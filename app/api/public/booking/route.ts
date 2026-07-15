/**
 * POST /api/public/booking
 *
 * Saves a new appointment (and optionally a new/updated client) for a salon.
 * Called from the public online-booking page — no auth required.
 *
 * Body: { salonId, appointment, client? }
 */

import { NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createBooking } from "@/lib/booking";
import type { Appointment, Client } from "@/lib/types";

export async function POST(req: NextRequest) {
  // Public + unauthenticated by design (customer self-booking), but each
  // booking triggers a real WhatsApp send and a DB write — throttle abuse.
  const limit = rateLimit("public-booking", clientIp(req), { maxAttempts: 8, windowMs: 10 * 60 * 1000, blockMs: 30 * 60 * 1000 });
  if (limit.blocked) {
    return Response.json(
      { ok: false, error: "Too many booking attempts. Please try again later.", retryAfter: limit.retryAfter },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 0) } },
    );
  }

  let body: { salonId: string; appointment: Appointment; client?: Client; clientPhone?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { salonId, appointment, client } = body;
  if (!salonId || !appointment) {
    return Response.json({ ok: false, error: "Missing salonId or appointment" }, { status: 400 });
  }

  try {
    // clientPhone is always sent from the booking form (covers both new and
    // returning clients).
    const result = await createBooking(salonId, appointment, client, body.clientPhone);
    return Response.json({ ok: result.ok });
  } catch (err) {
    console.error("[public/booking] error:", err);
    return Response.json({ ok: false, error: "Failed to save booking" }, { status: 500 });
  }
}
