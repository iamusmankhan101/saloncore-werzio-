/**
 * Client-side image intake for profile photos.
 *
 * Photos are stored inline as data URLs (in localStorage, and synced to Turso
 * with the rest of the record), so the original file must never be stored as-is:
 * a single modern phone photo is 3-8 MB, and base64 adds ~33% on top. A handful
 * of those would blow the ~5 MB localStorage budget and bloat every sync.
 *
 * So the file is drawn to a canvas, scaled so its longest edge is MAX_EDGE_PX,
 * and re-encoded as JPEG — which turns a 6 MB photo into roughly 20-40 KB while
 * staying sharp at the sizes these avatars are actually displayed at.
 */

/** Longest edge, in pixels, of a stored photo. 320 covers a 160px avatar on a 2x screen. */
const MAX_EDGE_PX = 320;
const JPEG_QUALITY = 0.82;

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export class ImageTooLargeError extends Error {}
export class ImageDecodeError extends Error {}

/**
 * Reads an image file and returns a downscaled JPEG data URL.
 *
 * Rejects rather than silently storing anything it can't decode, so a PDF or a
 * corrupt file surfaces as an error in the form instead of a broken <img>.
 */
export async function fileToResizedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ImageDecodeError("That file isn't an image. Pick a JPG or PNG.");
  }
  // Guard before decoding: a huge file would otherwise be fully read into
  // memory just to be rejected, and on a till PC that is a visible freeze.
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageTooLargeError("That image is over 15 MB. Pick a smaller one.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImageDecodeError("Could not read that file."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new ImageDecodeError("That image could not be opened."));
    el.src = dataUrl;
  });

  const longest = Math.max(img.width, img.height);
  const scale = longest > MAX_EDGE_PX ? MAX_EDGE_PX / longest : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageDecodeError("This browser could not process the image.");
  // JPEG has no alpha, so a transparent PNG would otherwise composite onto black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
