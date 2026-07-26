import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveActor } from "@/lib/api-auth";
import { backupExistingSalonData } from "@/lib/data-backup";

const ALLOWED = new Set(["clients", "appointments", "staff", "services", "inventory", "salon_invoices", "expenses"]);

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS salon_data (
      entity     TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

function itemId(item: unknown): string | null {
  return item && typeof item === "object" && "id" in item ? String((item as { id?: unknown }).id || "") || null : null;
}

async function mergeQueuedPosInvoices(userId: string, stored: unknown[]): Promise<unknown[]> {
  const byId = new Map<string, unknown>();
  for (const item of stored) {
    const id = itemId(item);
    if (id) byId.set(id, item);
  }

  try {
    const queued = await db.execute({
      sql: `SELECT invoice_json FROM wa_pos_receipt_queue
            WHERE user_id = ? AND status != 'cancelled'
            ORDER BY created_at DESC`,
      args: [userId],
    });

    for (const row of queued.rows) {
      try {
        const invoice = JSON.parse(row.invoice_json as string) as unknown;
        const id = itemId(invoice);
        if (id && !byId.has(id)) byId.set(id, invoice);
      } catch { /* skip malformed queue rows */ }
    }
  } catch {
    // The queue table may not exist on older deployments yet.
  }

  return Array.from(byId.values());
}

/**
 * GET /api/db?entity=clients&userId=user_123
 *
 * Returns the stored JSON array for the entity, scoped to the authenticated
 * caller's own salon data (userId/locationId are resolved from the session,
 * not trusted from the query string).
 */
export async function GET(req: NextRequest) {
  const entity = req.nextUrl.searchParams.get("entity");
  const requestedLocationId = req.nextUrl.searchParams.get("locationId") || "main";

  if (!entity || !ALLOWED.has(entity)) {
    return Response.json({ error: "Invalid entity" }, { status: 400 });
  }

  try {
    const actor = await resolveActor(req, requestedLocationId);
    if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { userId, locationId } = actor;
    await ensureTable();
    const key = locationId === "main" ? `${userId}_${entity}` : `${userId}_${locationId}_${entity}`;
    const result = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [key],
    });
    const stored = result.rows.length === 0 ? [] : JSON.parse(result.rows[0].data as string) as unknown[];
    if (entity !== "salon_invoices") return Response.json(stored);

    const merged = await mergeQueuedPosInvoices(userId, Array.isArray(stored) ? stored : []);
    if (merged.length !== (Array.isArray(stored) ? stored.length : 0)) {
      await db.execute({
        sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
        args: [key, JSON.stringify(merged), new Date().toISOString()],
      });
    }
    return Response.json(merged);
  } catch (err) {
    console.error("[db] GET error:", err);
    return Response.json([]);
  }
}

/**
 * POST /api/db
 * Body: { entity: string, data: unknown[], locationId?: string }
 *
 * Upserts the JSON array under a key scoped to the authenticated caller's
 * own userId/locationId (resolved server-side from the session).
 */
export async function POST(req: NextRequest) {
  let body: { entity: string; data: unknown[]; locationId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const { entity, data } = body;
  const requestedLocationId = body.locationId || "main";
  if (!entity || !ALLOWED.has(entity)) {
    return Response.json({ error: "Invalid entity" }, { status: 400 });
  }

  try {
    const actor = await resolveActor(req, requestedLocationId);
    if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { userId, locationId } = actor;
    await ensureTable();
    const key = locationId === "main" ? `${userId}_${entity}` : `${userId}_${locationId}_${entity}`;
    await backupExistingSalonData(key, userId);
    await db.execute({
      sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
      args: [key, JSON.stringify(data), new Date().toISOString()],
    });

    // Keep the relational clients table in sync so phone updates are reflected
    // in loyalty card lookups and Google Wallet passes.
    if (entity === "clients" && userId && Array.isArray(data)) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS clients (
          id          TEXT NOT NULL,
          user_id     TEXT NOT NULL,
          name        TEXT NOT NULL DEFAULT '',
          phone       TEXT NOT NULL DEFAULT '',
          email       TEXT,
          notes       TEXT,
          total_visits INTEGER NOT NULL DEFAULT 0,
          total_spent  REAL    NOT NULL DEFAULT 0,
          last_visit   TEXT,
          created_at   TEXT NOT NULL,
          PRIMARY KEY (id)
        )
      `);
      for (const item of data) {
        const c = item as Record<string, unknown>;
        if (!c.id) continue;
        await db.execute({
          sql: `INSERT INTO clients (id, user_id, name, phone, email, notes, total_visits, total_spent, last_visit, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  name         = excluded.name,
                  phone        = excluded.phone,
                  email        = excluded.email,
                  notes        = excluded.notes,
                  total_visits = excluded.total_visits,
                  total_spent  = excluded.total_spent,
                  last_visit   = excluded.last_visit`,
          args: [
            String(c.id),
            userId,
            String(c.name  || ""),
            String(c.phone || ""),
            typeof c.email        === "string" ? c.email        : null,
            typeof c.notes        === "string" ? c.notes        : null,
            Number(c.totalVisits  ?? 0),
            Number(c.totalSpend   ?? 0),
            typeof c.lastVisitDate === "string" ? c.lastVisitDate : null,
            String(c.createdAt   || new Date().toISOString().slice(0, 10)),
          ],
        });
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[db] POST error:", err);
    return Response.json({ ok: false, error: "DB write failed." }, { status: 500 });
  }
}
