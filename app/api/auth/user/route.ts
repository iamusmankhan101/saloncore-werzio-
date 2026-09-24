/**
 * GET /api/auth/user
 * Returns the signed-in user's own profile, taken from the session cookie.
 * Never accepts a user id from the request — that let anyone read any
 * account's email, phone and role.
 */

import { NextRequest } from "next/server";
import { getUserById } from "@/lib/auth-db";
import { getSessionUserId } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return Response.json({ ok: false, error: "Not authenticated." }, { status: 401 });
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
        approvalStatus: user.approvalStatus,
        accountFrozen: user.accountFrozen,
        freezeReason: user.freezeReason,
        createdAt: user.createdAt,
        salonOwnerId: user.salonOwnerId,
        staffId: user.staffId,
        locationId: user.locationId,
        permissions: user.permissions,
      },
    });
  } catch (err) {
    console.error("[auth/user] Error:", err);
    return Response.json({ ok: false, error: "Failed to fetch user." }, { status: 500 });
  }
}
