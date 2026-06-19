import { getCurrentUser, userKey } from "./auth";

const ENTITIES = ["clients", "appointments", "staff", "services", "inventory"] as const;
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
        const data = await res.json() as unknown[];
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem(userKey(`werzio_${entity}`), JSON.stringify(data));
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
  }).catch(() => {});
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
