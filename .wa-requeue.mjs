import { createClient } from "@libsql/client";
import fs from "node:fs";

const APPLY = process.env.APPLY === "1";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const db = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });

const MINUTE_MS = 60000, MIN_GAP = 25 * MINUTE_MS, MAX_GAP = 30 * MINUTE_MS;
const gap = () => Math.round(MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP));
const NON_RETRYABLE = `COALESCE(last_error,'') NOT LIKE '%fake/placeholder%' AND COALESCE(last_error,'') NOT LIKE '%too stale to send%'`;

const TZ = "Asia/Karachi", QSTART = 21 * 60, QEND = 9 * 60;
const localMin = (ms) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
  return Number(p.find(x => x.type === "hour").value) * 60 + Number(p.find(x => x.type === "minute").value);
};
const outsideQuiet = (ms) => {
  const n = localMin(ms);
  const inside = QSTART > QEND ? (n >= QSTART || n < QEND) : (n >= QSTART && n < QEND);
  if (!inside) return ms;
  return ms + ((QEND - n + 1440) % 1440) * MINUTE_MS + Math.round(Math.random() * 10 * MINUTE_MS);
};
const pkt = (ms) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date(ms));

const hasSent = async (userId, type, apptId) => {
  if (!apptId) return false;
  const r = await db.execute({
    sql: "SELECT 1 FROM wa_message_logs WHERE user_id = ? AND appt_id = ? AND type = ? AND status = 'sent' LIMIT 1",
    args: [userId, apptId, type],
  });
  return r.rows.length > 0;
};

const wb = await db.execute(`SELECT id, user_id, client_name, phone FROM wa_booking_send_queue
  WHERE kind='winback' AND status='expired' AND ${NON_RETRYABLE} ORDER BY created_at ASC`);
const inv = await db.execute(`SELECT invoice_id, user_id, client_name, phone, invoice_number, invoice_json FROM wa_pos_receipt_queue
  WHERE status='expired' AND ${NON_RETRYABLE} ORDER BY created_at ASC`);

let cursor = Date.now(), plan = [], skipped = 0;
for (const r of wb.rows) {
  const apptId = r.id.startsWith("winback_") ? r.id.slice(8) : "";
  if (await hasSent(r.user_id, "winback", apptId)) { skipped++; continue; }
  cursor = outsideQuiet(cursor + gap());
  plan.push({ kind: "winback", key: r.id, userId: r.user_id, name: r.client_name, phone: r.phone, at: cursor });
}
const seenInvoices = new Set(); let dupes = [];
for (const r of inv.rows) {
  if (await hasSent(r.user_id, "invoice", r.invoice_id)) { skipped++; continue; }
  let parsed = {}; try { parsed = JSON.parse(r.invoice_json); } catch {}
  const dupeKey = `${r.phone}|${parsed.date ?? ""}|${parsed.total ?? ""}`;
  if (parsed.total != null && seenInvoices.has(dupeKey)) { dupes.push(`${r.client_name} ${r.invoice_number} (PKR ${parsed.total})`); continue; }
  seenInvoices.add(dupeKey);
  cursor = outsideQuiet(cursor + gap());
  plan.push({ kind: "invoice", key: r.invoice_id, userId: r.user_id, name: r.client_name, phone: r.phone, at: cursor });
}

console.log(`now: ${pkt(Date.now())} PKT`);
console.log(`win-backs: ${wb.rows.length} | invoices: ${inv.rows.length} | skipped (already delivered): ${skipped}`);
console.log(`total to schedule: ${plan.length}`);
for (const x of plan) console.log(`  ${pkt(x.at).padEnd(18)} ${x.kind.padEnd(8)} ${String(x.name).slice(0, 28).padEnd(30)} ${x.phone}`);
if (plan.length) console.log(`last send: ${pkt(plan[plan.length - 1].at)} PKT`);
if (dupes.length) console.log(`\nheld back as duplicates (${dupes.length}):\n  ` + dupes.join("\n  "));

if (!APPLY) { console.log("\nDRY RUN — nothing written."); process.exit(0); }

for (const x of plan) {
  if (x.kind === "winback") {
    await db.execute({
      sql: `UPDATE wa_booking_send_queue SET status='pending', attempts=0, last_error=?, scheduled_at=? WHERE user_id=? AND id=?`,
      args: ["Requeued by hand after a failed send.", new Date(x.at).toISOString(), x.userId, x.key],
    });
  } else {
    await db.execute({
      sql: `UPDATE wa_pos_receipt_queue SET status='pending', attempts=0, last_error=?, sent_at=NULL, scheduled_at=? WHERE user_id=? AND invoice_id=?`,
      args: ["Requeued by hand after a failed send.", new Date(x.at).toISOString(), x.userId, x.key],
    });
  }
}
console.log(`\nAPPLIED — ${plan.length} rows requeued.`);
