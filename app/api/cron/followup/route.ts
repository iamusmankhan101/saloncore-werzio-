/**
 * /api/cron/followup
 *
 * Runs daily at 06:00 UTC (11:00 PKT).
 * Queues follow-up WhatsApp messages for appointments completed yesterday.
 * The paced /api/cron/booking-queue drain sends the rows later, one at a time.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { activeWhatsAppCredential, type WhatsAppProviderConfig } from "@/lib/whatsapp-provider";

const MINUTE_MS = 60 * 1000;

function followupSpacingMs() {
  return Math.round(25 * MINUTE_MS + Math.random() * 5 * MINUTE_MS);
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "92" + digits.slice(1);
  else if (digits.length === 10 && digits.startsWith("3")) digits = "92" + digits;
  return digits;
}

async function ensureTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wa_followup_sent (
      user_id TEXT NOT NULL,
      appt_id TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      PRIMARY KEY (user_id, appt_id)
    )
  `);
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
      appt_id       TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (user_id, id)
    )
  `);
  await db.execute(`ALTER TABLE wa_message_logs ADD COLUMN appt_id TEXT NOT NULL DEFAULT ''`).catch(() => {});
}

async function alreadySent(userId: string, apptId: string): Promise<boolean> {
  const legacyResult = await db.execute({
    sql: "SELECT 1 FROM wa_followup_sent WHERE user_id = ? AND appt_id = ?",
    args: [userId, apptId],
  });
  if (legacyResult.rows.length > 0) return true;
  const logResult = await db.execute({
    sql: "SELECT 1 FROM wa_message_logs WHERE user_id = ? AND appt_id = ? AND type = 'followup' AND status = 'sent' LIMIT 1",
    args: [userId, apptId],
  });
  return logResult.rows.length > 0;
}

async function alreadyQueued(userId: string, apptId: string): Promise<boolean> {
  const result = await db.execute({
    sql: "SELECT 1 FROM wa_booking_send_queue WHERE user_id = ? AND id = ? AND status IN ('pending', 'sent') LIMIT 1",
    args: [userId, `followup_${apptId}`],
  });
  return result.rows.length > 0;
}

async function queueFollowup(input: {
  userId: string;
  appt: Appointment;
  phone: string;
  text: string;
  scheduledAt: string;
}) {
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT OR IGNORE INTO wa_booking_send_queue
            (id, user_id, kind, phone, text, client_name, appt_date, appt_time, scheduled_at, status, attempts, created_at)
          VALUES (?, ?, 'followup', ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
    args: [
      `followup_${input.appt.id}`,
      input.userId,
      input.phone,
      input.text,
      input.appt.clientName,
      input.appt.date,
      input.appt.startTime,
      input.scheduledAt,
      now,
    ],
  });
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function to12h(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${mStr ?? "00"} ${suffix}`;
}

interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  serviceNames: string[];
  date: string;
  startTime: string;
  endTime?: string;
  status: string;
  totalAmount: number;
}

interface Client { id: string; phone: string; name: string; }

async function runFollowupCron() {
  const now = new Date();
  const dueLookbackMs = 36 * 60 * MINUTE_MS;

  let queued = 0, skipped = 0;
  let scheduleDelayMs = 0;

  // Get all users with followup enabled
  const settingsRows = await db.execute(
    "SELECT entity, data FROM salon_data WHERE entity LIKE '%_settings'"
  );

  for (const row of settingsRows.rows) {
    try {
      const userId = (row.entity as string).replace(/_settings$/, "");
      const s = JSON.parse(row.data as string);

      const providerConfig: WhatsAppProviderConfig = {
        provider: s?.wasender?.provider || "wasender",
        apiKey: s?.wasender?.apiKey,
        botSailorApiToken: s?.wasender?.botSailorApiToken,
        botSailorPhoneNumberId: s?.wasender?.botSailorPhoneNumberId,
        zaptickApiKey: s?.wasender?.zaptickApiKey,
      };
      const autoFollowup = s?.wasender?.autoFollowup;
      const rawFollowupDelayMinutes = Number(s?.wasender?.followupDelayMinutes ?? 1440);
      const followupDelayMinutes = Number.isFinite(rawFollowupDelayMinutes) ? rawFollowupDelayMinutes : 1440;
      const template     = s?.whatsapp?.followup;
      const salonName    = s?.salon?.name || "Your Salon";

      // Master "WhatsApp Automation" toggle in Account settings — when off, all
      // automated sends (and their log entries) must stop, not just autoFollowup.
      if (s?.wasender?.enabled === false) continue;
      if (!activeWhatsAppCredential(providerConfig) || !autoFollowup || !template) continue;

      // Load appointments
      const apptRow = await db.execute({
        sql: "SELECT data FROM salon_data WHERE entity = ?",
        args: [`${userId}_appointments`],
      });
      if (apptRow.rows.length === 0) continue;

      const appointments: Appointment[] = JSON.parse(apptRow.rows[0].data as string);
      const clientsRow = await db.execute({
        sql: "SELECT data FROM salon_data WHERE entity = ?",
        args: [`${userId}_clients`],
      });
      const clients: Client[] = clientsRow.rows.length > 0
        ? JSON.parse(clientsRow.rows[0].data as string)
        : [];

      const eligible = appointments.filter((appt) => {
        if (appt.status !== "completed") return false;
        const completedAt = new Date(`${appt.date}T${appt.endTime || appt.startTime}:00`);
        const dueAt = new Date(completedAt.getTime() + followupDelayMinutes * MINUTE_MS);
        return dueAt <= now && now.getTime() - dueAt.getTime() <= dueLookbackMs;
      });
      const queuedPhones = new Set<string>();

      for (const appt of eligible) {
        if (await alreadySent(userId, appt.id)) { skipped++; continue; }
        if (await alreadyQueued(userId, appt.id)) { skipped++; continue; }

        // Resolve phone: try appt.clientPhone first, then look up in clients
        let rawPhone = appt.clientPhone || "";
        if (!rawPhone && appt.clientId) {
          rawPhone = clients.find((c) => c.id === appt.clientId)?.phone || "";
        }
        const phone = normalizePhone(rawPhone);
        if (!phone) { skipped++; continue; }
        if (queuedPhones.has(phone)) { skipped++; continue; }

        const text = fillTemplate(template, {
          name:       appt.clientName,
          service:    appt.serviceNames[0] || "",
          date:       appt.date,
          time:       to12h(appt.startTime),
          salon_name: salonName,
        });

        scheduleDelayMs += followupSpacingMs();
        await queueFollowup({
          userId,
          appt,
          phone,
          text,
          scheduledAt: new Date(Date.now() + scheduleDelayMs).toISOString(),
        });
        queuedPhones.add(phone);
        queued++;
      }
    } catch (e) {
      console.error("[followup] error for row:", row.entity, e);
    }
  }

  return { queued, skipped };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    await ensureTables();
    const result = await runFollowupCron();
    console.log("[followup] cron complete:", result);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("[followup] cron error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
