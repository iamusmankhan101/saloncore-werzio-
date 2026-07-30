/**
 * POST /api/billing/set-price
 * Admin-only: overrides a specific salon's monthly price (independent of
 * their plan tier), e.g. for negotiated/custom deals. Future 30-day
 * invoices for this user will use the new amount. If the current cycle
 * already has an unpaid/overdue invoice, it's re-priced immediately too —
 * otherwise the change wouldn't show up until the next billing cycle,
 * which reads as "the price change did nothing" from the salon's side.
 */

import { NextRequest } from "next/server";
import {
  addDays,
  ensureBillingTables,
  getBillingUser,
  getCurrentCycleInvoice,
  setCustomPlanPrice,
  updateInvoiceAmount,
} from "@/lib/billing-db";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  let body: { userId: string; price: number; termMonths?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { userId, price } = body;
  const termMonths = body.termMonths ?? 1;
  if (!userId || typeof price !== "number" || !Number.isFinite(price) || price < 0 || ![1, 3, 6, 12].includes(termMonths)) {
    return Response.json({ ok: false, error: "Missing userId or invalid price." }, { status: 400 });
  }

  try {
    await ensureBillingTables();

    const user = await getBillingUser(userId);
    if (!user) {
      return Response.json({ ok: false, error: "Salon account not found." }, { status: 404 });
    }

    const rounded = Math.round(price);
    await setCustomPlanPrice(userId, rounded, termMonths);

    // Re-price the current cycle's invoice too, if it's still unpaid — so the
    // change is visible immediately instead of waiting for the next cycle.
    const currentInvoice = await getCurrentCycleInvoice(userId);
    if (currentInvoice && currentInvoice.status !== "paid") {
      await updateInvoiceAmount(currentInvoice.id, rounded, addDays(currentInvoice.periodStart, termMonths * 30));
    }

    console.log(`[billing/set-price] Set ${termMonths}-month price for ${userId} (${user.email}) to ${rounded}`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/set-price] DB error:", err);
    return Response.json({ ok: false, error: "Failed to update price." }, { status: 500 });
  }
}
