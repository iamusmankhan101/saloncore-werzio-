/**
 * POST /api/auth/signup
 * Create a new user account
 */

import { NextRequest } from "next/server";
import { createUser } from "@/lib/auth-db";

const ADMIN_ACCESS_CODE = "GLOW@ADMIN2026";

export async function POST(req: NextRequest) {
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
  if (adminCode && adminCode !== ADMIN_ACCESS_CODE) {
    return Response.json({ ok: false, error: "Invalid admin access code." }, { status: 400 });
  }

  const isAdmin = adminCode === ADMIN_ACCESS_CODE;

  try {
    const user = await createUser({
      email,
      password,
      ownerName,
      salonName: salonName || ownerName,
      phone: phone || "",
      role: isAdmin ? "admin" : "owner",
      emailVerified: isAdmin, // Admin accounts skip email verification
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
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
