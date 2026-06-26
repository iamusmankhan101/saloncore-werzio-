import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { getTier, nextTierThreshold, pointsToRupees, type LoyaltySettings } from "@/lib/loyalty";
import type { Client } from "@/lib/types";

const ISSUER_ID            = process.env.GOOGLE_WALLET_ISSUER_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;

function getPrivateKey() {
  return (process.env.GOOGLE_WALLET_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

const defaultLoyalty: LoyaltySettings = {
  enabled: true, pointsPerRupee: 0.01, rupeePerPoint: 1,
  silverMin: 500, goldMin: 2000, platinumMin: 5000,
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const result = await db.execute({ sql: "SELECT data FROM salon_data WHERE entity = ?", args: [key] });
    if (result.rows.length === 0) return fallback;
    return JSON.parse(result.rows[0].data as string) as T;
  } catch { return fallback; }
}

async function getClient(salonId: string, clientId: string): Promise<Client | null> {
  const clients = await readJson<Client[]>(`${salonId}_clients`, []);
  const found = clients.find(c => c.id === clientId);
  if (found) return found;

  try {
    const result = await db.execute({
      sql: "SELECT * FROM clients WHERE id = ? AND user_id = ?",
      args: [clientId, salonId],
    });
    if (result.rows.length === 0) return null;
    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: String(row.id), name: String(row.name || "Loyalty Member"),
      phone: String(row.phone || ""), tags: [], source: "web",
      createdAt: String(row.created_at || ""),
      totalVisits: Number(row.total_visits || 0),
      totalSpend: Number(row.total_spent || 0),
      loyaltyPoints: Number(row.loyalty_points || 0),
      loyaltyPointsEarned: Number(row.loyalty_points_earned || 0),
    };
  } catch { return null; }
}

async function getSalonName(salonId: string): Promise<string> {
  const settings = await readJson<{ salon?: { name?: string } }>(`${salonId}_settings`, {});
  if (settings.salon?.name) return settings.salon.name;
  try {
    const result = await db.execute({ sql: "SELECT salon_name FROM users WHERE id = ?", args: [salonId] });
    const name = result.rows[0]?.salon_name;
    if (typeof name === "string" && name) return name;
  } catch { /* fall through */ }
  return "Werzio Salon";
}

async function getSalonSettings(salonId: string): Promise<LoyaltySettings> {
  const settings = await readJson<{ loyalty?: Partial<LoyaltySettings> }>(`${salonId}_settings`, {});
  return { ...defaultLoyalty, ...(settings.loyalty || {}) };
}

function salonClassId(salonId: string) {
  return `${ISSUER_ID}.werzio_${salonId.replace(/[^a-z0-9]/gi, "_")}_loyalty`;
}

function salonObjectId(salonId: string, clientId: string) {
  return `${ISSUER_ID}.werzio_${salonId.replace(/[^a-z0-9]/gi, "_")}_loyalty_${clientId.replace(/[^a-z0-9]/gi, "_")}`;
}

async function getAccessToken(): Promise<string> {
  const privateKey = getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  };
  const signedJwt = jwt.sign(claims, privateKey, { algorithm: "RS256" });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`,
  });
  const data = await res.json() as { access_token?: string };
  if (!data.access_token) throw new Error(`Token fetch failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function ensureLoyaltyClass(salonId: string, salonName: string, settings: LoyaltySettings) {
  const accessToken = await getAccessToken();
  const classId = salonClassId(salonId);
  const tierMeta = [
    { label: "Platinum 💎", minimumValue: settings.platinumMin },
    { label: "Gold 🥇",     minimumValue: settings.goldMin     },
    { label: "Silver 🥈",   minimumValue: settings.silverMin   },
    { label: "Bronze 🥉",   minimumValue: 1                    },
  ];

  const loyaltyClass = {
    id: classId,
    issuerName: salonName,
    programName: `${salonName} Loyalty`,
    programLogo: {
      sourceUri: { uri: "https://app.werzio.com/icon.png" },
      contentDescription: { defaultValue: { language: "en-US", value: `${salonName} logo` } },
    },
    hexBackgroundColor: "#5B21B6",
    loyaltyPointsLabel: "Points",
    rewardsTierLabel: "Tier",
    rewardsTier: tierMeta.map(t => ({ tier: t.label, minimumValue: String(t.minimumValue) })),
    reviewStatus: "UNDER_REVIEW",
  };

  const createRes = await fetch(
    "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass",
    { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(loyaltyClass) }
  );

  if (createRes.status === 409) {
    await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(classId)}`,
      { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(loyaltyClass) }
    );
  } else if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Class create failed: ${JSON.stringify(err)}`);
  }

  return classId;
}

function generateWalletUrl(salonId: string, client: Client, salonName: string, settings: LoyaltySettings): string | null {
  const privateKey = getPrivateKey();
  if (!ISSUER_ID || !SERVICE_ACCOUNT_EMAIL || !privateKey) return null;

  const balance = client.loyaltyPoints ?? 0;
  const earned  = client.loyaltyPointsEarned ?? 0;
  const tier    = getTier(earned, settings);
  const next    = nextTierThreshold(earned, settings);
  const value   = pointsToRupees(balance, settings.rupeePerPoint);

  const tierLabels: Record<string, string> = {
    platinum: "Platinum 💎", gold: "Gold 🥇", silver: "Silver 🥈",
    bronze: "Bronze 🥉", none: "Member ⭐",
  };

  const loyaltyObject = {
    id: salonObjectId(salonId, client.id),
    classId: salonClassId(salonId),
    state: "ACTIVE",
    accountId: client.id,
    accountName: client.name,
    loyaltyPoints: {
      balance: { int: balance },
      label: "Points",
    },
    textModulesData: [
      { header: "Redeemable Value", body: `PKR ${value.toLocaleString()}`,                     id: "value"    },
      { header: "Lifetime Earned",  body: `${earned.toLocaleString()} pts`,                    id: "earned"   },
      { header: "Tier",             body: tierLabels[tier] ?? "Member",                        id: "tier"     },
      { header: "Next Tier",        body: next ? `${next.needed} pts to ${tierLabels[next.tier]}` : "Top tier reached 🏆", id: "next_tier" },
      { header: "Salon",            body: salonName,                                            id: "salon"    },
    ],
    barcode: {
      type: "QR_CODE",
      value: `https://app.werzio.com/loyalty-card/${encodeURIComponent(salonId)}`,
      alternateText: client.phone || client.id,
    },
  };

  const claims = {
    iss: SERVICE_ACCOUNT_EMAIL,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: { loyaltyObjects: [loyaltyObject] },
  };

  try {
    const token = jwt.sign(claims, privateKey, { algorithm: "RS256" });
    return `https://pay.google.com/gp/v/save/${token}`;
  } catch (err) {
    console.error("[wallet/loyalty] JWT sign error:", (err as Error).message);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform");
  const salonId  = req.nextUrl.searchParams.get("salonId");
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (!platform || !salonId || !clientId) {
    return Response.json({ ok: false, error: "Missing platform, salonId, or clientId" }, { status: 400 });
  }

  if (platform === "apple") {
    return Response.json({ ok: false, error: "Apple Wallet is not configured yet." }, { status: 501 });
  }

  if (platform !== "google") {
    return Response.json({ ok: false, error: "Unsupported wallet platform" }, { status: 400 });
  }

  if (!ISSUER_ID || !SERVICE_ACCOUNT_EMAIL || !getPrivateKey()) {
    return Response.json({ ok: false, error: "Google Wallet credentials are not configured." }, { status: 501 });
  }

  try {
    const [client, salonName, settings] = await Promise.all([
      getClient(salonId, clientId),
      getSalonName(salonId),
      getSalonSettings(salonId),
    ]);

    if (!client) {
      return Response.json({ ok: false, error: "Client not found." }, { status: 404 });
    }

    await ensureLoyaltyClass(salonId, salonName, settings);

    const url = generateWalletUrl(salonId, client, salonName, settings);
    if (!url) {
      return Response.json({ ok: false, error: "Failed to generate wallet pass." }, { status: 500 });
    }

    return Response.json({ ok: true, url });
  } catch (err) {
    console.error("[wallet/loyalty] error:", err);
    return Response.json({ ok: false, error: "Wallet pass generation failed." }, { status: 500 });
  }
}
