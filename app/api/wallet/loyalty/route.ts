import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { getTier, nextTierThreshold, pointsToRupees, type LoyaltySettings } from "@/lib/loyalty";
import type { Client } from "@/lib/types";

const ISSUER_ID             = process.env.GOOGLE_WALLET_ISSUER_ID;
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

async function getSalonInfo(salonId: string): Promise<{ name: string; settings: LoyaltySettings }> {
  const settings = await readJson<{ salon?: { name?: string }; loyalty?: Partial<LoyaltySettings> }>(`${salonId}_settings`, {});
  let name = settings.salon?.name || "";
  if (!name) {
    try {
      const result = await db.execute({ sql: "SELECT salon_name FROM users WHERE id = ?", args: [salonId] });
      const n = result.rows[0]?.salon_name;
      if (typeof n === "string" && n) name = n;
    } catch { /* fall through */ }
  }
  return {
    name: name || "Werzio Salon",
    settings: { ...defaultLoyalty, ...(settings.loyalty || {}) },
  };
}

function safeId(str: string) {
  return str.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

function generateWalletUrl(salonId: string, client: Client, _salonName: string, ls: LoyaltySettings, _salonLogo = "", appBaseUrl = ""): string {
  const privateKey = getPrivateKey();
  const balance = client.loyaltyPoints ?? 0;
  const earned  = client.loyaltyPointsEarned ?? 0;
  const tier    = getTier(earned, ls);
  const next    = nextTierThreshold(earned, ls);
  const value   = pointsToRupees(balance, ls.rupeePerPoint);

  const tierLabels: Record<string, string> = {
    platinum: "Platinum 💎", gold: "Gold 🥇",
    silver: "Silver 🥈",    bronze: "Bronze 🥉", none: "Member ⭐",
  };

  // Use the pre-created class registered in Google Pay Business Console.
  // classId format: {issuerId}.{classSuffix}
  const classId  = `${ISSUER_ID}.werzio-loyalty`;
  const objectId = `${ISSUER_ID}.werzio-loyalty_${safeId(client.id)}`;

  // Since the class already exists in the console, only embed the object.
  // Embedding the class too would attempt to overwrite it and cause errors.
  const loyaltyObject = {
    id: objectId,
    classId,
    state: "ACTIVE",
    accountId: client.phone || client.id,
    accountName: client.name,
    loyaltyPoints: {
      balance: { int: balance },
      label: "Points",
    },
    textModulesData: [
      { header: "Salon",            body: _salonName,                                                                      id: "salon"    },
      { header: "Redeemable Value", body: `PKR ${value.toLocaleString()}`,                                                 id: "value"    },
      { header: "Lifetime Earned",  body: `${earned.toLocaleString()} pts`,                                                id: "earned"   },
      { header: "Tier",             body: tierLabels[tier] ?? "Member ⭐",                                                 id: "tier"     },
      { header: "Next Tier",        body: next ? `${next.needed} pts needed for ${tierLabels[next.tier]}` : "Top tier 🏆", id: "next_tier" },
    ],
    barcode: {
      type: "QR_CODE",
      value: `${appBaseUrl}/loyalty-card/${encodeURIComponent(salonId)}`,
      alternateText: client.phone || client.id,
    },
  };

  const claims = {
    iss: SERVICE_ACCOUNT_EMAIL,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: {
      loyaltyObjects: [loyaltyObject],
    },
  };

  const token = jwt.sign(claims, privateKey, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}

async function fireAndForgetClassUpdate(appBaseUrl: string, salonName: string, salonLogo: string) {
  try {
    await fetch(`${appBaseUrl}/api/wallet/update-class`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonName, logoUrl: salonLogo || undefined, bgColor: "#5B21B6" }),
    });
  } catch {
    // non-critical — class update failure doesn't block pass generation
  }
}

export async function GET(req: NextRequest) {
  const platform  = req.nextUrl.searchParams.get("platform");
  const salonId   = req.nextUrl.searchParams.get("salonId");
  const clientId  = req.nextUrl.searchParams.get("clientId");
  const salonLogo = req.nextUrl.searchParams.get("salonLogo") ?? "";

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
    const [client, { name: salonName, settings }] = await Promise.all([
      getClient(salonId, clientId),
      getSalonInfo(salonId),
    ]);

    if (!client) {
      return Response.json({ ok: false, error: "Client not found." }, { status: 404 });
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const url = generateWalletUrl(salonId, client, salonName, settings, salonLogo, appBaseUrl);

    // Fire-and-forget: keep the Wallet class branding in sync with the salon name
    void fireAndForgetClassUpdate(appBaseUrl, salonName, salonLogo);

    return Response.json({ ok: true, url });
  } catch (err) {
    console.error("[wallet/loyalty] error:", err);
    return Response.json({ ok: false, error: "Wallet pass generation failed." }, { status: 500 });
  }
}
