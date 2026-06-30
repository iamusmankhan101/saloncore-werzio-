/**
 * /api/cron/birthday
 *
 * Runs 4 times daily on Vercel Hobby, spaced 120 minutes apart
 * (04:00, 06:00, 08:00, 10:00 UTC). Each salon is processed only when currently
 * open according to its saved business hours and timezone. For true every-10-minute
 * background queue draining, deploy on a Vercel plan that supports per-minute cron.
 * For every salon that has birthday reminders enabled:
 *   1. Loads their clients from Turso (salon_data table)
 *   2. Finds clients whose birthday is today (month+day match)
 *   3. Enqueues each birthday message at a random time across a 4-hour window
 *   4. Sends only due queued messages, one per cron tick, to avoid back-to-back sends.
 *      Queued messages continue sending even if the salon closes before the spread window ends.
 *   5. Logs to wa_message_logs and records in birthday_sent to prevent duplicates
 *
 * Secured with Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { activeWhatsAppCredential, sendWhatsAppMessage, type WhatsAppProviderConfig } from "@/lib/whatsapp-provider";
import { checkWhatsAppSafety, recordWhatsAppSafetySend, type WhatsAppSafetyConfig } from "@/lib/whatsapp-safety";

const BIRTHDAY_SPREAD_WINDOW_MS = 4 * 60 * 60 * 1000;
const BIRTHDAY_SEND_BATCH_LIMIT = 1;
const BIRTHDAY_MAX_ATTEMPTS = 5;

interface BusinessHour {
  day: string;
  open: boolean;
  from: string;
  to: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function ensureTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS birthday_sent (
      user_id   TEXT NOT NULL,
      client_id TEXT NOT NULL,
      year      TEXT NOT NULL,
      sent_at   TEXT NOT NULL,
      PRIMARY KEY (user_id, client_id, year)
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS birthday_message_queue (
      user_id     TEXT NOT NULL,
      client_id   TEXT NOT NULL,
      year        TEXT NOT NULL,
      client_name TEXT NOT NULL,
      phone       TEXT NOT NULL,
      text        TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      attempts    INTEGER NOT NULL DEFAULT 0,
      last_error  TEXT,
      created_at  TEXT NOT NULL,
      sent_at     TEXT,
      PRIMARY KEY (user_id, client_id, year)
    )
  `);
  // wa_birthday_settings and wa_message_logs created by their own routes on first use
}

interface BirthdayUser {
  userId: string;
  discount: string;
  providerConfig: WhatsAppProviderConfig & WhatsAppSafetyConfig;
  birthdayTemplate: string;
  salonName: string;
  timezone: string;
  hours: BusinessHour[];
}

const DEFAULT_HOURS: BusinessHour[] = [
  { day: "Monday",    open: true,  from: "09:00", to: "20:00" },
  { day: "Tuesday",   open: true,  from: "09:00", to: "20:00" },
  { day: "Wednesday", open: true,  from: "09:00", to: "20:00" },
  { day: "Thursday",  open: true,  from: "09:00", to: "20:00" },
  { day: "Friday",    open: true,  from: "09:00", to: "20:00" },
  { day: "Saturday",  open: true,  from: "10:00", to: "18:00" },
  { day: "Sunday",    open: false, from: "10:00", to: "18:00" },
];

function zonedParts(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour") || "0"),
    minute: Number(get("minute") || "0"),
  };
}

function minutesFromTime(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function isSalonOpen(user: BirthdayUser) {
  const parts = zonedParts(user.timezone);
  const todayHours = user.hours.find((hour) => hour.day === parts.weekday);
  if (!todayHours?.open) return false;
  const nowMin = parts.hour * 60 + parts.minute;
  const from = minutesFromTime(todayHours.from);
  const to = minutesFromTime(todayHours.to);
  if (from === to) return true;
  if (from < to) return nowMin >= from && nowMin <= to;
  return nowMin >= from || nowMin <= to;
}

function salonToday(user: BirthdayUser) {
  const parts = zonedParts(user.timezone);
  return {
    year: parts.year,
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

/**
 * Scan salon_data for every salon that has autoBirthday enabled.
 * This avoids the wa_birthday_settings pre-registration requirement —
 * settings saved via the app are sufficient to trigger birthday messages.
 */
async function getAllBirthdayUsers(): Promise<BirthdayUser[]> {
  const users: BirthdayUser[] = [];
  try {
    // Pull all settings rows — entity format is "{userId}_settings"
    const result = await db.execute(
      "SELECT entity, data FROM salon_data WHERE entity LIKE '%_settings'",
    );
    for (const row of result.rows) {
      try {
        const entity = row.entity as string;
        const userId = entity.replace(/_settings$/, "");
        const s = JSON.parse(row.data as string);

        const autoBirthday = s?.birthday?.autoBirthday;
        const providerConfig: WhatsAppProviderConfig & WhatsAppSafetyConfig = { ...(s?.wasender ?? {}), provider: s?.wasender?.provider || "wasender" };
        const template     = s?.whatsapp?.birthday;

        if (!autoBirthday || !activeWhatsAppCredential(providerConfig) || !template) continue;

        users.push({
          userId,
          discount:        s?.birthday?.birthdayDiscount || "a special treat",
          providerConfig,
          birthdayTemplate: template,
          salonName:        s?.salon?.name || "Your Salon",
          timezone:         s?.salon?.timezone || s?.wasender?.quietHoursTimezone || "Asia/Karachi",
          hours:            Array.isArray(s?.hours) ? s.hours : DEFAULT_HOURS,
        });
      } catch { /* skip malformed row */ }
    }
  } catch { /* table may not exist yet */ }
  return users;
}

async function getClients(userId: string): Promise<{ id: string; name: string; phone: string; dob?: string }[]> {
  try {
    const result = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [`${userId}_clients`],
    });
    if (result.rows.length === 0) return [];
    const raw = JSON.parse(result.rows[0].data as string);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function alreadySent(userId: string, clientId: string, year: string): Promise<boolean> {
  const result = await db.execute({
    sql: "SELECT 1 FROM birthday_sent WHERE user_id = ? AND client_id = ? AND year = ?",
    args: [userId, clientId, year],
  });
  return result.rows.length > 0;
}

async function markSent(userId: string, clientId: string, year: string) {
  await db.execute({
    sql: "INSERT OR IGNORE INTO birthday_sent (user_id, client_id, year, sent_at) VALUES (?, ?, ?, ?)",
    args: [userId, clientId, year, new Date().toISOString()],
  });
}

function randomScheduledAt(index: number, total: number, baseTime = Date.now()): string {
  const safeTotal = Math.max(1, total);
  const slotMs = BIRTHDAY_SPREAD_WINDOW_MS / safeTotal;
  const offsetMs = Math.floor(index * slotMs + Math.random() * slotMs);
  return new Date(baseTime + offsetMs).toISOString();
}

async function queueBirthdayMessage(input: {
  userId: string;
  clientId: string;
  year: string;
  clientName: string;
  phone: string;
  text: string;
  scheduledAt: string;
}) {
  await db.execute({
    sql: `INSERT OR IGNORE INTO birthday_message_queue
            (user_id, client_id, year, client_name, phone, text, scheduled_at, status, attempts, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
    args: [
      input.userId,
      input.clientId,
      input.year,
      input.clientName,
      input.phone,
      input.text,
      input.scheduledAt,
      new Date().toISOString(),
    ],
  });
}

async function queuedAlready(userId: string, clientId: string, year: string): Promise<boolean> {
  const result = await db.execute({
    sql: "SELECT 1 FROM birthday_message_queue WHERE user_id = ? AND client_id = ? AND year = ?",
    args: [userId, clientId, year],
  });
  return result.rows.length > 0;
}

async function logMessage(
  userId: string,
  clientName: string,
  phone: string,
  templateName: string,
  status: "sent" | "failed",
) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  try {
    await db.execute({
      sql: `INSERT OR REPLACE INTO wa_message_logs
              (id, user_id, timestamp, type, client_name, phone, status, template_id)
            VALUES (?, ?, ?, 'birthday', ?, ?, ?, ?)`,
      args: [id, userId, new Date().toISOString(), clientName, phone, status, templateName],
    });
  } catch {
    // non-critical — don't crash the cron
  }
}

// ─── WhatsApp send ────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "92" + digits.slice(1);
  else if (digits.length === 10 && digits.startsWith("3")) digits = "92" + digits;
  return digits;
}

async function sendBirthdayMessage(
  phone: string,
  providerConfig: WhatsAppProviderConfig & WhatsAppSafetyConfig,
  text: string,
): Promise<boolean> {
  try {
    const safety = checkWhatsAppSafety({ phone, intent: "marketing", config: providerConfig });
    if (!safety.ok) throw new Error(safety.error);
    const result = await sendWhatsAppMessage(providerConfig, phone, text);
    if (result.ok) recordWhatsAppSafetySend({ phone, config: providerConfig });
    return result.ok;
  } catch {
    return false;
  }
}

// ─── Birthday check ───────────────────────────────────────────────────────────

function isBirthdayToday(dob: string, user: BirthdayUser): boolean {
  // dob is stored as "YYYY-MM-DD"
  const today = salonToday(user);
  const [, month, day] = dob.split("-");
  return (
    parseInt(month, 10) === today.month &&
    parseInt(day, 10) === today.day
  );
}

// ─── Main run ─────────────────────────────────────────────────────────────────

async function enqueueTodaysBirthdays(): Promise<{ checked: number; queued: number; skipped: number }> {
  const users = await getAllBirthdayUsers();

  let checked = 0;
  let queued = 0;
  let skipped = 0;

  for (const user of users) {
    if (!isSalonOpen(user)) continue;
    const year = salonToday(user).year;
    const clients = await getClients(user.userId);
    const birthdayClients = clients.filter((client) => client.dob && client.phone && isBirthdayToday(client.dob, user));
    let scheduleIndex = 0;

    for (const client of birthdayClients) {
      checked++;
      const phone = normalizePhone(client.phone);
      if (!phone) continue;

      // Skip if already sent this year
      if (await alreadySent(user.userId, client.id, year)) {
        skipped++;
        console.log(`[birthday] already sent ${year} → ${client.name} (${user.userId})`);
        continue;
      }
      if (await queuedAlready(user.userId, client.id, year)) {
        skipped++;
        continue;
      }

      const text = user.birthdayTemplate
        .replace(/\{\{name\}\}/g, client.name)
        .replace(/\{\{salon_name\}\}/g, user.salonName)
        .replace(/\{\{discount\}\}/g, user.discount || "a special treat");

      await queueBirthdayMessage({
        userId: user.userId,
        clientId: client.id,
        year,
        clientName: client.name,
        phone,
        text,
        scheduledAt: randomScheduledAt(scheduleIndex, birthdayClients.length),
      });
      scheduleIndex++;
      queued++;
    }
  }

  return { checked, queued, skipped };
}

async function getDueBirthdayQueueItems(limit: number): Promise<Array<{
  userId: string;
  clientId: string;
  year: string;
  clientName: string;
  phone: string;
  text: string;
  attempts: number;
}>> {
  const result = await db.execute({
    sql: `SELECT user_id, client_id, year, client_name, phone, text, attempts
          FROM birthday_message_queue
          WHERE status = 'pending'
            AND scheduled_at <= ?
            AND attempts < ?
          ORDER BY scheduled_at ASC
          LIMIT ?`,
    args: [new Date().toISOString(), BIRTHDAY_MAX_ATTEMPTS, limit],
  });
  return result.rows.map((row) => ({
    userId: row.user_id as string,
    clientId: row.client_id as string,
    year: row.year as string,
    clientName: row.client_name as string,
    phone: row.phone as string,
    text: row.text as string,
    attempts: Number(row.attempts ?? 0),
  }));
}

async function updateQueueAttempt(input: {
  userId: string;
  clientId: string;
  year: string;
  ok: boolean;
  attempts: number;
  error?: string;
}) {
  await db.execute({
    sql: `UPDATE birthday_message_queue
          SET status = ?, attempts = ?, last_error = ?, sent_at = ?
          WHERE user_id = ? AND client_id = ? AND year = ?`,
    args: [
      input.ok ? "sent" : input.attempts + 1 >= BIRTHDAY_MAX_ATTEMPTS ? "failed" : "pending",
      input.attempts + 1,
      input.error ?? null,
      input.ok ? new Date().toISOString() : null,
      input.userId,
      input.clientId,
      input.year,
    ],
  });
}

async function processDueBirthdayMessages(): Promise<{ sent: number; failed: number; deferred: number }> {
  const users = await getAllBirthdayUsers();
  const userById = new Map(users.map((user) => [user.userId, user]));
  const dueItems = await getDueBirthdayQueueItems(BIRTHDAY_SEND_BATCH_LIMIT);

  let sent = 0;
  let failed = 0;
  let deferred = 0;

  for (const item of dueItems) {
    const user = userById.get(item.userId);
    if (!user) {
      await updateQueueAttempt({ ...item, ok: false, error: "Birthday settings or WhatsApp credentials are no longer available." });
      failed++;
      continue;
    }
    if (await alreadySent(item.userId, item.clientId, item.year)) {
      await updateQueueAttempt({ ...item, ok: true });
      deferred++;
      continue;
    }

    const ok = await sendBirthdayMessage(item.phone, user.providerConfig, item.text);
    await logMessage(item.userId, item.clientName, item.phone, "birthday", ok ? "sent" : "failed");

    if (ok) {
      await markSent(item.userId, item.clientId, item.year);
      await updateQueueAttempt({ ...item, ok: true });
      sent++;
      console.log(`[birthday] ✓ sent queued birthday → ${item.clientName} (${item.phone})`);
    } else {
      await updateQueueAttempt({ ...item, ok: false, error: "WhatsApp send failed or was blocked by safety guard." });
      failed++;
      console.log(`[birthday] ✗ failed queued birthday → ${item.clientName} (${item.phone})`);
    }
  }

  return { sent, failed, deferred };
}

async function runBirthdayCron(): Promise<{ checked: number; queued: number; sent: number; failed: number; skipped: number; deferred: number }> {
  const enqueueResult = await enqueueTodaysBirthdays();
  const sendResult = await processDueBirthdayMessages();
  return { ...enqueueResult, ...sendResult };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTables();
    const result = await runBirthdayCron();
    console.log(`[birthday] cron complete:`, result);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("[birthday] cron error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
