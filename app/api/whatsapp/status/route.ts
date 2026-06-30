import { NextRequest } from "next/server";
import { checkWhatsAppProvider, type WhatsAppProvider } from "@/lib/whatsapp-provider";

// Server-side cache — one real check per 15 minutes maximum.
// Free WaSender plan = 1 req/min total (includes message sends).
// We must not waste that quota on status polling.
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { connected: boolean; status: string; message: string; ts: number }>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get("apiKey") || process.env.WASENDER_API_KEY;
  const provider = (searchParams.get("provider") || "wasender") as WhatsAppProvider;
  const botSailorApiToken = searchParams.get("botSailorApiToken") || process.env.BOTSAILOR_API_TOKEN;
  const botSailorPhoneNumberId = searchParams.get("botSailorPhoneNumberId") || process.env.BOTSAILOR_PHONE_NUMBER_ID;
  const force  = searchParams.get("force") === "1"; // manual "Test Connection" click

  const credential = provider === "botsailor" ? botSailorApiToken : apiKey;
  if (!credential) {
    return Response.json({ ok: false, connected: false, error: "No API key configured" });
  }

  // Return cached result unless a manual test is requested
  const cacheKey = `${provider}:${credential}:${botSailorPhoneNumberId || ""}`;
  const cached = cache.get(cacheKey);
  if (cached && !force && Date.now() - cached.ts < CACHE_TTL_MS) {
    return Response.json({ ok: cached.connected, connected: cached.connected, status: cached.status, message: cached.message, cached: true });
  }

  try {
    const result = await checkWhatsAppProvider({ provider, apiKey: apiKey || undefined, botSailorApiToken: botSailorApiToken || undefined, botSailorPhoneNumberId: botSailorPhoneNumberId || undefined });
    cache.set(cacheKey, { ...result, ts: Date.now() });
    return Response.json({ ok: result.connected, ...result });

  } catch (err) {
    // Network/timeout error — if we have a stale cache, prefer it over falsely showing disconnected
    if (cached) {
      return Response.json({ ok: cached.connected, connected: cached.connected, status: cached.status, message: cached.message, stale: true });
    }
    return Response.json({ ok: false, connected: false, status: "UNKNOWN", message: `Could not reach ${provider === "botsailor" ? "BotSailor" : "WaSender"}.`, error: String(err) }, { status: 502 });
  }
}
