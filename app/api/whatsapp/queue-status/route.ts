import { NextRequest } from "next/server";
import { resolveActor } from "@/lib/api-auth";
import { db } from "@/lib/db";

async function ensureTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wa_booking_send_queue (
      id           TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      kind         TEXT NOT NULL,
      phone        TEXT NOT NULL,
      text         TEXT NOT NULL,
      client_name  TEXT NOT NULL,
      appt_date    TEXT,
      appt_time    TEXT,
      scheduled_at TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      attempts     INTEGER NOT NULL DEFAULT 0,
      last_error   TEXT,
      created_at   TEXT NOT NULL,
      sent_at      TEXT,
      PRIMARY KEY (user_id, id)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wa_pos_receipt_queue (
      id             TEXT NOT NULL,
      user_id        TEXT NOT NULL,
      invoice_id     TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      phone          TEXT NOT NULL,
      client_name    TEXT NOT NULL,
      invoice_json   TEXT NOT NULL,
      salon_json     TEXT NOT NULL,
      thank_you_text TEXT NOT NULL DEFAULT '',
      scheduled_at   TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      attempts       INTEGER NOT NULL DEFAULT 0,
      last_error     TEXT,
      created_at     TEXT NOT NULL,
      sent_at        TEXT,
      PRIMARY KEY (user_id, invoice_id)
    )
  `);
}

async function count(sql: string, args: string[]) {
  const result = await db.execute({ sql, args });
  return Number(result.rows[0]?.count ?? 0);
}

export async function GET(request: NextRequest) {
  const actor = await resolveActor(request);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    await ensureTables();
    const now = new Date().toISOString();
    const bookingPending = await count(
      "SELECT COUNT(*) AS count FROM wa_booking_send_queue WHERE user_id = ? AND status = 'pending'",
      [actor.userId],
    );
    const bookingDue = await count(
      "SELECT COUNT(*) AS count FROM wa_booking_send_queue WHERE user_id = ? AND status = 'pending' AND scheduled_at <= ?",
      [actor.userId, now],
    );
    const posPending = await count(
      "SELECT COUNT(*) AS count FROM wa_pos_receipt_queue WHERE user_id = ? AND status = 'pending'",
      [actor.userId],
    );
    const posDue = await count(
      "SELECT COUNT(*) AS count FROM wa_pos_receipt_queue WHERE user_id = ? AND status = 'pending' AND scheduled_at <= ?",
      [actor.userId, now],
    );

    return Response.json({
      ok: true,
      bookingPending,
      bookingDue,
      posPending,
      posDue,
      totalPending: bookingPending + posPending,
      totalDue: bookingDue + posDue,
    });
  } catch (error) {
    console.error("[whatsapp/queue-status]", error);
    return Response.json({ ok: false, error: "Could not load queue status." }, { status: 500 });
  }
}
