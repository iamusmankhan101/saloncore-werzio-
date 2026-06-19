import { NextRequest } from "next/server";
import { db } from "@/lib/db";

const ALLOWED = new Set(["clients", "appointments", "staff", "services", "inventory", "salon_invoices"]);

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS salon_data (
      entity     TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

/**
 * GET /api/db?entity=clients&userId=user_123
 *
 * Returns the stored JSON array for the entity. When userId is supplied the
 * lookup key is "{userId}_{entity}", otherwise falls back to bare "{entity}"
 * (legacy / unauthenticated path).
 */
export async function GET(req: NextRequest) {
  const entity = req.nextUrl.searchParams.get("entity");
  const userId = req.nextUrl.searchParams.get("userId");

  if (!entity || !ALLOWED.has(entity)) {
    return Response.json({ error: "Invalid entity" }, { status: 400 });
  }

  try {
    await ensureTable();
    const key = userId ? `${userId}_${entity}` : entity;
    const result = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [key],
    });
    if (result.rows.length === 0) return Response.json([]);
    return Response.json(JSON.parse(result.rows[0].data as string));
  } catch (err) {
    console.error("[db] GET error:", err);
    return Response.json([]);
  }
}

/**
 * POST /api/db
 * Body: { entity: string, data: unknown[], userId?: string }
 *
 * Upserts the JSON array. When userId is supplied the storage key is
 * "{userId}_{entity}" so each salon owner has isolated data.
 */
export async function POST(req: NextRequest) {
  let body: { entity: string; data: unknown[]; userId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const { entity, data, userId } = body;
  if (!entity || !ALLOWED.has(entity)) {
    return Response.json({ error: "Invalid entity" }, { status: 400 });
  }

  try {
    await ensureTable();
    const key = userId ? `${userId}_${entity}` : entity;
    await db.execute({
      sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
      args: [key, JSON.stringify(data), new Date().toISOString()],
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[db] POST error:", err);
    return Response.json({ ok: false, error: "DB write failed." }, { status: 500 });
  }
}