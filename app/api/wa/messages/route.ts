/**
 * /api/wa/messages
 *
 * GET  ?userId=xxx&limit=200         — fetch WA message log for a user from Turso
 * GET  ?userId=xxx&apptId=yyy&type=z — check whether a log already exists for
 *                                      that appointment/type (used to dedup a
 *                                      send across browsers/devices)
 * POST { userId, entry }             — persist a single WA log entry to Turso
 *
 * This gives every salon owner their own message history that survives
 * localStorage clears and is visible across devices.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wa_message_logs (
      id          TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      timestamp   TEXT NOT NULL,
      type        TEXT NOT NULL,
      client_name TEXT NOT NULL,
      phone       TEXT NOT NULL,
      status      TEXT NOT NULL,
      template_id TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      appt_id     TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user_id, id)
    )
  `);
  // Older rows may predate these columns — add them if missing (no-op once applied).
  await db.execute(`ALTER TABLE wa_message_logs ADD COLUMN error_message TEXT NOT NULL DEFAULT ''`).catch(() => {});
  await db.execute(`ALTER TABLE wa_message_logs ADD COLUMN appt_id TEXT NOT NULL DEFAULT ''`).catch(() => {});
  await db.execute(`ALTER TABLE wa_message_logs ADD COLUMN appt_date TEXT NOT NULL DEFAULT ''`).catch(() => {});
  await db.execute(`ALTER TABLE wa_message_logs ADD COLUMN service TEXT NOT NULL DEFAULT ''`).catch(() => {});
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return Response.json({ ok: false, error: "Missing userId." }, { status: 400 });

  try {
    await ensureTable();

    const apptId = req.nextUrl.searchParams.get("apptId");
    const type = req.nextUrl.searchParams.get("type");
    if (apptId && type) {
      const result = await db.execute({
        sql: "SELECT 1 FROM wa_message_logs WHERE user_id = ? AND appt_id = ? AND type = ? AND status = 'sent' LIMIT 1",
        args: [userId, apptId, type],
      });
      return Response.json({ ok: true, exists: result.rows.length > 0 });
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "200"), 500);
    const result = await db.execute({
      sql: "SELECT * FROM wa_message_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?",
      args: [userId, limit],
    });

    const logs = result.rows.map((r) => ({
      id:         r.id            as string,
      timestamp:  r.timestamp     as string,
      type:       r.type          as string,
      clientName: r.client_name   as string,
      phone:      r.phone         as string,
      status:     r.status        as string,
      templateId: r.template_id   as string,
      error:      (r.error_message as string) || undefined,
      apptId:     (r.appt_id      as string) || undefined,
    }));

    return Response.json({ ok: true, logs });
  } catch (err) {
    console.error("[wa/messages] GET error:", err);
    return Response.json({ ok: true, logs: [] }); // fail open — don't break the page
  }
}

export async function POST(req: NextRequest) {
  let body: {
    userId: string;
    entry: {
      id: string;
      timestamp: string;
      type: string;
      clientName: string;
      phone: string;
      status: string;
      templateId: string;
      error?: string;
      apptId?: string;
      apptDate?: string;
      service?: string;
    };
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  if (!body?.userId || !body?.entry) {
    return Response.json({ ok: false, error: "Missing userId or entry." }, { status: 400 });
  }

  try {
    await ensureTable();
    const { entry } = body;
    await db.execute({
      sql: `INSERT OR REPLACE INTO wa_message_logs
              (id, user_id, timestamp, type, client_name, phone, status, template_id, error_message, appt_id, appt_date, service)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        entry.id, body.userId, entry.timestamp, entry.type,
        entry.clientName, entry.phone, entry.status, entry.templateId ?? "", entry.error ?? "", entry.apptId ?? "",
        entry.apptDate ?? "", entry.service ?? "",
      ],
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[wa/messages] POST error:", err);
    return Response.json({ ok: false, error: "Failed to save log." }, { status: 500 });
  }
}