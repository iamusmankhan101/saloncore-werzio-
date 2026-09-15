/**
 * GET /api/salon-icon/[salonId] — the salon's own logo, as a PWA app icon
 *
 * Customers install a *salon's* app, so the home-screen icon has to be that
 * salon's logo, not the Salon Central mark. Logos are stored as base64 data
 * URLs inside the settings blob, which can't be used directly as an icon:
 * data: URLs in a manifest are unevenly supported, and iOS ignores the
 * manifest for icons altogether (it reads <link rel="apple-touch-icon">).
 * Both paths need a real URL serving real bytes at a declared size, which is
 * what this endpoint is.
 *
 * Query parameters
 *   size     output square edge in px (default 192, clamped 32–1024)
 *   purpose  "any" (default) | "maskable"
 *
 * "maskable" matters on Android: the OS crops icons to a circle/squircle, so
 * the logo is inset to ~70% and centred, keeping it inside the safe zone
 * instead of having its edges shaved off.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/** Logos are user-uploaded; cap the decode so a huge one can't wedge a function. */
const MAX_LOGO_BYTES = 8 * 1024 * 1024;

interface StoredLogo {
  bytes: Buffer;
  /** From the data URL header, so the unresized fallback serves a truthful type. */
  mime: string;
}

async function getSalonLogo(salonId: string): Promise<StoredLogo | null> {
  try {
    const row = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [`${salonId}_settings`],
    });
    if (row.rows.length === 0) return null;

    const logo = JSON.parse(row.rows[0].data as string)?.salon?.logo;
    if (typeof logo !== "string" || !logo.startsWith("data:image/")) return null;

    const comma = logo.indexOf(",");
    if (comma === -1) return null;
    const base64 = logo.slice(comma + 1);
    if (!base64) return null;
    // 4 base64 chars per 3 bytes — check before allocating.
    if (base64.length * 0.75 > MAX_LOGO_BYTES) return null;

    const mimeMatch = /^data:(image\/[a-z0-9.+-]+)/i.exec(logo);
    const bytes = Buffer.from(base64, "base64");
    return bytes.length > 0 ? { bytes, mime: mimeMatch?.[1] ?? "image/png" } : null;
  } catch (err) {
    console.error("[salon-icon] logo lookup failed:", err);
    return null;
  }
}

/**
 * sharp is a native module, so it can be present at build time and still fail
 * to load in the deployed function (a missing platform binary). Imported at
 * module scope that failure throws before the handler ever runs — which no
 * try/catch in here can catch, so the route 500s for *every* salon, including
 * the logo-less path that has no resizing to do. Resolving it lazily turns
 * that into a degraded icon instead of a dead endpoint.
 */
async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch (err) {
    console.error("[salon-icon] sharp unavailable — serving the logo unresized:", err);
    return null;
  }
}

/**
 * The stored logo, untouched. Already capped at 300×300 by the uploader, so
 * it is a usable icon at every size the manifest asks for — the browser
 * scales it. Not as good as a real resize (no white flattening, so a
 * transparent logo sits on black in an iOS home-screen icon), but it is the
 * salon's own mark, which is the whole point of this endpoint.
 */
function unresized(logo: StoredLogo) {
  return new Response(new Uint8Array(logo.bytes), {
    headers: {
      "Content-Type": logo.mime,
      // Shorter than the resized path's hour: this is a degraded response, so
      // a deploy that restores sharp shouldn't stay papered over for long.
      "Cache-Control": "public, max-age=300",
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = await params;
  const sp = req.nextUrl.searchParams;

  const size = Math.min(1024, Math.max(32, Number(sp.get("size")) || 192));
  const maskable = sp.get("purpose") === "maskable";

  const logo = await getSalonLogo(salonId);

  // No logo configured (or it failed to load): fall back to the Salon Central
  // mark so the install still produces a usable icon rather than a blank tile.
  if (!logo) {
    return Response.redirect(new URL("/icons/icon-512.png", req.nextUrl.origin), 302);
  }

  const sharp = await loadSharp();
  if (!sharp) return unresized(logo);

  try {
    // Flattened onto white rather than left transparent: iOS renders a
    // transparent apple-touch-icon on a black background, which turns a dark
    // logo into an unreadable smudge.
    const inner = maskable ? Math.round(size * 0.7) : size;
    const pad = Math.round((size - inner) / 2);

    const resized = await sharp(logo.bytes)
      .resize(inner, inner, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .extend({
        top: pad, bottom: size - inner - pad,
        left: pad, right: size - inner - pad,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();

    return new Response(new Uint8Array(resized), {
      headers: {
        "Content-Type": "image/png",
        // Logos change rarely; an hour keeps installs snappy without pinning a
        // stale logo for long after a salon updates it.
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    // Fall back to the salon's own logo rather than the Salon Central mark —
    // a soft icon still identifies the right salon.
    console.error("[salon-icon] resize failed:", err);
    return unresized(logo);
  }
}
