import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get("apiKey") || process.env.WASENDER_API_KEY;

  if (!apiKey) {
    return Response.json({ ok: false, connected: false, error: "No API key configured" });
  }

  try {
    // WaSender has no reliable dedicated status endpoint — use the send-message
    // endpoint with an obviously-invalid number instead.
    // • "Session not connected / not found / disconnected" → session is DOWN
    // • Any other response (invalid number, not on WA, even success) → session is UP
    const res = await fetch("https://www.wasenderapi.com/api/send-message", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phoneNumber: "000000000000", message: "__ping__" }),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      // HTML response means the API endpoint itself is unreachable
      console.error("📶 WaSender ping: non-JSON", res.status);
      return Response.json({ ok: false, connected: false, error: `WaSender HTTP ${res.status}` });
    }

    const body = await res.json() as { success?: boolean; message?: string; error?: string };
    console.log("📶 WaSender ping:", res.status, JSON.stringify(body));

    const msg = (body.message ?? body.error ?? "").toLowerCase();
    // These strings indicate the WhatsApp session itself is not active
    const isSessionDown = msg.includes("not connected")
      || msg.includes("not found")
      || msg.includes("disconnected")
      || msg.includes("session")
      || msg.includes("unauthorized")
      || res.status === 401;

    const connected = !isSessionDown;
    return Response.json({
      ok: connected,
      connected,
      status: connected ? "CONNECTED" : "DISCONNECTED",
      message: connected ? "Session is active" : (body.message ?? "Session not connected"),
    });
  } catch (err) {
    return Response.json({ ok: false, connected: false, error: String(err) });
  }
}
