/**
 * /api/billing/payment-methods
 * Admin-managed library of bank accounts that can be assigned to salons'
 * invoices — GET lists them (also used to populate the salon-row dropdown),
 * POST creates a new one, PATCH edits one, DELETE removes one (any salon
 * pointed at it falls back to the platform default, see billing-db.ts).
 */

import { NextRequest } from "next/server";
import {
  createPaymentMethod, deletePaymentMethod, ensureBillingTables,
  getPaymentMethods, updatePaymentMethod,
} from "@/lib/billing-db";
import { requireAdmin } from "@/lib/api-auth";

interface MethodBody { label: string; bankName: string; bankTitle: string; accountNumber: string; iban: string }

function validate(body: Partial<MethodBody>): string | null {
  if (!body.label?.trim()) return "Label is required.";
  if (!body.bankName?.trim()) return "Bank name is required.";
  if (!body.bankTitle?.trim()) return "Account title is required.";
  if (!body.accountNumber?.trim()) return "Account number is required.";
  if (!body.iban?.trim()) return "IBAN is required.";
  return null;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }
  try {
    await ensureBillingTables();
    const methods = await getPaymentMethods();
    return Response.json({ ok: true, methods });
  } catch (err) {
    console.error("[billing/payment-methods] GET error:", err);
    return Response.json({ ok: false, error: "Failed to fetch payment methods." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }
  let body: MethodBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  const validationError = validate(body);
  if (validationError) return Response.json({ ok: false, error: validationError }, { status: 400 });

  try {
    const method = await createPaymentMethod(body);
    return Response.json({ ok: true, method });
  } catch (err) {
    console.error("[billing/payment-methods] POST error:", err);
    return Response.json({ ok: false, error: "Failed to create payment method." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }
  let body: MethodBody & { id: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (!body.id) return Response.json({ ok: false, error: "Missing id." }, { status: 400 });
  const validationError = validate(body);
  if (validationError) return Response.json({ ok: false, error: validationError }, { status: 400 });

  try {
    await updatePaymentMethod(body.id, body);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/payment-methods] PATCH error:", err);
    return Response.json({ ok: false, error: "Failed to update payment method." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return Response.json({ ok: false, error: "Missing id." }, { status: 400 });

  try {
    await deletePaymentMethod(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/payment-methods] DELETE error:", err);
    return Response.json({ ok: false, error: "Failed to delete payment method." }, { status: 500 });
  }
}
