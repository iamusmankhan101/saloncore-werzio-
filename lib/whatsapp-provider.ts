export type WhatsAppProvider = "wasender" | "botsailor" | "zaptick";

export interface WhatsAppProviderConfig {
  provider?: WhatsAppProvider;
  apiKey?: string;
  botSailorApiToken?: string;
  botSailorPhoneNumberId?: string;
  botSailorTemplateReminder?: string;
  botSailorTemplateConfirmation?: string;
  botSailorTemplateFollowup?: string;
  botSailorTemplateCancellation?: string;
  botSailorTemplateBirthday?: string;
  zaptickApiKey?: string;
}

export interface WhatsAppSendResult {
  ok: boolean;
  status: number;
  skipped?: boolean;
  data?: unknown;
  errorReason?: string;
}

export function activeWhatsAppCredential(config: WhatsAppProviderConfig): string {
  if (config.provider === "botsailor") return config.botSailorApiToken || "";
  if (config.provider === "zaptick") return config.zaptickApiKey || "";
  return config.apiKey || "";
}

/**
 * Detects obviously-fake/placeholder phone numbers — every digit the same
 * (0000000000), sequential runs (1234567890, 0123456789, 9876543210, ...), or the
 * "count from 1" pattern (12345678910 = "1"+"2"+...+"9"+"10") that test/demo
 * bookings tend to get typed in — so WhatsApp sends are skipped for them instead
 * of failing (or worse, landing on some unrelated real number) at the provider.
 */
export function isFakePlaceholderPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return false;

  if (/^(\d)\1+$/.test(digits)) return true;

  const chars = digits.split("");
  const isAscending = chars.length > 1 && chars.every((d, i) => i === 0 || (Number(d) - Number(chars[i - 1]) + 10) % 10 === 1);
  const isDescending = chars.length > 1 && chars.every((d, i) => i === 0 || (Number(chars[i - 1]) - Number(d) + 10) % 10 === 1);
  if (isAscending || isDescending) return true;

  let counted = "";
  for (let n = 1; counted.length < digits.length; n++) counted += String(n);
  if (counted.slice(0, digits.length) === digits) return true;

  return false;
}

export async function sendWhatsAppMessage(
  config: WhatsAppProviderConfig,
  phone: string,
  text: string,
  options?: { messageType?: "reminder" | "confirmation" | "followup" | "cancellation" | "birthday" | "manual" },
): Promise<WhatsAppSendResult> {
  // Group JIDs (…@g.us) aren't phone numbers, so the fake-number check doesn't apply.
  if (!phone.endsWith("@g.us") && isFakePlaceholderPhone(phone)) {
    return { ok: false, skipped: true, status: 200, errorReason: "Recipient looks like a fake/placeholder phone number." };
  }

  const provider = config.provider ?? "wasender";

  // ─── Zaptick Provider ───────────────────────────────────────────────────────
  if (provider === "zaptick") {
    const apiKey = config.zaptickApiKey || "";
    
    if (!apiKey) {
      return { ok: false, status: 500, errorReason: "Zaptick API key is required." };
    }

    // Zaptick uses WhatsApp Web multi-device protocol - supports both individual and group messages
    // Works with existing personal/business WhatsApp numbers (QR code connection)
    const normalizedPhone = phone.replace(/\D/g, "");
    const recipientNumber = phone.endsWith("@g.us") ? phone : normalizedPhone;

    try {
      const response = await fetch("https://api.zaptick.io/api/v1/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          recipient: recipientNumber,
          message: text,
        }),
      });

      const data = await response.json().catch(() => ({})) as { 
        success?: boolean; 
        status?: string;
        message?: string; 
        error?: string;
      };

      const ok = response.ok && (data.success === true || data.status === "success");
      return { 
        ok, 
        status: response.status, 
        data, 
        errorReason: ok ? undefined : (data.error || data.message || `HTTP ${response.status}`) 
      };
    } catch (err) {
      return { 
        ok: false, 
        status: 500, 
        errorReason: err instanceof Error ? err.message : "Failed to connect to Zaptick API" 
      };
    }
  }

  // ─── BotSailor Provider ─────────────────────────────────────────────────────
  if (provider === "botsailor") {
    const apiToken = config.botSailorApiToken || "";
    const phoneNumberId = config.botSailorPhoneNumberId || "";
    if (!apiToken || !phoneNumberId) {
      return { ok: false, status: 500, errorReason: "BotSailor API token and phone number ID are required." };
    }
    if (phone.endsWith("@g.us")) {
      return { ok: false, status: 400, errorReason: "BotSailor Cloud API does not support WhatsApp group recipients." };
    }

    // Get template ID based on message type
    const messageType = options?.messageType;
    let templateId = "";
    if (messageType === "reminder") templateId = config.botSailorTemplateReminder || "";
    else if (messageType === "confirmation") templateId = config.botSailorTemplateConfirmation || "";
    else if (messageType === "followup") templateId = config.botSailorTemplateFollowup || "";
    else if (messageType === "cancellation") templateId = config.botSailorTemplateCancellation || "";
    else if (messageType === "birthday") templateId = config.botSailorTemplateBirthday || "";

    // Build request body
    const bodyParams: Record<string, string> = {
      apiToken,
      phone_number_id: phoneNumberId,
      phone_number: phone.replace(/\D/g, ""),
    };

    // If template ID is provided, use template-based message; otherwise send as regular message
    if (templateId) {
      bodyParams.template_name = templateId;
      bodyParams.language_code = "en"; // or make this configurable
      // For template messages, Meta requires variables in a specific format
      // If your templates have variables, you'd need to parse the text and extract them
      // For now, we'll send the message as-is
    } else {
      // Fallback to regular message if no template ID
      bodyParams.message = text;
    }

    const body = new URLSearchParams(bodyParams);
    const response = await fetch("https://botsailor.com/api/v1/whatsapp/send", {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = await response.json().catch(() => ({})) as { status?: string | number | boolean; message?: string };
    const ok = response.ok && (data.status === "1" || data.status === 1 || data.status === true);
    return { ok, status: response.status, data, errorReason: ok ? undefined : (data.message || `HTTP ${response.status}`) };
  }

  // ─── WaSender Provider ──────────────────────────────────────────────────────
  const apiKey = config.apiKey || "";
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
  
  // ─── Zaptick Provider Status ────────────────────────────────────────────────
  if (provider === "zaptick") {
    const apiKey = config.zaptickApiKey || "";
    if (!apiKey) return { connected: false, status: "NOT_CONFIGURED", message: "Zaptick API key is required." };
    
    try {
      const response = await fetch("https://api.zaptick.io/api/v1/status", {
        headers: { 
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json" 
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      
      const data = await response.json().catch(() => ({})) as {
        success?: boolean;
        status?: string;
        connected?: boolean;
        message?: string;
      };
      
      const connected = response.ok && (data.success === true || data.connected === true || data.status === "connected");
      return {
        connected,
        status: connected ? "CONNECTED" : "DISCONNECTED",
        message: data.message || (connected ? "Zaptick account active." : "Zaptick session disconnected."),
      };
    } catch (err) {
      return {
        connected: false,
        status: "ERROR",
        message: err instanceof Error ? err.message : "Failed to check Zaptick status.",
      };
    }
  }
  
  // ─── BotSailor Provider Status ──────────────────────────────────────────────
  if (provider === "botsailor") {
    const apiToken = config.botSailorApiToken || "";
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

  // ─── WaSender Provider Status ───────────────────────────────────────────────
  const apiKey = config.apiKey || "";
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
