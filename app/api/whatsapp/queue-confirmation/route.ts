import { NextRequest } from "next/server";
import { resolveActor } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { activeWhatsAppCredential, isFakePlaceholderPhone, type WhatsAppProviderConfig } from "@/lib/whatsapp-provider";

interface QueueConfirmationBody {
  appointment: {
    id: string;
    clientName: string;
    serviceNames: string[];
    date: string;
    startTime: string;
    totalAmount?: number;
  };
  phone: string;
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

function to12h(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${mStr ?? "00"} ${suffix}`;
}

function fillTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

function jitteredScheduledAt(): string {
  const delayMs = 5 * 60_000 + Math.random() * 2 * 60_000;
  return new Date(Date.now() + delayMs).toISOString();
}

export async function POST(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: QueueConfirmationBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  const { appointment, phone: rawPhone } = body;
  if (!appointment?.id || !appointment.clientName || !appointment.date || !appointment.startTime) {
    return Response.json({ ok: false, error: "Missing appointment details." }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone || "");
  if (!phone) return Response.json({ ok: true, queued: false, skipped: true, reason: "missing-phone" });
  if (isFakePlaceholderPhone(phone)) return Response.json({ ok: true, queued: false, skipped: true, reason: "fake-placeholder-phone" });

  if (new Date(`${appointment.date}T${appointment.startTime}:00`) < new Date()) {
    return Response.json({ ok: true, queued: false, skipped: true, reason: "appointment-started" });
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
    if (settings?.wasender?.autoConfirmation === false) {
      return Response.json({ ok: true, queued: false, skipped: true, reason: "auto-confirmation-disabled" });
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

    const template: string =
      settings?.whatsapp?.confirmation ||
      "Hi {{name}}, your {{service}} booking on {{date}} at {{time}} is confirmed at {{salon_name}}. We look forward to seeing you!";
    const text = fillTemplate(template, {
      name: appointment.clientName,
      service: appointment.serviceNames.join(", "),
      date: appointment.date,
      time: to12h(appointment.startTime),
      salon_name: settings?.salon?.name || "the salon",
      amount: String(appointment.totalAmount ?? ""),
    });

    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT OR IGNORE INTO wa_booking_send_queue
              (id, user_id, kind, phone, text, client_name, appt_date, appt_time, scheduled_at, status, attempts, created_at)
            VALUES (?, ?, 'confirmation', ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
      args: [
        appointment.id,
        actor.userId,
        phone,
        text,
        appointment.clientName,
        appointment.date,
        appointment.startTime,
        jitteredScheduledAt(),
        now,
      ],
    });

    return Response.json({ ok: true, queued: true });
  } catch (error) {
    console.error("[whatsapp/queue-confirmation]", error);
    return Response.json({ ok: false, error: "Could not queue confirmation." }, { status: 500 });
  }
}
