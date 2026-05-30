/**
 * POST /api/billing/update-plan
 * Updates a user's plan in the database
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureBillingTables } from "@/lib/billing-db";

const PLAN_PRICES: Record<string, number> = {
  free:    0,
  pro:     6000,
  basic:   6000,  // legacy support
  premium: 10000,
};

const PLAN_NAMES: Record<string, string> = {
  free:    "Free",
  pro:     "Pro",
  basic:   "Pro",  // legacy support
  premium: "Premium",
};

export async function POST(req: NextRequest) {
  let body: {
    userId: string;
    planId: string;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { userId, planId } = body;
  if (!userId || !planId) {
    return Response.json({ ok: false, error: "Missing required fields." }, { status: 400 });
  }

  const planPrice = PLAN_PRICES[planId];
  const planName  = PLAN_NAMES[planId];
  if (planPrice === undefined) {
    return Response.json({ ok: false, error: `Unknown plan: ${planId}` }, { status: 400 });
  }

  try {
    await ensureBillingTables();
    
    // Update the plan in the database
    await db.execute({
      sql: `UPDATE billing_users 
            SET plan_id = ?, plan_name = ?, plan_price = ? 
            WHERE id = ?`,
      args: [planId, planName, planPrice, userId],
    });

    console.log(`[billing/update-plan] Updated user ${userId} to ${planName} plan`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/update-plan] DB error:", err);
    return Response.json({ ok: false, error: "Failed to update plan." }, { status: 500 });
  }
}
