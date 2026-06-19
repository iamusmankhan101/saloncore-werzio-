/**
 * /api/settings
 *
 * GET  ?userId=xxx       — fetch salon settings object from Turso
 * POST { userId, data }  — upsert settings (full object)
 *
 * Stored in salon_data table under key "{userId}_settings".
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS salon_data (
      entity     TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return Response.json({ ok: false, error: "Missing userId" }, { status: 400 });

  try {
    await ensureTable();
    const result = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [`${userId}_settings`],
    });
    if (result.rows.length === 0) return Response.json({ ok: true, data: null });
    return Response.json({ ok: true, data: JSON.parse(result.rows[0].data as string) });
  } catch (err) {
    console.error("[settings] GET error:", err);
    return Response.json({ ok: true, data: null });
  }
}

export async function POST(req: NextRequest) {
  let body: { userId: string; data: object };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { userId, data } = body;
  if (!userId || !data) return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });

  try {
    await ensureTable();
    await db.execute({
      sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
      args: [`${userId}_settings`, JSON.stringify(data), new Date().toISOString()],
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[settings] POST error:", err);
    return Response.json({ ok: false, error: "DB write failed" }, { status: 500 });
  }
}
