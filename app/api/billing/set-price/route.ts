/**
 * POST /api/billing/set-price
 * Admin-only: overrides a specific salon's monthly price (independent of
 * their plan tier), e.g. for negotiated/custom deals. Future 30-day
 * invoices for this user will use the new amount; already-issued invoices
 * are unaffected.
 */

import { NextRequest } from "next/server";
import { ensureBillingTables, getBillingUser, setCustomPlanPrice } from "@/lib/billing-db";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  let body: { userId: string; price: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { userId, price } = body;
  if (!userId || typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    return Response.json({ ok: false, error: "Missing userId or invalid price." }, { status: 400 });
  }

  try {
    await ensureBillingTables();

    const user = await getBillingUser(userId);
    if (!user) {
      return Response.json({ ok: false, error: "Salon account not found." }, { status: 404 });
    }

    await setCustomPlanPrice(userId, Math.round(price));

    console.log(`[billing/set-price] Set custom price for ${userId} (${user.email}) to ${price}`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/set-price] DB error:", err);
    return Response.json({ ok: false, error: "Failed to update price." }, { status: 500 });
  }
}
