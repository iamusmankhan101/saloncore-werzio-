/**
 * POST /api/billing/set-payment-method
 * Admin-only: picks which payment_methods row (or null, for the platform
 * default) a specific salon's invoice should show.
 */

import { NextRequest } from "next/server";
import { ensureBillingTables, getBillingUser, getPaymentMethod, setPaymentMethodForUser } from "@/lib/billing-db";
import { requireAdmin } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  let body: { userId: string; paymentMethodId: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { userId } = body;
  const paymentMethodId = body.paymentMethodId || null;
  if (!userId) {
    return Response.json({ ok: false, error: "Missing userId." }, { status: 400 });
  }

  try {
    await ensureBillingTables();

    const user = await getBillingUser(userId);
    if (!user) {
      return Response.json({ ok: false, error: "Salon account not found." }, { status: 404 });
    }
    if (paymentMethodId) {
      const method = await getPaymentMethod(paymentMethodId);
      if (!method) return Response.json({ ok: false, error: "Payment method not found." }, { status: 404 });
    }

    await setPaymentMethodForUser(userId, paymentMethodId);

    console.log(`[billing/set-payment-method] Set payment method for ${userId} (${user.email}) to ${paymentMethodId ?? "default"}`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/set-payment-method] DB error:", err);
    return Response.json({ ok: false, error: "Failed to update payment method." }, { status: 500 });
  }
}
