/**
 * /api/cron/billing
 *
 * Automated 30-day rolling billing engine. Called by Vercel Cron every day at 09:00 UTC.
 *
 * Each user has their own billing cycle:
 *   Invoice issued on: signup_date + 30 days, then every 30 days
 *   Due date         = issued_date + 7 days   (day 37 from signup)
 *   Overdue after    : due_date + 3 days      (day 40 from signup)
 *   Suspended on     : same day as overdue    (day 40 from signup)
 *
 * Secured with Authorization: Bearer {CRON_SECRET}
 * Can also be triggered manually with the same header.
 */

import { NextRequest } from "next/server";
import { Resend } from "resend";
import {
  ensureBillingTables,
  getAllActiveBillingUsers,
  getOrCreate30DayInvoice,
  getAllUnpaidOverdueInvoices,
  markInvoiceOverdue,
  suspendUser,
  stampInvoiceNotification,
  logBillingRun,
  addDays,
  BILLING_CYCLE_DAYS,
  SUSPENSION_GRACE_DAYS,
  type BillingUser,
  type BillingInvoice,
} from "@/lib/billing-db";

// ─── Auth guard ───────────────────────────────────────────────────────────────

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

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
      <div style="color:#fff;font-size:22px;font-weight:900">Salon Central</div>
      <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px">Salon Management Platform</div>
    </div>
    <div style="padding:32px 36px">
      <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:12px">${title}</div>
      ${body}
    </div>
    <div style="background:#f8f8fc;padding:16px 36px;border-top:1px solid #ebebf0;text-align:center;color:#b0b0c8;font-size:11px;line-height:1.6">
      Salon Central · Salon Management Platform<br>
      Automated billing notification — <a href="https://werzio.com" style="color:#7C3AED;text-decoration:none">werzio.com</a>
    </div>
  </div>
</body>
</html>`;
}

function invoiceBox(inv: BillingInvoice, accentColor = "#7C3AED"): string {
  return `
  <div style="background:#f8f8fc;border-radius:12px;padding:20px 22px;margin:16px 0;border:1px solid #ebebf0">
    <div style="display:flex;justify-content:space-between;margin-bottom:8px">
      <span style="color:#9898b0;font-size:12px">Invoice</span>
      <span style="color:#1a1a2e;font-size:13px;font-weight:700">${inv.number}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:8px">
      <span style="color:#9898b0;font-size:12px">Billing Period</span>
      <span style="color:#1a1a2e;font-size:13px;font-weight:600">${fmtDate(inv.periodStart)} – ${fmtDate(addDays(inv.periodStart, BILLING_CYCLE_DAYS))}</span>
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

function issuedEmail(user: BillingUser, inv: BillingInvoice) {
  return {
    subject: `📄 Invoice ${inv.number} — ${fmt(inv.amount)} due by ${fmtDate(inv.dueDate)}`,
    html: emailBase(
      "Your invoice is ready",
      `<p style="color:#6b6b8a;font-size:14px;line-height:1.7;margin:0 0 4px">
        Hi <strong>${user.ownerName}</strong>,<br>
        Your <strong>${user.planName} Plan</strong> invoice has been generated for the next 30-day billing period.
      </p>
      ${invoiceBox(inv, "#7C3AED")}
      <p style="color:#6b6b8a;font-size:13px;line-height:1.6;margin:0">
        Please log in to your <strong>Salon Central Dashboard → Billing</strong> and submit your payment within 10 days to avoid any interruption in service.
      </p>`,
    ),
    text: `Hi ${user.ownerName},\n\nYour ${user.planName} Plan invoice ${inv.number} has been issued.\nPeriod: ${fmtDate(inv.periodStart)} – ${fmtDate(addDays(inv.periodStart, BILLING_CYCLE_DAYS))}\nAmount: ${fmt(inv.amount)}\nDue: ${fmtDate(inv.dueDate)}\n\nLog in to Salon Central → Billing to submit payment.\n\n— Salon Central`,
  };
}

function overdueEmail(user: BillingUser, inv: BillingInvoice) {
  return {
    subject: `⚠️ Invoice ${inv.number} is overdue — ${fmt(inv.amount)} unpaid`,
    html: emailBase(
      "⚠️ Your invoice is overdue",
      `<p style="color:#6b6b8a;font-size:14px;line-height:1.7;margin:0 0 4px">
        Hi <strong>${user.ownerName}</strong>,<br>
        Your <strong>${user.planName} Plan</strong> invoice is now overdue. Please pay immediately to avoid account suspension.
      </p>
      ${invoiceBox(inv, "#dc2626")}
      <p style="color:#92400e;font-size:13px;line-height:1.6;margin:0;padding:12px 14px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a">
        ⚠️ <strong>Your account will be suspended 10 days after the due date</strong> if payment is not received. Submit your payment screenshot in the Billing section to avoid interruption.
      </p>`,
      "#d97706",
    ),
    text: `Hi ${user.ownerName},\n\nYour ${user.planName} Plan invoice ${inv.number} is OVERDUE.\nAmount: ${fmt(inv.amount)}\n\nPlease pay now to avoid suspension. Log in to Salon Central → Billing.\n\n— Salon Central`,
  };
}

function suspendedEmail(user: BillingUser, inv: BillingInvoice) {
  return {
    subject: `🚫 Your Salon Central account has been suspended — Invoice ${inv.number} unpaid`,
    html: emailBase(
      "🚫 Account suspended",
      `<p style="color:#6b6b8a;font-size:14px;line-height:1.7;margin:0 0 4px">
        Hi <strong>${user.ownerName}</strong>,<br>
        Your <strong>${user.planName} Plan</strong> has been suspended because invoice <strong>${inv.number}</strong> (${fmt(inv.amount)}) was not paid within the payment window.
      </p>
      ${invoiceBox(inv, "#dc2626")}
      <p style="color:#991b1b;font-size:13px;line-height:1.6;margin:0;padding:12px 14px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca">
        Your dashboard access is restricted. To restore your account, log in and go to <strong>Billing</strong> to submit your payment screenshot. Access will be restored within minutes of admin approval.
      </p>`,
      "#dc2626",
    ),
    text: `Hi ${user.ownerName},\n\nYour Salon Central account has been SUSPENDED due to non-payment of invoice ${inv.number} (${fmt(inv.amount)}).\n\nLog in to Salon Central → Billing and submit your payment to restore access.\n\n— Salon Central`,
  };
}

// ─── Daily billing run ────────────────────────────────────────────────────────

async function runDaily(resend: Resend): Promise<{ invoicesGenerated: number; emailsSent: number; usersSuspended: number }> {
  const today = new Date().toISOString().slice(0, 10);
  let invoicesGenerated = 0;
  let emailsSent = 0;
  let usersSuspended = 0;

  const users = await getAllActiveBillingUsers();

  for (const user of users) {
    // ── Step 1: Generate invoice for the current 30-day period (idempotent) ──
    const result = await getOrCreate30DayInvoice(user);
    if (result) {
      if (result.created) {
        invoicesGenerated++;
        console.log(`[billing] new invoice ${result.invoice.number} → ${user.email} (period: ${result.invoice.periodStart})`);
      }

      // Send "issued" email once per invoice
      if (!result.invoice.notifiedIssuedAt) {
        const mail = issuedEmail(user, result.invoice);
        try {
          const { error } = await resend.emails.send({
            from: "Salon Central Billing <noreply@werzio.com>",
            replyTo: "support@werzio.com",
            to: [user.email],
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
          });
          if (!error) {
            await stampInvoiceNotification(result.invoice.id, "notified_issued_at");
            emailsSent++;
            console.log(`[billing] issued email → ${user.email} (${result.invoice.number})`);
          } else {
            console.error(`[billing] issued email error for ${user.email}:`, error.message);
          }
        } catch (e) {
          console.error(`[billing] issued email exception for ${user.email}:`, e);
        }
      }
    }
  }

  // ── Step 2: Overdue — invoices past their due_date ────────────────────────
  const overdueInvoices = await getAllUnpaidOverdueInvoices();

  for (const inv of overdueInvoices) {
    // Mark as overdue (no-op if already)
    await markInvoiceOverdue(inv.id);

    const user = users.find((u) => u.id === inv.userId);
    if (!user) continue;

    // Send overdue reminder once
    if (!inv.notifiedOverdueAt) {
      const mail = overdueEmail(user, inv);
      try {
        const { error } = await resend.emails.send({
          from: "Salon Central Billing <noreply@werzio.com>",
          replyTo: "support@werzio.com",
          to: [user.email],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        });
        if (!error) {
          await stampInvoiceNotification(inv.id, "notified_overdue_at");
          emailsSent++;
          console.log(`[billing] overdue email → ${user.email} (${inv.number})`);
        }
      } catch (e) {
        console.error(`[billing] overdue email exception for ${user.email}:`, e);
      }
    }

    // ── Step 3: Suspend if unpaid 10+ days after due_date ──────────────────
    const suspendAfter = addDays(inv.dueDate, SUSPENSION_GRACE_DAYS);
    if (today >= suspendAfter && !user.suspended) {
      await suspendUser(user.id, `Invoice ${inv.number} unpaid — payment was due ${inv.dueDate}. Suspended on ${today}.`);
      usersSuspended++;
      console.log(`[billing] suspended user ${user.id} (${user.email})`);

      // Send suspension email once
      if (!inv.notifiedSuspendedAt) {
        const mail = suspendedEmail(user, inv);
        try {
          const { error } = await resend.emails.send({
            from: "Salon Central Billing <noreply@werzio.com>",
            replyTo: "support@werzio.com",
            to: [user.email],
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
          });
          if (!error) {
            await stampInvoiceNotification(inv.id, "notified_suspended_at");
            emailsSent++;
            console.log(`[billing] suspension email → ${user.email}`);
          }
        } catch (e) {
          console.error(`[billing] suspension email exception for ${user.email}:`, e);
        }
      }
    }
  }

  return { invoicesGenerated, emailsSent, usersSuspended };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  try {
    await ensureBillingTables();
    const resend = new Resend(apiKey);

    const { invoicesGenerated, emailsSent, usersSuspended } = await runDaily(resend);
    await logBillingRun("daily-30d", invoicesGenerated, emailsSent, usersSuspended);

    console.log(`[billing] run complete — invoices: ${invoicesGenerated}, emails: ${emailsSent}, suspended: ${usersSuspended}`);
    return Response.json({ ok: true, invoicesGenerated, emailsSent, usersSuspended });

  } catch (err) {
    console.error("[billing] Unexpected error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}