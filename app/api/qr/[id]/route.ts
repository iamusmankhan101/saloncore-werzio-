/**
 * GET /api/qr/[id]
 *
 * Generates a QR code that points at this salon's client-facing page.
 * `[id]` is the sub-target — a chair/station number, a staff id or a client id —
 * and is optional in practice: pass "salon" for the salon-wide code.
 *
 * Query parameters
 *   type   salon | station | staff | client | booking | loyalty  (default: salon)
 *   format dataurl (default, JSON) | png | svg
 *   size   pixel width, 120–1200 (default 320)
 *   label  free-text caption echoed back so the print sheet can title each code
 *
 * Responses
 *   ?format=dataurl  { ok, targetUrl, dataUrl, type, targetId, label }
 *   ?format=png      image/png bytes  — usable directly as <img src> or a download
 *   ?format=svg      image/svg+xml    — vector, best for large prints
 *
 * The salon the code points to is resolved from the session cookie, so a code
 * can never be minted for another tenant by changing the URL.
 */

import { NextRequest } from "next/server";
import { resolveActor } from "@/lib/api-auth";
import {
  buildQrTargetUrl,
  isQrTargetType,
  renderQrDataUrl,
  renderQrPngBuffer,
  renderQrSvg,
} from "@/lib/qr";

export const runtime = "nodejs";

/**
 * Prefer the configured public URL: behind Vercel's proxy `req.nextUrl.origin`
 * can resolve to an internal deployment host, which would bake an unreachable
 * URL into a printed code.
 */
function publicOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : req.nextUrl.origin;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sp = req.nextUrl.searchParams;

  const rawType = sp.get("type") ?? "salon";
  if (!isQrTargetType(rawType)) {
    return Response.json({ ok: false, error: `Unknown QR type "${rawType}"` }, { status: 400 });
  }

  // "salon" is the sentinel for "no sub-target" so the path segment is never empty.
  const targetId = id && id !== "salon" ? decodeURIComponent(id).slice(0, 120) : undefined;
  // Only the sub-target types need an id in the path.
  if ((rawType === "station" || rawType === "staff" || rawType === "client") && !targetId) {
    return Response.json({ ok: false, error: `type=${rawType} needs an id in the path` }, { status: 400 });
  }

  const targetUrl = buildQrTargetUrl({
    origin: publicOrigin(req),
    salonId: actor.userId,
    type: rawType,
    targetId,
  });

  const size   = Number(sp.get("size") ?? 320);
  const format = (sp.get("format") ?? "dataurl").toLowerCase();
  const label  = sp.get("label")?.slice(0, 80) ?? null;

  try {
    if (format === "png") {
      const png = await renderQrPngBuffer(targetUrl, { size });
      return new Response(new Uint8Array(png), {
        headers: {
          "Content-Type": "image/png",
          // Per-salon URL — must never land in a shared/CDN cache.
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    if (format === "svg") {
      const svg = await renderQrSvg(targetUrl, { size });
      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    const dataUrl = await renderQrDataUrl(targetUrl, { size });
    return Response.json(
      { ok: true, targetUrl, dataUrl, type: rawType, targetId: targetId ?? null, label },
      { headers: { "Cache-Control": "private, max-age=3600" } },
    );
  } catch (err) {
    console.error("[qr] generation failed:", err);
    return Response.json({ ok: false, error: "Failed to generate QR code" }, { status: 500 });
  }
}
