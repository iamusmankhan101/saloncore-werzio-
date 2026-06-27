/**
 * /api/cron/followup
 *
 * Runs daily at 06:00 UTC (11:00 PKT).
 * Sends follow-up WhatsApp messages for appointments completed yesterday.
 * This is the server-side equivalent of the client-side followup queue so
 * messages go out even when the dashboard is not open.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";

const WASENDER_URL = "https://www.wasenderapi.com/api/send-message";

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
}

async function alreadySent(userId: string, apptId: string): Promise<boolean> {
  const result = await db.execute({
    sql: "SELECT 1 FROM wa_followup_sent WHERE user_id = ? AND appt_id = ?",
    args: [userId, apptId],
  });
  return result.rows.length > 0;
}

async function markSent(userId: string, apptId: string) {
  await db.execute({
    sql: "INSERT OR IGNORE INTO wa_followup_sent (user_id, appt_id, sent_at) VALUES (?, ?, ?)",
    args: [userId, apptId, new Date().toISOString()],
  });
}

async function sendMessage(phone: string, apiKey: string, text: string): Promise<boolean> {
  const to = phone.startsWith("+") ? phone : `+${phone}`;
  try {
    const res = await fetch(WASENDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ to, text }),
    });
    const data = await res.json() as { success?: boolean };
    return res.ok && data.success === true;
  } catch { return false; }
}

async function logMessage(userId: string, clientName: string, phone: string, status: "sent" | "failed") {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  try {
    await db.execute({
      sql: `INSERT OR REPLACE INTO wa_message_logs
              (id, user_id, timestamp, type, client_name, phone, status, template_id)
            VALUES (?, ?, ?, 'followup', ?, ?, ?, 'followup')`,
      args: [id, userId, new Date().toISOString(), clientName, phone, status],
    });
  } catch { /* non-critical */ }
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
  status: string;
  totalAmount: number;
}

interface Client { id: string; phone: string; name: string; }

async function runFollowupCron() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  // Also catch the day before yesterday in case the cron ran late
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);

  let sent = 0, failed = 0, skipped = 0;

  // Get all users with followup enabled
  const settingsRows = await db.execute(
    "SELECT entity, data FROM salon_data WHERE entity LIKE '%_settings'"
  );

  for (const row of settingsRows.rows) {
    try {
      const userId = (row.entity as string).replace(/_settings$/, "");
      const s = JSON.parse(row.data as string);

      const apiKey       = s?.wasender?.apiKey;
      const autoFollowup = s?.wasender?.autoFollowup;
      const template     = s?.whatsapp?.followup;
      const salonName    = s?.salon?.name || "Your Salon";

      if (!apiKey || !autoFollowup || !template) continue;

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

      const eligible = appointments.filter(
        (a) => a.status === "completed" &&
          (a.date === yesterdayStr || a.date === twoDaysAgoStr)
      );

      for (const appt of eligible) {
        if (await alreadySent(userId, appt.id)) { skipped++; continue; }

        // Resolve phone: try appt.clientPhone first, then look up in clients
        let rawPhone = appt.clientPhone || "";
        if (!rawPhone && appt.clientId) {
          rawPhone = clients.find((c) => c.id === appt.clientId)?.phone || "";
        }
        const phone = normalizePhone(rawPhone);
        if (!phone) { skipped++; continue; }

        const text = fillTemplate(template, {
          name:       appt.clientName,
          service:    appt.serviceNames[0] || "",
          date:       appt.date,
          time:       to12h(appt.startTime),
          salon_name: salonName,
        });

        const ok = await sendMessage(phone, apiKey, text);
        await logMessage(userId, appt.clientName, phone, ok ? "sent" : "failed");
        if (ok) { await markSent(userId, appt.id); sent++; }
        else failed++;
      }
    } catch (e) {
      console.error("[followup] error for row:", row.entity, e);
    }
  }

  return { sent, failed, skipped };
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
