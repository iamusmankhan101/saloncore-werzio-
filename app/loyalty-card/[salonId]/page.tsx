"use client";

import { use, useState } from "react";
import { Award, ChevronRight, CreditCard, Gift, Loader2, Smartphone, Star } from "lucide-react";
import { TIER_META, type LoyaltySettings, type LoyaltyTier } from "@/lib/loyalty";
import type { Client } from "@/lib/types";

interface CardResponse {
  ok: boolean;
  error?: string;
  salon?: { name?: string; phone?: string; email?: string; logo?: string };
  client?: Client | null;
  card?: {
    number: string;
    tier: LoyaltyTier;
    balance: number;
    earned: number;
    redeemableValue: number;
    nextTier: { tier: LoyaltyTier; needed: number } | null;
  };
  settings?: LoyaltySettings;
}

function fmt(n: number) {
  return "PKR " + n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function normalizeUrlSalonName(name?: string) {
  return name || "Werzio Salon";
}

export default function PublicLoyaltyCardPage({ params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = use(params);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState<CardResponse | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletMsg, setWalletMsg] = useState("");

  async function lookupOrClaim(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!salonId || !phone.trim()) return;
    setLoading(true);
    setWalletMsg("");
    try {
      const method = needsName ? "POST" : "GET";
      const res = await fetch(
        method === "GET"
          ? `/api/loyalty-card?salonId=${encodeURIComponent(salonId)}&phone=${encodeURIComponent(phone)}`
          : "/api/loyalty-card",
        {
          method,
          headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
          body: method === "POST" ? JSON.stringify({ salonId, phone, name, email }) : undefined,
        }
      );
      const json = await res.json() as CardResponse;
      if (json.ok && json.client && json.card) {
        setData(json);
        setNeedsName(false);
      } else if (json.ok && json.client === null) {
        setData(json);
        setNeedsName(true);
      } else {
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }

  async function addToWallet(platform: "apple" | "google") {
    if (!data?.client?.id) return;
    setWalletMsg("");
    const res = await fetch(`/api/wallet/loyalty?platform=${platform}&salonId=${encodeURIComponent(salonId)}&clientId=${encodeURIComponent(data.client.id)}`);
    const json = await res.json() as { ok: boolean; url?: string; error?: string };
    if (json.ok && json.url) {
      window.location.href = json.url;
      return;
    }
    setWalletMsg(json.error || `${platform === "apple" ? "Apple" : "Google"} Wallet is not configured yet.`);
  }

  const salonName = normalizeUrlSalonName(data?.salon?.name);
  const tier = data?.card?.tier || "none";
  const tierMeta = TIER_META[tier];

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f4f1ff,#ffffff 42%,#f6f7fb)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 980, display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 24 }}>
        <section style={{ borderRadius: 28, padding: 28, background: "linear-gradient(145deg,#1e1b4b,#5b21b6 55%,#9333ea)", color: "#fff", minHeight: 520, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: "0 24px 70px rgba(76,29,149,0.28)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: "rgba(255,255,255,0.16)", display: "grid", placeItems: "center" }}>
                <Gift size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", opacity: 0.68 }}>LOYALTY CARD</div>
                <div style={{ fontSize: 17, fontWeight: 900 }}>{salonName}</div>
              </div>
            </div>
            <Star size={22} />
          </div>

          <div>
            <div style={{ fontSize: 13, opacity: 0.72, fontWeight: 700, marginBottom: 10 }}>Scan, claim, and keep your rewards with you.</div>
            <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.04, letterSpacing: 0 }}>Your salon rewards card lives here.</h1>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Card status</div>
            <div style={{ border: "1px solid rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.11)", borderRadius: 18, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Member</div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{data?.client?.name || "Not claimed yet"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Points</div>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{data?.card?.balance ?? 0}</div>
                </div>
              </div>
              <div style={{ marginTop: 18, fontFamily: "monospace", fontSize: 14, letterSpacing: "0.12em", opacity: 0.86 }}>
                {data?.card?.number || "SCAN CLAIM CARD"}
              </div>
            </div>
          </div>
        </section>

        <section style={{ border: "1px solid #e8e8f0", borderRadius: 28, background: "#fff", padding: 30, boxShadow: "0 20px 50px rgba(30,30,50,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", background: "#ede9fe", color: "#7c3aed" }}>
              <CreditCard size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, color: "#1a1a2e", fontSize: 24 }}>Get your loyalty card</h2>
              <p style={{ margin: "4px 0 0", color: "#9898b0", fontSize: 13 }}>Enter your phone number to view or claim your card.</p>
            </div>
          </div>

          <form onSubmit={lookupOrClaim} style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#303044" }}>Phone number</span>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+92 300 1234567" style={{ height: 46, border: "1px solid #dedeea", borderRadius: 12, padding: "0 14px", outline: "none", fontSize: 14 }} />
            </label>

            {needsName && (
              <div style={{ display: "grid", gap: 14, padding: 14, borderRadius: 16, background: "#fafafa", border: "1px solid #eeeeF6" }}>
                <div style={{ fontSize: 12, color: "#7c7c92", fontWeight: 700 }}>No card found for this phone. Create one now.</div>
                <label style={{ display: "grid", gap: 7 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#303044" }}>Name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" style={{ height: 42, border: "1px solid #dedeea", borderRadius: 10, padding: "0 12px", outline: "none" }} />
                </label>
                <label style={{ display: "grid", gap: 7 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#303044" }}>Email optional</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" style={{ height: 42, border: "1px solid #dedeea", borderRadius: 10, padding: "0 12px", outline: "none" }} />
                </label>
              </div>
            )}

            <button type="submit" disabled={loading || !phone.trim() || (needsName && !name.trim())} style={{ height: 46, border: "none", borderRadius: 12, background: "#7c3aed", color: "#fff", fontSize: 14, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", opacity: loading ? 0.72 : 1 }}>
              {loading ? <Loader2 size={16} /> : null}
              {needsName ? "Create my card" : "View my card"}
              <ChevronRight size={16} />
            </button>
          </form>

          {data?.card && data.client && (
            <div style={{ marginTop: 24, border: "1px solid #eeeeF6", borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: 16, background: tierMeta.bg, color: tierMeta.color, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>{tierMeta.emoji} {tierMeta.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>{data.client.name}</div>
                </div>
                <Award size={30} />
              </div>
              <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ color: "#9898b0", fontSize: 11, fontWeight: 800 }}>POINTS</div>
                  <div style={{ color: "#1a1a2e", fontSize: 24, fontWeight: 900 }}>{data.card.balance.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color: "#9898b0", fontSize: 11, fontWeight: 800 }}>VALUE</div>
                  <div style={{ color: "#059669", fontSize: 24, fontWeight: 900 }}>{fmt(data.card.redeemableValue)}</div>
                </div>
              </div>
              <div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => addToWallet("apple")} style={{ border: "1px solid #1a1a2e", background: "#1a1a2e", color: "#fff", borderRadius: 12, padding: "11px 10px", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <Smartphone size={15} /> Apple Wallet
                </button>
                <button onClick={() => addToWallet("google")} style={{ border: "1px solid #dedeea", background: "#fff", color: "#1a1a2e", borderRadius: 12, padding: "11px 10px", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <Smartphone size={15} /> Google Wallet
                </button>
              </div>
            </div>
          )}

          {walletMsg && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#fffbeb", color: "#92400e", fontSize: 12, fontWeight: 700 }}>{walletMsg}</div>}
          {data?.error && <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 700 }}>{data.error}</div>}
        </section>
      </div>
    </main>
  );
}
