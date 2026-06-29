import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { apiKey, phone, text } = body as {
    apiKey?: string;
    phone: string;
    text: string;
  };

  const key = apiKey || process.env.WASENDER_API_KEY;
  if (!key) {
    return Response.json({ ok: false, error: "WaSender API key not configured." }, { status: 500 });
  }

  if (!phone || !text) {
    return Response.json({ ok: false, error: "Missing required fields: phone, text" }, { status: 400 });
  }

  const to = phone.endsWith("@g.us") || phone.startsWith("+") ? phone : `+${phone}`;

  console.log("📱 WaSender send to:", to, "| text:", text.slice(0, 60));

  try {
    const res = await fetch("https://www.wasenderapi.com/api/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({ to, text }),
    });

    const data = await res.json();
    console.log("📥 WaSender response:", res.status, JSON.stringify(data));

    const ok = res.ok && data.success === true;
    const errorReason = ok ? undefined : (data.message || data.error || `HTTP ${res.status}`);
    return Response.json({ ok, status: res.status, data, errorReason });
  } catch (err) {
    console.error("❌ WaSender API error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
