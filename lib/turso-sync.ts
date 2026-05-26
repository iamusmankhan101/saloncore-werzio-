const ENTITIES = ["clients", "appointments", "staff", "services", "inventory"] as const;
type Entity = typeof ENTITIES[number];

/** On app load: pull all data from Turso into localStorage. */
export async function syncFromDB(): Promise<void> {
  await Promise.all(
    ENTITIES.map(async (entity) => {
      try {
        const res = await fetch(`/api/db?entity=${entity}`);
        if (!res.ok) return;
        const data = await res.json() as unknown[];
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem(`glowbook_${entity}`, JSON.stringify(data));
        }
      } catch {
        // network error — keep whatever is in localStorage
      }
    }),
  );
}

/** After every save: push the updated list to Turso (fire-and-forget). */
export function saveToDB(entity: Entity, data: unknown[]): void {
  fetch("/api/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entity, data }),
  }).catch(() => {/* ignore network errors */});
}