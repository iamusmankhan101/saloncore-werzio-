/**
 * POST /api/billing/mark-paid
 * Admin-only: manually marks a specific billing invoice as paid.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { ensureBillingTables, markInvoicePaidDB, unsuspendUser } from "@/lib/billing-db";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  let body: { userId?: string; invoiceId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const invoiceId = body.invoiceId?.trim();
  if (!userId || !invoiceId) {
    return Response.json({ ok: false, error: "Missing userId or invoiceId." }, { status: 400 });
  }

  try {
    await ensureBillingTables();

    const invoice = await db.execute({
      sql: "SELECT id, status FROM billing_invoices WHERE id = ? AND user_id = ?",
      args: [invoiceId, userId],
    });

    if (invoice.rows.length === 0) {
      return Response.json({ ok: false, error: "Invoice not found for this salon." }, { status: 404 });
    }

    if (invoice.rows[0].status !== "paid") {
      await markInvoicePaidDB(invoiceId);
    }

    await unsuspendUser(userId);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/mark-paid] error:", err);
    return Response.json({ ok: false, error: "Failed to mark invoice paid." }, { status: 500 });
  }
}
