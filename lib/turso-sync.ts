import { getCurrentUser, userKey } from "./auth";

const ENTITIES = ["clients", "appointments", "staff", "services", "inventory", "salon_invoices"] as const;
type Entity = typeof ENTITIES[number];

/**
 * On app load: pull all data from Turso into the user-scoped localStorage slots.
 * Only runs when a user is logged in (getCurrentUser() returns non-null).
 */
export async function syncFromDB(): Promise<void> {
  const user = getCurrentUser();
  if (!user) return;

  // Sync core entities (clients, appointments, staff, services, inventory)
  await Promise.all(
    ENTITIES.map(async (entity) => {
      try {
        const res = await fetch(
          `/api/db?entity=${entity}&userId=${encodeURIComponent(user.id)}`,
        );
        if (!res.ok) return;
        const incoming = await res.json() as unknown[];
        if (!Array.isArray(incoming) || incoming.length === 0) return;

        if (entity === "clients") {
          // Merge: never overwrite a client's numeric progress (loyalty pts, visits, spend)
          // with a staler value from DB — guards against the race where a POS save
          // completes after syncFromDB already started its fetch.
          const lsRaw = localStorage.getItem(userKey("werzio_clients"));
          const local: Record<string, Record<string, unknown>> = {};
          if (lsRaw) {
            try {
              (JSON.parse(lsRaw) as Record<string, unknown>[]).forEach(c => { local[(c as { id: string }).id] = c; });
            } catch { /* ignore */ }
          }
          const merged = (incoming as Record<string, unknown>[]).map(dbClient => {
            const lc = local[(dbClient as { id: string }).id];
            if (!lc) return dbClient;
            return {
              ...dbClient,
              loyaltyPoints:       Math.max(Number(lc.loyaltyPoints       ?? 0), Number(dbClient.loyaltyPoints       ?? 0)),
              loyaltyPointsEarned: Math.max(Number(lc.loyaltyPointsEarned ?? 0), Number(dbClient.loyaltyPointsEarned ?? 0)),
              totalVisits:         Math.max(Number(lc.totalVisits          ?? 0), Number(dbClient.totalVisits          ?? 0)),
              totalSpend:          Math.max(Number(lc.totalSpend           ?? 0), Number(dbClient.totalSpend           ?? 0)),
            };
          });
          localStorage.setItem(userKey("werzio_clients"), JSON.stringify(merged));
        } else {
          localStorage.setItem(userKey(`werzio_${entity}`), JSON.stringify(incoming));
        }
      } catch { /* keep localStorage */ }
    }),
  );

  // Sync settings
  try {
    const res = await fetch(`/api/settings?userId=${encodeURIComponent(user.id)}`);
    if (res.ok) {
      const { data } = await res.json() as { data: object | null };
      if (data && typeof data === "object") {
        localStorage.setItem(userKey("werzio_settings"), JSON.stringify(data));
      }
    }
  } catch { /* keep localStorage */ }

  // Sync loyalty transaction history
  try {
    const res = await fetch(`/api/loyalty?userId=${encodeURIComponent(user.id)}`);
    if (res.ok) {
      const { data } = await res.json() as { data: unknown[] };
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(userKey("werzio_loyalty_history"), JSON.stringify(data));
      }
    }
  } catch { /* keep localStorage */ }
}

/**
 * After every save: push the updated list to Turso under the user-scoped key.
 * Fire-and-forget — never blocks the UI.
 */
export function saveToDB(entity: Entity, data: unknown[]): void {
  const user = getCurrentUser();
  if (!user) return;

  fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity, data, userId: user.id }),
  })
    .then(r => { if (!r.ok) console.warn(`[saveToDB] ${entity} save failed:`, r.status); })
    .catch(err => console.warn(`[saveToDB] ${entity} network error:`, err));
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
    body: JSON.stringify({ userId: user.id, data }),
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
    body: JSON.stringify({ userId: user.id, data }),
  }).catch(() => {});
}
