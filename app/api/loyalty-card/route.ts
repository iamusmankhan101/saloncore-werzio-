import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getTier, nextTierThreshold, pointsToRupees, type LoyaltySettings } from "@/lib/loyalty";
import type { Client } from "@/lib/types";

interface SalonSettings {
  salon?: {
    name?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
  loyalty?: LoyaltySettings;
}

const defaultLoyalty: LoyaltySettings = {
  enabled: true,
  pointsPerRupee: 0.01,
  rupeePerPoint: 1,
  silverMin: 500,
  goldMin: 2000,
  platinumMin: 5000,
};

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS salon_data (
      entity     TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function formatCardNumber(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().padEnd(16, "0").slice(0, 16);
  return `${compact.slice(0, 4)} ${compact.slice(4, 8)} ${compact.slice(8, 12)} ${compact.slice(12, 16)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const result = await db.execute({
    sql: "SELECT data FROM salon_data WHERE entity = ?",
    args: [key],
  });
  if (result.rows.length === 0) return fallback;
  try {
    return JSON.parse(result.rows[0].data as string) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, data: unknown) {
  await db.execute({
    sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
    args: [key, JSON.stringify(data), new Date().toISOString()],
  });
}

function cardPayload(client: Client, settings: LoyaltySettings, salon: SalonSettings["salon"]) {
  const earned = client.loyaltyPointsEarned ?? 0;
  const balance = client.loyaltyPoints ?? 0;
  const tier = getTier(earned, settings);
  const next = nextTierThreshold(earned, settings);
  return {
    salon: {
      name: salon?.name || "Werzio Salon",
      phone: salon?.phone || "",
      email: salon?.email || "",
      logo: salon?.logo || "",
    },
    client,
    card: {
      number: formatCardNumber(client.id),
      tier,
      balance,
      earned,
      redeemableValue: pointsToRupees(balance, settings.rupeePerPoint),
      nextTier: next,
    },
    settings,
  };
}

export async function GET(req: NextRequest) {
  const salonId = req.nextUrl.searchParams.get("salonId");
  const phone = req.nextUrl.searchParams.get("phone");
  if (!salonId) return Response.json({ ok: false, error: "Missing salonId" }, { status: 400 });

  try {
    await ensureTable();
    const settings = await readJson<SalonSettings>(`${salonId}_settings`, {});
    const loyalty = { ...defaultLoyalty, ...(settings.loyalty || {}) };
    const clients = await readJson<Client[]>(`${salonId}_clients`, []);

    if (!phone) {
      return Response.json({
        ok: true,
        salon: settings.salon || { name: "Werzio Salon" },
        settings: loyalty,
      });
    }

    const normalized = normalizePhone(phone);
    const client = clients.find((item) => normalizePhone(item.phone) === normalized);
    if (!client) {
      return Response.json({
        ok: true,
        salon: settings.salon || { name: "Werzio Salon" },
        settings: loyalty,
        client: null,
      });
    }

    return Response.json({ ok: true, ...cardPayload(client, loyalty, settings.salon) });
  } catch (err) {
    console.error("[loyalty-card] GET error:", err);
    return Response.json({ ok: false, error: "Unable to load loyalty card." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { salonId?: string; phone?: string; name?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const salonId = body.salonId;
  const phone = body.phone?.trim();
  if (!salonId || !phone) return Response.json({ ok: false, error: "Missing salonId or phone" }, { status: 400 });

  try {
    await ensureTable();
    const settings = await readJson<SalonSettings>(`${salonId}_settings`, {});
    const loyalty = { ...defaultLoyalty, ...(settings.loyalty || {}) };
    const key = `${salonId}_clients`;
    const clients = await readJson<Client[]>(key, []);
    const normalized = normalizePhone(phone);
    let client = clients.find((item) => normalizePhone(item.phone) === normalized);

    if (!client) {
      client = {
        id: `lc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: body.name?.trim() || "Loyalty Member",
        phone,
        email: body.email?.trim() || undefined,
        tags: ["Loyalty"],
        source: "web",
        createdAt: new Date().toISOString().split("T")[0],
        totalVisits: 0,
        totalSpend: 0,
        loyaltyPoints: 0,
        loyaltyPointsEarned: 0,
      };
      await writeJson(key, [client, ...clients]);
    }

    return Response.json({ ok: true, created: !clients.some((item) => item.id === client.id), ...cardPayload(client, loyalty, settings.salon) });
  } catch (err) {
    console.error("[loyalty-card] POST error:", err);
    return Response.json({ ok: false, error: "Unable to create loyalty card." }, { status: 500 });
  }
}
