import { NextRequest } from "next/server";
import type { SalonInvoice } from "@/lib/salon-invoices";
import { generateSalonInvoicePdf } from "@/lib/salon-invoice-pdf";
import type { WhatsAppProviderConfig } from "@/lib/whatsapp-provider";
import { checkWhatsAppSafety, recordWhatsAppSafetySend, type WhatsAppSafetyConfig } from "@/lib/whatsapp-safety";

interface RequestBody {
  invoice: SalonInvoice;
  salon: { name: string; phone?: string; email?: string; address?: string; logo?: string };
  phone: string;
  providerConfig: WhatsAppProviderConfig & WhatsAppSafetyConfig;
}

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
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
    const pdf = await generateSalonInvoicePdf(body.invoice, body.salon);
    const pdfArrayBuffer = Uint8Array.from(pdf).buffer;
    const fileName = `${body.invoice.number}.pdf`;
    const caption = `Invoice ${body.invoice.number} from ${body.salon.name} — PKR ${body.invoice.total.toLocaleString("en-PK")}`;
    const provider = body.providerConfig.provider ?? "wasender";

    if (provider === "botsailor") {
      const apiToken = body.providerConfig.botSailorApiToken || process.env.BOTSAILOR_API_TOKEN || "";
      const phoneNumberId = body.providerConfig.botSailorPhoneNumberId || process.env.BOTSAILOR_PHONE_NUMBER_ID || "";
      if (!apiToken || !phoneNumberId) throw new Error("BotSailor credentials are not configured.");

      const uploadForm = new FormData();
      uploadForm.set("phone_number_id", phoneNumberId);
      uploadForm.set("media_file", new Blob([pdfArrayBuffer], { type: "application/pdf" }), fileName);
      const uploadResponse = await fetch("https://botsailor.com/api/v1/whatsapp/upload/media", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, Accept: "application/json" },
        body: uploadForm,
      });
      const uploadData = await uploadResponse.json().catch(() => ({})) as { status?: string | number; media_id?: string; message?: string };
      if (!uploadResponse.ok || !uploadData.media_id) throw new Error(uploadData.message || "BotSailor PDF upload failed.");

      const sendForm = new URLSearchParams({
        apiToken,
        phone_number_id: phoneNumberId,
        phone_number: cleanPhone(body.phone),
        media_id: uploadData.media_id,
        media_type: "document",
        media_name: fileName,
        media_caption_text: caption,
      });
      const sendResponse = await fetch("https://botsailor.com/api/v1/whatsapp/send/file", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: sendForm,
      });
      const sendData = await sendResponse.json().catch(() => ({})) as { status?: string | number | boolean; message?: string };
      const ok = sendResponse.ok && (sendData.status === "1" || sendData.status === 1 || sendData.status === true);
      if (!ok) throw new Error(sendData.message || "BotSailor invoice send failed.");
      recordWhatsAppSafetySend({ phone: body.phone, config: body.providerConfig });
      return Response.json({ ok: true, provider });
    }

    const apiKey = body.providerConfig.apiKey || process.env.WASENDER_API_KEY || "";
    if (!apiKey) throw new Error("WaSender API key is not configured.");

    const uploadResponse = await fetch("https://wasenderapi.com/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: pdfArrayBuffer,
    });
    const uploadData = await uploadResponse.json().catch(() => ({})) as { success?: boolean; publicUrl?: string; message?: string };
    if (!uploadResponse.ok || !uploadData.publicUrl) throw new Error(uploadData.message || "WaSender PDF upload failed.");

    const sendResponse = await fetch("https://www.wasenderapi.com/api/send-message", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: `+${cleanPhone(body.phone)}`,
        text: caption,
        documentUrl: uploadData.publicUrl,
        fileName,
      }),
    });
    const sendData = await sendResponse.json().catch(() => ({})) as { success?: boolean; message?: string; error?: string };
    if (!sendResponse.ok || sendData.success !== true) throw new Error(sendData.message || sendData.error || "WaSender invoice send failed.");
    recordWhatsAppSafetySend({ phone: body.phone, config: body.providerConfig });
    return Response.json({ ok: true, provider });
  } catch (error) {
    console.error("[whatsapp/send-invoice]", error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Invoice send failed." }, { status: 502 });
  }
}
