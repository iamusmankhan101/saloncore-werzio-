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

/**
 * How long a POS receipt waits before it goes out. The receipt is the one
 * automated message the client is actively expecting — they just paid and
 * watched the invoice print — so it goes out while they are still in the
 * chair rather than on the old 10-15 min anti-ban schedule, which regularly
 * landed after they had already left.
 *
 * The 1-2 min that remains is jitter, not spacing: a send that lands the same
 * second as every checkout is a machine-readable pattern, and the drain cron
 * needs a tick to pick the row up either way. Random on every call, never a
 * fixed 90s — a constant offset is just as regular as no offset at all.
 */
function posReceiptDelayMs() {
  return 60_000 + Math.floor(Math.random() * 60_000);
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

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  try {
    await ensureTable();

    // Each receipt is now scheduled off its own checkout, not chained behind the
    // salon's last queued invoice. The chain existed to hold every send 10-15
    // min apart; with the receipt going out on the sale, there is nothing to
    // anchor on, and with no anchor read there is no read-then-write race for a
    // transaction to close — two simultaneous checkouts simply insert two rows.
    const scheduledAt = new Date(Date.now() + posReceiptDelayMs()).toISOString();

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

/**
 * DELETE /api/whatsapp/queue-pos-receipt?invoiceId=xxx
 *
 * Cancels a still-pending queued receipt when its invoice is deleted, so a
 * WhatsApp "Invoice" message never goes out for a sale that no longer exists.
 * Rows already sent are left untouched — the message already went out.
 */
export async function DELETE(request: NextRequest) {
  const actor = await resolveActor(request);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const invoiceId = request.nextUrl.searchParams.get("invoiceId");
  if (!invoiceId) {
    return Response.json({ ok: false, error: "invoiceId is required." }, { status: 400 });
  }

  try {
    await ensureTable();
    const result = await db.execute({
      sql: `UPDATE wa_pos_receipt_queue SET status = 'cancelled'
            WHERE user_id = ? AND invoice_id = ? AND status = 'pending'`,
      args: [actor.userId, invoiceId],
    });
    return Response.json({ ok: true, cancelled: result.rowsAffected > 0 });
  } catch (error) {
    console.error("[whatsapp/queue-pos-receipt] DELETE", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Could not cancel queued receipt." }, { status: 500 });
  }
}
