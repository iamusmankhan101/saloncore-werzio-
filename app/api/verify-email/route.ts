import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return Response.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  try {
    const result = await db.execute({
      sql: "SELECT email, expires_at FROM email_verification_tokens WHERE token = ?",
      args: [token],
    });

    if (result.rows.length === 0) {
      return Response.json({ ok: false, error: "Invalid or already-used verification link." }, { status: 400 });
    }

    const row = result.rows[0];
    if (new Date(row.expires_at as string) < new Date()) {
      return Response.json({ ok: false, error: "This verification link has expired. Please sign up again." }, { status: 400 });
    }

    const email = row.email as string;

    // Delete used token
    await db.execute({
      sql: "DELETE FROM email_verification_tokens WHERE token = ?",
      args: [token],
    });

    return Response.json({ ok: true, email });
  } catch {
    return Response.json({ ok: false, error: "Verification failed. Please try again." }, { status: 500 });
  }
}