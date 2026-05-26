import { NextRequest } from "next/server";
import { db } from "@/lib/db";

const ALLOWED = new Set(["clients", "appointments", "staff", "services", "inventory"]);

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS salon_data (
      entity TEXT PRIMARY KEY,
      data   TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

export async function GET(req: NextRequest) {
  const entity = req.nextUrl.searchParams.get("entity");
  if (!entity || !ALLOWED.has(entity)) {
    return Response.json({ error: "Invalid entity" }, { status: 400 });
  }
  await ensureTable();
  const result = await db.execute({
    sql: "SELECT data FROM salon_data WHERE entity = ?",
    args: [entity],
  });
  if (result.rows.length === 0) return Response.json([]);
  return Response.json(JSON.parse(result.rows[0].data as string));
}

export async function POST(req: NextRequest) {
  const { entity, data } = await req.json() as { entity: string; data: unknown[] };
  if (!entity || !ALLOWED.has(entity)) {
    return Response.json({ error: "Invalid entity" }, { status: 400 });
  }
  await ensureTable();
  await db.execute({
    sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
    args: [entity, JSON.stringify(data), new Date().toISOString()],
  });
  return Response.json({ ok: true });
}