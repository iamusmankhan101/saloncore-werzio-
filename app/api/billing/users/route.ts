/**
 * GET /api/billing/users
 * Admin-only: lists every salon's billing record so the admin panel can
 * show/edit per-salon pricing.
 */

import { NextRequest } from "next/server";
import { ensureBillingTables, getAllActiveBillingUsers } from "@/lib/billing-db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    await ensureBillingTables();
    const users = await getAllActiveBillingUsers();
    return Response.json({ ok: true, users });
  } catch (err) {
    console.error("[billing/users] Error fetching billing users:", err);
    return Response.json({ ok: false, error: "Failed to fetch salon accounts." }, { status: 500 });
  }
}
