/**
 * GET /api/billing/invoices?userId=xxx
 * Returns the user's real invoice history from the billing database
 * (the same table the admin-approval flow and the daily cron write to).
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureBillingTables, getBillingUser } from "@/lib/billing-db";
import type { Invoice, InvoiceStatus } from "@/lib/invoices";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return Response.json({ ok: false, error: "Missing userId parameter." }, { status: 400 });
  }

  try {
    await ensureBillingTables();

    const user = await getBillingUser(userId);
    if (!user) {
      return Response.json({ ok: true, invoices: [] });
    }

    const res = await db.execute({
      sql: "SELECT * FROM billing_invoices WHERE user_id = ? ORDER BY period_start DESC",
      args: [userId],
    });

    const invoices: Invoice[] = res.rows.map((r) => {
      const amount = r.amount as number;
      return {
        id: r.id as string,
        number: r.number as string,
        userId: user.id,
        userName: user.ownerName,
        salonName: user.salonName,
        userEmail: user.email,
        userPhone: user.phone,
        planId: user.planId,
        planName: user.planName,
        items: [{
          description: `${user.planName} Plan — Monthly Subscription`,
          qty: 1,
          unitPrice: amount,
          total: amount,
        }],
        subtotal: amount,
        tax: 0,
        total: amount,
        issuedDate: r.issued_date as string,
        dueDate: r.due_date as string,
        status: r.status as InvoiceStatus,
        paidDate: (r.paid_date as string) ?? null,
      };
    });

    return Response.json({ ok: true, invoices });
  } catch (err) {
    console.error("[billing/invoices] Error fetching invoices:", err);
    return Response.json({ ok: false, error: "Failed to fetch invoices." }, { status: 500 });
  }
}
