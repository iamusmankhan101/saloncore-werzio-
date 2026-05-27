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

  await Promise.all(
    ENTITIES.map(async (entity) => {
      try {
        const res = await fetch(
          `/api/db?entity=${entity}&userId=${encodeURIComponent(user.id)}`,
        );
        if (!res.ok) return;
        const data = await res.json() as unknown[];
        if (Array.isArray(data) && data.length > 0) {
          // Write into the per-user localStorage key so storage.ts picks it up
          localStorage.setItem(userKey(`werzio_${entity}`), JSON.stringify(data));
        }
      } catch {
        // network error — keep whatever is already in localStorage
      }
    }),
  );
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
  }).catch(() => { /* ignore network errors */ });
}