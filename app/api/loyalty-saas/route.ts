import { NextRequest } from "next/server";

const DEFAULT_API_URL = "https://www.trydecidr.xyz/api/loyalty";

const ALLOWED_ACTIONS = new Set([
  "stamp",
  "cashback-balance",
  "cashback-earn",
  "cashback-redeem",
]);

type LoyaltySaasBody = {
  action?: string;
  apiKey?: string;
  payload?: Record<string, unknown>;
};

function apiUrl(action: string) {
  const base = process.env.LOYALTY_SAAS_API_URL || DEFAULT_API_URL;
  const url = new URL(base);
  url.searchParams.set("action", action);
  return url;
}

export async function POST(req: NextRequest) {
  let body: LoyaltySaasBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const action = body.action;
  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return Response.json({ ok: false, error: "Unsupported loyalty action" }, { status: 400 });
  }

  const apiKey = body.apiKey || process.env.LOYALTY_SAAS_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: "Missing loyalty API key" }, { status: 400 });
  }

  const payload = body.payload || {};
  const url = apiUrl(action);

  try {
    const headers = { "X-API-Key": apiKey };
    const upstream = action === "cashback-balance"
      ? await fetch(withQuery(url, payload), { headers, cache: "no-store" })
      : await fetch(url, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        });

    const text = await upstream.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { ok: false, error: text || "Invalid loyalty service response" };
    }

    return Response.json(data, { status: upstream.status });
  } catch (err) {
    console.error("[loyalty-saas] proxy error:", err);
    return Response.json({ ok: false, error: "Loyalty service is unavailable" }, { status: 502 });
  }
}

function withQuery(url: URL, payload: Record<string, unknown>) {
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}
