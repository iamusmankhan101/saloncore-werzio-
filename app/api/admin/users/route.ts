/**
 * GET /api/admin/users
 * Admin-only: lists every login account on the platform — salon owners,
 * managers, and staff — for the Admin panel's Users tab. Distinct from
 * /api/billing/users, which is one row per salon's billing record, not
 * every individual account that can log in to it.
 */

import { NextRequest } from "next/server";
import { getAllUsers } from "@/lib/auth-db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const users = await getAllUsers();
    return Response.json({ ok: true, users });
  } catch (err) {
    console.error("[admin/users] Error fetching users:", err);
    return Response.json({ ok: false, error: "Failed to fetch users." }, { status: 500 });
  }
}
