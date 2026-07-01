import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserById } from "@/lib/auth-db";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { ensureSegmentCampaignTables, segmentScheduledAt } from "@/lib/segment-campaign-db";

type CampaignRecipient = {
  clientName: string;
  phone: string;
  text: string;
};

async function authenticatedOwner(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const actorId = token ? verifySessionToken(token) : null;
  const actor = actorId ? await getUserById(actorId) : null;
  if (!actor) return null;
  return {
    actor,
    ownerId: actor.salonOwnerId || actor.id,
    locationId: actor.locationId || "main",
  };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticatedOwner(req);
    if (!auth) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    await ensureSegmentCampaignTables();

    const result = await db.execute({
      sql: `SELECT c.id, c.mode, c.total, c.created_at,
                   SUM(CASE WHEN q.status = 'pending' OR q.status = 'processing' THEN 1 ELSE 0 END) AS pending,
                   SUM(CASE WHEN q.status = 'sent' THEN 1 ELSE 0 END) AS sent,
                   SUM(CASE WHEN q.status = 'failed' THEN 1 ELSE 0 END) AS failed
            FROM wa_segment_campaigns c
            LEFT JOIN wa_segment_campaign_queue q ON q.campaign_id = c.id
            WHERE c.user_id = ?
            GROUP BY c.id
            ORDER BY c.created_at DESC
            LIMIT 20`,
      args: [auth.ownerId],
    });

    const campaigns = result.rows.map((row) => ({
      id: String(row.id),
      mode: String(row.mode),
      total: Number(row.total),
      pending: Number(row.pending ?? 0),
      sent: Number(row.sent ?? 0),
      failed: Number(row.failed ?? 0),
      createdAt: String(row.created_at),
    }));
    return Response.json({
      ok: true,
      campaigns,
      pending: campaigns.reduce((sum, campaign) => sum + campaign.pending, 0),
    });
  } catch (error) {
    console.error("[wa/campaigns] GET error:", error);
    return Response.json({ ok: false, error: "Failed to load campaigns." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticatedOwner(req);
    if (!auth) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (auth.actor.role === "staff") {
      return Response.json({ ok: false, error: "Staff accounts cannot create marketing campaigns." }, { status: 403 });
    }

    const body = await req.json() as {
      mode?: "spend" | "visits" | "absent";
      templateId?: string;
      locationId?: string;
      recipients?: CampaignRecipient[];
    };
    if (!body.mode || !body.templateId || !Array.isArray(body.recipients)) {
      return Response.json({ ok: false, error: "Invalid campaign." }, { status: 400 });
    }
    const mode = body.mode;
    const templateId = body.templateId;

    const recipients = body.recipients
      .filter((item) => item?.clientName && item?.phone && item?.text)
      .slice(0, 500);
    if (recipients.length === 0) {
      return Response.json({ ok: false, error: "No clients with phone numbers were selected." }, { status: 400 });
    }

    await ensureSegmentCampaignTables();
    const now = Date.now();
    const campaignId = `campaign_${now}_${crypto.randomUUID().slice(0, 8)}`;
    const locationId = body.locationId || auth.locationId;
    const statements = [
      {
        sql: `INSERT INTO wa_segment_campaigns (id, user_id, location_id, mode, total, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [campaignId, auth.ownerId, locationId, mode, recipients.length, new Date(now).toISOString()],
      },
      ...recipients.map((recipient, index) => ({
        sql: `INSERT INTO wa_segment_campaign_queue
                (id, campaign_id, user_id, client_name, phone, text, template_id, scheduled_at, status, attempts, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
        args: [
          crypto.randomUUID(),
          campaignId,
          auth.ownerId,
          recipient.clientName,
          recipient.phone,
          recipient.text,
          templateId,
          segmentScheduledAt(index, recipients.length, now),
          new Date(now).toISOString(),
        ],
      })),
    ];
    await db.batch(statements, "write");

    return Response.json({ ok: true, campaignId, queued: recipients.length });
  } catch (error) {
    console.error("[wa/campaigns] POST error:", error);
    return Response.json({ ok: false, error: "Failed to queue campaign." }, { status: 500 });
  }
}
