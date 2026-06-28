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
  // Use the public app URL so Google's servers can fetch the generated wordmark.
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const wordmarkUrl = new URL("/api/wallet/program-logo", appOrigin);
  wordmarkUrl.searchParams.set("name", salonName);
  const logoUrl = wordmarkUrl.toString();

  const classId = `${ISSUER_ID}.werzio-loyalty`;
  const classUrl = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(classId)}`;

  try {
    const accessToken = await getAccessToken();
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type":  "application/json",
    };

    // GET first to decide whether to INSERT or PATCH.
    const getRes  = await fetch(classUrl, { headers });
    const getData = await getRes.json() as { id?: string; error?: { message?: string } };
    console.log("[wallet/update-class] GET", getRes.status, JSON.stringify(getData));

    const classPayload: Record<string, unknown> = {
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

    let method: "PATCH" | "POST";
    let writeUrl: string;
    let writeBody: Record<string, unknown>;

    if (getRes.ok) {
      method = "PATCH";
      writeUrl = classUrl;
      const { id: _id, ...mutableFields } = classPayload;
      void _id;
      writeBody = { ...mutableFields, reviewStatus: "UNDER_REVIEW" };
    } else if (getRes.status === 404) {
      method = "POST";
      writeUrl = "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass";
      writeBody = { ...classPayload, reviewStatus: "UNDER_REVIEW" };
    } else {
      throw new Error(getData.error?.message || `Google Wallet class lookup failed (${getRes.status}).`);
    }

    const writeRes = await fetch(writeUrl, { method, headers, body: JSON.stringify(writeBody) });
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
