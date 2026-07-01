import { NextRequest } from "next/server";
import { sendWhatsAppMessage, type WhatsAppProvider } from "@/lib/whatsapp-provider";
import { applyWhatsAppRandomDelay, checkWhatsAppSafety, recordWhatsAppSafetySend, type WhatsAppMessageIntent, type WhatsAppSafetyConfig } from "@/lib/whatsapp-safety";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider, apiKey, botSailorApiToken, botSailorPhoneNumberId, zaptickApiKey, phone, text, messageIntent, messageType, recipientOptedIn, safety } = body as {
    provider?: WhatsAppProvider;
    apiKey?: string;
    botSailorApiToken?: string;
    botSailorPhoneNumberId?: string;
    zaptickApiKey?: string;
    phone: string;
    text: string;
    messageIntent?: WhatsAppMessageIntent;
    messageType?: "reminder" | "confirmation" | "followup" | "cancellation" | "birthday" | "manual";
    recipientOptedIn?: boolean;
    safety?: WhatsAppSafetyConfig;
  };

  if (!phone || !text) {
    return Response.json({ ok: false, error: "Missing required fields: phone, text" }, { status: 400 });
  }

  try {
    const safetyConfig = safety ?? (body as WhatsAppSafetyConfig);
    const safetyCheck = checkWhatsAppSafety({ phone, intent: messageIntent, recipientOptedIn, config: safetyConfig });
    if (!safetyCheck.ok) {
      return Response.json(
        { ok: false, error: safetyCheck.error, errorReason: safetyCheck.error, retryAfter: safetyCheck.retryAfter },
        { status: safetyCheck.status },
      );
    }

    const delayMs = await applyWhatsAppRandomDelay(safetyConfig);
    const result = await sendWhatsAppMessage(
      { provider, apiKey, botSailorApiToken, botSailorPhoneNumberId, zaptickApiKey }, 
      phone, 
      text,
      messageType ? { messageType } : undefined
    );
    if (result.ok) recordWhatsAppSafetySend({ phone, config: safetyConfig });
    return Response.json({ ...result, safetyDelayMs: delayMs }, { status: result.status >= 500 ? 500 : 200 });
  } catch (err) {
    console.error("WhatsApp provider error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
