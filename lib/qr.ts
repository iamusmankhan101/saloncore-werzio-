/**
 * lib/qr.ts
 *
 * Server-side QR generation for the printable codes salon staff put on the
 * reception desk, each styling chair and every mirror.
 *
 * This replaces the pattern used by the loyalty page, which builds an
 * <img src="https://api.qrserver.com/..."> — that leaks every salon's claim URL
 * to a third party, needs an extra CSP origin, and prints blank whenever that
 * service is slow. Rendering locally with `qrcode` has none of those problems.
 */

import QRCode from "qrcode";

/** What a scanned code should open. `station` is the per-chair case. */
export type QrTargetType = "salon" | "station" | "staff" | "client" | "booking" | "loyalty";

// Note: there is deliberately no "feedback" code. /feedback/[token] is a
// one-time link tied to a single appointment, so it can't be baked into a
// static printed QR — those links are issued per-appointment instead.
export const QR_TARGET_TYPES: QrTargetType[] = [
  "salon", "station", "staff", "client", "booking", "loyalty",
];

export function isQrTargetType(value: string): value is QrTargetType {
  return (QR_TARGET_TYPES as string[]).includes(value);
}

/**
 * Builds the destination URL for a code.
 *
 * `salonId` always comes from the caller's own session — never from the request
 * — so a printed code can only ever point at the salon that printed it.
 * `targetId` is the sub-target (chair number, staff id, client id) and is only
 * ever used as a query value.
 */
export function buildQrTargetUrl(params: {
  origin: string;
  salonId: string;
  type: QrTargetType;
  targetId?: string;
}): string {
  const { origin, salonId, type, targetId } = params;
  const salon = encodeURIComponent(salonId);
  const id    = targetId ? encodeURIComponent(targetId) : "";

  switch (type) {
    case "station":
      return `${origin}/client/${salon}?station=${id}`;
    case "staff":
      return `${origin}/client/${salon}?staff=${id}`;
    case "client":
      return `${origin}/client/${salon}?c=${id}`;
    case "booking":
      return `${origin}/online-booking?salon=${salon}`;
    case "loyalty":
      return `${origin}/loyalty-card/${salon}`;
    case "salon":
    default:
      return `${origin}/client/${salon}`;
  }
}

interface QrRenderOptions {
  /** Pixel width of the square code. Clamped to a printable range. */
  size?: number;
  /** Quiet-zone width in modules. Below 2 many scanners struggle. */
  margin?: number;
  dark?: string;
  light?: string;
}

function normalize(opts: QrRenderOptions = {}) {
  return {
    width: Math.min(1200, Math.max(120, Math.round(opts.size ?? 320))),
    margin: Math.min(8, Math.max(1, Math.round(opts.margin ?? 2))),
    color: {
      dark:  opts.dark  ?? "#1a1a2e",
      light: opts.light ?? "#ffffff",
    },
    // "M" survives a smudged or partly-covered print while keeping the module
    // count low enough to stay scannable at business-card size.
    errorCorrectionLevel: "M" as const,
  };
}

/** base64 `data:image/png;base64,...` — what the admin UI renders inline. */
export function renderQrDataUrl(text: string, opts: QrRenderOptions = {}): Promise<string> {
  return QRCode.toDataURL(text, { type: "image/png", ...normalize(opts) });
}

/** Raw PNG bytes — used by the `?format=png` download/print path. */
export function renderQrPngBuffer(text: string, opts: QrRenderOptions = {}): Promise<Buffer> {
  return QRCode.toBuffer(text, { type: "png", ...normalize(opts) });
}

/** Crisp at any print size — best choice for a poster or A4 sheet. */
export function renderQrSvg(text: string, opts: QrRenderOptions = {}): Promise<string> {
  return QRCode.toString(text, { type: "svg", ...normalize(opts) });
}
