/**
 * GET /api/manifest/[salonId] — per-salon Web App Manifest
 *
 * A static manifest can't serve a multi-tenant PWA: its start_url has to name
 * one salon, and "/client" alone isn't a page (the real route is
 * /client/[salonId]). An install driven by the static manifest therefore
 * produced a home-screen icon that launched a 404.
 *
 * Serving the manifest per salon fixes that and improves the result: the icon
 * is labelled with the salon's own name, and launching it opens that salon's
 * page directly. `id` is salon-scoped too, so a customer who uses two salons
 * gets two separate installed apps instead of one overwriting the other.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Home-screen labels are cut around 12 characters on both iOS and Android.
 * Trimming on a word boundary gives "Misbah" rather than "Misbah Seren" —
 * a hard slice reads like a rendering bug sitting under the icon.
 */
function shortName(name: string): string {
  if (name.length <= 12) return name;

  const words = name.split(/\s+/);
  let out = "";
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (next.length > 12) break;
    out = next;
  }
  // A single word longer than the limit still has to be cut somewhere.
  return out || name.slice(0, 12);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = await params;

  let salonName = "Salon Central";
  try {
    const row = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [`${salonId}_settings`],
    });
    if (row.rows.length > 0) {
      const settings = JSON.parse(row.rows[0].data as string);
      const name = settings?.salon?.name;
      if (typeof name === "string" && name.trim()) salonName = name.trim();
    }
  } catch (err) {
    // A manifest that 500s blocks installation entirely, so fall back to the
    // generic name rather than failing the request.
    console.error("[manifest] salon lookup failed:", err);
  }

  const base = `/client/${encodeURIComponent(salonId)}`;

  return Response.json(
    {
      id: base,
      name: `${salonName} — Offers & Booking`,
      short_name: shortName(salonName),
      description: `Book services, view your loyalty card and get offers from ${salonName}.`,
      start_url: base,
      scope: "/",
      display: "standalone",
      display_override: ["standalone", "minimal-ui"],
      orientation: "portrait",
      background_color: "#ffffff",
      theme_color: "#7C3AED",
      lang: "en",
      dir: "ltr",
      categories: ["lifestyle", "business"],
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
