/**
 * GET /api/auth/user
 * Get user by ID
 */

import { NextRequest } from "next/server";
import { getUserById } from "@/lib/auth-db";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return Response.json({ ok: false, error: "Missing userId parameter." }, { status: 400 });
  }

  try {
    const user = await getUserById(userId);

    if (!user) {
      return Response.json({ ok: false, error: "User not found." }, { status: 404 });
    }

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
    console.error("[auth/user] Error:", err);
    return Response.json({ ok: false, error: "Failed to fetch user." }, { status: 500 });
  }
}
