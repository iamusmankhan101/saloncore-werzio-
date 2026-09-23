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
 *   3. Enqueues each birthday message at a random time across a 6-8 hour window
 *   4. Sends only due queued messages, one per cron tick, to avoid back-to-back sends.
 *      Queued messages continue sending even if the salon closes before the spread window ends.
 *   5. Logs to wa_message_logs and records in birthday_sent to prevent duplicates
 *
 * Secured with Authorization: Bearer {CRON_SECRET}
 */

import { NextRequest } from "next/server";
import { ensureBirthdayTables, runBirthdayCron } from "@/lib/birthday-queue";

// ─── Auth ─────────────────────────────────────────────────────────────────────

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureBirthdayTables();
    const result = await runBirthdayCron();
    console.log(`[birthday] cron complete:`, result);
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("[birthday] cron error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
