import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/session";

const DASHBOARD = /^\/dashboard(\/|$)/;
const AUTH_PAGES = new Set(["/sign-in", "/sign-up"]);

export function middleware(req: NextRequest) {
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

  const token  = req.cookies.get(COOKIE_NAME)?.value ?? "";
  const userId = token ? verifySessionToken(token) : null;

  // ── Protect dashboard routes ──────────────────────────────────────────────
  if (DASHBOARD.test(pathname) && !userId) {
    const signIn = req.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.search   = "";
    return NextResponse.redirect(signIn);
  }

  // ── Redirect authenticated users away from auth pages ────────────────────
  if (AUTH_PAGES.has(pathname) && userId) {
    const dash = req.nextUrl.clone();
    dash.pathname = "/dashboard";
    dash.search   = "";
    return NextResponse.redirect(dash);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/sign-in",
    "/sign-up",
  ],
};
