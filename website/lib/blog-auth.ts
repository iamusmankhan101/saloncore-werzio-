import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

// Single-shared-password auth for the blog CMS — this deployment doesn't
// share cookies/session state with the dashboard app (different domain), so
// it gets its own minimal, stateless session: an HMAC-signed expiry, no DB
// table needed. Good enough for one (or a small trusted group of) authors.

export const BLOG_SESSION_COOKIE = "blog_admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function secret(): string {
  const s = process.env.BLOG_SESSION_SECRET;
  if (!s) throw new Error("BLOG_SESSION_SECRET is not set.");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyPassword(password: string): boolean {
  const expected = process.env.BLOG_ADMIN_PASSWORD;
  if (!expected || !password) return false;
  return safeEqual(password, expected);
}

export function createSessionToken(): string {
  const expires = String(Date.now() + SESSION_TTL_MS);
  return `${expires}.${sign(expires)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig) return false;
  if (!safeEqual(sig, sign(expires))) return false;
  const expiresAt = Number(expires);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

/** Guard for API routes — the page layout covers the CMS pages themselves,
 * but routes aren't covered by a layout's redirect, so each checks directly. */
export function requireBlogSession(req: NextRequest): boolean {
  return verifySessionToken(req.cookies.get(BLOG_SESSION_COOKIE)?.value);
}
