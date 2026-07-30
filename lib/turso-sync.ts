import { getCurrentUser, userKey } from "./auth";
import { getActiveLocationFilter, locationUserKey } from "./locations";

const ENTITIES = ["clients", "appointments", "staff", "services", "inventory", "salon_invoices", "expenses", "attendance", "payouts", "cash_flow_income"] as const;
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
          // Prefer the local copy of any record this browser already has, rather
          // than the DB's — the DB row can be stale for a few seconds after a save
          // (saveToDB is fire-and-forget), and syncFromDB() runs on nearly every
          // page's mount. Without this, editing something (e.g. a staff member's
          // pay type or section) and then immediately navigating to another page
          // races the still-in-flight save: syncFromDB fetches the pre-edit DB
          // row and silently reverts the edit back in localStorage. Records that
          // exist only in the DB (created on another device/session) still come
          // through unaffected.
          const localById: Record<string, Record<string, unknown>> = {};
          localList.forEach(r => { localById[(r as { id: string }).id] = r; });
          const merged = (incoming as Record<string, unknown>[]).map(dbRecord =>
            localById[(dbRecord as { id: string }).id] ?? dbRecord
          );
          localStorage.setItem(locationUserKey(`werzio_${entity}`, locationId), JSON.stringify([...merged, ...localOnly]));
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
      const { data, updatedAt } = await res.json() as { data: object | null; updatedAt: string | null };
      if (data && typeof data === "object") {
        // saveSettingsToDB() (lib/turso-sync.ts) is fire-and-forget from most
        // callers and can still be in flight — or can have failed outright —
        // when syncFromDB() runs on the very next page load/navigation. Without
        // this check, a just-saved edit (salon name, logo, etc.) gets silently
        // overwritten by the stale row this GET just fetched, which is exactly
        // what "settings revert after refresh" looks like from the outside.
        const localSavedAt = localStorage.getItem(userKey("werzio_settings_saved_at"));
        const localIsNewer = !!localSavedAt && !!updatedAt && localSavedAt > updatedAt;
        if (!localIsNewer) {
          localStorage.setItem(userKey("werzio_settings"), JSON.stringify(data));
        }
      }
    }
  } catch { /* keep localStorage */ }

  // Sync loyalty transaction history — same merge-by-id protection as the
  // ENTITIES loop above (saveLoyaltyHistoryToDB is fire-and-forget from most
  // callers, so a blind overwrite here could revert a just-awarded/redeemed
  // transaction the same way settings used to revert on refresh).
  try {
    const res = await fetch(`/api/loyalty?userId=${encodeURIComponent(dataOwnerId)}&locationId=${encodeURIComponent(locationId)}`);
    if (res.ok) {
      const { data: incoming } = await res.json() as { data: Record<string, unknown>[] };
      if (Array.isArray(incoming)) {
        const lsRaw = localStorage.getItem(locationUserKey("werzio_loyalty_history", locationId));
        const localList: Record<string, unknown>[] = [];
        if (lsRaw) {
          try { localList.push(...(JSON.parse(lsRaw) as Record<string, unknown>[])); } catch { /* ignore */ }
        }
        const incomingIds = new Set(incoming.map(r => r.id as string));
        const localOnly = localList.filter(r => !incomingIds.has(r.id as string));
        const localById: Record<string, Record<string, unknown>> = {};
        localList.forEach(r => { localById[r.id as string] = r; });
        const merged = incoming.map(dbRecord => localById[dbRecord.id as string] ?? dbRecord);
        const union = [...merged, ...localOnly];
        if (union.length > 0) {
          localStorage.setItem(locationUserKey("werzio_loyalty_history", locationId), JSON.stringify(union));
        }
        if (localOnly.length > 0) {
          fetch("/api/loyalty", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: dataOwnerId, locationId, data: union }),
          }).catch(() => {});
        }
      }
    }
  } catch { /* keep localStorage */ }
}

/**
 * POSTs with up to 3 attempts and exponential back-off (1s/2s/4s), resolving
 * true/false with the outcome instead of throwing. Every "save to Turso"
 * function in this file is built on this — a save that silently gives up
 * after one failed attempt is exactly how data (expenses, invoices, settings)
 * has gone missing or reverted after a refresh in the past. New save
 * functions should use this too rather than a bare fire-and-forget fetch.
 */
async function retryFetch(url: string, options: RequestInit, label: string, tries = 3): Promise<boolean> {
  try {
    const r = await fetch(url, options);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return true;
  } catch (err) {
    if (tries <= 1) {
      console.warn(`[${label}] failed after all retries:`, err);
      return false;
    }
    const delay = 2 ** (3 - tries) * 1000; // 1s, 2s, 4s
    await new Promise(res => setTimeout(res, delay));
    return retryFetch(url, options, label, tries - 1);
  }
}

/**
 * Re-push the browser's currently visible local data to Turso. This runs after
 * syncFromDB() has merged DB + localStorage, so it does not ask the user to log
 * out and does not drop records that only existed locally during a sync gap.
 */
export async function syncLocalDataToDB(): Promise<boolean> {
  const user = getCurrentUser();
  if (!user || typeof window === "undefined") return false;
  const dataOwnerId = user.salonOwnerId || user.id;
  const locationId = getActiveLocationFilter();

  const results = await Promise.all(
    ENTITIES.map(async (entity) => {
      try {
        const raw = localStorage.getItem(locationUserKey(`werzio_${entity}`, locationId));
        if (!raw) return true;
        const data = JSON.parse(raw) as unknown;
        if (!Array.isArray(data)) return true;

        const body = JSON.stringify({ entity, data, userId: dataOwnerId, locationId });
        return retryFetch(
          "/api/db",
          { method: "POST", headers: { "Content-Type": "application/json" }, body },
          `syncLocalDataToDB:${entity}`,
        );
      } catch (err) {
        console.warn(`[syncLocalDataToDB:${entity}] skipped:`, err);
        return false;
      }
    }),
  );

  return results.every(Boolean);
}

/**
 * Push the updated list to Turso under the user-scoped key. Most callers
 * don't await it (fire-and-forget, doesn't block the UI), but a caller that
 * needs to know whether the write actually landed (e.g. POS checkout, so it
 * can warn the cashier instead of silently losing the sale from every device
 * but the one that rang it up) can await the result.
 */
export function saveToDB(entity: Entity, data: unknown[]): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) return Promise.resolve(false);
  const dataOwnerId = user.salonOwnerId || user.id;
  const locationId = getActiveLocationFilter();

  const body = JSON.stringify({ entity, data, userId: dataOwnerId, locationId });
  return retryFetch("/api/db", { method: "POST", headers: { "Content-Type": "application/json" }, body }, `saveToDB:${entity}`);
}

/**
 * Save settings object to Turso. Most callers still don't await it, but the
 * caller does need to know whether the write actually landed (see
 * saveSettings() in lib/settings-store.ts) since a silently-failed save
 * previously looked identical to a successful one until the next refresh
 * quietly reverted it.
 */
export function saveSettingsToDB(data: object): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) return Promise.resolve(false);
  const body = JSON.stringify({ userId: user.salonOwnerId || user.id, data });
  return retryFetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body }, "saveSettingsToDB");
}

/**
 * Save loyalty transaction history to Turso. Still fire-and-forget from most
 * callers, but no longer gives up silently on the first network hiccup.
 */
export function saveLoyaltyHistoryToDB(data: unknown[]): Promise<boolean> {
  const user = getCurrentUser();
  if (!user) return Promise.resolve(false);

  const body = JSON.stringify({
    userId: user.salonOwnerId || user.id,
    locationId: getActiveLocationFilter(),
    data,
  });
  return retryFetch("/api/loyalty", { method: "POST", headers: { "Content-Type": "application/json" }, body }, "saveLoyaltyHistoryToDB");
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
