/**
 * GET /api/billing/user
 * Returns the current user's billing information from the database
 */

import { NextRequest } from "next/server";
import { getBillingUser } from "@/lib/billing-db";

export async function GET(req: NextRequest) {
  // Get user ID from query params
  const userId = req.nextUrl.searchParams.get("userId");
  
  if (!userId) {
    return Response.json({ ok: false, error: "Missing userId parameter." }, { status: 400 });
  }

  try {
    const billingUser = await getBillingUser(userId);
    
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
