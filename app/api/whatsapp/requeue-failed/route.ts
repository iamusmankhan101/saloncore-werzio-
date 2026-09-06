/**
 * /api/whatsapp/requeue-failed
 *
 * Re-sends invoices and win-back messages that gave up after MAX_ATTEMPTS
 * (status 'expired') — typically a whole day's worth at once, after an outage
 * or an unpaid WhatsApp provider subscription is sorted out.
 *
 * Rows go back into their normal queues rather than being sent here, so every
 * anti-ban rule in /api/cron/booking-queue still applies. On top of that this
 * lays them out on its own cursor: the first is 25-30 min from now and each
 * following one steps a fresh random 25-30 min past the previous, so a requeue
 * of thirty failed invoices is a slow trickle, never a blast.
 *
 * Anything with a successful send already logged is left alone, so a client is
 * never messaged the same invoice or win-back twice.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveActor } from "@/lib/api-auth";

const MINUTE_MS = 60 * 1000;
const REQUEUE_MIN_GAP_MS = 25 * MINUTE_MS;
const REQUEUE_MAX_GAP_MS = 30 * MINUTE_MS;
const MAX_REQUEUE = 200;

function nextGapMs(): number {
  return Math.round(REQUEUE_MIN_GAP_MS + Math.random() * (REQUEUE_MAX_GAP_MS - REQUEUE_MIN_GAP_MS));
}

// Invoices go out with "utility" intent, which by design does NOT respect quiet
// hours — correct for a receipt handed over at the till moments earlier, wrong
// for a backlog being replayed hours later. A long requeue would otherwise walk
// its cursor straight through the night and wake clients at 2am, so the cursor
// steps over quiet hours here instead. (Win-backs are marketing and are gated
// twice over — quiet hours and salon opening hours — by the drain cron itself.)
const DEFAULT_QUIET_START = "21:00";
const DEFAULT_QUIET_END = "09:00";
const DEFAULT_QUIET_TZ = "Asia/Karachi";

function minutesFromTime(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** Local wall-clock minutes-since-midnight for `ms` in `tz`. */
function localMinutes(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date(ms));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

interface QuietHours { enabled: boolean; start: number; end: number; tz: string }

function quietHoursFromSettings(settings: Record<string, unknown> | null): QuietHours {
  const wasender = (settings?.wasender ?? {}) as Record<string, unknown>;
  return {
    enabled: wasender.quietHoursEnabled !== false,
    start: minutesFromTime((wasender.quietHoursStart as string) || DEFAULT_QUIET_START),
    end: minutesFromTime((wasender.quietHoursEnd as string) || DEFAULT_QUIET_END),
    tz: (wasender.quietHoursTimezone as string) || DEFAULT_QUIET_TZ,
  };
}

/** Pushes `ms` past quiet hours if it lands inside them, else returns it as-is. */
function outsideQuietHours(ms: number, quiet: QuietHours): number {
  if (!quiet.enabled) return ms;
  const now = localMinutes(ms, quiet.tz);
  // A window that wraps midnight (21:00-09:00) is "inside" on either side of it.
  const inside = quiet.start > quiet.end
    ? now >= quiet.start || now < quiet.end
    : now >= quiet.start && now < quiet.end;
  if (!inside) return ms;
  const minutesUntilEnd = (quiet.end - now + 1440) % 1440;
  // A few random minutes past the boundary so a held-back batch doesn't all
  // resume on the same exact minute the window lifts.
  return ms + minutesUntilEnd * MINUTE_MS + Math.round(Math.random() * 10 * MINUTE_MS);
}

async function loadSettings(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const row = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [`${userId}_settings`],
    });
    return row.rows.length > 0 ? JSON.parse(row.rows[0].data as string) as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

// Not every expired row failed for a reason a retry can fix. A row skipped as a
// fake/placeholder number will just be skipped again, and one that expired for
// being too stale is stale by definition — requeueing either only churns the
// queue. Provider-side failures (an outage, a rate limit, an unpaid provider
// subscription) are the ones worth sending again.
const NON_RETRYABLE_ERROR_SQL = `
  COALESCE(last_error, '') NOT LIKE '%fake/placeholder%'
  AND COALESCE(last_error, '') NOT LIKE '%too stale to send%'
`;

/** Mirrors apptIdForQueueItem in the drain cron for the kinds we requeue. */
function apptIdForRow(kind: string, id: string): string {
  const prefix = `${kind}_`;
  return id.startsWith(prefix) ? id.slice(prefix.length) : "";
}

async function hasSentMessage(userId: string, logType: string, apptId: string): Promise<boolean> {
  if (!apptId) return false;
  try {
    const result = await db.execute({
      sql: "SELECT 1 FROM wa_message_logs WHERE user_id = ? AND appt_id = ? AND type = ? AND status = 'sent' LIMIT 1",
      args: [userId, apptId, logType],
    });
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { kinds?: string[] };
  const kinds = new Set(body.kinds?.length ? body.kinds : ["invoice", "winback"]);

  try {
    const quiet = quietHoursFromSettings(await loadSettings(actor.userId));
    let cursorMs = Date.now();
    let winbackRequeued = 0;
    let invoiceRequeued = 0;
    let skippedAlreadySent = 0;
    let skippedDuplicate = 0;

    if (kinds.has("winback")) {
      const rows = await db.execute({
        sql: `SELECT id FROM wa_booking_send_queue
              WHERE user_id = ? AND kind = 'winback' AND status = 'expired'
                AND ${NON_RETRYABLE_ERROR_SQL}
              ORDER BY created_at ASC LIMIT ?`,
        args: [actor.userId, MAX_REQUEUE],
      });
      for (const row of rows.rows) {
        const id = row.id as string;
        if (await hasSentMessage(actor.userId, "winback", apptIdForRow("winback", id))) {
          skippedAlreadySent++;
          continue;
        }
        cursorMs = outsideQuietHours(cursorMs + nextGapMs(), quiet);
        await db.execute({
          sql: `UPDATE wa_booking_send_queue
                SET status = 'pending', attempts = 0, last_error = ?, scheduled_at = ?
                WHERE user_id = ? AND id = ?`,
          args: ["Requeued by hand after a failed send.", new Date(cursorMs).toISOString(), actor.userId, id],
        });
        winbackRequeued++;
      }
    }

    if (kinds.has("invoice")) {
      const rows = await db.execute({
        sql: `SELECT invoice_id, phone, invoice_json FROM wa_pos_receipt_queue
              WHERE user_id = ? AND status = 'expired'
                AND ${NON_RETRYABLE_ERROR_SQL}
              ORDER BY created_at ASC LIMIT ?`,
        args: [actor.userId, MAX_REQUEUE],
      });
      // Distinct invoice ids are not proof of distinct bills: when sends were
      // visibly failing, the same sale tends to get rung up again, leaving two
      // rows with the same client, day and total. Resending both would put two
      // identical PDFs on one client's phone, so only the first of each goes.
      const seenInvoices = new Set<string>();
      for (const row of rows.rows) {
        const invoiceId = row.invoice_id as string;
        if (await hasSentMessage(actor.userId, "invoice", invoiceId)) {
          skippedAlreadySent++;
          continue;
        }
        let parsed: { date?: string; total?: number } = {};
        try { parsed = JSON.parse(row.invoice_json as string) as typeof parsed; } catch { /* fall through to a per-id key */ }
        const dupeKey = `${row.phone as string}|${parsed.date ?? ""}|${parsed.total ?? ""}`;
        if (parsed.total != null && seenInvoices.has(dupeKey)) {
          skippedDuplicate++;
          continue;
        }
        seenInvoices.add(dupeKey);
        cursorMs = outsideQuietHours(cursorMs + nextGapMs(), quiet);
        await db.execute({
          sql: `UPDATE wa_pos_receipt_queue
                SET status = 'pending', attempts = 0, last_error = ?, sent_at = NULL, scheduled_at = ?
                WHERE user_id = ? AND invoice_id = ?`,
          args: ["Requeued by hand after a failed send.", new Date(cursorMs).toISOString(), actor.userId, invoiceId],
        });
        invoiceRequeued++;
      }
    }

    return Response.json({
      ok: true,
      winbackRequeued,
      invoiceRequeued,
      skippedAlreadySent,
      skippedDuplicate,
      lastScheduledAt: winbackRequeued + invoiceRequeued > 0 ? new Date(cursorMs).toISOString() : null,
    });
  } catch (error) {
    console.error("[whatsapp/requeue-failed]", error);
    return Response.json({ ok: false, error: "Could not requeue failed messages." }, { status: 500 });
  }
}
