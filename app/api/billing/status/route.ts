/**
 * GET /api/billing/status?userId=xxx
 * Returns the user's suspension status from Turso.
 * Called by the dashboard layout on every load.
 */

import { NextRequest } from "next/server";
import { ensureBillingTables, getBillingUser } from "@/lib/billing-db";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return Response.json({ ok: false, error: "Missing userId." }, { status: 400 });
  }

  try {
    await ensureBillingTables();
    const user = await getBillingUser(userId);

    if (!user) {
      return Response.json({ ok: true, suspended: false });
    }

    return Response.json({
      ok: true,
      suspended: user.suspended,
      reason: user.suspensionReason ?? null,
    });
  } catch (err) {
    console.error("[billing/status] error:", err);
    return Response.json({ ok: true, suspended: false });
  }
}