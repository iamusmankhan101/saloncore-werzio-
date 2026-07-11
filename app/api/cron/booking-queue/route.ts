/**
 * /api/cron/booking-queue
 *
 * Drains wa_booking_send_queue — automated appointment/customer WhatsApp sends
 * queued by the app with a 5-7 min scheduled_at
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
import { checkWhatsAppSafety, recordWhatsAppSafetySend, type WhatsAppMessageIntent, type WhatsAppSafetyConfig } from "@/lib/whatsapp-safety";
import { appointmentStartHasPassed, timezoneFromSettings } from "@/lib/appointment-time";

const BATCH_LIMIT = 50;
const SEND_LIMIT_PER_RUN = 1;
const MAX_ATTEMPTS = 5;
// If the cron hasn't run in a long time (e.g. stuck on Hobby's once-daily
// schedule), don't fire off a burst of hours-old booking confirmations —
// mirrors the same "don't send stale automated messages" fix applied to the
// dashboard's own confirmation queue.
const EXPIRE_AFTER_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

function randBetween(minMs: number, maxMs: number): number {
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}

function spacingDelayMs(kind: QueueKind): number {
  if (kind === "followup") return randBetween(25 * MINUTE_MS, 30 * MINUTE_MS);
  if (kind === "reminder") return randBetween(10 * MINUTE_MS, 20 * MINUTE_MS);
  if (kind === "cancellation") return randBetween(15 * MINUTE_MS, 20 * MINUTE_MS);
  if (kind === "birthday") return randBetween(20 * MINUTE_MS, 30 * MINUTE_MS);
  return randBetween(5 * MINUTE_MS, 7 * MINUTE_MS);
}

function retryDelayMs(kind: QueueKind): number {
  if (kind === "followup") return randBetween(45 * MINUTE_MS, 75 * MINUTE_MS);
  return randBetween(30 * MINUTE_MS, 60 * MINUTE_MS);
}

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
  await db.execute(`ALTER TABLE wa_booking_send_queue ADD COLUMN service TEXT`).catch(() => {});
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
  await db.execute(`ALTER TABLE wa_message_logs ADD COLUMN appt_date TEXT NOT NULL DEFAULT ''`).catch(() => {});
  await db.execute(`ALTER TABLE wa_message_logs ADD COLUMN service TEXT NOT NULL DEFAULT ''`).catch(() => {});
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

type QueueKind = "confirmation" | "groupalert" | "followup" | "cancellation" | "reminder" | "birthday" | "lowstock" | "manual";
type LogKind = QueueKind | "invoice";

interface QueueRow {
  id: string;
  userId: string;
  kind: QueueKind;
  phone: string;
  text: string;
  clientName: string;
  apptDate: string | null;
  apptTime: string | null;
  service: string | null;
  scheduledAt: string;
  attempts: number;
}

async function getDueItems(): Promise<QueueRow[]> {
  const result = await db.execute({
    sql: `SELECT id, user_id, kind, phone, text, client_name, appt_date, appt_time, service, scheduled_at, attempts
          FROM wa_booking_send_queue
          WHERE status = 'pending' AND scheduled_at <= ? AND attempts < ?
          ORDER BY scheduled_at ASC
          LIMIT ?`,
    args: [new Date().toISOString(), MAX_ATTEMPTS, BATCH_LIMIT],
  });
  return result.rows.map((r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    kind: r.kind as QueueKind,
    phone: r.phone as string,
    text: r.text as string,
    clientName: r.client_name as string,
    apptDate: (r.appt_date as string) ?? null,
    apptTime: (r.appt_time as string) ?? null,
    service: (r.service as string) ?? null,
    scheduledAt: r.scheduled_at as string,
    attempts: Number(r.attempts ?? 0),
  }));
}

async function updateItem(item: QueueRow, status: "sent" | "pending" | "expired", error?: string, nextScheduledAt?: string) {
  await db.execute({
    sql: `UPDATE wa_booking_send_queue
          SET status = ?, attempts = ?, last_error = ?, sent_at = ?, scheduled_at = COALESCE(?, scheduled_at)
          WHERE user_id = ? AND id = ?`,
    args: [
      status, item.attempts + 1, error ?? null,
      status === "sent" ? new Date().toISOString() : null,
      nextScheduledAt ?? null,
      item.userId, item.id,
    ],
  });
}

async function deferItem(item: QueueRow, delayMs: number, reason: string) {
  await db.execute({
    sql: `UPDATE wa_booking_send_queue
          SET scheduled_at = ?, last_error = ?
          WHERE user_id = ? AND id = ? AND status = 'pending'`,
    args: [
      new Date(Date.now() + delayMs).toISOString(),
      reason,
      item.userId,
      item.id,
    ],
  });
}

async function hasSentMessage(userId: string, logType: string, apptId: string): Promise<boolean> {
  if (!apptId) return false;
  try {
    await db.execute(`ALTER TABLE wa_message_logs ADD COLUMN appt_id TEXT NOT NULL DEFAULT ''`).catch(() => {});
    const result = await db.execute({
      sql: "SELECT 1 FROM wa_message_logs WHERE user_id = ? AND appt_id = ? AND type = ? AND status = 'sent' LIMIT 1",
      args: [userId, apptId, logType],
    });
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

// Guards against duplicate appointment records (or a client re-booked twice for
// the same visit) resulting in two confirmations/reminders/follow-ups for what
// is really the same client + service + date — the appt_id check above only
// catches a retry of the *same* appointment record, not a second, distinct one
// for the same visit.
async function hasSentForSameVisit(userId: string, logType: string, phone: string, apptDate: string | null, service: string | null): Promise<boolean> {
  if (!apptDate?.trim() || !service?.trim()) return false;
  try {
    const result = await db.execute({
      sql: "SELECT 1 FROM wa_message_logs WHERE user_id = ? AND phone = ? AND type = ? AND appt_date = ? AND service = ? AND status = 'sent' LIMIT 1",
      args: [userId, phone, logType, apptDate.trim(), service.trim()],
    });
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

function logTypeForKind(kind: LogKind): string {
  if (kind === "groupalert") return "newbooking";
  return kind;
}

function messageTypeForKind(kind: QueueKind): "reminder" | "confirmation" | "followup" | "cancellation" | "manual" | "birthday" {
  if (kind === "groupalert") return "manual";
  if (kind === "lowstock") return "manual";
  return kind;
}

function intentForKind(kind: QueueKind): WhatsAppMessageIntent {
  if (kind === "lowstock" || kind === "groupalert") return "internal";
  if (kind === "cancellation" || kind === "birthday") return "marketing";
  return "utility";
}

function autoSettingEnabled(settings: Record<string, unknown> | null, kind: QueueKind): boolean {
  const wasender = settings?.wasender as {
    autoConfirmation?: boolean;
    autoGroupBooking?: boolean;
    autoFollowup?: boolean;
    autoCancellation?: boolean;
    autoReminder?: boolean;
    autoLowStock?: boolean;
  } | undefined;
  if (kind === "confirmation") return wasender?.autoConfirmation !== false;
  if (kind === "groupalert") return wasender?.autoGroupBooking !== false;
  if (kind === "followup") return wasender?.autoFollowup !== false;
  if (kind === "cancellation") return wasender?.autoCancellation !== false;
  if (kind === "reminder") return wasender?.autoReminder !== false;
  if (kind === "lowstock") return wasender?.autoLowStock !== false;
  return true;
}

function apptIdForQueueItem(item: QueueRow): string {
  if (item.kind === "confirmation") return item.id;
  if (item.kind === "groupalert" && item.id.startsWith("newbooking_")) return item.id.slice("newbooking_".length);
  const prefix = `${item.kind}_`;
  return item.id.startsWith(prefix) ? item.id.slice(prefix.length) : "";
}

async function logMessage(userId: string, kind: LogKind, clientName: string, phone: string, status: "sent" | "failed", error?: string, apptId = "", apptDate = "", service = "") {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  try {
    await db.execute(`ALTER TABLE wa_message_logs ADD COLUMN appt_id TEXT NOT NULL DEFAULT ''`).catch(() => {});
    await db.execute({
      sql: `INSERT OR REPLACE INTO wa_message_logs
              (id, user_id, timestamp, type, client_name, phone, status, template_id, error_message, appt_id, appt_date, service)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'direct', ?, ?, ?, ?)`,
      args: [id, userId, new Date().toISOString(), logTypeForKind(kind), clientName, phone, status, error ?? "", apptId, apptDate, service],
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

async function deferPosReceipt(item: PosReceiptRow, delayMs: number, reason: string) {
  await db.execute({
    sql: `UPDATE wa_pos_receipt_queue
          SET scheduled_at = ?, last_error = ?
          WHERE user_id = ? AND invoice_id = ? AND status = 'pending'`,
    args: [
      new Date(Date.now() + delayMs).toISOString(),
      reason,
      item.userId,
      item.invoiceId,
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
  let sendAttemptsThisRun = 0;
  let deferredDelayMs = 0;
  const settingsCache = new Map<string, Record<string, unknown> | null>();

  for (const item of items) {
    if (Date.now() - new Date(item.scheduledAt).getTime() > EXPIRE_AFTER_MS) {
      await updateItem(item, "expired", "Expired before the queue could drain — too stale to send.");
      expired++;
      continue;
    }

    const settings = await getSettings(item.userId, settingsCache);

    // Confirmation/reminder messages are tied to the appointment start. Once that
    // time has passed in the salon's timezone, do not send them from a backlog.
    if ((item.kind === "confirmation" || item.kind === "reminder") && item.apptDate && item.apptTime
        && appointmentStartHasPassed(item.apptDate, item.apptTime, timezoneFromSettings(settings))) {
      await updateItem(item, "expired", "Appointment time already passed — queued message skipped.");
      expired++;
      continue;
    }

    // If automation or a specific message type is off when a due item is reached,
    // expire it instead of leaving a backlog that fires when the toggle is turned
    // on again later.
    if (settings?.wasender && (settings.wasender as { enabled?: boolean }).enabled === false) {
      await updateItem(item, "expired", "WhatsApp automation was disabled at the scheduled send time.");
      expired++;
      continue;
    }
    if (!autoSettingEnabled(settings, item.kind)) {
      await updateItem(item, "expired", `${logTypeForKind(item.kind)} automation was disabled at the scheduled send time.`);
      expired++;
      continue;
    }
    const apptId = apptIdForQueueItem(item);
    if (apptId && await hasSentMessage(item.userId, logTypeForKind(item.kind), apptId)) {
      await updateItem(item, "sent");
      skipped++;
      continue;
    }
    if ((item.kind === "confirmation" || item.kind === "reminder" || item.kind === "followup")
        && await hasSentForSameVisit(item.userId, logTypeForKind(item.kind), item.phone, item.apptDate, item.service)) {
      await updateItem(item, "sent");
      skipped++;
      continue;
    }

    const providerConfig = providerFromSettings(settings);
    if (sendAttemptsThisRun >= SEND_LIMIT_PER_RUN) {
      deferredDelayMs += spacingDelayMs(item.kind);
      await deferItem(item, deferredDelayMs, "Deferred to pace automated WhatsApp sends.");
      skipped++;
      continue;
    }

    const safety = checkWhatsAppSafety({ phone: item.phone, intent: intentForKind(item.kind), config: providerConfig });
    if (!safety.ok) {
      const retryAfterMs = "retryAfter" in safety && typeof safety.retryAfter === "number"
        ? safety.retryAfter * 1000
        : retryDelayMs(item.kind);
      await deferItem(item, retryAfterMs, safety.error ?? "WhatsApp safety check deferred this send.");
      skipped++;
      continue;
    }

    const result = await sendWhatsAppMessage(
      providerConfig, item.phone, item.text,
      { messageType: messageTypeForKind(item.kind) },
    );
    sendAttemptsThisRun++;
    if (result.skipped) {
      await updateItem(item, "expired", "Skipped fake/placeholder recipient.");
      skipped++;
      continue;
    }
    await logMessage(item.userId, item.kind, item.clientName, item.phone, result.ok ? "sent" : "failed", result.errorReason, apptId, item.apptDate ?? "", item.service ?? "");

    if (result.ok) {
      recordWhatsAppSafetySend({ phone: item.phone, config: providerConfig });
      await updateItem(item, "sent");
      sent++;
    } else if (item.attempts + 1 >= MAX_ATTEMPTS) {
      await updateItem(item, "expired", result.errorReason);
      failed++;
    } else {
      await updateItem(item, "pending", result.errorReason, new Date(Date.now() + retryDelayMs(item.kind)).toISOString());
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
      await deferPosReceipt(item, retryDelayMs("manual"), "WhatsApp provider credentials are not configured.");
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
      const retryAfterMs = "retryAfter" in safety && typeof safety.retryAfter === "number"
        ? safety.retryAfter * 1000
        : retryDelayMs("manual");
      await deferPosReceipt(item, retryAfterMs, safety.error ?? "WhatsApp safety check deferred this send.");
      skipped++;
      continue;
    }

    if (sendAttemptsThisRun >= SEND_LIMIT_PER_RUN) {
      deferredDelayMs += spacingDelayMs("manual");
      await deferPosReceipt(item, deferredDelayMs, "Deferred to pace automated WhatsApp sends.");
      skipped++;
      continue;
    }

    const result = await sendSalonInvoiceWhatsApp({
      invoice: item.invoice,
      salon: item.salon,
      phone: item.phone,
      providerConfig,
      thankYouText: item.thankYouText,
    });
    sendAttemptsThisRun++;
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
