/**
 * POST /api/billing/set-payment-details
 * Admin-only: overrides the bank account shown on a specific salon's invoice
 * (Account Title / Account Number / IBAN). Passing empty strings clears the
 * override so that salon falls back to DEFAULT_BANK_DETAILS.
 */

import { NextRequest } from "next/server";
import { ensureBillingTables, getBillingUser, setPaymentDetails } from "@/lib/billing-db";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  let body: { userId: string; bankTitle: string; accountNumber: string; iban: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { userId } = body;
  const bankTitle = String(body.bankTitle ?? "");
  const accountNumber = String(body.accountNumber ?? "");
  const iban = String(body.iban ?? "");
  if (!userId) {
    return Response.json({ ok: false, error: "Missing userId." }, { status: 400 });
  }

  try {
    await ensureBillingTables();

    const user = await getBillingUser(userId);
    if (!user) {
      return Response.json({ ok: false, error: "Salon account not found." }, { status: 404 });
    }

    await setPaymentDetails(userId, { bankTitle, accountNumber, iban });

    console.log(`[billing/set-payment-details] Updated payment details for ${userId} (${user.email})`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/set-payment-details] DB error:", err);
    return Response.json({ ok: false, error: "Failed to update payment details." }, { status: 500 });
  }
}
