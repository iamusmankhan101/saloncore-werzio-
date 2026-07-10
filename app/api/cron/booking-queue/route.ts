/**
 * /api/cron/booking-queue
 *
 * Drains wa_booking_send_queue — the online-booking confirmation and salon
 * group alert, queued by /api/public/booking with a 5-7 min scheduled_at
 * instead of being sent immediately (a serverless function can't just sleep
 * for 5-7 minutes to apply the same jitter every other automated WhatsApp
 * send in this app uses).
 *
 * Needs a cron schedule more frequent than Vercel Hobby's once-a-day limit to
 * actually hit the 5-7 min target — on Hobby this still drains, just later.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sendWhatsAppMessage, type WhatsAppProviderConfig } from "@/lib/whatsapp-provider";

const BATCH_LIMIT = 50;
const MAX_ATTEMPTS = 5;
// If the cron hasn't run in a long time (e.g. stuck on Hobby's once-daily
// schedule), don't fire off a burst of hours-old booking confirmations —
// mirrors the same "don't send stale automated messages" fix applied to the
// dashboard's own confirmation queue.
const EXPIRE_AFTER_MS = 24 * 60 * 60 * 1000;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function ensureTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wa_booking_send_queue (
      id           TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      kind         TEXT NOT NULL,
      phone        TEXT NOT NULL,
      text         TEXT NOT NULL,
      client_name  TEXT NOT NULL,
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
    CREATE TABLE IF NOT EXISTS wa_message_logs (
      id            TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      timestamp     TEXT NOT NULL,
      type          TEXT NOT NULL,
      client_name   TEXT NOT NULL,
      phone         TEXT NOT NULL,
      status        TEXT NOT NULL,
      template_id   TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user_id, id)
    )
  `);
}

interface QueueRow {
  id: string;
  userId: string;
  kind: "confirmation" | "groupalert";
  phone: string;
  text: string;
  clientName: string;
  scheduledAt: string;
  attempts: number;
}

async function getDueItems(): Promise<QueueRow[]> {
  const result = await db.execute({
    sql: `SELECT id, user_id, kind, phone, text, client_name, scheduled_at, attempts
          FROM wa_booking_send_queue
          WHERE status = 'pending' AND scheduled_at <= ? AND attempts < ?
          ORDER BY scheduled_at ASC
          LIMIT ?`,
    args: [new Date().toISOString(), MAX_ATTEMPTS, BATCH_LIMIT],
  });
  return result.rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    kind: r.kind as "confirmation" | "groupalert",
    phone: r.phone as string,
    text: r.text as string,
    clientName: r.client_name as string,
    scheduledAt: r.scheduled_at as string,
    attempts: Number(r.attempts ?? 0),
  }));
}

async function updateItem(item: QueueRow, status: "sent" | "pending" | "expired", error?: string) {
  await db.execute({
    sql: `UPDATE wa_booking_send_queue
          SET status = ?, attempts = ?, last_error = ?, sent_at = ?
          WHERE user_id = ? AND id = ?`,
    args: [
      status, item.attempts + 1, error ?? null,
      status === "sent" ? new Date().toISOString() : null,
      item.userId, item.id,
    ],
  });
}

async function logMessage(userId: string, kind: string, clientName: string, phone: string, status: "sent" | "failed", error?: string) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  try {
    await db.execute({
      sql: `INSERT OR REPLACE INTO wa_message_logs
              (id, user_id, timestamp, type, client_name, phone, status, template_id, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'direct', ?)`,
      args: [id, userId, new Date().toISOString(), kind === "groupalert" ? "newbooking" : "confirmation", clientName, phone, status, error ?? ""],
    });
  } catch { /* non-critical */ }
}

async function runBookingQueueCron(): Promise<{ sent: number; failed: number; skipped: number; expired: number }> {
  const items = await getDueItems();
  let sent = 0, failed = 0, skipped = 0, expired = 0;
  const settingsCache = new Map<string, Record<string, unknown> | null>();

  for (const item of items) {
    if (Date.now() - new Date(item.scheduledAt).getTime() > EXPIRE_AFTER_MS) {
      await updateItem(item, "expired", "Expired before the queue could drain — too stale to send.");
      expired++;
      continue;
    }

    if (!settingsCache.has(item.userId)) {
      const row = await db.execute({
        sql: "SELECT data FROM salon_data WHERE entity = ?",
        args: [`${item.userId}_settings`],
      });
      settingsCache.set(item.userId, row.rows.length > 0 ? JSON.parse(row.rows[0].data as string) : null);
    }
    const settings = settingsCache.get(item.userId);

    // Master "WhatsApp Automation" toggle — if it got switched off during the
    // wait, leave the item pending (don't burn an attempt) so it can still send
    // once re-enabled, without logging anything while automation is off.
    if (settings?.wasender && (settings.wasender as { enabled?: boolean }).enabled === false) {
      skipped++;
      continue;
    }

    const wasender = (settings?.wasender ?? {}) as Record<string, unknown>;
    const providerConfig: WhatsAppProviderConfig = {
      provider: (wasender.provider as WhatsAppProviderConfig["provider"]) || "wasender",
      apiKey: wasender.apiKey as string | undefined,
      botSailorApiToken: wasender.botSailorApiToken as string | undefined,
      botSailorPhoneNumberId: wasender.botSailorPhoneNumberId as string | undefined,
      zaptickApiKey: wasender.zaptickApiKey as string | undefined,
    };

    const result = await sendWhatsAppMessage(
      providerConfig, item.phone, item.text,
      { messageType: item.kind === "groupalert" ? "manual" : "confirmation" },
    );
    await logMessage(item.userId, item.kind, item.clientName, item.phone, result.ok ? "sent" : "failed", result.errorReason);

    if (result.ok) {
      await updateItem(item, "sent");
      sent++;
    } else if (item.attempts + 1 >= MAX_ATTEMPTS) {
      await updateItem(item, "expired", result.errorReason);
      failed++;
    } else {
      await updateItem(item, "pending", result.errorReason);
      failed++;
    }
  }

  return { sent, failed, skipped, expired };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureTables();
    const result = await runBookingQueueCron();
    console.log("[booking-queue] cron complete:", result);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("[booking-queue] cron error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
