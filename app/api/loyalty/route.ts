/**
 * /api/loyalty
 *
 * GET  ?userId=xxx       — fetch loyalty transaction history for a user
 * POST { userId, data }  — upsert full history array
 *
 * Stored in salon_data table under key "{userId}_loyalty_history".
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
  const locationId = req.nextUrl.searchParams.get("locationId") || "main";
  if (!userId) return Response.json({ ok: false, error: "Missing userId" }, { status: 400 });

  try {
    await ensureTable();
    const result = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [locationId === "main" ? `${userId}_loyalty_history` : `${userId}_${locationId}_loyalty_history`],
    });
    if (result.rows.length === 0) return Response.json({ ok: true, data: [] });
    return Response.json({ ok: true, data: JSON.parse(result.rows[0].data as string) });
  } catch (err) {
    console.error("[loyalty] GET error:", err);
    return Response.json({ ok: true, data: [] });
  }
}

export async function POST(req: NextRequest) {
  let body: { userId: string; locationId?: string; data: unknown[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { userId, locationId = "main", data } = body;
  if (!userId || !Array.isArray(data)) return Response.json({ ok: false, error: "Missing fields" }, { status: 400 });

  try {
    await ensureTable();
    await db.execute({
      sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
      args: [
        locationId === "main" ? `${userId}_loyalty_history` : `${userId}_${locationId}_loyalty_history`,
        JSON.stringify(data),
        new Date().toISOString(),
      ],
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[loyalty] POST error:", err);
    return Response.json({ ok: false, error: "DB write failed" }, { status: 500 });
  }
}
