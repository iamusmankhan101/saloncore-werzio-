import { NextRequest } from "next/server";

// Server-side cache — avoids hammering WaSender on every page load / focus event.
// The result is reused for up to 3 minutes before a fresh check is made.
const CACHE_TTL_MS = 3 * 60 * 1000;
const cache = new Map<string, { connected: boolean; status: string; message: string; ts: number }>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get("apiKey") || process.env.WASENDER_API_KEY;

  if (!apiKey) {
    return Response.json({ ok: false, connected: false, error: "No API key configured" });
  }

  // Return cached result if still fresh
  const cached = cache.get(apiKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return Response.json({ ok: cached.connected, connected: cached.connected, status: cached.status, message: cached.message, cached: true });
  }

  // WaSender endpoints to try in order (some may not exist depending on plan)
  const endpoints = [
    "https://www.wasenderapi.com/api/session-status",
    "https://wasenderapi.com/api/session-status",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) continue; // HTML → try next URL

      const body = await res.json() as {
        success?: boolean; status?: string; message?: string;
        data?: { status?: string };
      };
      console.log("📶 WaSender status [%s]:", url, res.status, JSON.stringify(body));

      const rawStatus = (body.data?.status ?? body.status ?? "").toUpperCase();
      const connected  = res.ok && (body.success === true || rawStatus === "CONNECTED");
      const result = { connected, status: rawStatus || (connected ? "CONNECTED" : "DISCONNECTED"), message: body.message ?? "" };
      cache.set(apiKey, { ...result, ts: Date.now() });
      return Response.json({ ok: connected, ...result });
    } catch {
      continue; // timeout or network error → try next
    }
  }

  // All endpoints failed — return last cached value if we have one, even if stale
  if (cached) {
    return Response.json({ ok: cached.connected, connected: cached.connected, status: cached.status, message: cached.message, stale: true });
  }

  return Response.json({ ok: false, connected: false, error: "Could not reach WaSender API" });
}
