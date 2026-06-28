/**
 * GET /api/auth/google
 * Redirects the browser to Google's OAuth consent screen.
 * Uses PKCE + a signed state cookie to prevent CSRF.
 */

import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const REDIRECT  = `${APP_URL}/api/auth/google/callback`;

export async function GET() {
  if (!CLIENT_ID) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 501 });
  }

  // PKCE: code_verifier is random, code_challenge = SHA-256(verifier) base64url-encoded
  const state    = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    redirect_uri:          REDIRECT,
    response_type:         "code",
    scope:                 "openid email profile",
    state,
    code_challenge:        challenge,
    code_challenge_method: "S256",
    access_type:           "online",
    prompt:                "select_account",
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );

  // Short-lived HTTP-only cookies hold the state + PKCE verifier
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, maxAge: 600, path: "/" };
  res.cookies.set("g_oauth_state",    state,    cookieOpts);
  res.cookies.set("g_pkce_verifier",  verifier, cookieOpts);
  return res;
}
