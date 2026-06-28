import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME, tokenId } from "@/lib/session";
import { isSessionValid } from "@/lib/auth-db";
import { randomBytes } from "crypto";

const DASHBOARD = /^\/dashboard(\/|$)/;
const AUTH_PAGES = new Set(["/sign-in", "/sign-up"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── HTTPS redirect in production ──────────────────────────────────────────
  if (
    process.env.NODE_ENV === "production" &&
    req.headers.get("x-forwarded-proto") === "http"
  ) {
    const httpsUrl = req.nextUrl.clone();
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, { status: 301 });
  }

  // ── Session check ─────────────────────────────────────────────────────────
  const token  = req.cookies.get(COOKIE_NAME)?.value ?? "";
  const userId = token ? verifySessionToken(token) : null;

  // Only hit DB when cryptographic check passes (avoids DB queries for bad tokens)
  let sessionOk = false;
  if (userId) {
    try {
      sessionOk = await isSessionValid(tokenId(token));
    } catch {
      // DB unavailable — fall back to crypto-only check so the app stays up
      sessionOk = true;
    }
  }

  // ── Protect dashboard routes ──────────────────────────────────────────────
  if (DASHBOARD.test(pathname) && !sessionOk) {
    const dest = req.nextUrl.clone();
    dest.pathname = "/sign-in";
    dest.search   = "";
    return NextResponse.redirect(dest);
  }

  // ── Redirect authenticated users away from auth pages ────────────────────
  if (AUTH_PAGES.has(pathname) && sessionOk) {
    const dest = req.nextUrl.clone();
    dest.pathname = "/dashboard";
    dest.search   = "";
    return NextResponse.redirect(dest);
  }

  // ── Nonce-based Content-Security-Policy ───────────────────────────────────
  const nonce = randomBytes(16).toString("base64");
  const isProd = process.env.NODE_ENV === "production";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.turso.io wss://*.turso.io https://api.resend.com https://graph.facebook.com https://api.qrserver.com https://api.wasenderapi.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    isProd ? "upgrade-insecure-requests" : "",
  ].filter(Boolean).join("; ");

  // Pass nonce to Server Components via request header
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set("x-nonce", nonce);
  reqHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  matcher: [
    // Run on all routes except static assets and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
