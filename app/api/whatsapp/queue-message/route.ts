import { NextRequest } from "next/server";
import { resolveActor } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { activeWhatsAppCredential, isFakePlaceholderPhone, type WhatsAppProviderConfig } from "@/lib/whatsapp-provider";

type QueueKind = "groupalert" | "followup" | "cancellation" | "reminder" | "birthday" | "lowstock" | "manual";

interface QueueMessageBody {
  kind: QueueKind;
  phone: string;
  text: string;
  clientName?: string;
  apptId?: string;
  apptDate?: string;
  apptTime?: string;
  scheduledAt?: string;
  dedupeKey?: string;
}

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS salon_data (
      entity     TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wa_booking_send_queue (
      id           TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      kind         TEXT NOT NULL,
      phone        TEXT NOT NULL,
      text         TEXT NOT NULL,
      client_name  TEXT NOT NULL,
      appt_date    TEXT,
      appt_time    TEXT,
      scheduled_at TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      attempts     INTEGER NOT NULL DEFAULT 0,
      last_error   TEXT,
      created_at   TEXT NOT NULL,
      sent_at      TEXT,
      PRIMARY KEY (user_id, id)
    )
  `);
  await db.execute(`ALTER TABLE wa_booking_send_queue ADD COLUMN appt_date TEXT`).catch(() => {});
  await db.execute(`ALTER TABLE wa_booking_send_queue ADD COLUMN appt_time TEXT`).catch(() => {});
}

function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("3")) digits = `92${digits}`;
  return digits;
}

function isQueueKind(value: unknown): value is QueueKind {
  return ["groupalert", "followup", "cancellation", "reminder", "birthday", "lowstock", "manual"].includes(String(value));
}

function normalizeRecipient(kind: QueueKind, rawPhone: string): string {
  const trimmed = rawPhone.trim();
  if (kind === "groupalert" && trimmed.endsWith("@g.us")) return trimmed;
  return normalizePhone(trimmed);
}

function queueIdFor(body: QueueMessageBody): string {
  if (body.dedupeKey?.trim()) return body.dedupeKey.trim();
  if (body.apptId?.trim()) return `${body.kind}_${body.apptId.trim()}`;
  return `${body.kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: QueueMessageBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  if (!isQueueKind(body.kind)) return Response.json({ ok: false, error: "Invalid queue kind." }, { status: 400 });
  if (!body.text?.trim()) return Response.json({ ok: false, error: "Missing message text." }, { status: 400 });

  const phone = normalizeRecipient(body.kind, body.phone || "");
  if (!phone) return Response.json({ ok: true, queued: false, skipped: true, reason: "missing-phone" });
  if (body.kind !== "groupalert" && isFakePlaceholderPhone(phone)) {
    return Response.json({ ok: true, queued: false, skipped: true, reason: "fake-placeholder-phone" });
  }

  try {
    await ensureTable();

    const settingsRow = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [`${actor.userId}_settings`],
    });
    const settings = settingsRow.rows.length > 0
      ? JSON.parse(settingsRow.rows[0].data as string)
      : {};

    if (settings?.wasender?.enabled === false) {
      return Response.json({ ok: true, queued: false, skipped: true, reason: "automation-disabled" });
    }

    const providerConfig: WhatsAppProviderConfig = {
      provider: settings?.wasender?.provider || "wasender",
      apiKey: settings?.wasender?.apiKey,
      botSailorApiToken: settings?.wasender?.botSailorApiToken,
      botSailorPhoneNumberId: settings?.wasender?.botSailorPhoneNumberId,
      zaptickApiKey: settings?.wasender?.zaptickApiKey,
    };
    if (!activeWhatsAppCredential(providerConfig)) {
      return Response.json({ ok: true, queued: false, skipped: true, reason: "missing-provider-credentials" });
    }

    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT OR IGNORE INTO wa_booking_send_queue
              (id, user_id, kind, phone, text, client_name, appt_date, appt_time, scheduled_at, status, attempts, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
      args: [
        queueIdFor(body),
        actor.userId,
        body.kind,
        phone,
        body.text,
        body.clientName?.trim() || "Client",
        body.apptDate || null,
        body.apptTime || null,
        body.scheduledAt || now,
        now,
      ],
    });

    return Response.json({ ok: true, queued: true });
  } catch (error) {
    console.error("[whatsapp/queue-message]", error);
    return Response.json({ ok: false, error: "Could not queue message." }, { status: 500 });
  }
}
