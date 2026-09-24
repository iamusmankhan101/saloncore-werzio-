/**
 * /api/booking-link
 *
 * GET  → the salon's short online-booking link (created from the salon name
 *        on first use), e.g. { slug: "misbahs-serenity-spa-salon", url: ".../book/misbahs-serenity-spa-salon" }.
 * POST { slug } → change it (owner/admin only). Old links to the previous
 *        slug stop working, so the dashboard warns before saving.
 */

import { NextRequest } from "next/server";
import { resolveActor } from "@/lib/api-auth";
import { getOrCreateBookingSlug, setBookingSlug } from "@/lib/booking-slug";

// The domain the owner is using right now (app.saloncentral.xyz in production).
function bookingUrl(req: NextRequest, slug: string) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
  const origin = host ? `${proto}://${host}` : req.nextUrl.origin;
  return `${origin}/book/${slug}`;
}

export async function GET(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const slug = await getOrCreateBookingSlug(actor.userId);
    return Response.json({ ok: true, slug, url: bookingUrl(req, slug) });
  } catch (error) {
    console.error("[booking-link] GET", error);
    return Response.json({ ok: false, error: "Could not load the booking link." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (actor.role === "staff" || actor.role === "manager") {
    return Response.json({ ok: false, error: "Only the salon owner can change the booking link." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({})) as { slug?: unknown };
  if (typeof body.slug !== "string") return Response.json({ ok: false, error: "slug is required." }, { status: 400 });
  try {
    const error = await setBookingSlug(actor.userId, body.slug);
    if (error) return Response.json({ ok: false, error }, { status: 400 });
    const slug = body.slug.trim().toLowerCase();
    return Response.json({ ok: true, slug, url: bookingUrl(req, slug) });
  } catch (error) {
    console.error("[booking-link] POST", error);
    return Response.json({ ok: false, error: "Could not save the booking link." }, { status: 500 });
  }
}
