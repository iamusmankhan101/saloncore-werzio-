import { NextRequest } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: "RESEND_API_KEY not configured" }, { status: 500 });
  }
  const resend = new Resend(apiKey);

  const { to, invoiceNumber, dueDate, total, planName, salonName, status } = await req.json() as {
    to: string;
    invoiceNumber: string;
    dueDate: string;
    total: number;
    planName: string;
    salonName: string;
    status: "unpaid" | "overdue";
  };

  const isOverdue = status === "overdue";
  const subject = isOverdue
    ? `⚠️ Invoice ${invoiceNumber} is overdue — PKR ${total.toLocaleString()}`
    : `📄 Invoice ${invoiceNumber} is due — PKR ${total.toLocaleString()}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e8f0">
      <div style="background:${isOverdue ? "#dc2626" : "#7C3AED"};padding:24px 28px">
        <div style="color:#fff;font-size:20px;font-weight:800">SalonCore</div>
        <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:2px">Salon Management Platform</div>
      </div>
      <div style="padding:28px">
        <div style="font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:6px">
          ${isOverdue ? "⚠️ Your invoice is overdue" : "📄 Your invoice is due"}
        </div>
        <p style="color:#6b6b8a;font-size:13px;margin:0 0 20px">
          Hi ${salonName} team, your <strong>${planName} Plan</strong> subscription invoice requires attention.
        </p>
        <div style="background:#f8f8fc;border-radius:10px;padding:16px 20px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#9898b0;font-size:12px">Invoice</span>
            <span style="color:#1a1a2e;font-size:12px;font-weight:700">${invoiceNumber}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#9898b0;font-size:12px">Due Date</span>
            <span style="color:${isOverdue ? "#dc2626" : "#d97706"};font-size:12px;font-weight:700">${dueDate}</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid #e8e8f0;padding-top:8px;margin-top:4px">
            <span style="color:#1a1a2e;font-size:13px;font-weight:700">Total Due</span>
            <span style="color:#1a1a2e;font-size:15px;font-weight:800">PKR ${total.toLocaleString()}</span>
          </div>
        </div>
        <p style="color:#6b6b8a;font-size:12px;margin:0">
          Please log in to your SalonCore dashboard and go to <strong>Billing</strong> to submit your payment.
          ${isOverdue ? "Continued non-payment may result in service suspension." : ""}
        </p>
      </div>
      <div style="background:#f8f8fc;padding:14px 28px;text-align:center;color:#b0b0c8;font-size:11px">
        SalonCore — Automated invoice notification
      </div>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: "SalonCore <onboarding@resend.dev>",
    to: [to],
    subject,
    html,
  });

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}