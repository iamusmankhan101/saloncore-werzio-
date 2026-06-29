import { NextRequest } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: "RESEND_API_KEY not configured." }, { status: 500 });
  }
  const resend = new Resend(apiKey);

  let body: {
    to: string;
    invoiceNumber: string;
    dueDate: string;
    total: number;
    planName: string;
    salonName: string;
    status: "unpaid" | "overdue";
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { to, invoiceNumber, dueDate, total, planName, salonName, status } = body;
  if (!to || !invoiceNumber) {
    return Response.json({ ok: false, error: "Missing required fields." }, { status: 400 });
  }

  const isOverdue = status === "overdue";
  const accentColor = isOverdue ? "#dc2626" : "#7C3AED";
  const subject = isOverdue
    ? `⚠️ Invoice ${invoiceNumber} is overdue — PKR ${total.toLocaleString()}`
    : `📄 Invoice ${invoiceNumber} due — PKR ${total.toLocaleString()}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e8f0;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <div style="background:${accentColor};padding:28px 36px">
      <div style="color:#ffffff;font-size:22px;font-weight:900">Salon Central</div>
      <div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px">Salon Management Platform</div>
    </div>
    <div style="padding:32px 36px">
      <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:8px">
        ${isOverdue ? "⚠️ Your invoice is overdue" : "📄 Your invoice is due"}
      </div>
      <p style="color:#6b6b8a;font-size:14px;line-height:1.7;margin:0 0 24px">
        Hi <strong>${salonName}</strong> team,<br>
        Your <strong>${planName} Plan</strong> subscription invoice requires attention.
      </p>
      <div style="background:#f8f8fc;border-radius:12px;padding:20px 22px;margin-bottom:24px;border:1px solid #ebebf0">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <span style="color:#9898b0;font-size:12px">Invoice</span>
          <span style="color:#1a1a2e;font-size:13px;font-weight:700">${invoiceNumber}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px">
          <span style="color:#9898b0;font-size:12px">Due Date</span>
          <span style="color:${accentColor};font-size:13px;font-weight:700">${dueDate}</span>
        </div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid #e8e8f0;padding-top:12px;margin-top:4px">
          <span style="color:#1a1a2e;font-size:14px;font-weight:700">Total Due</span>
          <span style="color:#1a1a2e;font-size:16px;font-weight:900">PKR ${total.toLocaleString()}</span>
        </div>
      </div>
      <p style="color:#6b6b8a;font-size:13px;margin:0;line-height:1.6">
        Please log in to your Salon Central dashboard and go to <strong>Billing</strong> to submit your payment.
        ${isOverdue ? "<br><br><strong style='color:#dc2626'>Note:</strong> Continued non-payment may result in service suspension." : ""}
      </p>
    </div>
    <div style="background:#f8f8fc;padding:16px 36px;border-top:1px solid #ebebf0;text-align:center;color:#b0b0c8;font-size:11px;line-height:1.6">
      Salon Central · Salon Management Platform<br>
      This is an automated billing notification.
    </div>
  </div>
</body>
</html>`;

  const text = `Hi ${salonName} team,\n\nYour ${planName} Plan invoice ${invoiceNumber} is ${isOverdue ? "OVERDUE" : "due"} — PKR ${total.toLocaleString()}\nDue date: ${dueDate}\n\nPlease log in to your Salon Central dashboard → Billing to submit payment.\n\n— Salon Central`;

  try {
    const { data, error } = await resend.emails.send({
      from: "Salon Central Billing <noreply@werzio.com>",
      replyTo: "support@werzio.com",
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error("[email/invoice] Resend error:", error);
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    console.log(`[email/invoice] ✓ Sent (id=${data?.id}) → ${to}`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[email/invoice] Unexpected error:", err);
    return Response.json({ ok: false, error: "Failed to send email. Please try again." }, { status: 500 });
  }
}