import { NextRequest } from "next/server";
import type { SalonInvoice } from "@/lib/salon-invoices";
import type { WhatsAppProviderConfig } from "@/lib/whatsapp-provider";
import { sendSalonInvoiceWhatsApp } from "@/lib/whatsapp-invoice-send";
import { checkWhatsAppSafety, recordWhatsAppSafetySend, type WhatsAppSafetyConfig } from "@/lib/whatsapp-safety";
import { resolveActor } from "@/lib/api-auth";

interface RequestBody {
  invoice: SalonInvoice;
  salon: { name: string; phone?: string; email?: string; address?: string; logo?: string };
  phone: string;
  providerConfig: WhatsAppProviderConfig & WhatsAppSafetyConfig;
  /** Optional thank-you text prepended to the invoice caption, so both go out as one message. */
  thankYouText?: string;
}

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as RequestBody | null;
  if (!body?.invoice || !body.phone || !body.providerConfig) {
    return Response.json({ ok: false, error: "Invoice, phone, and provider configuration are required." }, { status: 400 });
  }

  try {
    const safetyCheck = checkWhatsAppSafety({ phone: body.phone, intent: "utility", config: body.providerConfig });
    if (!safetyCheck.ok) {
      return Response.json(
        { ok: false, error: safetyCheck.error, errorReason: safetyCheck.error, retryAfter: safetyCheck.retryAfter },
        { status: safetyCheck.status },
      );
    }

    // Pacing between messages is handled by the caller — a blocking sleep here
    // would risk exceeding the serverless function's execution timeout.
    const result = await sendSalonInvoiceWhatsApp(body);
    if (!result.ok) throw new Error(result.error || "Invoice send failed.");
    recordWhatsAppSafetySend({ phone: body.phone, config: body.providerConfig });
    return Response.json({ ok: true, provider: result.provider });
  } catch (error) {
    console.error("[whatsapp/send-invoice]", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Invoice send failed." }, { status: 502 });
  }
}
