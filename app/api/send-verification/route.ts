import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token      TEXT PRIMARY KEY,
      email      TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )
  `);
}

export async function POST(req: NextRequest) {
  const { email, name } = await req.json() as { email: string; name: string };
  if (!email) return Response.json({ ok: false, error: "Missing email" }, { status: 400 });

  await ensureTable();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await db.execute({
    sql: "INSERT OR REPLACE INTO email_verification_tokens (token, email, expires_at) VALUES (?, ?, ?)",
    args: [token, email.trim().toLowerCase(), expiresAt],
  });

  const baseUrl = req.nextUrl.origin;
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev mode — no email sent, return the link directly
    return Response.json({ ok: true, devUrl: verifyUrl });
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e8f0">
      <div style="background:linear-gradient(135deg,#5B21B6,#9333EA);padding:28px">
        <div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px">SalonCore</div>
        <div style="color:rgba(255,255,255,0.75);font-size:12px;margin-top:2px">Salon Management Platform</div>
      </div>
      <div style="padding:32px">
        <div style="font-size:18px;font-weight:800;color:#1a1a2e;margin-bottom:8px">Verify your email address</div>
        <p style="color:#6b6b8a;font-size:14px;line-height:1.7;margin:0 0 24px">
          Hi ${name || "there"}, thanks for signing up for SalonCore! Click the button below to verify your email and activate your account.
        </p>
        <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#5B21B6,#9333EA);color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px">
          Verify my email
        </a>
        <p style="color:#9898b0;font-size:12px;margin-top:24px;line-height:1.6">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
        <div style="margin-top:16px;padding:12px 14px;background:#f8f8fc;border-radius:8px;font-size:11px;color:#9898b0;word-break:break-all">
          ${verifyUrl}
        </div>
      </div>
      <div style="background:#f8f8fc;padding:14px 28px;text-align:center;color:#b0b0c8;font-size:11px">
        SalonCore — Automated account verification
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SalonCore <noreply@saloncore.app>",
        to: [email],
        subject: "Verify your SalonCore account",
        html,
      }),
    });
    return Response.json({ ok: res.ok });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}