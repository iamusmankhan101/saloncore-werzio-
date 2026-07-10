import type { SalonInvoice } from "@/lib/salon-invoices";
import { generateSalonInvoicePdf } from "@/lib/salon-invoice-pdf";
import type { WhatsAppProviderConfig } from "@/lib/whatsapp-provider";

export interface SendSalonInvoiceWhatsAppInput {
  invoice: SalonInvoice;
  salon: { name: string; phone?: string; email?: string; address?: string; logo?: string };
  phone: string;
  providerConfig: WhatsAppProviderConfig;
  thankYouText?: string;
}

export interface SendSalonInvoiceWhatsAppResult {
  ok: boolean;
  provider: WhatsAppProviderConfig["provider"];
  error?: string;
}

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function sendSalonInvoiceWhatsApp({
  invoice,
  salon,
  phone,
  providerConfig,
  thankYouText,
}: SendSalonInvoiceWhatsAppInput): Promise<SendSalonInvoiceWhatsAppResult> {
  const pdf = await generateSalonInvoicePdf(invoice, salon);
  const pdfArrayBuffer = Uint8Array.from(pdf).buffer;
  const fileName = `${invoice.number}.pdf`;
  const invoiceLine = `Invoice ${invoice.number} from ${salon.name} — PKR ${invoice.total.toLocaleString("en-PK")}`;
  const caption = thankYouText ? `${thankYouText}\n\n${invoiceLine}` : invoiceLine;
  const provider = providerConfig.provider ?? "wasender";

  if (provider === "botsailor") {
    const apiToken = providerConfig.botSailorApiToken || "";
    const phoneNumberId = providerConfig.botSailorPhoneNumberId || "";
    if (!apiToken || !phoneNumberId) return { ok: false, provider, error: "BotSailor credentials are not configured." };

    const uploadForm = new FormData();
    uploadForm.set("phone_number_id", phoneNumberId);
    uploadForm.set("media_file", new Blob([pdfArrayBuffer], { type: "application/pdf" }), fileName);
    const uploadResponse = await fetch("https://botsailor.com/api/v1/whatsapp/upload/media", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}`, Accept: "application/json" },
      body: uploadForm,
    });
    const uploadData = await uploadResponse.json().catch(() => ({})) as { status?: string | number; media_id?: string; message?: string };
    if (!uploadResponse.ok || !uploadData.media_id) {
      return { ok: false, provider, error: uploadData.message || "BotSailor PDF upload failed." };
    }

    const sendForm = new URLSearchParams({
      apiToken,
      phone_number_id: phoneNumberId,
      phone_number: cleanPhone(phone),
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
    return { ok, provider, error: ok ? undefined : (sendData.message || "BotSailor invoice send failed.") };
  }

  if (provider === "zaptick") {
    return { ok: false, provider, error: "Zaptick PDF invoice sending is not supported yet." };
  }

  const apiKey = providerConfig.apiKey || "";
  if (!apiKey) return { ok: false, provider, error: "WaSender API key is not configured." };

  const uploadResponse = await fetch("https://wasenderapi.com/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: pdfArrayBuffer,
  });
  const uploadData = await uploadResponse.json().catch(() => ({})) as { success?: boolean; publicUrl?: string; message?: string };
  if (!uploadResponse.ok || !uploadData.publicUrl) {
    return { ok: false, provider, error: uploadData.message || "WaSender PDF upload failed." };
  }

  const sendResponse = await fetch("https://www.wasenderapi.com/api/send-message", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      to: `+${cleanPhone(phone)}`,
      text: caption,
      documentUrl: uploadData.publicUrl,
      fileName,
    }),
  });
  const sendData = await sendResponse.json().catch(() => ({})) as { success?: boolean; message?: string; error?: string };
  const ok = sendResponse.ok && sendData.success === true;
  return { ok, provider, error: ok ? undefined : (sendData.message || sendData.error || "WaSender invoice send failed.") };
}
