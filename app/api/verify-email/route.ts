import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyUserEmail, getUserByEmail } from "@/lib/auth-db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token.trim() === "") {
    return Response.json({ ok: false, error: "Missing verification token." }, { status: 400 });
  }

  try {
    // ── 1. Look up the token ──────────────────────────────────────────────────
    const result = await db.execute({
      sql: "SELECT email, expires_at FROM email_verification_tokens WHERE token = ?",
      args: [token.trim()],
    });

    if (result.rows.length === 0) {
      return Response.json(
        { ok: false, error: "This verification link has already been used or is invalid. Please sign in or request a new link." },
        { status: 400 }
      );
    }

    const row = result.rows[0];

    // ── 2. Check expiry ───────────────────────────────────────────────────────
    if (new Date(row.expires_at as string) < new Date()) {
      // Clean up the expired token
      await db.execute({
        sql: "DELETE FROM email_verification_tokens WHERE token = ?",
        args: [token.trim()],
      }).catch(() => { /* ignore cleanup errors */ });

      return Response.json(
        { ok: false, error: "This verification link has expired (valid for 24 hours). Please sign up again to get a new link." },
        { status: 400 }
      );
    }

    const email = row.email as string;

    // ── 3. Mark email as verified in database (if user exists) ────────────────
    let userId: string | null = null;
    try {
      const user = await getUserByEmail(email);
      if (user) {
        await verifyUserEmail(email);
        userId = user.id;
      } else {
        // User doesn't exist in database yet (created in localStorage)
        // This is okay - they'll need to sign in with localStorage auth
        console.log(`[verify-email] User ${email} not in database yet (localStorage user)`);
      }
    } catch (dbErr) {
      // If database operations fail, continue anyway
      // The user might be using localStorage auth
      console.warn(`[verify-email] Database verification failed for ${email}:`, dbErr);
    }

    // ── 4. Delete the token (one-time use) ───────────────────────────────────
    await db.execute({
      sql: "DELETE FROM email_verification_tokens WHERE token = ?",
      args: [token.trim()],
    });

    // ── 5. Return success ─────────────────────────────────────────────────────
    console.log(`[verify-email] ✓ Verified email=${email}`);
    return Response.json({ ok: true, email, userId });

  } catch (err) {
    console.error("[verify-email] DB error:", err);
    return Response.json(
      { ok: false, error: "A server error occurred. Please try again in a moment." },
      { status: 500 }
    );
  }
}