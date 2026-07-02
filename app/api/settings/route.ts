/**
 * /api/settings
 *
 * GET  — fetch the authenticated caller's salon settings object from Turso
 * POST { data }  — upsert settings (full object) for the authenticated caller
 *
 * Stored in salon_data table under key "{userId}_settings", where userId is
 * always resolved from the caller's own session (never a client-supplied id).
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveActor } from "@/lib/api-auth";

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
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    await ensureTable();
    const result = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [`${actor.userId}_settings`],
    });
    if (result.rows.length === 0) return Response.json({ ok: true, data: null });
    return Response.json({ ok: true, data: JSON.parse(result.rows[0].data as string) });
  } catch (err) {
    console.error("[settings] GET error:", err);
    return Response.json({ ok: true, data: null });
  }
}

export async function POST(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { data: object };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { data } = body;
  if (!data) return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });

  try {
    await ensureTable();
    await db.execute({
      sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
      args: [`${actor.userId}_settings`, JSON.stringify(data), new Date().toISOString()],
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[settings] POST error:", err);
    return Response.json({ ok: false, error: "DB write failed" }, { status: 500 });
  }
}
