import { db } from "@/lib/db";

export async function GET() {
  try {
    const url = process.env.TURSO_DATABASE_URL ?? "(not set — using localhost fallback)";
    await db.execute("SELECT 1");
    return Response.json({ ok: true, url });
  } catch (err: unknown) {
    const e = err as Error & { cause?: unknown };
    return Response.json({
      ok: false,
      url: process.env.TURSO_DATABASE_URL ?? "(not set — using localhost fallback)",
      error: e.message,
      cause: e.cause instanceof Error ? e.cause.message : String(e.cause ?? ""),
    }, { status: 500 });
  }
}
