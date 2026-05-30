/**
 * DEBUG ENDPOINT - Remove in production
 * GET /api/debug/users
 * Check what users exist in the database
 */

import { db } from "@/lib/db";

export async function GET() {
  try {
    const res = await db.execute("SELECT id, email, email_verified, created_at FROM users");
    
    return Response.json({
      ok: true,
      count: res.rows.length,
      users: res.rows.map(r => ({
        id: r.id,
        email: r.email,
        emailVerified: r.email_verified === 1,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error("[debug/users] Error:", err);
    return Response.json({
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    }, { status: 500 });
  }
}
