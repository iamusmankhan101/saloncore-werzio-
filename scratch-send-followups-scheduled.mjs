import { createClient } from "@libsql/client";
import fs from "fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const userId = "user_1782912586384_qfkvcow";

const settingsRow = await db.execute({ sql: "SELECT data FROM salon_data WHERE entity = ?", args: [`${userId}_settings`] });
const settings = JSON.parse(settingsRow.rows[0].data);
const apiKey = settings.wasender.apiKey;

// Target times in Asia/Karachi (UTC+5) today, 2026-07-19
const targets = [
  { atUTC: "2026-07-19T16:32:00.000Z", queueId: "followup_a_1784125725967", clientName: "Rizwana k block",   phone: "923414872182" },
  { atUTC: "2026-07-19T16:51:00.000Z", queueId: "followup_a_1784125818784", clientName: "Umme Ayesha",       phone: "923140816231" },
  { atUTC: "2026-07-19T17:03:00.000Z", queueId: "followup_a_1784120467551", clientName: "Anum Client",       phone: "923315111500" },
];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function sendOne(target) {
  const row = await db.execute({
    sql: "SELECT text, appt_date, appt_time, service FROM wa_booking_send_queue WHERE user_id = ? AND id = ?",
    args: [userId, target.queueId],
  });
  if (row.rows.length === 0) { console.log(`[skip] ${target.clientName} — queue row not found`); return; }
  const { text, appt_date, appt_time, service } = row.rows[0];

  const to = `+${target.phone}`;
  const res = await fetch("https://www.wasenderapi.com/api/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ to, text }),
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data.success === true;
  const nowIso = new Date().toISOString();
  const apptId = target.queueId.replace(/^followup_/, "");

  if (ok) {
    await db.execute({
      sql: "UPDATE wa_booking_send_queue SET status = 'sent', sent_at = ? WHERE user_id = ? AND id = ?",
      args: [nowIso, userId, target.queueId],
    });
  } else {
    await db.execute({
      sql: "UPDATE wa_booking_send_queue SET last_error = ? WHERE user_id = ? AND id = ?",
      args: [data.message || data.error || `HTTP ${res.status}`, userId, target.queueId],
    });
  }

  const logId = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  await db.execute({
    sql: `INSERT OR REPLACE INTO wa_message_logs
            (id, user_id, timestamp, type, client_name, phone, status, template_id, error_message, appt_id, appt_date, service)
          VALUES (?, ?, ?, 'followup', ?, ?, ?, 'direct', ?, ?, ?, ?)`,
    args: [logId, userId, nowIso, target.clientName, target.phone, ok ? "sent" : "failed", ok ? "" : (data.message || data.error || `HTTP ${res.status}`), apptId, appt_date, service],
  });

  console.log(`[${nowIso}] ${target.clientName} (${target.phone}) -> ${ok ? "SENT" : "FAILED: " + (data.message || data.error || res.status)}`);
}

for (const target of targets) {
  const waitMs = new Date(target.atUTC).getTime() - Date.now();
  if (waitMs > 0) {
    console.log(`Waiting ${Math.round(waitMs / 1000)}s until ${target.atUTC} for ${target.clientName}...`);
    await sleep(waitMs);
  }
  await sendOne(target);
}

console.log("All 3 follow-ups processed.");
