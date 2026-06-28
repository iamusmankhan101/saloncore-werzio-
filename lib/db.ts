import { createClient, type Client } from "@libsql/client";

// Lazy singleton — created on first use so the module can be imported during
// the build without throwing (env vars are only available at runtime).
let _db: Client | null = null;

export function getDb(): Client {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error("TURSO_DATABASE_URL environment variable is not set.");
    _db = createClient({ url, authToken });
  }
  return _db;
}

// Re-export as `db` for backward compatibility with existing imports.
export const db = new Proxy({} as Client, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
