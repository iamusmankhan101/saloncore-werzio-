import { NextRequest } from "next/server";

const HARDCODED_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID || "1143945662132104";

// Variable order per template — must match {{1}},{{2}}... positions in Meta template
const TEMPLATE_VAR_ORDER: Record<string, string[]> = {
  // "Hi {{1}}, your {{2}} appointment at {{3}} is on {{4}} at {{5}}. See you soon!"
  reminder: ["name", "service", "salon_name", "date", "time"],
  // "Hi {{1}}! Your {{2}} appointment confirmed at {{5}}. Date: {{3}} Time: {{4}}"
  confirmm: ["name", "service", "date", "time", "salon_name"],
};
// Default order for any other template
const DEFAULT_ORDER = ["name", "service", "date", "time", "salon_name", "items", "count"];

export async function POST(request: NextRequest) {
  const token = process.env.META_WHATSAPP_TOKEN;
  if (!token) {
    return Response.json({ ok: false, error: "META_WHATSAPP_TOKEN not configured on server." }, { status: 500 });
  }

  const body = await request.json();
  const { phoneNumberId, templateId: templateName, phone, variables } = body as {
    phoneNumberId?: string;
    templateId: string;   // now stores template name e.g. "reminder", "confirmm"
    phone: string;
    variables?: Record<string, string>;
  };

  if (!templateName || !phone) {
    return Response.json({ ok: false, error: "Missing required fields" }, { status: 400 });
  }

  // Use phone number ID from request body first, then env var, then hardcoded fallback
  const resolvedPhoneNumberId = phoneNumberId || HARDCODED_PHONE_NUMBER_ID;
  const metaUrl = `https://graph.facebook.com/v19.0/${resolvedPhoneNumberId}/messages`;

  // Build ordered parameters array matching template {{1}}...{{N}} positions
  const order = TEMPLATE_VAR_ORDER[templateName] ?? DEFAULT_ORDER;
  const parameters = variables
    ? order
        .filter((key) => variables[key] !== undefined)
        .map((key) => ({ type: "text", text: (variables[key] ?? "").trim() }))
    : [];

  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      ...(parameters.length > 0 && {
        components: [{ type: "body", parameters }],
      }),
    },
  };

  console.log("📱 Meta API send to phone ID:", resolvedPhoneNumberId, JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log("📥 Meta response:", res.status, text);

    const data = JSON.parse(text);
    const ok = res.ok && !!data.messages?.[0]?.id;
    return Response.json({ ok, status: res.status, data });
  } catch (err) {
    console.error("❌ Meta API error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}