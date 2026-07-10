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
import { activeWhatsAppCredential, isFakePlaceholderPhone, sendWhatsAppMessage, type WhatsAppProviderConfig } from "@/lib/whatsapp-provider";
import { sendSalonInvoiceWhatsApp } from "@/lib/whatsapp-invoice-send";
import type { SalonInvoice } from "@/lib/salon-invoices";
import { checkWhatsAppSafety, recordWhatsAppSafetySend, type WhatsAppSafetyConfig } from "@/lib/whatsapp-safety";

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
  // Older deployments may predate appt_date/appt_time — add them if missing.
  await db.execute(`ALTER TABLE wa_booking_send_queue ADD COLUMN appt_date TEXT`).catch(() => {});
  await db.execute(`ALTER TABLE wa_booking_send_queue ADD COLUMN appt_time TEXT`).catch(() => {});
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

interface QueueRow {
  id: string;
  userId: string;
  kind: "confirmation" | "groupalert";
  phone: string;
  text: string;
  clientName: string;
  apptDate: string | null;
  apptTime: string | null;
  scheduledAt: string;
  attempts: number;
}

async function getDueItems(): Promise<QueueRow[]> {
  const result = await db.execute({
    sql: `SELECT id, user_id, kind, phone, text, client_name, appt_date, appt_time, scheduled_at, attempts
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
    apptDate: (r.appt_date as string) ?? null,
    apptTime: (r.appt_time as string) ?? null,
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

async function hasSentConfirmation(userId: string, apptId: string): Promise<boolean> {
  try {
    await db.execute(`ALTER TABLE wa_message_logs ADD COLUMN appt_id TEXT NOT NULL DEFAULT ''`).catch(() => {});
    const result = await db.execute({
      sql: "SELECT 1 FROM wa_message_logs WHERE user_id = ? AND appt_id = ? AND type = 'confirmation' AND status = 'sent' LIMIT 1",
      args: [userId, apptId],
    });
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

async function logMessage(userId: string, kind: string, clientName: string, phone: string, status: "sent" | "failed", error?: string, apptId = "") {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  try {
    await db.execute(`ALTER TABLE wa_message_logs ADD COLUMN appt_id TEXT NOT NULL DEFAULT ''`).catch(() => {});
    await db.execute({
      sql: `INSERT OR REPLACE INTO wa_message_logs
              (id, user_id, timestamp, type, client_name, phone, status, template_id, error_message, appt_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'direct', ?, ?)`,
      args: [id, userId, new Date().toISOString(), kind === "groupalert" ? "newbooking" : "confirmation", clientName, phone, status, error ?? "", apptId],
    });
  } catch { /* non-critical */ }
}

interface PosReceiptRow {
  id: string;
  userId: string;
  invoiceId: string;
  phone: string;
  clientName: string;
  invoice: SalonInvoice;
  salon: { name: string; phone?: string; email?: string; address?: string; logo?: string };
  thankYouText: string;
  scheduledAt: string;
  attempts: number;
}

async function getDuePosReceipts(): Promise<PosReceiptRow[]> {
  const result = await db.execute({
    sql: `SELECT id, user_id, invoice_id, phone, client_name, invoice_json, salon_json, thank_you_text, scheduled_at, attempts
          FROM wa_pos_receipt_queue
          WHERE status = 'pending' AND scheduled_at <= ? AND attempts < ?
          ORDER BY scheduled_at ASC
          LIMIT ?`,
    args: [new Date().toISOString(), MAX_ATTEMPTS, BATCH_LIMIT],
  });
  return result.rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    invoiceId: r.invoice_id as string,
    phone: r.phone as string,
    clientName: r.client_name as string,
    invoice: JSON.parse(r.invoice_json as string) as SalonInvoice,
    salon: JSON.parse(r.salon_json as string) as PosReceiptRow["salon"],
    thankYouText: (r.thank_you_text as string) || "",
    scheduledAt: r.scheduled_at as string,
    attempts: Number(r.attempts ?? 0),
  }));
}

async function updatePosReceipt(item: PosReceiptRow, status: "sent" | "pending" | "expired", error?: string) {
  await db.execute({
    sql: `UPDATE wa_pos_receipt_queue
          SET status = ?, attempts = ?, last_error = ?, sent_at = ?
          WHERE user_id = ? AND invoice_id = ?`,
    args: [
      status, item.attempts + 1, error ?? null,
      status === "sent" ? new Date().toISOString() : null,
      item.userId, item.invoiceId,
    ],
  });
}

function providerFromSettings(settings: Record<string, unknown> | null): WhatsAppProviderConfig & WhatsAppSafetyConfig {
  const wasender = (settings?.wasender ?? {}) as Record<string, unknown>;
  return {
    ...(wasender as WhatsAppSafetyConfig),
    provider: (wasender.provider as WhatsAppProviderConfig["provider"]) || "wasender",
    apiKey: wasender.apiKey as string | undefined,
    botSailorApiToken: wasender.botSailorApiToken as string | undefined,
    botSailorPhoneNumberId: wasender.botSailorPhoneNumberId as string | undefined,
    zaptickApiKey: wasender.zaptickApiKey as string | undefined,
  };
}

async function getSettings(userId: string, cache: Map<string, Record<string, unknown> | null>) {
  if (!cache.has(userId)) {
    const row = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [`${userId}_settings`],
    });
    cache.set(userId, row.rows.length > 0 ? JSON.parse(row.rows[0].data as string) : null);
  }
  return cache.get(userId) ?? null;
}

async function runBookingQueueCron(): Promise<{ sent: number; failed: number; skipped: number; expired: number; posSent: number; posFailed: number; posExpired: number }> {
  const items = await getDueItems();
  let sent = 0, failed = 0, skipped = 0, expired = 0, posSent = 0, posFailed = 0, posExpired = 0;
  const settingsCache = new Map<string, Record<string, unknown> | null>();

  for (const item of items) {
    if (Date.now() - new Date(item.scheduledAt).getTime() > EXPIRE_AFTER_MS) {
      await updateItem(item, "expired", "Expired before the queue could drain — too stale to send.");
      expired++;
      continue;
    }

    // Confirmations are informational ("your booking is confirmed") — once the
    // appointment's own start time has passed, confirming it is no longer useful.
    // The group alert isn't checked here: a late "someone booked X" heads-up to
    // the salon is still relevant even after the appointment started.
    if (item.kind === "confirmation" && item.apptDate && item.apptTime
        && new Date(`${item.apptDate}T${item.apptTime}:00`) < new Date()) {
      await updateItem(item, "expired", "Appointment time already passed — confirmation skipped.");
      expired++;
      continue;
    }

    const settings = await getSettings(item.userId, settingsCache);

    // Master "WhatsApp Automation" toggle — if it got switched off during the
    // wait, leave the item pending (don't burn an attempt) so it can still send
    // once re-enabled, without logging anything while automation is off.
    if (settings?.wasender && (settings.wasender as { enabled?: boolean }).enabled === false) {
      skipped++;
      continue;
    }
    if (item.kind === "confirmation" && await hasSentConfirmation(item.userId, item.id)) {
      await updateItem(item, "sent");
      skipped++;
      continue;
    }

    const providerConfig = providerFromSettings(settings);

    const result = await sendWhatsAppMessage(
      providerConfig, item.phone, item.text,
      { messageType: item.kind === "groupalert" ? "manual" : "confirmation" },
    );
    if (result.skipped) {
      await updateItem(item, "expired", "Skipped fake/placeholder recipient.");
      skipped++;
      continue;
    }
    await logMessage(item.userId, item.kind, item.clientName, item.phone, result.ok ? "sent" : "failed", result.errorReason, item.kind === "confirmation" ? item.id : "");

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

  const posItems = await getDuePosReceipts();
  for (const item of posItems) {
    if (Date.now() - new Date(item.scheduledAt).getTime() > EXPIRE_AFTER_MS) {
      await updatePosReceipt(item, "expired", "Expired before the queue could drain — too stale to send.");
      posExpired++;
      continue;
    }

    const settings = await getSettings(item.userId, settingsCache);
    if (settings?.wasender && (settings.wasender as { enabled?: boolean }).enabled === false) {
      skipped++;
      continue;
    }

    const providerConfig = providerFromSettings(settings);
    if (!activeWhatsAppCredential(providerConfig)) {
      await updatePosReceipt(item, "pending", "WhatsApp provider credentials are not configured.");
      posFailed++;
      continue;
    }
    if (isFakePlaceholderPhone(item.phone)) {
      await updatePosReceipt(item, "expired", "Skipped fake/placeholder recipient.");
      skipped++;
      continue;
    }

    const safety = checkWhatsAppSafety({ phone: item.phone, intent: "utility", config: providerConfig });
    if (!safety.ok) {
      await updatePosReceipt(item, item.attempts + 1 >= MAX_ATTEMPTS ? "expired" : "pending", safety.error);
      await logMessage(item.userId, "invoice", item.clientName, item.phone, "failed", safety.error);
      posFailed++;
      continue;
    }

    const result = await sendSalonInvoiceWhatsApp({
      invoice: item.invoice,
      salon: item.salon,
      phone: item.phone,
      providerConfig,
      thankYouText: item.thankYouText,
    });
    if (result.skipped) {
      await updatePosReceipt(item, "expired", "Skipped fake/placeholder recipient.");
      skipped++;
      continue;
    }
    await logMessage(item.userId, "invoice", item.clientName, item.phone, result.ok ? "sent" : "failed", result.error);

    if (result.ok) {
      recordWhatsAppSafetySend({ phone: item.phone, config: providerConfig });
      await updatePosReceipt(item, "sent");
      posSent++;
    } else if (item.attempts + 1 >= MAX_ATTEMPTS) {
      await updatePosReceipt(item, "expired", result.error);
      posFailed++;
    } else {
      await updatePosReceipt(item, "pending", result.error);
      posFailed++;
    }
  }

  return { sent, failed, skipped, expired, posSent, posFailed, posExpired };
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
