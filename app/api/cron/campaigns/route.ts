import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sendWhatsAppMessage, type WhatsAppProviderConfig } from "@/lib/whatsapp-provider";
import { checkWhatsAppSafety, recordWhatsAppSafetySend, type WhatsAppSafetyConfig } from "@/lib/whatsapp-safety";
import { ensureSegmentCampaignTables, SEGMENT_CAMPAIGN_MAX_ATTEMPTS } from "@/lib/segment-campaign-db";

type QueueItem = {
  id: string;
  campaignId: string;
  userId: string;
  clientName: string;
  phone: string;
  text: string;
  templateId: string;
  attempts: number;
};

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

async function claimDueItem(): Promise<QueueItem | null> {
  await db.execute({
    sql: `UPDATE wa_segment_campaign_queue
          SET status = 'pending', processing_at = NULL
          WHERE status = 'processing' AND processing_at < ?`,
    args: [new Date(Date.now() - 10 * 60_000).toISOString()],
  });
  const result = await db.execute({
    sql: `SELECT id, campaign_id, user_id, client_name, phone, text, template_id, attempts
          FROM wa_segment_campaign_queue
          WHERE status = 'pending' AND scheduled_at <= ? AND attempts < ?
          ORDER BY scheduled_at ASC
          LIMIT 1`,
    args: [new Date().toISOString(), SEGMENT_CAMPAIGN_MAX_ATTEMPTS],
  });
  if (!result.rows.length) return null;
  const row = result.rows[0];
  const claimed = await db.execute({
    sql: `UPDATE wa_segment_campaign_queue
          SET status = 'processing', processing_at = ?
          WHERE id = ? AND status = 'pending'`,
    args: [new Date().toISOString(), row.id],
  });
  if (Number(claimed.rowsAffected ?? 0) !== 1) return null;
  return {
    id: String(row.id),
    campaignId: String(row.campaign_id),
    userId: String(row.user_id),
    clientName: String(row.client_name),
    phone: String(row.phone),
    text: String(row.text),
    templateId: String(row.template_id),
    attempts: Number(row.attempts ?? 0),
  };
}

async function loadProviderConfig(userId: string) {
  const result = await db.execute({
    sql: "SELECT data FROM salon_data WHERE entity = ?",
    args: [`${userId}_settings`],
  });
  if (!result.rows.length) return null;
  const settings = JSON.parse(String(result.rows[0].data)) as { wasender?: WhatsAppProviderConfig & WhatsAppSafetyConfig };
  return settings.wasender ?? null;
}

async function logResult(item: QueueItem, status: "sent" | "failed") {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS wa_message_logs (
        id TEXT NOT NULL, user_id TEXT NOT NULL, timestamp TEXT NOT NULL, type TEXT NOT NULL,
        client_name TEXT NOT NULL, phone TEXT NOT NULL, status TEXT NOT NULL,
        template_id TEXT NOT NULL DEFAULT '', PRIMARY KEY (user_id, id)
      )
    `);
    await db.execute({
      sql: `INSERT INTO wa_message_logs
              (id, user_id, timestamp, type, client_name, phone, status, template_id)
            VALUES (?, ?, ?, 'manual', ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), item.userId, new Date().toISOString(), item.clientName, item.phone, status, item.templateId],
    });
  } catch {
    // Logging must not cause an already-sent message to be retried.
  }
}

async function markResult(item: QueueItem, ok: boolean, error?: string) {
  const attempts = item.attempts + 1;
  const terminalFailure = !ok && attempts >= SEGMENT_CAMPAIGN_MAX_ATTEMPTS;
  const retryDelayMinutes = 5 + Math.floor(Math.random() * 6);
  await db.execute({
    sql: `UPDATE wa_segment_campaign_queue
          SET status = ?, attempts = ?, last_error = ?, sent_at = ?, scheduled_at = ?, processing_at = NULL
          WHERE id = ?`,
    args: [
      ok ? "sent" : terminalFailure ? "failed" : "pending",
      attempts,
      error ?? null,
      ok ? new Date().toISOString() : null,
      ok || terminalFailure ? new Date().toISOString() : new Date(Date.now() + retryDelayMinutes * 60_000).toISOString(),
      item.id,
    ],
  });
}

async function deferItem(item: QueueItem, reason: string) {
  const retryDelayMinutes = 5 + Math.floor(Math.random() * 6);
  await db.execute({
    sql: `UPDATE wa_segment_campaign_queue
          SET status = 'pending', last_error = ?, processing_at = NULL, scheduled_at = ?
          WHERE id = ?`,
    args: [reason, new Date(Date.now() + retryDelayMinutes * 60_000).toISOString(), item.id],
  });
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    await ensureSegmentCampaignTables();
    const item = await claimDueItem();
    if (!item) return Response.json({ ok: true, processed: 0 });

    const config = await loadProviderConfig(item.userId);
    if (!config) {
      await markResult(item, false, "WhatsApp settings are unavailable.");
      await logResult(item, "failed");
      return Response.json({ ok: true, processed: 1, sent: 0, error: "WhatsApp settings unavailable." });
    }

    const safety = checkWhatsAppSafety({
      phone: item.phone,
      intent: "marketing",
      config,
    });
    if (!safety.ok) {
      const reason = safety.error || "WhatsApp safety check deferred this message.";
      await deferItem(item, reason);
      return Response.json({ ok: true, processed: 1, sent: 0, deferred: 1, reason });
    }

    const result = await sendWhatsAppMessage(config, item.phone, item.text, { messageType: "manual" });
    await markResult(item, result.ok, result.errorReason);
    if (result.ok || item.attempts + 1 >= SEGMENT_CAMPAIGN_MAX_ATTEMPTS) {
      await logResult(item, result.ok ? "sent" : "failed");
    }
    if (result.ok) recordWhatsAppSafetySend({ phone: item.phone, config });

    return Response.json({ ok: true, processed: 1, sent: result.ok ? 1 : 0 });
  } catch (error) {
    console.error("[cron/campaigns] error:", error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
