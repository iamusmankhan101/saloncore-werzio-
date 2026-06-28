/**
 * GET /api/billing/status?userId=xxx
 * Returns the user's suspension status from Turso.
 * Called by the dashboard layout on every load.
 */

import { NextRequest } from "next/server";
import { ensureBillingTables, getBillingUser, getAllUnpaidInvoicesForUser } from "@/lib/billing-db";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return Response.json({ ok: false, error: "Missing userId." }, { status: 400 });
  }

  try {
    await ensureBillingTables();
    const [user, unpaidInvoices] = await Promise.all([
      getBillingUser(userId),
      getAllUnpaidInvoicesForUser(userId),
    ]);

    // User not in billing DB yet → not suspended, no invoices
    if (!user) {
      return Response.json({ ok: true, suspended: false, unpaidInvoice: null });
    }

    // Return the oldest unpaid/overdue invoice as the "most urgent"
    const oldest = unpaidInvoices[0] ?? null;

    return Response.json({
      ok: true,
      suspended: user.suspended,
      reason: user.suspensionReason ?? null,
      unpaidInvoice: oldest ? {
        number:    oldest.number,
        amount:    oldest.amount,
        status:    oldest.status,
        dueDate:   oldest.dueDate,
        issuedDate: oldest.issuedDate,
      } : null,
    });
  } catch (err) {
    console.error("[billing/status] error:", err);
    return Response.json({ ok: true, suspended: false, unpaidInvoice: null });
  }
}