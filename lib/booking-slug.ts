/**
 * Short, readable online-booking links: /book/<slug> instead of
 * /online-booking?salon=<user id>.
 *
 * Slugs live in their own table rather than inside the salon's settings JSON,
 * because the dashboard saves settings as one whole object from the browser —
 * a slug stored there could be overwritten by a tab that never loaded it.
 * A salon keeps its slug when it is renamed, so printed links and QR codes
 * stay valid. The old ?salon= link keeps working too.
 */

import { db } from "@/lib/db";

const SLUG_MIN = 3;
const SLUG_MAX = 40;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Paths that look like app pages or could confuse customers.
const RESERVED = new Set(["admin", "api", "app", "book", "booking", "dashboard", "salon", "saloncentral", "sign-in", "sign-up", "support", "www"]);

let tableReady: Promise<unknown> | null = null;
function ensureTable() {
  tableReady ??= db.execute(`
    CREATE TABLE IF NOT EXISTS booking_slugs (
      slug       TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )
  `).catch((err) => { tableReady = null; throw err; });
  return tableReady;
}

/** "Misbah's Serenity Spa & Salon" → "misbahs-serenity-spa-salon" */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

export function validateSlug(slug: string): string | null {
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) return `Use ${SLUG_MIN}-${SLUG_MAX} characters.`;
  if (!SLUG_PATTERN.test(slug)) return "Use only lowercase letters, numbers and single dashes.";
  if (RESERVED.has(slug)) return "That name is reserved. Please pick another.";
  return null;
}

export async function resolveBookingSlug(slug: string): Promise<string | null> {
  await ensureTable();
  const result = await db.execute({ sql: "SELECT user_id FROM booking_slugs WHERE slug = ?", args: [slug.toLowerCase()] });
  return (result.rows[0]?.user_id as string | undefined) ?? null;
}

export async function getBookingSlug(userId: string): Promise<string | null> {
  await ensureTable();
  const result = await db.execute({ sql: "SELECT slug FROM booking_slugs WHERE user_id = ?", args: [userId] });
  return (result.rows[0]?.slug as string | undefined) ?? null;
}

async function salonName(userId: string): Promise<string> {
  const result = await db.execute({ sql: "SELECT data FROM salon_data WHERE entity = ?", args: [`${userId}_settings`] });
  try {
    const settings = result.rows.length ? JSON.parse(result.rows[0].data as string) : {};
    return typeof settings?.salon?.name === "string" ? settings.salon.name : "";
  } catch {
    return "";
  }
}

/** The salon's slug, creating one from its name (with -2, -3… if taken) on first use. */
export async function getOrCreateBookingSlug(userId: string): Promise<string> {
  const existing = await getBookingSlug(userId);
  if (existing) return existing;

  let base = slugify(await salonName(userId));
  if (validateSlug(base)) base = "salon";
  for (let n = 1; n < 1000; n++) {
    const suffix = n === 1 ? "" : `-${n}`;
    const candidate = `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (RESERVED.has(candidate)) continue;
    const result = await db.execute({
      sql: "INSERT OR IGNORE INTO booking_slugs (slug, user_id, created_at) VALUES (?, ?, ?)",
      args: [candidate, userId, new Date().toISOString()],
    });
    if (result.rowsAffected > 0) return candidate;
    // Either the slug is taken or this salon got one concurrently.
    const mine = await getBookingSlug(userId);
    if (mine) return mine;
  }
  throw new Error("Could not create a booking link.");
}

/** Change the salon's slug. Returns an error message, or null on success. */
export async function setBookingSlug(userId: string, rawSlug: string): Promise<string | null> {
  const slug = rawSlug.trim().toLowerCase();
  const invalid = validateSlug(slug);
  if (invalid) return invalid;
  await ensureTable();
  const owner = await resolveBookingSlug(slug);
  if (owner && owner !== userId) return "That link is already taken by another salon.";
  if (owner === userId) return null;
  await db.batch([
    { sql: "DELETE FROM booking_slugs WHERE user_id = ?", args: [userId] },
    { sql: "INSERT INTO booking_slugs (slug, user_id, created_at) VALUES (?, ?, ?)", args: [slug, userId, new Date().toISOString()] },
  ], "write");
  return null;
}
