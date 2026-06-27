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
    // WaSender wraps the real status inside a nested `data` object:
    // { success: true, data: { status: "CONNECTED", phoneNumber: "..." } }
    const body = await res.json() as {
      success?: boolean;
      status?: string;
      message?: string;
      data?: { status?: string; phoneNumber?: string };
    };
    console.log("📶 WaSender status:", res.status, JSON.stringify(body));

    // Resolve status from either the top-level or nested data field, case-insensitive
    const rawStatus = (body.data?.status ?? body.status ?? "").toUpperCase();
    const connected = res.ok && (body.success === true || rawStatus === "CONNECTED");
    return Response.json({
      ok: connected,
      connected,
      status: rawStatus || undefined,
      message: body.message,
      httpStatus: res.status,
    });
  } catch (err) {
    return Response.json({ ok: false, connected: false, error: String(err) });
  }
}
