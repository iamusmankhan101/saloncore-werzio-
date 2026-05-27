/**
 * /api/cron/billing
 *
 * The automated billing engine. Called by Vercel Cron (see vercel.json).
 * Secured with CRON_SECRET env variable.
 *
 * Two modes (via ?mode= query param):
 *
 *   monthly  — Run on the 1st of each month
 *              • Generate invoice for each active user (after trial)
 *              • Email: "Invoice INV-YYYY-MM issued — due {date}"
 *
 *   daily    — Run every day (handles overdue + suspension)
 *              • Mark invoices overdue when past due_date
 *              • Email: overdue reminder (once per invoice)
 *              • If today >= 10th AND invoice still unpaid → suspend + email
 *
 * Can also be triggered manually (with CRON_SECRET) for testing.
 */

import { NextRequest } from "next/server";
import { Resend } from "resend";
import {
  ensureBillingTables,
  getAllActiveBillingUsers,
  getOrCreateMonthlyInvoice,
  getMonthlyInvoice,
  getAllUnpaidOverdueInvoices,
  markInvoiceOverdue,
  suspendUser,
  stampInvoiceNotification,
  logBillingRun,
  type BillingUser,
  type BillingInvoice,
} from "@/lib/billing-db";

// ─── Auth guard ───────────────────────────────────────────────────────────────

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // must be set
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trialEndDate(trialStart: string): string {
  const d = new Date(trialStart + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 14);
  return d.toISOString().slice(0, 10);
}

function isInTrial(trialStart: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return today < trialEndDate(trialStart);
}

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

function fmt(n: number): string {
  return "PKR " + n.toLocaleString("en-PK");
}

// ─── Email templates ──────────────────────────────────────────────────────────

function emailBase(title: string, body: string, accentColor = "#7C3AED"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e8e8f0;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="background:${accentColor};padding:28px 36px">
      <div style="color:#fff;font-size:22px;font-weight:900">Werzio</div>
      <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px">Salon Management Platform</div>
    </div>
    <div style="padding:32px 36px">
      <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:12px">${title}</div>
      ${body}
    </div>
    <div style="background:#f8f8fc;padding:16px 36px;border-top:1px solid #ebebf0;text-align:center;color:#b0b0c8;font-size:11px;line-height:1.6">
      Werzio · Salon Management Platform<br>
      Automated billing notification — <a href="https://werzio.com" style="color:#7C3AED;text-decoration:none">werzio.com</a>
    </div>
  </div>
</body>
</html>`;
}

function invoiceInfoBox(inv: BillingInvoice, accentColor = "#d97706"): string {
  return `
    <div style="background:#f8f8fc;border-radius:12px;padding:20px 22px;margin:16px 0;border:1px solid #ebebf0">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#9898b0;font-size:12px">Invoice #</span>
        <span style="color:#1a1a2e;font-size:13px;font-weight:700">${inv.number}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="color:#9898b0;font-size:12px">Due Date</span>
        <span style="color:${accentColor};font-size:13px;font-weight:700">${fmtDate(inv.dueDate)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding-top:10px;margin-top:4px;border-top:1px solid #e8e8f0">
        <span style="color:#1a1a2e;font-size:14px;font-weight:700">Total Due</span>
        <span style="color:#1a1a2e;font-size:16px;font-weight:900">${fmt(inv.amount)}</span>
      </div>
    </div>`;
}

function issuedEmail(user: BillingUser, inv: BillingInvoice): { subject: string; html: string; text: string } {
  return {
    subject: `📄 Invoice ${inv.number} issued — ${fmt(inv.amount)} due by ${fmtDate(inv.dueDate)}`,
    html: emailBase(
      "Your monthly invoice is ready",
      `<p style="color:#6b6b8a;font-size:14px;line-height:1.7;margin:0 0 4px">
        Hi <strong>${user.ownerName}</strong>,<br>
        Your <strong>${user.planName} Plan</strong> invoice for this month has been generated.
      </p>
      ${invoiceInfoBox(inv, "#7C3AED")}
      <p style="color:#6b6b8a;font-size:13px;line-height:1.6;margin:0">
        Please log in to your <strong>Werzio Dashboard → Billing</strong> and submit your payment before the due date to avoid any interruption in service.
      </p>`,
    ),
    text: `Hi ${user.ownerName},\n\nYour ${user.planName} Plan invoice ${inv.number} has been issued.\nAmount: ${fmt(inv.amount)}\nDue: ${fmtDate(inv.dueDate)}\n\nLog in to Werzio → Billing to submit payment.\n\n— Werzio`,
  };
}

function overdueEmail(user: BillingUser, inv: BillingInvoice): { subject: string; html: string; text: string } {
  return {
    subject: `⚠️ Invoice ${inv.number} is overdue — ${fmt(inv.amount)} unpaid`,
    html: emailBase(
      "⚠️ Your invoice is overdue",
      `<p style="color:#6b6b8a;font-size:14px;line-height:1.7;margin:0 0 4px">
        Hi <strong>${user.ownerName}</strong>,<br>
        Your <strong>${user.planName} Plan</strong> invoice is now overdue. Please pay immediately to avoid account suspension on the 10th.
      </p>
      ${invoiceInfoBox(inv, "#dc2626")}
      <p style="color:#92400e;font-size:13px;line-height:1.6;margin:0;padding:12px 14px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a">
        ⚠️ <strong>Your account will be suspended on the 10th of this month</strong> if payment is not received. Submit your payment screenshot in the Billing section to avoid interruption.
      </p>`,
      "#d97706",
    ),
    text: `Hi ${user.ownerName},\n\nYour ${user.planName} Plan invoice ${inv.number} is OVERDUE.\nAmount: ${fmt(inv.amount)}\n\nYour account will be suspended on the 10th if not paid. Log in to Werzio → Billing to submit payment.\n\n— Werzio`,
  };
}

function suspendedEmail(user: BillingUser, inv: BillingInvoice): { subject: string; html: string; text: string } {
  return {
    subject: `🚫 Your Werzio account has been suspended — Invoice ${inv.number} unpaid`,
    html: emailBase(
      "🚫 Account suspended",
      `<p style="color:#6b6b8a;font-size:14px;line-height:1.7;margin:0 0 4px">
        Hi <strong>${user.ownerName}</strong>,<br>
        Your <strong>${user.planName} Plan</strong> has been suspended because invoice <strong>${inv.number}</strong> (${fmt(inv.amount)}) was not paid by the 10th.
      </p>
      ${invoiceInfoBox(inv, "#dc2626")}
      <p style="color:#991b1b;font-size:13px;line-height:1.6;margin:0;padding:12px 14px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca">
        Your dashboard access is restricted. To restore your account, log in and go to <strong>Billing</strong> to submit your payment screenshot. Access will be restored within minutes of admin approval.
      </p>`,
      "#dc2626",
    ),
    text: `Hi ${user.ownerName},\n\nYour Werzio account has been SUSPENDED due to non-payment of invoice ${inv.number} (${fmt(inv.amount)}).\n\nLog in to Werzio → Billing and submit your payment to restore access.\n\n— Werzio`,
  };
}

// ─── Modes ────────────────────────────────────────────────────────────────────

async function runMonthly(resend: Resend): Promise<{ invoicesGenerated: number; emailsSent: number }> {
  const now   = new Date();
  const year  = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const users = await getAllActiveBillingUsers();
  let invoicesGenerated = 0;
  let emailsSent = 0;

  for (const user of users) {
    if (isInTrial(user.trialStart)) continue; // still in trial

    const { invoice, created } = await getOrCreateMonthlyInvoice(user, year, month);
    if (created) invoicesGenerated++;

    // Send "invoice issued" email if not already sent
    if (!invoice.notifiedIssuedAt) {
      const mail = issuedEmail(user, invoice);
      try {
        const { error } = await resend.emails.send({
          from: "Werzio Billing <noreply@werzio.com>",
          replyTo: "support@werzio.com",
          to: [user.email],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        if (!error) {
          await stampInvoiceNotification(invoice.id, "notified_issued_at");
          emailsSent++;
          console.log(`[billing/monthly] issued email → ${user.email} (${invoice.number})`);
        } else {
          console.error(`[billing/monthly] Resend error for ${user.email}:`, error.message);
        }
      } catch (e) {
        console.error(`[billing/monthly] send error for ${user.email}:`, e);
      }
    }
  }

  return { invoicesGenerated, emailsSent };
}

async function runDaily(resend: Resend): Promise<{ emailsSent: number; usersSuspended: number }> {
  const today    = new Date().toISOString().slice(0, 10);
  const dayOfMonth = new Date().getUTCDate();
  const now      = new Date();
  const year     = now.getUTCFullYear();
  const month    = now.getUTCMonth() + 1;

  let emailsSent = 0;
  let usersSuspended = 0;

  // ── Step 1: Mark overdue + send reminder emails ────────────────────────────
  const overdueInvoices = await getAllUnpaidOverdueInvoices();

  for (const inv of overdueInvoices) {
    // Mark as overdue (no-op if already)
    await markInvoiceOverdue(inv.id);

    // Find user
    const users = await getAllActiveBillingUsers();
    const user  = users.find((u) => u.id === inv.userId);
    if (!user) continue;

    // Send overdue reminder once
    if (!inv.notifiedOverdueAt) {
      const mail = overdueEmail(user, inv);
      try {
        const { error } = await resend.emails.send({
          from: "Werzio Billing <noreply@werzio.com>",
          replyTo: "support@werzio.com",
          to: [user.email],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        if (!error) {
          await stampInvoiceNotification(inv.id, "notified_overdue_at");
          emailsSent++;
          console.log(`[billing/daily] overdue email → ${user.email} (${inv.number})`);
        }
      } catch (e) {
        console.error(`[billing/daily] overdue send error for ${user.email}:`, e);
      }
    }
  }

  // ── Step 2: Suspend users unpaid after the 10th ────────────────────────────
  if (dayOfMonth >= 10) {
    const users = await getAllActiveBillingUsers();
    for (const user of users) {
      if (user.suspended) continue;           // already suspended
      if (isInTrial(user.trialStart)) continue; // still in trial

      const inv = await getMonthlyInvoice(user.id, year, month);
      if (!inv) continue;                     // no invoice yet
      if (inv.status === "paid") continue;    // paid — all good

      // Invoice exists, is unpaid/overdue, and today >= 10th → suspend
      await suspendUser(user.id, `Invoice ${inv.number} unpaid past 10th. Suspended on ${today}.`);
      usersSuspended++;
      console.log(`[billing/daily] suspended user ${user.id} (${user.email})`);

      // Send suspension email once
      if (!inv.notifiedSuspendedAt) {
        const mail = suspendedEmail(user, inv);
        try {
          const { error } = await resend.emails.send({
            from: "Werzio Billing <noreply@werzio.com>",
            replyTo: "support@werzio.com",
            to: [user.email],
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
          });
          if (!error) {
            await stampInvoiceNotification(inv.id, "notified_suspended_at");
            emailsSent++;
            console.log(`[billing/daily] suspension email → ${user.email}`);
          }
        } catch (e) {
          console.error(`[billing/daily] suspension email error for ${user.email}:`, e);
        }
      }
    }
  }

  return { emailsSent, usersSuspended };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode") ?? "daily";
  if (mode !== "monthly" && mode !== "daily") {
    return Response.json({ ok: false, error: "Invalid mode. Use ?mode=monthly or ?mode=daily" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  try {
    await ensureBillingTables();
    const resend = new Resend(apiKey);

    if (mode === "monthly") {
      const { invoicesGenerated, emailsSent } = await runMonthly(resend);
      await logBillingRun("monthly", invoicesGenerated, emailsSent, 0);
      console.log(`[billing/monthly] done — invoices: ${invoicesGenerated}, emails: ${emailsSent}`);
      return Response.json({ ok: true, mode, invoicesGenerated, emailsSent });
    }

    // daily
    const { emailsSent, usersSuspended } = await runDaily(resend);
    await logBillingRun("daily", 0, emailsSent, usersSuspended);
    console.log(`[billing/daily] done — emails: ${emailsSent}, suspended: ${usersSuspended}`);
    return Response.json({ ok: true, mode, emailsSent, usersSuspended });

  } catch (err) {
    console.error("[billing/cron] Unexpected error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}