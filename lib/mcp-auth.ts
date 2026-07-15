/**
 * lib/mcp-auth.ts
 *
 * Bearer-API-key auth for the MCP server (app/api/mcp/route.ts), used by
 * external agents (Poke) instead of the session-cookie auth every dashboard
 * route uses (lib/api-auth.ts). Keys are salon-scoped (userId + locationId,
 * mirroring ResolvedActor) and hashed at rest the same way session tokens are
 * (see lib/session.ts's tokenId) — the raw key is only ever shown once, at
 * generation time.
 */

import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

export interface McpKeyActor {
  userId: string;
  locationId: string;
  scope: "read" | "read_write";
  keyId: string;
}

const KEY_PREFIX = "sk_mcp_live_";
const LAST_USED_REFRESH_MS = 5 * 60 * 1000;

export async function ensureMcpKeysTable(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS mcp_api_keys (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      location_id   TEXT NOT NULL DEFAULT 'main',
      key_hash      TEXT NOT NULL,
      key_prefix    TEXT NOT NULL,
      label         TEXT NOT NULL DEFAULT 'Poke',
      scope         TEXT NOT NULL DEFAULT 'read_write',
      created_at    TEXT NOT NULL,
      last_used_at  TEXT,
      revoked_at    TEXT
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS mcp_api_keys_hash_idx ON mcp_api_keys(key_hash)`).catch(() => {});
  await db.execute(`CREATE INDEX IF NOT EXISTS mcp_api_keys_user_idx ON mcp_api_keys(user_id)`).catch(() => {});
}

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Generates a new raw key + its hash/prefix for storage. The raw value is never persisted. */
export function generateMcpKey(): { raw: string; hash: string; prefix: string } {
  const raw = KEY_PREFIX + randomBytes(24).toString("hex");
  return { raw, hash: hashKey(raw), prefix: raw.slice(0, KEY_PREFIX.length + 8) };
}

/**
 * Plugs directly into mcp-handler's `withMcpAuth(handler, verifyToken)`.
 * Resolves a bearer key to the salon it belongs to, or undefined if the key
 * is missing/malformed/unknown/revoked — mcp-handler responds 401 in that case.
 */
export async function verifyMcpToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken || !bearerToken.startsWith(KEY_PREFIX)) return undefined;

  await ensureMcpKeysTable();
  const hash = hashKey(bearerToken);
  const result = await db.execute({
    sql: "SELECT id, user_id, location_id, scope, last_used_at FROM mcp_api_keys WHERE key_hash = ? AND revoked_at IS NULL",
    args: [hash],
  });
  if (result.rows.length === 0) return undefined;
  const row = result.rows[0] as Record<string, unknown>;

  // Fire-and-forget — bookkeeping only, must not add latency to every tool call.
  // Only refreshed when stale by >5 min since a single Poke turn can fire several
  // tool calls in a row.
  const lastUsedMs = row.last_used_at ? new Date(String(row.last_used_at)).getTime() : 0;
  if (Date.now() - lastUsedMs > LAST_USED_REFRESH_MS) {
    db.execute({
      sql: "UPDATE mcp_api_keys SET last_used_at = ? WHERE id = ?",
      args: [new Date().toISOString(), row.id as string],
    }).catch(() => {});
  }

  const actor: McpKeyActor = {
    userId: String(row.user_id),
    locationId: String(row.location_id || "main"),
    scope: row.scope === "read" ? "read" : "read_write",
    keyId: String(row.id),
  };

  return {
    token: bearerToken,
    clientId: actor.userId,
    scopes: [actor.scope],
    extra: { actor },
  };
}

/** Pulls the resolved McpKeyActor back out of a tool call's RequestHandlerExtra.authInfo. */
export function mcpActorFrom(authInfo: AuthInfo | undefined): McpKeyActor | null {
  const actor = authInfo?.extra?.actor as McpKeyActor | undefined;
  return actor ?? null;
}

/** Same `${userId}_entity` / `${userId}_${locationId}_entity` key convention as app/api/db/route.ts. */
export function blobKey(actor: McpKeyActor, entity: string): string {
  return actor.locationId === "main" ? `${actor.userId}_${entity}` : `${actor.userId}_${actor.locationId}_${entity}`;
}
