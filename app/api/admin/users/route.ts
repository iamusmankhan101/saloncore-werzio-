/**
 * GET /api/admin/users
 * Admin-only: lists every login account on the platform — salon owners,
 * managers, and staff — for the Admin panel's Users tab. Distinct from
 * /api/billing/users, which is one row per salon's billing record, not
 * every individual account that can log in to it.
 */

import { NextRequest } from "next/server";
import { getAllUsers, updateUserApprovalStatus, type ApprovalStatus } from "@/lib/auth-db";
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

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  let body: { userId?: string; approvalStatus?: ApprovalStatus };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.userId || !body.approvalStatus) {
    return Response.json({ ok: false, error: "Missing userId or approvalStatus." }, { status: 400 });
  }
  if (!["pending", "approved", "rejected"].includes(body.approvalStatus)) {
    return Response.json({ ok: false, error: "Invalid approval status." }, { status: 400 });
  }

  try {
    const user = await updateUserApprovalStatus(body.userId, body.approvalStatus);
    return Response.json({ ok: true, user });
  } catch (err) {
    console.error("[admin/users] Approval update error:", err);
    return Response.json({ ok: false, error: err instanceof Error ? err.message : "Failed to update approval." }, { status: 500 });
  }
}
