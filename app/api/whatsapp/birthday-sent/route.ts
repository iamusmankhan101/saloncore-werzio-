/**
 * /api/whatsapp/birthday-sent
 *
 * Called after a birthday wish was sent by hand ("Send now" on the Messages
 * page). Clears this client's pending row in the server birthday queue and
 * records the send in birthday_sent, so /api/cron/birthday neither sends it a
 * second time nor queues it again this year.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveActor } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { clientId?: unknown; year?: unknown };
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const year = typeof body.year === "string" && /^\d{4}$/.test(body.year) ? body.year : String(new Date().getFullYear());
  if (!clientId) return Response.json({ ok: false, error: "clientId is required." }, { status: 400 });

  const now = new Date().toISOString();
  try {
    // Both tables are created by the birthday cron on its first run, so they
    // can be missing for a salon that has never had one — nothing to clear then.
    await db.execute({
      sql: `UPDATE birthday_message_queue
            SET status = 'sent', sent_at = ?, last_error = 'Sent by hand from the Messages page.'
            WHERE user_id = ? AND client_id = ? AND status = 'pending'`,
      args: [now, actor.userId, clientId],
    }).catch(() => {});
    await db.execute({
      sql: "INSERT OR IGNORE INTO birthday_sent (user_id, client_id, year, sent_at) VALUES (?, ?, ?, ?)",
      args: [actor.userId, clientId, year, now],
    }).catch(() => {});
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[whatsapp/birthday-sent]", error);
    return Response.json({ ok: false, error: "Could not update the birthday queue." }, { status: 500 });
  }
}
