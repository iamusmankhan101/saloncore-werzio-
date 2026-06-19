"use client";

import { useState, useEffect, useMemo } from "react";
import { getStoredClients, saveClients, getStoredAppointments } from "@/lib/storage";
import type { Client } from "@/lib/types";
import {
  getTier, TIER_META, nextTierThreshold, pointsToRupees,
  getClientHistory, adjustPoints, redeemPoints,
  type LoyaltySettings,
} from "@/lib/loyalty";
import { settingsStore, saveSettings } from "@/lib/settings-store";
import { fmtCurrency as fmt } from "@/lib/format";
import {
  Gift, Star, Search, Settings2, ChevronRight, TrendingUp,
  Award, Users, Plus, Minus, X,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TierBadge({ tier }: { tier: ReturnType<typeof getTier> }) {
  const m = TIER_META[tier];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 20,
      background: m.bg, color: m.color,
      fontSize: 11, fontWeight: 700,
    }}>
      {m.emoji} {m.label}
    </span>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, border: "1px solid #e8e8f0",
      padding: "20px 22px", display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "18", display: "grid", placeItems: "center", color }}>{icon}</div>
        <span style={{ fontSize: 12, color: "#9898b0", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9898b0" }}>{sub}</div>}
    </div>
  );
}

// ── Client Points Modal ────────────────────────────────────────────────────────

function ClientModal({
  client, settings, onClose, onUpdate,
}: {
  client: Client;
  settings: LoyaltySettings;
  onClose: () => void;
  onUpdate: (c: Client) => void;
}) {
  const tier     = getTier(client.loyaltyPointsEarned ?? 0, settings);
  const balance  = client.loyaltyPoints ?? 0;
  const earned   = client.loyaltyPointsEarned ?? 0;
  const next     = nextTierThreshold(earned, settings);
  const history  = getClientHistory(client.id);

  const [tab, setTab]       = useState<"overview" | "history" | "adjust">("overview");
  const [adjType, setAdjType] = useState<"add" | "redeem">("add");
  const [adjPts, setAdjPts]   = useState("");
  const [adjNote, setAdjNote] = useState("");
  const [saving, setSaving]   = useState(false);

  function handleAdjust() {
    const pts = parseInt(adjPts, 10);
    if (!pts || pts <= 0) return;
    setSaving(true);
    const clients = getStoredClients();
    let updated: Client;
    if (adjType === "add") {
      updated = adjustPoints(client, pts, adjNote || "Manual adjustment");
    } else {
      updated = redeemPoints(client, pts, adjNote || "Manual redemption");
    }
    const newClients = clients.map((c) => c.id === updated.id ? updated : c);
    saveClients(newClients);
    onUpdate(updated);
    setAdjPts("");
    setAdjNote("");
    setSaving(false);
  }

  const tierMeta = TIER_META[tier];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520,
        maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{ padding: "22px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>{client.name}</div>
            <div style={{ marginTop: 6 }}><TierBadge tier={tier} /></div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9898b0" }}><X size={20} /></button>
        </div>

        {/* Points summary */}
        <div style={{ padding: "16px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: tierMeta.bg, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: tierMeta.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>Balance</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: tierMeta.color, marginTop: 4 }}>{balance.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: tierMeta.color + "99", marginTop: 2 }}>≈ {fmt(pointsToRupees(balance, settings.rupeePerPoint))}</div>
          </div>
          <div style={{ background: "#f7f7fb", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Lifetime Earned</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", marginTop: 4 }}>{earned.toLocaleString()}</div>
            {next ? (
              <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2 }}>{next.needed} pts to {TIER_META[next.tier].emoji} {TIER_META[next.tier].label}</div>
            ) : (
              <div style={{ fontSize: 11, color: "#6b21a8", marginTop: 2 }}>💎 Top tier achieved!</div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #f0f0f8", padding: "0 24px" }}>
          {(["overview", "history", "adjust"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 14px", fontSize: 12, fontWeight: 700,
              color: tab === t ? "#7C3AED" : "#9898b0",
              borderBottom: tab === t ? "2px solid #7C3AED" : "2px solid transparent",
              textTransform: "capitalize",
            }}>{t}</button>
          ))}
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "16px 24px 24px" }}>
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {next && (
                <div style={{ background: "#f7f7fb", borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>
                    Progress to {TIER_META[next.tier].emoji} {TIER_META[next.tier].label}
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "#e8e8f0", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#7C3AED,#9333EA)",
                      width: `${Math.min(100, ((earned / (earned + next.needed)) * 100))}%`,
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: "#9898b0", marginTop: 6 }}>{next.needed} more points needed</div>
                </div>
              )}
              <div style={{ background: "#f7f7fb", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>Earning Rate</div>
                <div style={{ fontSize: 13, color: "#5a5a7a" }}>
                  Every <strong>Rs. {Math.round(1 / settings.pointsPerRupee)}</strong> spent = <strong>1 point</strong>
                </div>
                <div style={{ fontSize: 13, color: "#5a5a7a", marginTop: 4 }}>
                  100 points = <strong>{fmt(pointsToRupees(100, settings.rupeePerPoint))}</strong> discount
                </div>
              </div>
              <div style={{ background: "#f7f7fb", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", marginBottom: 4 }}>Redeemable Value</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#7C3AED" }}>
                  {fmt(pointsToRupees(balance, settings.rupeePerPoint))}
                </div>
                <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2 }}>from {balance} points</div>
              </div>
            </div>
          )}

          {tab === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9898b0", fontSize: 13, padding: "32px 0" }}>No transactions yet</div>
              ) : history.map((tx) => (
                <div key={tx.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: "#f7f7fb", borderRadius: 10,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{tx.note}</div>
                    <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2 }}>{fmtDate(tx.date)}</div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 800,
                    color: tx.points > 0 ? "#059669" : "#dc2626",
                  }}>
                    {tx.points > 0 ? "+" : ""}{tx.points} pts
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "adjust" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {(["add", "redeem"] as const).map((t) => (
                  <button key={t} onClick={() => setAdjType(t)} style={{
                    flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer",
                    fontWeight: 700, fontSize: 13,
                    background: adjType === t ? "#7C3AED" : "#f0f0f8",
                    color: adjType === t ? "#fff" : "#5a5a7a",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                    {t === "add" ? <Plus size={14} /> : <Minus size={14} />}
                    {t === "add" ? "Add Points" : "Redeem Points"}
                  </button>
                ))}
              </div>
              <input
                type="number" min={1} placeholder="Points"
                value={adjPts} onChange={(e) => setAdjPts(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e8f0", fontSize: 14, fontWeight: 600, outline: "none" }}
              />
              <input
                type="text" placeholder="Note (optional)"
                value={adjNote} onChange={(e) => setAdjNote(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e8f0", fontSize: 14, outline: "none" }}
              />
              {adjType === "redeem" && adjPts && (
                <div style={{ background: "#fef3c7", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400e", fontWeight: 600 }}>
                  Redeeming {adjPts} pts = {fmt(pointsToRupees(parseInt(adjPts) || 0, settings.rupeePerPoint))} discount
                </div>
              )}
              <button onClick={handleAdjust} disabled={!adjPts || saving} style={{
                padding: "12px", borderRadius: 12, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,#7C3AED,#9333EA)", color: "#fff",
                fontWeight: 700, fontSize: 14,
                opacity: !adjPts ? 0.5 : 1,
              }}>
                {adjType === "add" ? "Add Points" : "Redeem Points"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Settings Panel ─────────────────────────────────────────────────────────────

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = settingsStore.loyalty as LoyaltySettings;
  const [form, setForm] = useState({ ...s });
  const [saved, setSaved] = useState(false);

  function save() {
    Object.assign(settingsStore.loyalty, form);
    saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const F = (k: keyof typeof form, num?: boolean) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = num ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 440,
        boxShadow: "0 24px 60px rgba(0,0,0,0.18)", padding: "28px 28px 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>Loyalty Settings</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9898b0" }}><X size={20} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Enable toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f7f7fb", borderRadius: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>Enable Loyalty Program</div>
              <div style={{ fontSize: 12, color: "#9898b0" }}>Points auto-awarded on completion</div>
            </div>
            <div
              onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
              style={{
                width: 44, height: 24, borderRadius: 12, cursor: "pointer", transition: "background 0.2s",
                background: form.enabled ? "#7C3AED" : "#d1d5db", position: "relative",
              }}
            >
              <div style={{
                position: "absolute", top: 2, left: form.enabled ? 22 : 2,
                width: 20, height: 20, borderRadius: 10, background: "#fff",
                transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </div>
          </div>

          {/* Earning rate */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a5a7a", display: "block", marginBottom: 6 }}>
              Points per Rupee spent
            </label>
            <input
              type="number" step="0.01" min="0.01" value={form.pointsPerRupee}
              onChange={F("pointsPerRupee", true)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ fontSize: 11, color: "#9898b0", marginTop: 4 }}>
              e.g. 0.01 = 1 pt per Rs. 100 · 0.1 = 1 pt per Rs. 10
            </div>
          </div>

          {/* Redemption value */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#5a5a7a", display: "block", marginBottom: 6 }}>
              Rupees per point (redemption value)
            </label>
            <input
              type="number" step="0.5" min="0.5" value={form.rupeePerPoint}
              onChange={F("rupeePerPoint", true)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e8e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ fontSize: 11, color: "#9898b0", marginTop: 4 }}>
              e.g. 1 = 100 pts → Rs. 100 off
            </div>
          </div>

          {/* Tier thresholds */}
          <div style={{ borderTop: "1px solid #f0f0f8", paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#5a5a7a", marginBottom: 10 }}>Tier Thresholds (lifetime pts)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {(["silverMin", "goldMin", "platinumMin"] as const).map((k) => (
                <div key={k}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: TIER_META[k === "silverMin" ? "silver" : k === "goldMin" ? "gold" : "platinum"].color, display: "block", marginBottom: 4 }}>
                    {TIER_META[k === "silverMin" ? "silver" : k === "goldMin" ? "gold" : "platinum"].emoji} {k === "silverMin" ? "Silver" : k === "goldMin" ? "Gold" : "Platinum"}
                  </label>
                  <input
                    type="number" min={1} value={form[k]}
                    onChange={F(k, true)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e8e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <button onClick={save} style={{
          marginTop: 20, width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#7C3AED,#9333EA)", color: "#fff", fontWeight: 700, fontSize: 15,
        }}>
          {saved ? "Saved ✓" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function LoyaltyPage() {
  const [clients, setClients]         = useState<Client[]>([]);
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<Client | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [tierFilter, setTierFilter]   = useState<string>("all");

  const settings = settingsStore.loyalty as LoyaltySettings;

  useEffect(() => {
    const ls = settingsStore.loyalty as LoyaltySettings;
    const allClients = getStoredClients();
    const allAppts   = getStoredAppointments();

    // Recompute earned points from actual appointment history at the current rate.
    // This self-heals whenever the rate changes and handles first-time backfill.
    let changed = false;
    const recalculated = allClients.map((c) => {
      const spent = allAppts
        .filter((a) => a.clientId === c.id && a.status === "completed")
        .reduce((s, a) => s + a.totalAmount, 0);
      const correctEarned = Math.floor(spent * ls.pointsPerRupee);
      if (c.loyaltyPointsEarned === correctEarned) return c;
      // Preserve any manual redemptions (earned - balance = amount redeemed)
      const redeemed = Math.max(0, (c.loyaltyPointsEarned ?? 0) - (c.loyaltyPoints ?? 0));
      const newBalance = Math.max(0, correctEarned - redeemed);
      changed = true;
      return { ...c, loyaltyPointsEarned: correctEarned, loyaltyPoints: newBalance };
    });

    if (changed) saveClients(recalculated);
    setClients(recalculated);
  }, []);

  function handleUpdate(updated: Client) {
    setClients((prev) => {
      const next = prev.map((c) => c.id === updated.id ? updated : c);
      saveClients(next);
      return next;
    });
    setSelected(updated);
  }

  const enriched = useMemo(() => clients.map((c) => ({
    client: c,
    tier:    getTier(c.loyaltyPointsEarned ?? 0, settings),
    balance: c.loyaltyPoints ?? 0,
    earned:  c.loyaltyPointsEarned ?? 0,
  })), [clients, settings]);

  const filtered = useMemo(() => {
    return enriched
      .filter((e) => {
        if (search && !e.client.name.toLowerCase().includes(search.toLowerCase()) &&
            !e.client.phone.includes(search)) return false;
        if (tierFilter !== "all" && e.tier !== tierFilter) return false;
        return true;
      })
      .sort((a, b) => b.earned - a.earned);
  }, [enriched, search, tierFilter]);

  const totalPts      = clients.reduce((s, c) => s + (c.loyaltyPoints ?? 0), 0);
  const totalEarned   = clients.reduce((s, c) => s + (c.loyaltyPointsEarned ?? 0), 0);
  const activeMembers = clients.filter((c) => (c.loyaltyPointsEarned ?? 0) > 0).length;
  const platCount     = enriched.filter((e) => e.tier === "platinum").length;

  const TIER_FILTERS = [
    { value: "all",      label: "All Members" },
    { value: "platinum", label: "💎 Platinum" },
    { value: "gold",     label: "🥇 Gold" },
    { value: "silver",   label: "🥈 Silver" },
    { value: "bronze",   label: "🥉 Bronze" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7fb", padding: "28px 28px 40px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#7C3AED,#9333EA)", display: "grid", placeItems: "center" }}>
            <Gift size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>Loyalty Program</div>
            <div style={{ fontSize: 13, color: "#9898b0" }}>Reward your clients, grow retention</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowSettings(true)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 16px",
            borderRadius: 10, border: "1.5px solid #e8e8f0", background: "#fff",
            fontSize: 13, fontWeight: 600, color: "#5a5a7a", cursor: "pointer",
          }}>
            <Settings2 size={15} /> Settings
          </button>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "9px 16px",
            borderRadius: 10, border: "none",
            background: settings.enabled ? "#f0fdf4" : "#fef2f2",
            fontSize: 13, fontWeight: 700,
            color: settings.enabled ? "#059669" : "#dc2626",
          }}>
            {settings.enabled ? "● Active" : "● Paused"}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard icon={<Users size={18} />}     label="Active Members"    value={activeMembers.toString()} sub={`of ${clients.length} clients`} color="#7C3AED" />
        <StatCard icon={<Star size={18} />}       label="Total Points Balance" value={totalPts.toLocaleString()} sub={`≈ ${fmt(totalPts * settings.rupeePerPoint)}`} color="#d97706" />
        <StatCard icon={<TrendingUp size={18} />} label="Lifetime Earned"   value={totalEarned.toLocaleString()} sub="all time" color="#059669" />
        <StatCard icon={<Award size={18} />}      label="Platinum Members"  value={platCount.toString()} sub="top tier" color="#6b21a8" />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9898b0" }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 10, border: "1.5px solid #e8e8f0", fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TIER_FILTERS.map((f) => (
            <button key={f.value} onClick={() => setTierFilter(f.value)} style={{
              padding: "7px 14px", borderRadius: 20, cursor: "pointer",
              fontSize: 12, fontWeight: 700,
              background: tierFilter === f.value ? "#7C3AED" : "#fff",
              color: tierFilter === f.value ? "#fff" : "#5a5a7a",
              border: tierFilter === f.value ? "none" : "1.5px solid #e8e8f0",
            } as React.CSSProperties}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e8f0", overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>Client Leaderboard</div>
          <div style={{ fontSize: 12, color: "#9898b0" }}>{filtered.length} clients</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#9898b0" }}>
            <Gift size={36} style={{ marginBottom: 10, opacity: 0.4 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e" }}>No members yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Points are awarded when appointments are marked completed</div>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "40px 1fr 120px 100px 100px 80px 36px",
              padding: "10px 18px", background: "#f7f7fb",
              fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em",
              gap: 8,
            }}>
              <div>#</div><div>Client</div><div>Tier</div>
              <div style={{ textAlign: "right" }}>Balance</div>
              <div style={{ textAlign: "right" }}>Lifetime</div>
              <div style={{ textAlign: "right" }}>Value</div>
              <div />
            </div>
            {filtered.map((e, i) => (
              <div
                key={e.client.id}
                onClick={() => setSelected(e.client)}
                style={{
                  display: "grid", gridTemplateColumns: "40px 1fr 120px 100px 100px 80px 36px",
                  padding: "13px 18px", gap: 8, alignItems: "center",
                  borderBottom: "1px solid #f7f7fb", cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(el) => (el.currentTarget.style.background = "#f7f7fb")}
                onMouseLeave={(el) => (el.currentTarget.style.background = "transparent")}
              >
                {/* Rank */}
                <div style={{ fontSize: 13, fontWeight: 800, color: i < 3 ? "#7C3AED" : "#9898b0" }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                </div>

                {/* Name */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{e.client.name}</div>
                  <div style={{ fontSize: 11, color: "#9898b0" }}>{e.client.phone}</div>
                </div>

                {/* Tier */}
                <div><TierBadge tier={e.tier} /></div>

                {/* Balance */}
                <div style={{ textAlign: "right", fontSize: 14, fontWeight: 800, color: "#7C3AED" }}>
                  {e.balance.toLocaleString()}
                </div>

                {/* Lifetime */}
                <div style={{ textAlign: "right", fontSize: 13, color: "#5a5a7a", fontWeight: 600 }}>
                  {e.earned.toLocaleString()}
                </div>

                {/* Redeemable value */}
                <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "#059669" }}>
                  {fmt(pointsToRupees(e.balance, settings.rupeePerPoint))}
                </div>

                <ChevronRight size={16} color="#d0d0e0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selected && (
        <ClientModal
          client={selected}
          settings={settings}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
