/**
 * POST /api/auth/signup
 * Create a new user account
 */

import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { createUser } from "@/lib/auth-db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Set ADMIN_ACCESS_CODE in .env.local — never hard-code secrets in source.
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE ?? "";

// Timing-safe compare that also fails closed when ADMIN_ACCESS_CODE is unset —
// a plain `adminCode === ADMIN_ACCESS_CODE` would let anyone submit adminCode: ""
// and match an empty/misconfigured env var, self-granting the admin role.
function validAdminCode(code: string | undefined): boolean {
  if (!ADMIN_ACCESS_CODE || !code) return false;
  const a = Buffer.from(code);
  const b = Buffer.from(ADMIN_ACCESS_CODE);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const limit = rateLimit("signup", clientIp(req), { maxAttempts: 8, windowMs: 15 * 60 * 1000, blockMs: 30 * 60 * 1000 });
  if (limit.blocked) {
    return Response.json(
      { ok: false, error: "Too many signup attempts. Please try again later.", retryAfter: limit.retryAfter },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 0) } },
    );
  }

  let body: {
    email: string;
    password: string;
    ownerName: string;
    salonName: string;
    phone: string;
    adminCode?: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { email, password, ownerName, salonName, phone, adminCode } = body;

  if (!email || !password || !ownerName) {
    return Response.json({ ok: false, error: "Missing required fields." }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // Check admin code if provided
  if (adminCode && !validAdminCode(adminCode)) {
    return Response.json({ ok: false, error: "Invalid admin access code." }, { status: 400 });
  }

  const isAdmin = validAdminCode(adminCode);

  try {
    const user = await createUser({
      email,
      password,
      ownerName,
      salonName: salonName || ownerName,
      phone: phone || "",
      role: isAdmin ? "admin" : "owner",
      emailVerified: true,
    });

    return Response.json({
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
  } catch (err) {
    console.error("[auth/signup] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to create account.";

    // User-facing errors (email taken, etc.) → 400; server/DB errors → 500
    const isUserError = message.includes("already exists") || message.includes("Invalid admin");
    return Response.json({ ok: false, error: isUserError ? message : "Failed to create account. Please try again." }, { status: isUserError ? 400 : 500 });
  }
}
