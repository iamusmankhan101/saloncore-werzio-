import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform");
  const salonId = req.nextUrl.searchParams.get("salonId");
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (!platform || !salonId || !clientId) {
    return Response.json({ ok: false, error: "Missing platform, salonId, or clientId" }, { status: 400 });
  }

  if (platform === "apple") {
    const configured = Boolean(
      process.env.APPLE_WALLET_PASS_TYPE_ID &&
      process.env.APPLE_WALLET_TEAM_ID &&
      process.env.APPLE_WALLET_CERTIFICATE &&
      process.env.APPLE_WALLET_KEY
    );

    return Response.json({
      ok: configured,
      platform,
      configured,
      error: configured ? undefined : "Apple Wallet pass signing credentials are not configured yet.",
    }, { status: configured ? 200 : 501 });
  }

  if (platform === "google") {
    const configured = Boolean(
      process.env.GOOGLE_WALLET_ISSUER_ID &&
      process.env.GOOGLE_WALLET_CLASS_ID &&
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON
    );

    return Response.json({
      ok: configured,
      platform,
      configured,
      error: configured ? undefined : "Google Wallet issuer credentials are not configured yet.",
    }, { status: configured ? 200 : 501 });
  }

  return Response.json({ ok: false, error: "Unsupported wallet platform" }, { status: 400 });
}
