import { NextRequest } from "next/server";

// Server-side cache — one real check per 15 minutes maximum.
// Free WaSender plan = 1 req/min total (includes message sends).
// We must not waste that quota on status polling.
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { connected: boolean; status: string; message: string; ts: number }>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get("apiKey") || process.env.WASENDER_API_KEY;
  const force  = searchParams.get("force") === "1"; // manual "Test Connection" click

  if (!apiKey) {
    return Response.json({ ok: false, connected: false, error: "No API key configured" });
  }

  // Return cached result unless a manual test is requested
  const cached = cache.get(apiKey);
  if (cached && !force && Date.now() - cached.ts < CACHE_TTL_MS) {
    return Response.json({ ok: cached.connected, connected: cached.connected, status: cached.status, message: cached.message, cached: true });
  }

  try {
    const res = await fetch("https://www.wasenderapi.com/api/status", {
      method: "GET",
      headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const result = { connected: false, status: "UNKNOWN", message: "WaSender status endpoint returned an invalid response." };
      cache.set(apiKey, { ...result, ts: Date.now() });
      return Response.json({ ok: false, ...result }, { status: 502 });
    }

    const body = await res.json() as {
      success?: boolean; status?: string; message?: string;
      data?: { status?: string };
    };
    console.log("📶 WaSender status:", res.status, JSON.stringify(body));

    const rawStatus = (body.data?.status ?? body.status ?? "").toUpperCase();
    const connected  = res.ok && rawStatus === "CONNECTED";
    const result = {
      connected,
      status: rawStatus || (connected ? "CONNECTED" : "DISCONNECTED"),
      message: body.message ?? (connected ? "Session active" : `Session is ${rawStatus.toLowerCase() || "not connected"}`),
    };
    cache.set(apiKey, { ...result, ts: Date.now() });
    return Response.json({ ok: connected, ...result });

  } catch (err) {
    // Network/timeout error — if we have a stale cache, prefer it over falsely showing disconnected
    if (cached) {
      return Response.json({ ok: cached.connected, connected: cached.connected, status: cached.status, message: cached.message, stale: true });
    }
    return Response.json({ ok: false, connected: false, status: "UNKNOWN", message: "Could not reach WaSender.", error: String(err) }, { status: 502 });
  }
}
