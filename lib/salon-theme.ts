/**
 * Per-salon theming for the customer-facing client app.
 *
 * The dashboard is Salon Central's own product and stays locked to the house
 * purple on purpose (see applyAppearanceSettings in lib/settings-store.ts).
 * /client/[salonId] is the opposite case: it is the *salon's* app, sitting on a
 * customer's home screen under the salon's own logo, so it should wear the
 * salon's colours rather than ours.
 *
 * The accent is resolved in this order:
 *   1. settings.appearance.accent, when the salon actually picked one in
 *      Settings → Appearance. An explicit choice always wins.
 *   2. The dominant colour of the salon's logo, read in the browser straight
 *      off the data URL the app already has. No server work, no extra request,
 *      and no dependency on sharp — so every salon looks branded without
 *      anyone configuring anything.
 *   3. The house purple, for a salon with neither.
 *
 * Whatever the source, the colour is pushed through legibleOnWhite() before it
 * is used. A logo colour is chosen to look good on a sign, not to carry 13px
 * white button text — Misbah's pale gold is contrast 1.8:1 against white,
 * which would make every button in the app unreadable.
 */

export const PLATFORM_ACCENT = "#7C3AED";

/** WCAG AA for normal-size text. The accent carries 13px white button labels. */
const MIN_CONTRAST_ON_WHITE = 4.5;

export interface SalonTheme {
  /** Hex. Inline styles (and InstallPrompt) need a real value, not a var(). */
  accent: string;
  /** Custom properties to spread onto the app root. */
  vars: Record<string, string>;
}

// ─── Colour conversion ───────────────────────────────────────────────────────

interface Rgb { r: number; g: number; b: number }
interface Hsl { h: number; s: number; l: number }

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function hexToRgb(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, "");
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const hex = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn)      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else                 h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };
  return { r: channel(hn + 1 / 3) * 255, g: channel(hn) * 255, b: channel(hn - 1 / 3) * 255 };
}

function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio of white text sitting on this colour. */
function contrastOnWhite(rgb: Rgb): number {
  return 1.05 / (relativeLuminance(rgb) + 0.05);
}

// ─── Making a brand colour usable ────────────────────────────────────────────

/**
 * Darkens a colour, keeping its hue, until white text on it passes AA. A logo
 * colour that is already dark enough comes back untouched.
 *
 * Saturation gets a floor too: a washed-out logo colour darkened on its own
 * turns into grey-brown sludge, which reads as a broken theme rather than as
 * the salon's colour.
 */
export function legibleOnWhite(hex: string, minContrast = MIN_CONTRAST_ON_WHITE): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return PLATFORM_ACCENT;

  const hsl = rgbToHsl(rgb);
  // A near-grey colour has no hue worth preserving — don't invent one.
  const s = hsl.s < 0.08 ? hsl.s : Math.max(hsl.s, 0.32);

  // Black passes at 21:1, so this always converges.
  for (let l = hsl.l; l >= 0; l -= 0.01) {
    const candidate = hslToRgb({ h: hsl.h, s, l });
    if (contrastOnWhite(candidate) >= minContrast) return rgbToHex(candidate);
  }
  return "#000000";
}

/** Same hue, shifted lightness, never falling below the legibility floor. */
function shift(hex: string, delta: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb);
  const moved = hslToRgb({ h, s, l: clamp(l + delta, 0.04, 0.96) });
  return delta > 0 ? legibleOnWhite(rgbToHex(moved)) : rgbToHex(moved);
}

function rgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex) ?? hexToRgb(PLATFORM_ACCENT)!;
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

/** Builds the full set of custom properties the client app's stylesheet reads. */
export function buildTheme(rawAccent: string): SalonTheme {
  const accent = legibleOnWhite(rawAccent);
  // The gradient runs deep → lifted so the hero keeps the depth the fixed
  // purple had. Both ends stay legible: white sits on top of the whole sweep.
  const deep = shift(accent, -0.09);
  const lift = shift(accent, +0.07);

  return {
    accent,
    vars: {
      "--ca-accent": accent,
      "--ca-accent-gradient": `linear-gradient(135deg, ${deep} 0%, ${lift} 100%)`,
      "--ca-accent-dim": rgba(accent, 0.08),
      "--ca-accent-shadow": rgba(accent, 0.22),
      "--ca-accent-glow": rgba(accent, 0.3),
    },
  };
}

// ─── Reading a colour out of the logo ────────────────────────────────────────

/** Sampled small: this is a dominant-hue question, not a detail question. */
const SAMPLE_EDGE = 48;
/** 15° per bucket — fine enough to split gold from orange, coarse enough that
 *  antialiasing along a stroke doesn't scatter one colour across buckets. */
const HUE_BUCKETS = 24;
/** Below this the logo is effectively greyscale and has no brand colour to read. */
const MIN_BUCKET_WEIGHT = 8;

function loadImage(src: string, timeoutMs: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (result: HTMLImageElement | null) => {
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      resolve(result);
    };
    // A logo that never decodes must not hold the whole app on its skeleton.
    const timer = setTimeout(() => done(null), timeoutMs);
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });
}

/**
 * The dominant *brand* colour of an image, or null if it hasn't got one.
 *
 * Transparent, near-white, near-black and unsaturated pixels are all skipped:
 * on a salon logo those are the background and the drop shadow, never the
 * brand. What's left is bucketed by hue and weighted by saturation, so a small
 * vivid mark beats a large washed-out wash of the same hue.
 */
export async function dominantColorFromImage(src: string, timeoutMs = 1200): Promise<string | null> {
  if (typeof document === "undefined") return null;

  try {
    const img = await loadImage(src, timeoutMs);
    if (!img) return null;

    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_EDGE;
    canvas.height = SAMPLE_EDGE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, SAMPLE_EDGE, SAMPLE_EDGE);

    // Same-origin data URL, so this can't taint the canvas — but a browser with
    // canvas readback blocked still throws, hence the surrounding try.
    const { data } = ctx.getImageData(0, 0, SAMPLE_EDGE, SAMPLE_EDGE);

    const buckets = Array.from({ length: HUE_BUCKETS }, () => ({ w: 0, r: 0, g: 0, b: 0 }));

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 128) continue;

      const r = data[i], g = data[i + 1], b = data[i + 2];
      const { h, s, l } = rgbToHsl({ r, g, b });
      if (s < 0.18) continue;
      if (l > 0.92 || l < 0.08) continue;

      const bucket = buckets[Math.floor(h / (360 / HUE_BUCKETS)) % HUE_BUCKETS];
      bucket.w += s;
      bucket.r += r * s;
      bucket.g += g * s;
      bucket.b += b * s;
    }

    const best = buckets.reduce((a, b) => (b.w > a.w ? b : a));
    if (best.w < MIN_BUCKET_WEIGHT) return null;

    return rgbToHex({ r: best.r / best.w, g: best.g / best.w, b: best.b / best.w });
  } catch {
    // Any failure here just means the salon keeps the default theme.
    return null;
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Resolves the theme for one salon. Never rejects: a salon with a broken logo
 * and no saved colour gets the house purple rather than an unstyled app.
 */
export async function resolveSalonTheme(
  { chosenAccent, logo }: { chosenAccent?: string; logo?: string },
): Promise<SalonTheme> {
  // A salon that picked a colour means it. Note that the stored default is the
  // house purple, which is indistinguishable from "never opened that screen" —
  // so it is treated as unset and the logo still gets a say.
  if (chosenAccent && hexToRgb(chosenAccent) && chosenAccent.toLowerCase() !== PLATFORM_ACCENT.toLowerCase()) {
    return buildTheme(chosenAccent);
  }

  if (logo?.startsWith("data:image/")) {
    const fromLogo = await dominantColorFromImage(logo);
    if (fromLogo) return buildTheme(fromLogo);
  }

  return buildTheme(PLATFORM_ACCENT);
}
