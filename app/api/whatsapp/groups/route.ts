import { NextRequest } from "next/server";

interface WaSenderGroup {
  jid?: unknown;
  name?: unknown;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { apiKey?: string };
  const apiKey = body.apiKey || process.env.WASENDER_API_KEY || "";

  if (!apiKey) {
    return Response.json({ ok: false, error: "WaSender API key not configured." }, { status: 400 });
  }

  try {
    const response = await fetch("https://www.wasenderapi.com/api/groups", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as {
      success?: boolean;
      data?: WaSenderGroup[] | { items?: WaSenderGroup[] };
      message?: string;
      error?: string;
    };
    const rawGroups = Array.isArray(payload.data) ? payload.data : payload.data?.items ?? [];
    const groups = rawGroups
      .filter((group) => typeof group.jid === "string" && group.jid.endsWith("@g.us"))
      .map((group) => ({
        jid: group.jid as string,
        name: typeof group.name === "string" && group.name.trim() ? group.name.trim() : "Unnamed WhatsApp Group",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!response.ok || payload.success === false) {
      return Response.json({
        ok: false,
        error: payload.message || payload.error || `WaSender returned HTTP ${response.status}.`,
      }, { status: response.status || 502 });
    }

    return Response.json({ ok: true, groups });
  } catch {
    return Response.json({ ok: false, error: "Unable to load WhatsApp groups." }, { status: 502 });
  }
}
