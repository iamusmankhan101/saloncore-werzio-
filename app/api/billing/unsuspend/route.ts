/**
 * POST /api/billing/unsuspend
 * Called by the admin page when approving a payment request.
 * Marks the current month's invoice as paid and lifts the suspension.
 * Sends a "account restored" confirmation email.
 */

import { NextRequest } from "next/server";
import { Resend } from "resend";
import {
  ensureBillingTables,
  getBillingUser,
  getCurrentCycleInvoice,
  markInvoicePaidDB,
  unsuspendUser,
} from "@/lib/billing-db";

function fmt(n: number) { return "PKR " + n.toLocaleString("en-PK"); }
function fmtDate(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

export async function POST(req: NextRequest) {
  let body: { userId: string; planId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { userId } = body;
  if (!userId) {
    return Response.json({ ok: false, error: "Missing userId." }, { status: 400 });
  }

  try {
    await ensureBillingTables();

    // Update plan if provided (plan switch on approval)
    const user = await getBillingUser(userId);
    if (!user) {
      // Not in billing DB yet — just acknowledge, no action needed
      return Response.json({ ok: true, note: "User not in billing DB — skipping." });
    }

    // Mark the current 30-day cycle invoice as paid
    const inv = await getCurrentCycleInvoice(userId);
    if (inv && inv.status !== "paid") {
      await markInvoicePaidDB(inv.id);
    }

    // Lift suspension
    await unsuspendUser(userId);

    // Send "account restored" email
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e8e8f0">
    <div style="background:#059669;padding:28px 36px">
      <div style="color:#fff;font-size:22px;font-weight:900">Werzio</div>
      <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px">Salon Management Platform</div>
    </div>
    <div style="padding:32px 36px">
      <div style="font-size:20px;font-weight:800;color:#1a1a2e;margin-bottom:12px">✅ Account restored!</div>
      <p style="color:#6b6b8a;font-size:14px;line-height:1.7;margin:0 0 20px">
        Hi <strong>${user.ownerName}</strong>,<br>
        Your payment has been confirmed and your <strong>${user.planName} Plan</strong> is now active again.
        ${inv ? `Invoice <strong>${inv.number}</strong> (${fmt(inv.amount)}) has been marked as paid on ${fmtDate(new Date().toISOString().slice(0, 10))}.` : ""}
      </p>
      <div style="padding:14px 16px;background:#ecfdf5;border-radius:10px;border:1px solid #6ee7b7;font-size:13px;color:#065f46;font-weight:600">
        Your full dashboard access has been restored. Thank you for your payment!
      </div>
    </div>
    <div style="background:#f8f8fc;padding:16px 36px;border-top:1px solid #ebebf0;text-align:center;color:#b0b0c8;font-size:11px">
      Werzio · Automated billing notification · <a href="https://werzio.com" style="color:#7C3AED;text-decoration:none">werzio.com</a>
    </div>
  </div>
</body>
</html>`;

      await resend.emails.send({
        from: "Werzio Billing <noreply@werzio.com>",
        replyTo: "support@werzio.com",
        to: [user.email],
        subject: `✅ Your Werzio account is restored — Payment confirmed`,
        html,
        text: `Hi ${user.ownerName},\n\nYour payment has been confirmed and your ${user.planName} Plan is now active. Full dashboard access has been restored.\n\nThank you!\n— Werzio`,
      }).catch((e) => console.error("[billing/unsuspend] email error:", e));
    }

    console.log(`[billing/unsuspend] user ${userId} (${user.email}) unsuspended`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/unsuspend] error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}