import { createClient, type Client } from "@libsql/client";

// Shares the same Turso database as the main dashboard app (same
// TURSO_DATABASE_URL / TURSO_AUTH_TOKEN in this deployment's env) — the blog
// tables live alongside the salon data but are never read by the dashboard
// app. Fallback URL lets the module load during `next build` without a real
// connection; nothing actually connects until the first query at request time.
export const db: Client = createClient({
  url:       process.env.TURSO_DATABASE_URL ?? "http://localhost:8080",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
