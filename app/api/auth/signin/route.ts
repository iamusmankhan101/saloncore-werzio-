/**
 * POST /api/auth/signin
 * Authenticate user with rate limiting and account lockout.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateCredentials } from "@/lib/auth-db";
import { createSessionToken, COOKIE_NAME, cookieOptions, tokenId } from "@/lib/session";
import { createDbSession } from "@/lib/auth-db";

// ─── In-memory rate limiter ───────────────────────────────────────────────────
// Keyed by IP address. Resets on server restart.
// For multi-instance deployments replace with Redis / Upstash.

interface RateEntry {
  attempts: number;
  windowStart: number;
  blockedUntil?: number;
}

const store = new Map<string, RateEntry>();

const WINDOW_MS   = 15 * 60 * 1000;  // 15-minute sliding window
const MAX_ATTEMPTS = 10;              // max attempts before lockout
const BLOCK_MS    = 30 * 60 * 1000;  // 30-minute lockout

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function rateCheck(key: string): { blocked: boolean; retryAfter?: number } {
  const now = Date.now();
  const e = store.get(key);

  if (!e) {
    store.set(key, { attempts: 1, windowStart: now });
    return { blocked: false };
  }

  // Still in active lockout?
  if (e.blockedUntil && now < e.blockedUntil) {
    return { blocked: true, retryAfter: Math.ceil((e.blockedUntil - now) / 1000) };
  }

  // Window expired — reset
  if (now - e.windowStart > WINDOW_MS) {
    store.set(key, { attempts: 1, windowStart: now });
    return { blocked: false };
  }

  e.attempts++;

  if (e.attempts > MAX_ATTEMPTS) {
    e.blockedUntil = now + BLOCK_MS;
    return { blocked: true, retryAfter: Math.ceil(BLOCK_MS / 1000) };
  }

  return { blocked: false };
}

function rateClear(key: string) {
  store.delete(key);
}

// Periodically prune stale entries so the Map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [k, e] of store) {
    const expired = now - e.windowStart > WINDOW_MS * 2;
    const unblocked = !e.blockedUntil || now > e.blockedUntil;
    if (expired && unblocked) store.delete(k);
  }
}, 10 * 60 * 1000);

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

  // Check rate limit before doing any work
  const limit = rateCheck(ip);
  if (limit.blocked) {
    const minutes = Math.ceil((limit.retryAfter ?? BLOCK_MS / 1000) / 60);
    return Response.json(
      { ok: false, error: `Too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`, retryAfter: limit.retryAfter },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 0) } },
    );
  }

  let body: { email: string; password: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return Response.json({ ok: false, error: "Missing email or password." }, { status: 400 });
  }

  try {
    const user = await validateCredentials(email, password);

    // Success — clear the rate-limit counter for this IP
    rateClear(ip);

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        ownerName: user.ownerName,
        salonName: user.salonName,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    });

    // Persist session in DB so it can be immediately revoked on signout
    const token = createSessionToken(user.id);
    const expiresAt = new Date(Date.now() + cookieOptions.maxAge * 1000);
    await createDbSession(tokenId(token), user.id, expiresAt);

    // Set HTTP-only cookie — not readable by JavaScript
    res.cookies.set(COOKIE_NAME, token, cookieOptions);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed.";

    if (message === "EMAIL_NOT_VERIFIED") {
      return Response.json({ ok: false, error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
    }

    if (message === "Invalid email or password.") {
      return Response.json({ ok: false, error: message }, { status: 401 });
    }

    console.error("[auth/signin] Unexpected error:", message);
    return Response.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
