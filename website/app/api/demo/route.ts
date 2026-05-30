import { Resend } from "resend";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

async function appendToSheet(row: string[]) {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Sheet1!A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });
}

export async function POST(req: NextRequest) {
  const { name, email, phone, datetime } = await req.json();

  if (!name || !email || !phone || !datetime) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const submittedAt = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" });
  const errors: string[] = [];

  // ── 1. Save to Google Sheets ───────────────────────────────
  try {
    await appendToSheet([submittedAt, name, email, phone, datetime]);
  } catch (err) {
    console.error("Google Sheets error:", err);
    errors.push("sheets");
  }

  // ── 2. Send email via Resend ───────────────────────────────
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Werzio Demo <demo@werzio.com>",
      to: ["iamusmankhan101@gmail.com"],
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
                <td style="padding: 10px 0; color: #9ca3af; font-size: 0.85rem; width: 120px;">Submitted</td>
                <td style="padding: 10px 0; color: #111; font-size: 0.95rem;">${submittedAt}</td>
              </tr>
              <tr style="border-top: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #9ca3af; font-size: 0.85rem;">Name</td>
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
  } catch (err) {
    console.error("Resend error:", err);
    errors.push("email");
  }

  return NextResponse.json({ success: true, errors });
}
