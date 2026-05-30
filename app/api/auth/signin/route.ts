/**
 * POST /api/auth/signin
 * Authenticate user and return user data
 */

import { NextRequest } from "next/server";
import { validateCredentials } from "@/lib/auth-db";

export async function POST(req: NextRequest) {
  let body: {
    email: string;
    password: string;
  };

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
    console.log("[auth/signin] Attempting sign-in for:", email);
    const user = await validateCredentials(email, password);
    console.log("[auth/signin] Sign-in successful for:", email);

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
    console.error("[auth/signin] Error:", err);
    const message = err instanceof Error ? err.message : "Authentication failed.";
    console.error("[auth/signin] Error message:", message);
    
    if (message === "EMAIL_NOT_VERIFIED") {
      return Response.json({ ok: false, error: "EMAIL_NOT_VERIFIED" }, { status: 403 });
    }
    
    return Response.json({ ok: false, error: message }, { status: 401 });
  }
}
