import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get("apiKey") || process.env.WASENDER_API_KEY;

  if (!apiKey) {
    return Response.json({ ok: false, connected: false, error: "No API key configured" });
  }

  try {
    const res = await fetch("https://www.wasenderapi.com/api/session-status", {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    const data = await res.json() as { success?: boolean; status?: string; message?: string };
    console.log("📶 WaSender status:", res.status, JSON.stringify(data));

    const connected = res.ok && (data.success === true || data.status === "CONNECTED");
    return Response.json({
      ok: connected,
      connected,
      status: data.status,
      message: data.message,
      httpStatus: res.status,
    });
  } catch (err) {
    return Response.json({ ok: false, connected: false, error: String(err) });
  }
}
