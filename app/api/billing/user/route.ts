/**
 * GET /api/billing/user
 * Returns the authenticated caller's own billing information from the database.
 */

import { NextRequest } from "next/server";
import { DEFAULT_BANK_DETAILS, getBillingUser } from "@/lib/billing-db";
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
        billingTermMonths: 1,
        suspended: false,
        isDemoSignup: false,
        bankTitle: DEFAULT_BANK_DETAILS.title,
        bankAccountNumber: DEFAULT_BANK_DETAILS.accountNumber,
        bankIban: DEFAULT_BANK_DETAILS.iban,
      });
    }

    return Response.json({
      ok: true,
      planId: billingUser.planId,
      planName: billingUser.planName,
      planPrice: billingUser.planPrice,
      billingTermMonths: billingUser.billingTermMonths,
      suspended: billingUser.suspended,
      suspensionReason: billingUser.suspensionReason,
      trialStart: billingUser.trialStart,
      isDemoSignup: billingUser.isDemoSignup,
      // Per-salon override if the admin set one, else the platform default —
      // callers don't need to know which.
      bankTitle: billingUser.paymentBankTitle || DEFAULT_BANK_DETAILS.title,
      bankAccountNumber: billingUser.paymentAccountNumber || DEFAULT_BANK_DETAILS.accountNumber,
      bankIban: billingUser.paymentIban || DEFAULT_BANK_DETAILS.iban,
    });
  } catch (err) {
    console.error("[billing/user] Error fetching billing user:", err);
    return Response.json({ ok: false, error: "Failed to fetch billing information." }, { status: 500 });
  }
}
