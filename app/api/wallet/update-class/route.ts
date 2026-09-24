import { NextRequest } from "next/server";
import { resolveActor } from "@/lib/api-auth";
import { googleWalletConfigured, ensureGoogleWalletLoyaltyClass } from "@/lib/google-wallet";

export async function POST(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  if (actor.role === "staff") return Response.json({ ok: false, error: "Not allowed." }, { status: 403 });

  if (!googleWalletConfigured()) {
    return Response.json({ ok: false, error: "Google Wallet credentials not configured in environment variables." }, { status: 501 });
  }

  const body = await req.json() as { salonName?: string; bgColor?: string };
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const result = await ensureGoogleWalletLoyaltyClass({
    salonName: body.salonName || "Salon Central",
    bgColor: body.bgColor,
    appOrigin,
  });

  if (result.ok) {
    return Response.json({ ok: true, message: result.message });
  }
  return Response.json({ ok: false, error: result.error, detail: result.detail }, { status: result.status });
}
