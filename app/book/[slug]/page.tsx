/**
 * /book/<slug> — the short, shareable online-booking link for a salon
 * (see lib/booking-slug.ts). Renders the same form as /online-booking?salon=<id>.
 */

import { notFound } from "next/navigation";
import { resolveBookingSlug } from "@/lib/booking-slug";
import { OnlineBookingView } from "@/app/online-booking/booking-view";

export const dynamic = "force-dynamic";

export default async function BookBySlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salonId = await resolveBookingSlug(decodeURIComponent(slug)).catch(() => null);
  if (!salonId) notFound();
  return <OnlineBookingView salonId={salonId} />;
}
