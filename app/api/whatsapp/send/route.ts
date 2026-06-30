import { NextRequest } from "next/server";
import { sendWhatsAppMessage, type WhatsAppProvider } from "@/lib/whatsapp-provider";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider, apiKey, botSailorApiToken, botSailorPhoneNumberId, phone, text } = body as {
    provider?: WhatsAppProvider;
    apiKey?: string;
    botSailorApiToken?: string;
    botSailorPhoneNumberId?: string;
    phone: string;
    text: string;
  };

  if (!phone || !text) {
    return Response.json({ ok: false, error: "Missing required fields: phone, text" }, { status: 400 });
  }

  try {
    const result = await sendWhatsAppMessage({ provider, apiKey, botSailorApiToken, botSailorPhoneNumberId }, phone, text);
    return Response.json(result, { status: result.status >= 500 ? 500 : 200 });
  } catch (err) {
    console.error("WhatsApp provider error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
