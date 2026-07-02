/**
 * GET /api/billing/user
 * Returns the authenticated caller's own billing information from the database.
 */

import { NextRequest } from "next/server";
import { getBillingUser } from "@/lib/billing-db";
import { resolveActor } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const billingUser = await getBillingUser(actor.userId);
    
    if (!billingUser) {
      // User not found in billing DB - they're on free plan
      return Response.json({ 
        ok: true, 
        planId: "free",
        planName: "Free",
        planPrice: 0,
        suspended: false,
      });
    }

    return Response.json({
      ok: true,
      planId: billingUser.planId,
      planName: billingUser.planName,
      planPrice: billingUser.planPrice,
      suspended: billingUser.suspended,
      suspensionReason: billingUser.suspensionReason,
      trialStart: billingUser.trialStart,
    });
  } catch (err) {
    console.error("[billing/user] Error fetching billing user:", err);
    return Response.json({ ok: false, error: "Failed to fetch billing information." }, { status: 500 });
  }
}
