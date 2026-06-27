import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const ISSUER_ID             = process.env.GOOGLE_WALLET_ISSUER_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;

function getPrivateKey() {
  return (process.env.GOOGLE_WALLET_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

// Exchange service-account credentials for a short-lived Google OAuth2 access token
async function getAccessToken(): Promise<string> {
  const privateKey = getPrivateKey();
  const now = Math.floor(Date.now() / 1000);

  const assertion = jwt.sign(
    {
      iss:   SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/wallet_object.issuer",
      aud:   "https://oauth2.googleapis.com/token",
      iat:   now,
      exp:   now + 3600,
    },
    privateKey,
    { algorithm: "RS256" },
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await res.json() as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(data.error ?? "Failed to get access token");
  return data.access_token;
}

export async function POST(req: NextRequest) {
  if (!ISSUER_ID || !SERVICE_ACCOUNT_EMAIL || !getPrivateKey()) {
    return Response.json({ ok: false, error: "Google Wallet credentials not configured" }, { status: 501 });
  }

  const body = await req.json() as {
    salonName?: string;
    logoUrl?: string;
    bgColor?: string;
  };

  const salonName = body.salonName || "Werzio";
  const bgColor   = body.bgColor   || "#5B21B6";
  // Only use HTTPS non-base64 URLs — Google Wallet requires a public PNG/JPEG
  const logoUrl   = body.logoUrl?.startsWith("https://") && !body.logoUrl.startsWith("data:")
    ? body.logoUrl
    : null;

  const classId = `${ISSUER_ID}.werzio-loyalty`;

  try {
    const accessToken = await getAccessToken();

    // Build the patch payload with all branding fields
    const patch: Record<string, unknown> = {
      id:               classId,
      issuerName:       salonName,
      programName:      `${salonName} Loyalty`,
      hexBackgroundColor: bgColor,
      loyaltyPointsLabel: "Points",
      reviewStatus:     "UNDER_REVIEW",
    };

    if (logoUrl) {
      patch.programLogo = {
        sourceUri: { uri: logoUrl },
        contentDescription: { defaultValue: { language: "en-US", value: `${salonName} logo` } },
      };
    }

    // Try PATCH first (update existing class), fall back to PUT
    const patchRes = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(classId)}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify(patch),
      },
    );

    const patchData = await patchRes.json() as { id?: string; error?: { message?: string } };
    console.log("[wallet/update-class] PATCH", patchRes.status, JSON.stringify(patchData));

    if (patchRes.ok) {
      return Response.json({ ok: true, message: "Loyalty card class updated successfully" });
    }

    return Response.json(
      { ok: false, error: patchData.error?.message ?? `HTTP ${patchRes.status}` },
      { status: patchRes.status },
    );
  } catch (err) {
    console.error("[wallet/update-class]", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
