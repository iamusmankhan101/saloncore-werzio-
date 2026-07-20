import { getCurrentUser, userKey } from "./auth";
import { getActiveLocationFilter, locationUserKey } from "./locations";

const ENTITIES = ["clients", "appointments", "staff", "services", "inventory", "salon_invoices", "expenses"] as const;
type Entity = typeof ENTITIES[number];

/**
 * On app load: pull all data from Turso into the user-scoped localStorage slots.
 * Only runs when a user is logged in (getCurrentUser() returns non-null).
 */
export async function syncFromDB(): Promise<void> {
  const user = getCurrentUser();
  if (!user) return;
  const dataOwnerId = user.salonOwnerId || user.id;
  const locationId = getActiveLocationFilter();

  // Sync core entities (clients, appointments, staff, services, inventory)
  await Promise.all(
    ENTITIES.map(async (entity) => {
      try {
        const res = await fetch(
          `/api/db?entity=${entity}&userId=${encodeURIComponent(dataOwnerId)}&locationId=${encodeURIComponent(locationId)}`,
        );
        if (!res.ok) return;
        const incoming = await res.json() as unknown[];
        if (!Array.isArray(incoming) || incoming.length === 0) {
          // Turso has nothing for this entity yet on this account/location — if this
          // browser is holding local data that predates sync support (e.g. expenses,
          // which only started syncing after this check was added), push it up now
          // instead of waiting for the next add/edit to trigger a save. Awaited so a
          // later syncFromDB() can't race ahead and see the still-empty DB row.
          try {
            const lsRaw = localStorage.getItem(locationUserKey(`werzio_${entity}`, locationId));
            const local = lsRaw ? JSON.parse(lsRaw) as unknown[] : [];
            if (Array.isArray(local) && local.length > 0) {
              await fetch("/api/db", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entity, data: local, userId: dataOwnerId, locationId }),
              }).catch(() => {});
            }
          } catch { /* ignore */ }
          return;
        }

        // Merge by id instead of blindly overwriting: any record that exists only in
        // localStorage (e.g. added while offline, or not yet pushed to Turso) is kept
        // rather than dropped just because the DB's copy didn't have it. Without this,
        // a DB row that is behind (or was raced by a smaller concurrent save) silently
        // truncates whatever the browser already had — this is how the expenses total
        // dropped from 400k+ to a handful of recent entries.
        const lsRaw = localStorage.getItem(locationUserKey(`werzio_${entity}`, locationId));
        const localList: Record<string, unknown>[] = [];
        if (lsRaw) {
          try { localList.push(...(JSON.parse(lsRaw) as Record<string, unknown>[])); } catch { /* ignore */ }
        }
        const incomingIds = new Set((incoming as Record<string, unknown>[]).map(r => (r as { id: string }).id));
        const localOnly = localList.filter(r => !incomingIds.has((r as { id: string }).id));

        if (entity === "clients") {
          // Additionally: never overwrite a client's numeric progress (loyalty pts,
          // visits, spend) with a staler value from DB — guards against the race where
          // a POS save completes after syncFromDB already started its fetch.
          const localById: Record<string, Record<string, unknown>> = {};
          localList.forEach(c => { localById[(c as { id: string }).id] = c; });
          const merged = (incoming as Record<string, unknown>[]).map(dbClient => {
            const lc = localById[(dbClient as { id: string }).id];
            if (!lc) return dbClient;
            return {
              ...dbClient,
              loyaltyPoints:       Math.max(Number(lc.loyaltyPoints       ?? 0), Number(dbClient.loyaltyPoints       ?? 0)),
              loyaltyPointsEarned: Math.max(Number(lc.loyaltyPointsEarned ?? 0), Number(dbClient.loyaltyPointsEarned ?? 0)),
              totalVisits:         Math.max(Number(lc.totalVisits          ?? 0), Number(dbClient.totalVisits          ?? 0)),
              totalSpend:          Math.max(Number(lc.totalSpend           ?? 0), Number(dbClient.totalSpend           ?? 0)),
            };
          });
          localStorage.setItem(locationUserKey("werzio_clients", locationId), JSON.stringify([...merged, ...localOnly]));
        } else {
          localStorage.setItem(locationUserKey(`werzio_${entity}`, locationId), JSON.stringify([...incoming, ...localOnly]));
        }

        if (localOnly.length > 0) {
          // Push the reconciled (union) list back up so Turso stops being behind.
          fetch("/api/db", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entity, data: [...incoming, ...localOnly], userId: dataOwnerId, locationId }),
          }).catch(() => {});
        }
      } catch { /* keep localStorage */ }
    }),
  );

  // Sync settings
  try {
    const res = await fetch(`/api/settings?userId=${encodeURIComponent(dataOwnerId)}`);
    if (res.ok) {
      const { data } = await res.json() as { data: object | null };
      if (data && typeof data === "object") {
        localStorage.setItem(userKey("werzio_settings"), JSON.stringify(data));
      }
    }
  } catch { /* keep localStorage */ }

  // Sync loyalty transaction history
  try {
    const res = await fetch(`/api/loyalty?userId=${encodeURIComponent(dataOwnerId)}&locationId=${encodeURIComponent(locationId)}`);
    if (res.ok) {
      const { data } = await res.json() as { data: unknown[] };
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(locationUserKey("werzio_loyalty_history", locationId), JSON.stringify(data));
      }
    }
  } catch { /* keep localStorage */ }
}

/**
 * After every save: push the updated list to Turso under the user-scoped key.
 * Fire-and-forget — never blocks the UI. Retries up to 3 times with exponential back-off.
 */
export function saveToDB(entity: Entity, data: unknown[]): void {
  const user = getCurrentUser();
  if (!user) return;
  const dataOwnerId = user.salonOwnerId || user.id;
  const locationId = getActiveLocationFilter();

  const body = JSON.stringify({ entity, data, userId: dataOwnerId, locationId });

  async function attempt(tries: number): Promise<void> {
    try {
      const r = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (err) {
      if (tries <= 1) {
        console.warn(`[saveToDB] ${entity} failed after all retries:`, err);
        return;
      }
      const delay = 2 ** (3 - tries) * 1000; // 1s, 2s, 4s
      await new Promise(res => setTimeout(res, delay));
      return attempt(tries - 1);
    }
  }

  attempt(3);
}

/**
 * Save settings object to Turso. Fire-and-forget.
 */
export function saveSettingsToDB(data: object): void {
  const user = getCurrentUser();
  if (!user) return;

  fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: user.salonOwnerId || user.id, data }),
  }).catch(() => {});
}

/**
 * Save loyalty transaction history to Turso. Fire-and-forget.
 */
export function saveLoyaltyHistoryToDB(data: unknown[]): void {
  const user = getCurrentUser();
  if (!user) return;

  fetch("/api/loyalty", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.salonOwnerId || user.id,
      locationId: getActiveLocationFilter(),
      data,
    }),
  }).catch(() => {});
}

/**
 * Push the latest loyalty points / profile to an existing Google Wallet pass.
 * Fire-and-forget. Pass `client` so the handler uses fresh data directly and
 * avoids a Turso re-fetch race (saveToDB is async and may not have settled yet).
 */
export function syncWalletPass(clientId: string, client?: unknown): void {
  const user = getCurrentUser();
  if (!user) return;

  fetch("/api/wallet/loyalty", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ salonId: user.salonOwnerId || user.id, clientId, client }),
  }).catch(() => {});
}
