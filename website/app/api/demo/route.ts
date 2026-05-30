import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { name, email, phone, datetime } = await req.json();

  if (!name || !email || !phone || !datetime) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: "Werzio Demo <demo@werzio.com>",
      to: ["ali@gfdubai.com"],
      replyTo: email,
      subject: `New Demo Request — ${name}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f9f9fb; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 28px;">
            <h1 style="font-size: 1.5rem; color: #111; margin: 0 0 4px;">New Demo Request 🎉</h1>
            <p style="color: #6b7280; font-size: 0.9rem; margin: 0;">Someone wants to see Werzio in action</p>
          </div>
          <div style="background: #fff; border-radius: 10px; padding: 24px; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #9ca3af; font-size: 0.85rem; width: 120px;">Name</td>
                <td style="padding: 10px 0; color: #111; font-weight: 600; font-size: 0.95rem;">${name}</td>
              </tr>
              <tr style="border-top: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #9ca3af; font-size: 0.85rem;">Email</td>
                <td style="padding: 10px 0; color: #111; font-weight: 600; font-size: 0.95rem;">${email}</td>
              </tr>
              <tr style="border-top: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #9ca3af; font-size: 0.85rem;">Phone</td>
                <td style="padding: 10px 0; color: #111; font-weight: 600; font-size: 0.95rem;">${phone}</td>
              </tr>
              <tr style="border-top: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #9ca3af; font-size: 0.85rem;">Preferred Time</td>
                <td style="padding: 10px 0; color: #7c3aed; font-weight: 700; font-size: 0.95rem;">${datetime}</td>
              </tr>
            </table>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 0.8rem; margin-top: 24px;">
            Sent from werzio.com — Book a Demo form
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Resend error:", err);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
