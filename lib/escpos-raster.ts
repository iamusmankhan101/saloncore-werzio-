/**
 * Turns the salon's logo into the 1-bit raster an ESC/POS printer can accept.
 *
 * This runs in the browser on purpose. The logo is stored as a data URL (see
 * handleLogoUpload in the account page), in whatever format the salon happened
 * to upload, and decoding that server-side would mean adding an image library
 * to a project that has none. The browser already decodes every format it
 * accepted at upload time, and it already holds the bytes, so the page hands
 * /api/print a finished bitmap and the route stays a formatter.
 */

/**
 * Printable dots across, by paper width. A thermal head is 203dpi — 8 dots/mm —
 * and the usual 80mm head is specified at 576 dots (72mm of printable window,
 * the same 72mm the CSS receipt is laid out to), 58mm at 384.
 */
const DOT_WIDTH: Record<number, number> = { 58: 384, 80: 576 };
const DEFAULT_PAPER_MM = 80;

/**
 * How much of the paper the logo may take. Full width makes a letterhead, not a
 * receipt, and every dot of it is head-time on a battery-or-USB-powered
 * printer; 60% reads as a mark above the salon name, which is what it is.
 * The absolute caps are 40mm x 20mm at 8 dots/mm, which is what the CSS
 * receipt sizes the same logo to (see .sip-logo in salon-invoice-print.tsx) —
 * the two paths print the same roll and should not disagree about how much of
 * it the logo gets. The fraction is what keeps 58mm paper proportionate, where
 * a flat 40mm would be most of the width.
 */
const LOGO_WIDTH_FRACTION = 0.6;
const MAX_LOGO_WIDTH_DOTS = 320;
const MAX_LOGO_HEIGHT_DOTS = 160;

/**
 * Luminance at or above this stays white. A logo is flat art, not a photo, so
 * this thresholds rather than dithers: dithering renders a solid mid-tone fill
 * as a speckle of alternating dots, which is precisely the "low quality ink"
 * look the rest of this receipt was changed to avoid. Set above the midpoint
 * because brand colors are usually mid-luminance (a #5B21B6 purple lands at
 * ~60) and thresholding them at 128 would drop half a wordmark to white.
 */
const BLACK_THRESHOLD = 170;

export interface ThermalRaster {
  /** Bytes per row — always widthDots / 8. */
  widthBytes: number;
  /** Rows. */
  height: number;
  /** Packed rows, MSB first, 1 = burn a dot. Base64 for the JSON body. */
  base64: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // A data URL needs no CORS, but a salon whose logo is a hosted https URL
    // would otherwise taint the canvas and make getImageData throw.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Logo could not be decoded."));
    img.src = src;
  });
}

/**
 * Returns null rather than throwing when there is nothing printable — a salon
 * with no logo, a logo that won't decode, or a browser without a canvas. The
 * receipt is the thing that matters; it prints without the mark.
 */
export async function rasterizeLogoForThermal(
  logoDataUrl: string,
  paperWidthMm: number = DEFAULT_PAPER_MM,
): Promise<ThermalRaster | null> {
  if (!logoDataUrl) return null;

  try {
    const img = await loadImage(logoDataUrl);
    const natural = { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
    if (!natural.w || !natural.h) return null;

    const dotWidth = DOT_WIDTH[paperWidthMm] ?? DOT_WIDTH[DEFAULT_PAPER_MM];
    // Rows are packed into whole bytes, so the width has to land on a multiple
    // of 8 — a width of 300 would leave 4 dots of the last byte undefined and
    // print as a ragged column down the right edge of the mark.
    let widthDots = Math.floor(Math.min(dotWidth * LOGO_WIDTH_FRACTION, MAX_LOGO_WIDTH_DOTS) / 8) * 8;
    let heightDots = Math.round((natural.h / natural.w) * widthDots);

    // A tall, narrow logo hits the height cap first; scale back by height and
    // re-round the width to its byte boundary rather than squashing the mark.
    if (heightDots > MAX_LOGO_HEIGHT_DOTS) {
      widthDots = Math.floor(((natural.w / natural.h) * MAX_LOGO_HEIGHT_DOTS) / 8) * 8;
      heightDots = MAX_LOGO_HEIGHT_DOTS;
    }
    if (widthDots < 8 || heightDots < 1) return null;

    const canvas = document.createElement("canvas");
    canvas.width = widthDots;
    canvas.height = heightDots;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    // A transparent PNG — the common case for a logo — has undefined RGB in its
    // clear pixels, which read as black once alpha is discarded below and would
    // print the mark as a filled rectangle. Laying white down first is what
    // makes "transparent" mean "no dot".
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, widthDots, heightDots);
    ctx.drawImage(img, 0, 0, widthDots, heightDots);

    const { data } = ctx.getImageData(0, 0, widthDots, heightDots);
    const widthBytes = widthDots / 8;
    const packed = new Uint8Array(widthBytes * heightDots);

    for (let y = 0; y < heightDots; y++) {
      for (let x = 0; x < widthDots; x++) {
        const i = (y * widthDots + x) * 4;
        // Rec. 601 luma — a flat green and a flat blue of the same RGB average
        // are not equally dark to the eye, and a logo thresholded on a plain
        // average loses whichever half of it is blue.
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Alpha is composited against the white laid down above, so a
        // half-transparent pixel lightens toward white instead of vanishing.
        const alpha = data[i + 3] / 255;
        const composited = lum * alpha + 255 * (1 - alpha);
        if (composited < BLACK_THRESHOLD) {
          packed[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
        }
      }
    }

    let binary = "";
    for (const byte of packed) binary += String.fromCharCode(byte);
    return { widthBytes, height: heightDots, base64: btoa(binary) };
  } catch {
    return null;
  }
}
