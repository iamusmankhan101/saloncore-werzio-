import { NextRequest } from "next/server";
import { resolveActor } from "@/lib/api-auth";
import { db } from "@/lib/db";
import type { SalonInvoice } from "@/lib/salon-invoices";
import { isFakePlaceholderPhone, type WhatsAppProviderConfig } from "@/lib/whatsapp-provider";
import type { WhatsAppSafetyConfig } from "@/lib/whatsapp-safety";

interface RequestBody {
  invoice: SalonInvoice;
  salon: { name: string; phone?: string; email?: string; address?: string; logo?: string };
  phone: string;
  providerConfig: WhatsAppProviderConfig & WhatsAppSafetyConfig;
  thankYouText?: string;
}

function posReceiptDelayMs() {
  return 10 * 60_000 + Math.floor(Math.random() * 5 * 60_000);
}

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wa_pos_receipt_queue (
      id             TEXT NOT NULL,
      user_id        TEXT NOT NULL,
      invoice_id     TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      phone          TEXT NOT NULL,
      client_name    TEXT NOT NULL,
      invoice_json   TEXT NOT NULL,
      salon_json     TEXT NOT NULL,
      thank_you_text TEXT NOT NULL DEFAULT '',
      scheduled_at   TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      attempts       INTEGER NOT NULL DEFAULT 0,
      last_error     TEXT,
      created_at     TEXT NOT NULL,
      sent_at        TEXT,
      PRIMARY KEY (user_id, invoice_id)
    )
  `);
}

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as RequestBody | null;
  if (!body?.invoice || !body.phone || !body.providerConfig) {
    return Response.json({ ok: false, error: "Invoice, phone, and provider configuration are required." }, { status: 400 });
  }
  if (isFakePlaceholderPhone(body.phone)) {
    return Response.json({ ok: true, queued: false, skipped: true, reason: "fake-placeholder-phone" });
  }

  const scheduledAt = new Date(Date.now() + posReceiptDelayMs()).toISOString();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  try {
    await ensureTable();
    await db.execute({
      sql: `INSERT INTO wa_pos_receipt_queue
              (id, user_id, invoice_id, invoice_number, phone, client_name, invoice_json, salon_json, thank_you_text, scheduled_at, status, attempts, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)
            ON CONFLICT(user_id, invoice_id) DO UPDATE SET
              phone = excluded.phone,
              client_name = excluded.client_name,
              invoice_json = excluded.invoice_json,
              salon_json = excluded.salon_json,
              thank_you_text = excluded.thank_you_text,
              scheduled_at = CASE
                WHEN wa_pos_receipt_queue.status = 'sent' THEN wa_pos_receipt_queue.scheduled_at
                ELSE excluded.scheduled_at
              END,
              status = CASE
                WHEN wa_pos_receipt_queue.status = 'sent' THEN wa_pos_receipt_queue.status
                ELSE 'pending'
              END,
              attempts = CASE
                WHEN wa_pos_receipt_queue.status = 'sent' THEN wa_pos_receipt_queue.attempts
                ELSE 0
              END,
              last_error = CASE
                WHEN wa_pos_receipt_queue.status = 'sent' THEN wa_pos_receipt_queue.last_error
                ELSE NULL
              END,
              sent_at = CASE
                WHEN wa_pos_receipt_queue.status = 'sent' THEN wa_pos_receipt_queue.sent_at
                ELSE NULL
              END`,
      args: [
        id,
        actor.userId,
        body.invoice.id,
        body.invoice.number,
        body.phone,
        body.invoice.clientName,
        JSON.stringify(body.invoice),
        JSON.stringify(body.salon),
        body.thankYouText || "",
        scheduledAt,
        new Date().toISOString(),
      ],
    });
    return Response.json({ ok: true, queued: true, scheduledAt });
  } catch (error) {
    console.error("[whatsapp/queue-pos-receipt]", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not queue POS receipt." }, { status: 500 });
  }
}
