/**
 * /api/cron/birthday
 *
 * Runs daily at 09:00 PKT (04:00 UTC) via Vercel Cron.
 * For every salon that has birthday reminders enabled:
 *   1. Loads their clients from Turso (salon_data table)
 *   2. Finds clients whose birthday is today (month+day match)
 *   3. Sends a WhatsApp template message via Meta API
 *   4. Logs to wa_message_logs and records in birthday_sent to prevent duplicates
 *
 * Secured with Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { activeWhatsAppCredential, sendWhatsAppMessage, type WhatsAppProviderConfig } from "@/lib/whatsapp-provider";

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
  // wa_birthday_settings and wa_message_logs created by their own routes on first use
}

interface BirthdayUser {
  userId: string;
  discount: string;
  providerConfig: WhatsAppProviderConfig;
  birthdayTemplate: string;
  salonName: string;
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
        const providerConfig: WhatsAppProviderConfig = {
          provider: s?.wasender?.provider || "wasender",
          apiKey: s?.wasender?.apiKey,
          botSailorApiToken: s?.wasender?.botSailorApiToken,
          botSailorPhoneNumberId: s?.wasender?.botSailorPhoneNumberId,
        };
        const template     = s?.whatsapp?.birthday;

        if (!autoBirthday || !activeWhatsAppCredential(providerConfig) || !template) continue;

        users.push({
          userId,
          discount:        s?.birthday?.birthdayDiscount || "a special treat",
          providerConfig,
          birthdayTemplate: template,
          salonName:        s?.salon?.name || "Your Salon",
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
  providerConfig: WhatsAppProviderConfig,
  text: string,
): Promise<boolean> {
  try {
    return (await sendWhatsAppMessage(providerConfig, phone, text)).ok;
  } catch {
    return false;
  }
}

// ─── Birthday check ───────────────────────────────────────────────────────────

function isBirthdayToday(dob: string): boolean {
  // dob is stored as "YYYY-MM-DD"
  const today = new Date();
  const [, month, day] = dob.split("-");
  return (
    parseInt(month, 10) === today.getMonth() + 1 &&
    parseInt(day, 10) === today.getDate()
  );
}

// ─── Main run ─────────────────────────────────────────────────────────────────

async function runBirthdayCron(): Promise<{ checked: number; sent: number; failed: number; skipped: number }> {
  const users = await getAllBirthdayUsers();
  const today = new Date();
  const year = String(today.getFullYear());

  let checked = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    const clients = await getClients(user.userId);

    for (const client of clients) {
      if (!client.dob || !client.phone) continue;
      if (!isBirthdayToday(client.dob)) continue;

      checked++;
      const phone = normalizePhone(client.phone);
      if (!phone) continue;

      // Skip if already sent this year
      if (await alreadySent(user.userId, client.id, year)) {
        skipped++;
        console.log(`[birthday] already sent ${year} → ${client.name} (${user.userId})`);
        continue;
      }

      const text = user.birthdayTemplate
        .replace(/\{\{name\}\}/g, client.name)
        .replace(/\{\{salon_name\}\}/g, user.salonName)
        .replace(/\{\{discount\}\}/g, user.discount || "a special treat");

      const ok = await sendBirthdayMessage(phone, user.providerConfig, text);
      await logMessage(user.userId, client.name, phone, "birthday", ok ? "sent" : "failed");

      if (ok) {
        await markSent(user.userId, client.id, year);
        sent++;
        console.log(`[birthday] ✓ sent → ${client.name} (${phone})`);
      } else {
        failed++;
        console.log(`[birthday] ✗ failed → ${client.name} (${phone})`);
      }
    }
  }

  return { checked, sent, failed, skipped };
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
