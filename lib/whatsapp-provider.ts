export type WhatsAppProvider = "wasender" | "botsailor";

export interface WhatsAppProviderConfig {
  provider?: WhatsAppProvider;
  apiKey?: string;
  botSailorApiToken?: string;
  botSailorPhoneNumberId?: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  status: number;
  data?: unknown;
  errorReason?: string;
}

export function activeWhatsAppCredential(config: WhatsAppProviderConfig): string {
  if (config.provider === "botsailor") return config.botSailorApiToken || "";
  return config.apiKey || "";
}

export async function sendWhatsAppMessage(
  config: WhatsAppProviderConfig,
  phone: string,
  text: string,
): Promise<WhatsAppSendResult> {
  const provider = config.provider ?? "wasender";

  if (provider === "botsailor") {
    const apiToken = config.botSailorApiToken || process.env.BOTSAILOR_API_TOKEN || "";
    const phoneNumberId = config.botSailorPhoneNumberId || process.env.BOTSAILOR_PHONE_NUMBER_ID || "";
    if (!apiToken || !phoneNumberId) {
      return { ok: false, status: 500, errorReason: "BotSailor API token and phone number ID are required." };
    }
    if (phone.endsWith("@g.us")) {
      return { ok: false, status: 400, errorReason: "BotSailor Cloud API does not support WhatsApp group recipients." };
    }

    const body = new URLSearchParams({
      apiToken,
      phone_number_id: phoneNumberId,
      phone_number: phone.replace(/\D/g, ""),
      message: text,
    });
    const response = await fetch("https://botsailor.com/api/v1/whatsapp/send", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await response.json().catch(() => ({})) as { status?: string | number | boolean; message?: string };
    const ok = response.ok && (data.status === "1" || data.status === 1 || data.status === true);
    return { ok, status: response.status, data, errorReason: ok ? undefined : (data.message || `HTTP ${response.status}`) };
  }

  const apiKey = config.apiKey || process.env.WASENDER_API_KEY || "";
  if (!apiKey) return { ok: false, status: 500, errorReason: "WaSender API key not configured." };
  const to = phone.endsWith("@g.us") || phone.startsWith("+") ? phone : `+${phone}`;
  const response = await fetch("https://www.wasenderapi.com/api/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ to, text }),
  });
  const data = await response.json().catch(() => ({})) as { success?: boolean; message?: string; error?: string };
  const ok = response.ok && data.success === true;
  return { ok, status: response.status, data, errorReason: ok ? undefined : (data.message || data.error || `HTTP ${response.status}`) };
}

export async function checkWhatsAppProvider(config: WhatsAppProviderConfig) {
  const provider = config.provider ?? "wasender";
  if (provider === "botsailor") {
    const apiToken = config.botSailorApiToken || process.env.BOTSAILOR_API_TOKEN || "";
    if (!apiToken) return { connected: false, status: "NOT_CONFIGURED", message: "BotSailor API token is required." };
    const response = await fetch(`https://botsailor.com/api/v1/user/myInfo?apiToken=${encodeURIComponent(apiToken)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = await response.json().catch(() => ({})) as {
      status?: string | number | boolean;
      message?: { whatsapp_bots_details?: Array<{ phone_number_id?: string }> } | string;
    };
    const authenticated = response.ok && (data.status === "1" || data.status === 1 || data.status === true);
    const accounts = typeof data.message === "object" ? data.message.whatsapp_bots_details ?? [] : [];
    const phoneMatches = !config.botSailorPhoneNumberId || accounts.some((account) => account.phone_number_id === config.botSailorPhoneNumberId);
    return {
      connected: authenticated && phoneMatches,
      status: authenticated && phoneMatches ? "CONNECTED" : "DISCONNECTED",
      message: !authenticated
        ? (typeof data.message === "string" ? data.message : "BotSailor authentication failed.")
        : phoneMatches ? "BotSailor account active." : "Phone number ID was not found in this BotSailor account.",
    };
  }

  const apiKey = config.apiKey || process.env.WASENDER_API_KEY || "";
  if (!apiKey) return { connected: false, status: "NOT_CONFIGURED", message: "WaSender API key is required." };
  const response = await fetch("https://www.wasenderapi.com/api/status", {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json().catch(() => ({})) as { status?: string; message?: string; data?: { status?: string } };
  const status = (data.data?.status ?? data.status ?? "").toUpperCase();
  const connected = response.ok && status === "CONNECTED";
  return { connected, status: status || "DISCONNECTED", message: data.message || (connected ? "Session active." : "WaSender session disconnected.") };
}
