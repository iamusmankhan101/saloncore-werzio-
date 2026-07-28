import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSessionToken, BLOG_SESSION_COOKIE } from "@/lib/blog-auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { password?: string } | null;
  if (!body?.password || !verifyPassword(body.password)) {
    return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(BLOG_SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
