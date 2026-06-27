import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const ISSUER_ID             = process.env.GOOGLE_WALLET_ISSUER_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;

function getPrivateKey() {
  return (process.env.GOOGLE_WALLET_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

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

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };
  if (!tokenData.access_token) {
    throw new Error(`OAuth2 error: ${tokenData.error ?? "unknown"} — ${tokenData.error_description ?? ""}`);
  }
  return tokenData.access_token;
}

export async function POST(req: NextRequest) {
  if (!ISSUER_ID || !SERVICE_ACCOUNT_EMAIL || !getPrivateKey()) {
    return Response.json({ ok: false, error: "Google Wallet credentials not configured in environment variables." }, { status: 501 });
  }

  const body = await req.json() as { salonName?: string; logoUrl?: string; bgColor?: string };

  const salonName = (body.salonName || "Werzio").trim();
  const bgColor   = body.bgColor || "#5B21B6";
  // Use the public app URL so Google's servers can fetch the logo
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  // Google Wallet requires a public HTTPS PNG/JPEG URL — never base64
  const logoUrl = body.logoUrl?.startsWith("https://") && !body.logoUrl.startsWith("data:")
    ? body.logoUrl
    : `${appOrigin}/werzio-logo.png`;

  const classId = `${ISSUER_ID}.werzio-loyalty`;
  const classUrl = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(classId)}`;

  try {
    const accessToken = await getAccessToken();
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type":  "application/json",
    };

    // First GET the class to see its current reviewStatus
    const getRes  = await fetch(classUrl, { headers });
    const getData = await getRes.json() as { id?: string; reviewStatus?: string; error?: { message?: string } };
    console.log("[wallet/update-class] GET", getRes.status, JSON.stringify(getData));

    const patch: Record<string, unknown> = {
      id:                 classId,
      issuerName:         salonName,
      programName:        `${salonName} Loyalty`,
      hexBackgroundColor: bgColor,
      loyaltyPointsLabel: "Points",
      programLogo: {
        sourceUri: { uri: logoUrl },
        contentDescription: { defaultValue: { language: "en-US", value: `${salonName} logo` } },
      },
    };

    // Only include reviewStatus when creating or when still in review (APPROVED classes reject it)
    const currentStatus = getData.reviewStatus ?? "";
    if (!getRes.ok || currentStatus === "UNDER_REVIEW" || currentStatus === "DRAFT") {
      patch.reviewStatus = "UNDER_REVIEW";
    }

    // Use PUT (full replace) when creating; PATCH (partial) when updating
    const method     = getRes.ok ? "PATCH" : "PUT";
    const writeRes   = await fetch(classUrl, { method, headers, body: JSON.stringify(patch) });
    const writeData  = await writeRes.json() as { id?: string; error?: { message?: string; status?: string } };
    console.log("[wallet/update-class]", method, writeRes.status, JSON.stringify(writeData));

    if (writeRes.ok) {
      return Response.json({ ok: true, message: `Card class updated (${method}). Changes appear in Google Wallet within a few minutes.` });
    }

    const errMsg = writeData.error?.message ?? `HTTP ${writeRes.status}`;
    return Response.json({ ok: false, error: errMsg, detail: writeData }, { status: writeRes.status });

  } catch (err) {
    console.error("[wallet/update-class]", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
