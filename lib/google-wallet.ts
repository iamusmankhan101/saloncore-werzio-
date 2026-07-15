import jwt from "jsonwebtoken";

export const GOOGLE_WALLET_ISSUER_ID             = process.env.GOOGLE_WALLET_ISSUER_ID;
export const GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL  = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;

export function getGoogleWalletPrivateKey() {
  return (process.env.GOOGLE_WALLET_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

export function googleWalletConfigured(): boolean {
  return !!(GOOGLE_WALLET_ISSUER_ID && GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL && getGoogleWalletPrivateKey());
}

export async function getGoogleWalletAccessToken(): Promise<string> {
  const privateKey = getGoogleWalletPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss:   GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
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
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = await res.json() as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) {
    throw new Error(`OAuth2 error: ${data.error ?? "unknown"} — ${data.error_description ?? ""}`);
  }
  return data.access_token;
}

type EnsureClassResult =
  | { ok: true; message: string }
  | { ok: false; error: string; detail?: unknown; status: number };

/**
 * Creates/updates the shared Google Wallet loyalty class in-process — called directly
 * (never over HTTP) so it can't fail with a non-JSON response from an unrelated self-fetch
 * hitting a stale domain, deployment-protection page, or a build-in-progress placeholder.
 */
export async function ensureGoogleWalletLoyaltyClass(params: {
  salonName: string;
  bgColor?: string;
  appOrigin: string;
}): Promise<EnsureClassResult> {
  const salonName = (params.salonName || "Salon Central").trim();
  const bgColor   = params.bgColor || "#5B21B6";
  const logoUrl   = `${params.appOrigin}/api/wallet/program-logo`;
  const classId   = `${GOOGLE_WALLET_ISSUER_ID}.werzio-loyalty`;
  const classUrl  = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(classId)}`;

  try {
    const accessToken = await getGoogleWalletAccessToken();
    const headers = { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" };

    const getRes  = await fetch(classUrl, { headers });
    const getData = await getRes.json() as { id?: string; error?: { message?: string } };
    console.log("[google-wallet] class GET", getRes.status, JSON.stringify(getData));

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
      // Google requires a modified class to be explicitly resubmitted for
      // review. Reusing its current APPROVED status causes:
      // `Invalid review status "APPROVED". Use "UNDER_REVIEW" instead.`
      writeBody = { ...mutableFields, reviewStatus: "UNDER_REVIEW" };
    } else if (getRes.status === 404) {
      method = "POST";
      writeUrl = "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass";
      writeBody = { ...classPayload, reviewStatus: "UNDER_REVIEW" };
    } else {
      throw new Error(getData.error?.message || `Google Wallet class lookup failed (${getRes.status}).`);
    }

    const writeRes  = await fetch(writeUrl, { method, headers, body: JSON.stringify(writeBody) });
    const writeData = await writeRes.json() as { id?: string; error?: { message?: string; status?: string } };
    console.log("[google-wallet] class", method, writeRes.status, JSON.stringify(writeData));

    if (writeRes.ok) {
      return { ok: true, message: `Card class updated (${method}). Changes appear in Google Wallet within a few minutes.` };
    }
    return { ok: false, error: writeData.error?.message ?? `HTTP ${writeRes.status}`, detail: writeData, status: writeRes.status };
  } catch (err) {
    console.error("[google-wallet] class error", err);
    return { ok: false, error: String(err), status: 500 };
  }
}
