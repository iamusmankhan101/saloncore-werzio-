/**
 * POST /api/billing/set-due-date
 * Admin-only: changes the due date of a specific billing invoice for a salon
 * (e.g. granting an extension for a late payer). Only unpaid/overdue invoices
 * can be re-dated; paid invoices keep their date as-is. The daily billing
 * cron reads due_date for overdue/suspension, so this immediately affects it.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { ensureBillingTables, updateInvoiceDueDate } from "@/lib/billing-db";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  let body: { userId?: string; invoiceId?: string; dueDate?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const invoiceId = body.invoiceId?.trim();
  const dueDate = body.dueDate?.trim();
  if (!userId || !invoiceId) {
    return Response.json({ ok: false, error: "Missing userId or invoiceId." }, { status: 400 });
  }
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return Response.json({ ok: false, error: "Invalid dueDate (expected YYYY-MM-DD)." }, { status: 400 });
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

    if (invoice.rows[0].status === "paid") {
      return Response.json({ ok: false, error: "Paid invoices can't be re-dated." }, { status: 400 });
    }

    await updateInvoiceDueDate(invoiceId, dueDate);
    return Response.json({ ok: true, dueDate });
  } catch (err) {
    console.error("[billing/set-due-date] error:", err);
    return Response.json({ ok: false, error: "Failed to update due date." }, { status: 500 });
  }
}
