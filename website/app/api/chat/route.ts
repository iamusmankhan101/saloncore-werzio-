/**
 * POST /api/chat
 *
 * Backend for the site's own chat widget (components/ChatWidget.tsx),
 * replacing the Typebot embed. Proxies to OpenRouter's OpenAI-compatible
 * chat completions endpoint using a free-tier model, keyed by
 * OPENROUTER_API_KEY (server-side only — never exposed to the browser).
 */

import { NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// tencent/hy3:free burns its entire token budget on hidden chain-of-thought
// before emitting a reply (measured ~1000 reasoning tokens for a 5-word
// answer, 11s+ latency) — too slow/expensive for a chat widget. This nano
// model still reasons a little but reliably leaves room for real content.
const MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

const SYSTEM_PROMPT = `You are the support assistant on the Salon Central marketing website (saloncentral.xyz). Salon Central is all-in-one salon management software for beauty salons, hair salons, spas, and nail salons in Pakistan, covering:
- Appointment scheduling with staff calendars and automated WhatsApp confirmations/reminders
- Point of sale (POS): services + retail products, 6 payment methods (cash, JazzCash, EasyPaisa, Raast, card, bank transfer), auto-numbered invoices
- Client management: visit history, detailed beauty profiles (hair color formulas, allergy alerts, skin type, nail preferences)
- AI virtual try-on for hair color, hairstyle, and makeup previews
- Inventory management with low-stock alerts and automatic stock deduction on sale
- Staff management with commission-based payroll
- Loyalty points program with Bronze/Silver/Gold membership tiers
- Online booking page shareable via Instagram, WhatsApp, or Google Maps
- Multi-branch/location support
- WhatsApp automation for confirmations, reminders, follow-ups, birthday messages, and low-stock alerts

Answer questions about these features concisely and helpfully. Pricing is not published — always direct pricing questions to "Book a free demo" or contact sales. If asked about a competitor, answer honestly and only compare on features you're told about here; don't invent claims about competitors. If you don't know something, say so plainly rather than guessing. Keep replies short (2-4 sentences) and friendly, matching a helpful sales-support tone. Never invent pricing numbers.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const limit = rateLimit("chat-widget", clientIp(req), { maxAttempts: 20, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 });
  if (limit.blocked) {
    return Response.json(
      { ok: false, error: "Too many messages. Please try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 0) } },
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: "Chat is not configured." }, { status: 503 });
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (messages.length === 0) {
    return Response.json({ ok: false, error: "Missing messages." }, { status: 400 });
  }
  // Cap conversation length and per-message size sent upstream — keeps cost/latency bounded
  // and stops a malicious client from sending an unbounded payload.
  const trimmed = messages.slice(-20).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content ?? "").slice(0, 2000),
  }));

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://www.saloncentral.xyz",
        "X-Title": "Salon Central",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmed],
        temperature: 0.4,
        max_tokens: 700,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[chat] OpenRouter error:", res.status, errText);
      return Response.json({ ok: false, error: "The assistant is temporarily unavailable." }, { status: 502 });
    }

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      return Response.json({ ok: false, error: "No response generated." }, { status: 502 });
    }

    return Response.json({ ok: true, reply });
  } catch (err) {
    console.error("[chat] request failed:", err);
    return Response.json({ ok: false, error: "The assistant is temporarily unavailable." }, { status: 502 });
  }
}
