"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BEAUTY_PROFILES } from "@/lib/mock-data";
import { getStoredAppointments, getStoredClients, saveClients } from "@/lib/storage";
import { getSalonInvoices, type SalonInvoice } from "@/lib/salon-invoices";
import type { Client, Appointment } from "@/lib/types";
import { Search, X, Plus, Phone, Mail, Calendar, Heart, ChevronDown, Camera, ExternalLink, Trash2, Download, Upload, FileSpreadsheet, TrendingUp, Clock, Send } from "lucide-react";
import { getCurrentPlan, isAtLimit } from "@/lib/plan-limits";
import { settingsStore } from "@/lib/settings-store";
import { normalizePhone, appendLog } from "@/lib/whatsapp-scheduler";
import { getTier, TIER_META, nextTierThreshold, pointsToRupees, type LoyaltySettings } from "@/lib/loyalty";

const STATUS_CONFIG = {
  booked:        { color: "#6366f1", bg: "#eef2ff" },
  confirmed:     { color: "#059669", bg: "#ecfdf5" },
  arrived:       { color: "#9333EA", bg: "#f5f3ff" },
  "in-progress": { color: "#d97706", bg: "#fffbeb" },
};

const TAG_COLORS: Record<string, { color: string; bg: string }> = {
  VIP:      { color: "#7C3AED", bg: "#EDE9FE" },
  Regular:  { color: "#059669", bg: "#ecfdf5" },
  Bridal:   { color: "#db2777", bg: "#fdf2f8" },
  New:      { color: "#0369a1", bg: "#e0f2fe" },
  "At-Risk":{ color: "#dc2626", bg: "#fef2f2" },
};

import { fmtCurrency as fmt } from "@/lib/format";

function fmtDate(s?: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Delete All Confirm Modal ──────────────────────────────────────────────────
function DeleteAllConfirmModal({ count, onConfirm, onCancel }: { count: number; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: 360, padding: "28px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Trash2 size={22} color="#dc2626" />
        </div>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 8 }}>Delete All Clients?</div>
        <div style={{ fontSize: 13, color: "#6b6b8a", lineHeight: 1.6, marginBottom: 24 }}>
          This will permanently delete all <strong>{count} client{count !== 1 ? "s" : ""}</strong>. This action cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
            Delete All
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ clientName, onConfirm, onCancel }: { clientName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: 340, padding: "28px 24px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Trash2 size={22} color="#dc2626" />
        </div>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 8 }}>Delete Client?</div>
        <div style={{ fontSize: 13, color: "#6b6b8a", lineHeight: 1.6, marginBottom: 24 }}>
          This will permanently delete <strong>{clientName}</strong> and all their data. This cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Client Detail Panel ───────────────────────────────────────────────────────
function ClientPanel({ client, onClose, appointments, onUpdate, onDelete }: { client: Client; onClose: () => void; appointments: Appointment[]; onUpdate?: (c: Client) => void; onDelete?: (id: string) => void }) {
  const panelRouter = useRouter();
  const allClientAppts   = appointments.filter((a) => a.clientId === client.id);
  const completedAppts   = allClientAppts.filter((a) => a.status === "completed").sort((a, b) => b.date.localeCompare(a.date));
  const posInvoices      = getSalonInvoices().filter((inv) => inv.clientId === client.id && inv.source === "pos");
  const upcomingAppts    = allClientAppts.filter((a) => !["completed","cancelled","no-show"].includes(a.status)).sort((a, b) => a.date.localeCompare(b.date));

  // Use stored accumulated values (include POS + all devices)
  const apptVisits   = completedAppts.length;
  const apptSpend    = completedAppts.reduce((s, a) => s + a.totalAmount, 0);
  const liveVisits   = Math.max(client.totalVisits ?? 0, apptVisits + posInvoices.length);
  const liveSpend    = Math.max(client.totalSpend  ?? 0, apptSpend + posInvoices.reduce((s, inv) => s + inv.total, 0));
  const liveLastVisit = client.lastVisitDate ?? completedAppts[0]?.date;
  const liveAvgTicket = liveVisits ? Math.round(liveSpend / liveVisits) : 0;

  // Loyalty — use the stored earned/balance fields (maintained by the loyalty system),
  // but floor-reconcile upward from liveSpend so un-synced older records still show correctly
  const loyalty = settingsStore.loyalty as LoyaltySettings;
  const storedEarned  = client.loyaltyPointsEarned ?? 0;
  const storedBalance = client.loyaltyPoints ?? 0;
  // liveSpend already includes both completed appointments + POS invoices (computed above)
  const computedEarned = Math.floor(liveSpend * (loyalty.pointsPerRupee ?? 0.01));
  const liveEarned    = Math.max(storedEarned, computedEarned);
  const redeemed      = Math.max(0, storedEarned - storedBalance);
  const liveBalance   = Math.max(storedBalance, liveEarned - redeemed);
  const loyaltyTier   = getTier(liveEarned, loyalty);
  const tierMeta      = TIER_META[loyaltyTier];
  const pointsValue   = Math.round(pointsToRupees(liveBalance, loyalty.rupeePerPoint ?? 1));
  const nextTier      = nextTierThreshold(liveEarned, loyalty);

  // Unified visit history: completed appointments + POS invoices, sorted by date desc
  type HistoryEntry = { kind: "appt"; data: Appointment } | { kind: "pos"; data: SalonInvoice };
  const historyEntries: HistoryEntry[] = [
    ...completedAppts.map((a): HistoryEntry => ({ kind: "appt", data: a })),
    ...posInvoices.map((inv): HistoryEntry => ({ kind: "pos", data: inv })),
  ].sort((a, b) => {
    const da = a.data.date;
    const db = b.data.date;
    return db.localeCompare(da);
  });
  const profile = BEAUTY_PROFILES.find((p) => p.clientId === client.id);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: client.name,
    phone: client.phone,
    email: client.email ?? "",
    dob: client.dob ?? "",
    source: client.source,
    tag: client.tags[0] ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const setE = (k: string, v: string) => setEditForm((f) => ({ ...f, [k]: v }));
  const [visitPhotos, setVisitPhotos] = useState<Record<string, { before?: string; after?: string }>>({});
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  const handlePhotoUpload = (apptId: string, side: "before" | "after", file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setVisitPhotos((prev) => ({ ...prev, [apptId]: { ...prev[apptId], [side]: e.target?.result as string } }));
    };
    reader.readAsDataURL(file);
  };

  const displayName = saved ? editForm.name : client.name;
  const displayPhone = saved ? editForm.phone : client.phone;
  const displayEmail = saved ? editForm.email : client.email;
  const displayDob = saved ? editForm.dob : client.dob;
  const displaySource = saved ? editForm.source : client.source;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {showDeleteConfirm && (
        <DeleteConfirmModal
          clientName={client.name}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => { onDelete?.(client.id); onClose(); }}
        />
      )}
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #EDE9FE, #fdf2f8)", padding: "28px 24px 20px", borderBottom: "1px solid #f0f0f8", position: "relative" }}>
          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
            <button
              onClick={() => { onClose(); panelRouter.push(`/dashboard/clients/${client.id}`); }}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: "1px solid #EDE9FE", background: "#7C3AED", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer" }}
            >
              <ExternalLink size={11} /> Full Profile
            </button>
            {!editing && (
              <button onClick={() => setEditing(true)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #EDE9FE", background: "#fff", fontSize: 11, fontWeight: 600, color: "#7C3AED", cursor: "pointer" }}>
                Edit
              </button>
            )}
            <button onClick={() => setShowDeleteConfirm(true)} title="Delete client" style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer" }}>
              <Trash2 size={13} color="#dc2626" />
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}>
              <X size={18} color="#6b6b8a" />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #5B21B6, #9333EA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff" }}>
              {displayName.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20, color: "#1a1a2e" }}>{displayName}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {(saved ? [editForm.tag].filter(Boolean) : client.tags).map((tag) => {
                  const tc = TAG_COLORS[tag] ?? { color: "#6b7280", bg: "#f9fafb" };
                  return <span key={tag} style={{ fontSize: 11, fontWeight: 600, color: tc.color, background: tc.bg, padding: "2px 10px", borderRadius: 20 }}>{tag}</span>;
                })}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stats — live-computed from appointment history */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "Visits",     value: liveVisits,            color: "#7C3AED", bg: "#f5f3ff" },
                { label: "Total Spend",value: fmt(liveSpend),        color: "#059669", bg: "#ecfdf5" },
                { label: "Avg Ticket", value: liveAvgTicket ? fmt(liveAvgTicket) : "—", color: "#0284c7", bg: "#f0f9ff" },
                { label: "Upcoming",   value: upcomingAppts.length,  color: "#d97706", bg: "#fffbeb" },
              ].map((s) => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#9898b0", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Loyalty row — only when enabled */}
            {loyalty.enabled && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 12, background: tierMeta.bg, border: `1px solid ${tierMeta.color}28` }}>
                <div style={{ fontSize: 20, lineHeight: 1 }}>{tierMeta.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: tierMeta.color, lineHeight: 1 }}>{liveBalance.toLocaleString()}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: tierMeta.color }}>pts balance</span>
                    <span style={{ fontSize: 11, color: "#9898b0" }}>· {fmt(pointsValue)}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#9898b0", marginTop: 3 }}>
                    {liveEarned.toLocaleString()} lifetime earned
                    {nextTier ? ` · ${nextTier.needed} to ${TIER_META[nextTier.tier].emoji} ${TIER_META[nextTier.tier].label}` : " · Top tier!"}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: tierMeta.color, background: "#fff", border: `1px solid ${tierMeta.color}40`, borderRadius: 20, padding: "3px 10px", flexShrink: 0 }}>
                  {tierMeta.label}
                </span>
              </div>
            )}
          </div>

          {/* Visit History — appointments + POS merged */}
          {historyEntries.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                Visit History <span style={{ fontWeight: 400 }}>({historyEntries.length})</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {historyEntries.slice(0, 10).map((entry) => {
                  if (entry.kind === "pos") {
                    const inv = entry.data;
                    const isExpanded = expandedVisit === inv.id;
                    return (
                      <div key={inv.id}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: isExpanded ? "10px 10px 0 0" : 10, background: "#f0fdf4", border: "1px solid #bbf7d0", borderBottom: isExpanded ? "none" : undefined }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "#059669", background: "#dcfce7", padding: "1px 6px", borderRadius: 20, border: "1px solid #bbf7d0" }}>POS</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{inv.items.map((it) => it.description).join(", ")}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2 }}>{fmtDate(inv.date)} · {inv.staffName || "—"} · {inv.paymentMethod || "cash"}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#059669" }}>{fmt(inv.total)}</div>
                            <button onClick={() => setExpandedVisit(isExpanded ? null : inv.id)}
                              style={{ display: "flex", alignItems: "center", padding: "4px 7px", borderRadius: 20, border: "none", cursor: "pointer", background: "#dcfce7", fontSize: 10, fontWeight: 700, color: "#059669" }}>
                              {isExpanded ? "▲" : "▼"}
                            </button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div style={{ background: "#f9fffe", border: "1px solid #bbf7d0", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px 12px" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7 }}>Items</div>
                            {inv.items.map((it, i) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#1a1a2e", marginBottom: 4 }}>
                                <span>{it.description}{it.qty > 1 ? ` ×${it.qty}` : ""}</span>
                                <span style={{ fontWeight: 700 }}>{fmt(it.unitPrice * it.qty)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const a = entry.data;
                  const photos = visitPhotos[a.id] ?? {};
                  const photoCount = [photos.before, photos.after].filter(Boolean).length;
                  const isExpanded = expandedVisit === a.id;
                  return (
                    <div key={a.id}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: isExpanded ? "10px 10px 0 0" : 10, background: "#f9f9fb", border: "1px solid #f0f0f8", borderBottom: isExpanded ? "none" : "1px solid #f0f0f8" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{a.serviceNames.join(", ")}</div>
                          <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2 }}>{fmtDate(a.date)} · {a.staffName || "—"}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#7C3AED" }}>{fmt(a.totalAmount)}</div>
                          <button
                            onClick={() => setExpandedVisit(isExpanded ? null : a.id)}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 20, border: "none", cursor: "pointer", background: photoCount > 0 ? "#ede9fe" : "#f3f4f6" }}
                          >
                            <Camera size={11} color={photoCount > 0 ? "#7C3AED" : "#9ca3af"} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: photoCount > 0 ? "#7C3AED" : "#9ca3af" }}>
                              {photoCount > 0 ? photoCount : "Add"}
                            </span>
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ background: "#f5f3ff", border: "1px solid #ede9fe", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "12px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {(["before", "after"] as const).map((side) => (
                              <div key={side}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{side}</div>
                                {photos[side] ? (
                                  <div style={{ position: "relative", borderRadius: 8, overflow: "hidden" }}>
                                    <img src={photos[side]} alt={side} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
                                    <button
                                      onClick={() => setVisitPhotos((prev) => ({ ...prev, [a.id]: { ...prev[a.id], [side]: undefined } }))}
                                      style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                                    >
                                      <X size={10} color="#fff" />
                                    </button>
                                  </div>
                                ) : (
                                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, height: 90, borderRadius: 8, border: "2px dashed #a78bfa", background: "#faf5ff", cursor: "pointer" }}>
                                    <Camera size={16} color="#a78bfa" />
                                    <span style={{ fontSize: 10, fontWeight: 600, color: "#a78bfa" }}>Upload {side}</span>
                                    <input type="file" accept="image/*" style={{ display: "none" }}
                                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(a.id, side, f); }} />
                                  </label>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {liveLastVisit && (
                <div style={{ fontSize: 11, color: "#b0b0c8", marginTop: 6 }}>Last visit: {fmtDate(liveLastVisit)}</div>
              )}
            </div>
          )}

          {/* Upcoming appointments */}
          {upcomingAppts.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Upcoming</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {upcomingAppts.slice(0, 3).map((a) => {
                  const sc = STATUS_CONFIG[a.status as keyof typeof STATUS_CONFIG] ?? { color: "#6b7280", bg: "#f9fafb" };
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 10, background: sc.bg, border: `1px solid ${sc.color}22` }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{a.serviceNames.join(", ")}</div>
                        <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2 }}>{fmtDate(a.date)} · {a.staffName || "—"}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: sc.color, background: "rgba(255,255,255,0.8)", borderRadius: 20, padding: "2px 8px", border: `1px solid ${sc.color}33` }}>
                        {a.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contact — view or edit */}
          {editing ? (
            <PanelSection title="Edit Details">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Full Name", key: "name", type: "text", placeholder: "Full name" },
                  { label: "Phone", key: "phone", type: "text", placeholder: "Phone number" },
                  { label: "Email", key: "email", type: "email", placeholder: "Email address" },
                  { label: "Date of Birth", key: "dob", type: "date", placeholder: "" },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                    <input type={type} value={editForm[key as keyof typeof editForm]} onChange={(e) => setE(key, e.target.value)} placeholder={placeholder}
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Source</label>
                    <select value={editForm.source} onChange={(e) => setE("source", e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff" }}>
                      {["whatsapp", "walk-in", "web", "manual"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tag</label>
                    <select value={editForm.tag} onChange={(e) => setE("tag", e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff" }}>
                      <option value="">None</option>
                      {Object.keys(TAG_COLORS).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                  <button onClick={() => { setEditing(false); setEditForm({ name: client.name, phone: client.phone, email: client.email ?? "", dob: client.dob ?? "", source: client.source, tag: client.tags[0] ?? "" }); }}
                    style={{ flex: 1, padding: "10px 0", borderRadius: 9, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={() => {
                    const updatedC: Client = {
                      ...client,
                      name: editForm.name,
                      phone: editForm.phone,
                      email: editForm.email || undefined,
                      dob: editForm.dob || undefined,
                      source: editForm.source as any,
                      tags: editForm.tag ? [editForm.tag] : [],
                    };
                    onUpdate?.(updatedC);
                    setSaved(true);
                    setEditing(false);
                  }}
                    style={{ flex: 2, padding: "10px 0", borderRadius: 9, border: "none", background: "#7C3AED", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                    Save Changes
                  </button>
                </div>
              </div>
            </PanelSection>
          ) : (
            <PanelSection title="Contact & Info">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <InfoLine icon={<Phone size={13} color="#9898b0" />} label={displayPhone} />
                {displayEmail && <InfoLine icon={<Mail size={13} color="#9898b0" />} label={displayEmail} />}
                {displayDob && <InfoLine icon={<Calendar size={13} color="#9898b0" />} label={`DOB: ${fmtDate(displayDob)}`} />}
                <InfoLine icon={<Heart size={13} color="#9898b0" />} label={`Source: ${displaySource}`} />
                <InfoLine icon={<Calendar size={13} color="#9898b0" />} label={`Last visit: ${fmtDate(liveLastVisit ?? client.lastVisitDate)}`} />
              </div>
            </PanelSection>
          )}

          {/* Beauty Profile */}
          {profile && (
            <PanelSection title="Beauty Profile">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {profile.skinType && (
                  <div style={{ fontSize: 13, color: "#1a1a2e" }}>Skin type: <span style={{ fontWeight: 600 }}>{profile.skinType}</span></div>
                )}
                {profile.allergies.length > 0 && (
                  <div style={{ fontSize: 13, color: "#dc2626" }}>⚠ Allergies: {profile.allergies.join(", ")}</div>
                )}
                {profile.nailPrefs && (
                  <div style={{ fontSize: 13, color: "#1a1a2e" }}>Nail prefs: {profile.nailPrefs}</div>
                )}
                {profile.hairFormulas.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Hair Formulas</div>
                    {profile.hairFormulas.map((f, i) => (
                      <div key={i} style={{ background: "#f9f9fb", borderRadius: 8, padding: "10px 12px", marginBottom: 6, fontSize: 12, color: "#1a1a2e", lineHeight: 1.7 }}>
                        <span style={{ fontWeight: 600 }}>{f.brand}</span> · {f.shade} · {f.developer} · {f.ratio} · {f.processingTime}min
                        {f.notes && <div style={{ color: "#9898b0", marginTop: 2 }}>{f.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {profile.notes && <div style={{ fontSize: 12, color: "#6b6b8a", fontStyle: "italic" }}>{profile.notes}</div>}
              </div>
            </PanelSection>
          )}

        </div>
      </div>
    </div>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function InfoLine({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {icon}
      <span style={{ fontSize: 13, color: "#1a1a2e", textTransform: "capitalize" }}>{label}</span>
    </div>
  );
}

// ── Add Client Modal ──────────────────────────────────────────────────────────
function AddClientModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Client) => void }) {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", dob: "", source: "whatsapp", tag: "", notes: "" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name && form.phone;

  const handleAdd = () => {
    if (!canSubmit) return;
    const newClient: Client = {
      id: "c_" + Date.now(),
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      gender: "female",
      dob: form.dob || undefined,
      tags: form.tag ? [form.tag] : ["New"],
      source: form.source as any,
      createdAt: new Date().toISOString().split("T")[0],
      totalVisits: 0,
      totalSpend: 0,
      lastVisitDate: "",
      averageRating: 0.0,
      notes: form.notes || undefined,
    };
    onAdd(newClient);
    setDone(true);
  };

  if (done) return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 360, padding: "48px 32px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e", marginBottom: 8 }}>Client Added</div>
        <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 24 }}>The new client has been created.</div>
        <button onClick={onClose} style={{ padding: "10px 32px", borderRadius: 10, background: "#7C3AED", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>Add New Client</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={18} color="#6b6b8a" /></button>
        </div>
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Full Name *", key: "name", placeholder: "e.g. Amna Siddiqui", type: "text" },
            { label: "Phone *", key: "phone", placeholder: "e.g. 0321-1234567", type: "text" },
            { label: "Email", key: "email", placeholder: "e.g. amna@email.com", type: "email" },
            { label: "Date of Birth", key: "dob", placeholder: "", type: "date" },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
              <input type={type} value={form[key as keyof typeof form]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Source</label>
              <select value={form.source} onChange={(e) => set("source", e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff" }}>
                {["whatsapp", "walk-in", "web", "manual"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tag</label>
              <select value={form.tag} onChange={(e) => set("tag", e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff" }}>
                <option value="">None</option>
                {Object.keys(TAG_COLORS).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes & Preferences</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. Sensitive scalp, prefers morning appointments, no strong fragrances…"
              rows={3}
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleAdd} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: canSubmit ? "#7C3AED" : "#e8e8f0", fontSize: 13, fontWeight: 600, color: canSubmit ? "#fff" : "#b0b0c8", cursor: canSubmit ? "pointer" : "not-allowed" }}>
              Add Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export helpers ────────────────────────────────────────────────────────────
const EXPORT_COLS = [
  "Name","Phone","Email","Gender","Date of Birth","Source","Tags","Notes",
  "Total Visits","Total Spend","Loyalty Points","Created At",
];

function clientsToRows(list: Client[]) {
  return list.map((c) => ({
    "Name":           c.name,
    "Phone":          c.phone,
    "Email":          c.email ?? "",
    "Gender":         c.gender ?? "",
    "Date of Birth":  c.dob ?? "",
    "Source":         c.source,
    "Tags":           c.tags.join(", "),
    "Notes":          c.notes ?? "",
    "Total Visits":   c.totalVisits,
    "Total Spend":    c.totalSpend,
    "Loyalty Points": c.loyaltyPoints ?? 0,
    "Created At":     c.createdAt,
  }));
}

async function exportClients(list: Client[], format: "xlsx" | "csv") {
  const XLSX = await import("xlsx");
  const ws   = XLSX.utils.json_to_sheet(clientsToRows(list), { header: EXPORT_COLS });
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clients");
  const date = new Date().toISOString().slice(0,10);
  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `clients-${date}.csv`; a.click();
  } else {
    XLSX.writeFile(wb, `clients-${date}.xlsx`);
  }
}

// ── Import Modal ──────────────────────────────────────────────────────────────
type ImportResult = { added: number; skipped: number; errors: string[] };

function ImportModal({ existing, onClose, onImport }: {
  existing: Client[];
  onClose: () => void;
  onImport: (newClients: Client[]) => void;
}) {
  const [step, setStep]     = useState<"pick" | "preview" | "done">("pick");
  const [parsed, setParsed] = useState<Client[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    setError(""); setLoading(true);
    try {
      const XLSX   = await import("xlsx");
      const buf    = await file.arrayBuffer();
      const wb     = XLSX.read(buf, { type: "array" });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const rows   = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      if (rows.length === 0) { setError("File is empty or unreadable."); setLoading(false); return; }

      const existingPhones = new Set(existing.map((c) => c.phone.replace(/\s/g, "")));
      const newClients: Client[] = [];

      for (const row of rows) {
        const name  = String(row["Name"] ?? row["name"] ?? "").trim();
        const phone = String(row["Phone"] ?? row["phone"] ?? row["Phone Number"] ?? "").replace(/\s/g,"").trim();
        if (!name || !phone) continue; // skip blank rows
        if (existingPhones.has(phone)) continue; // skip duplicates
        existingPhones.add(phone);

        const gender = String(row["Gender"] ?? "").toLowerCase();
        newClients.push({
          id:          `imp_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
          name,
          phone,
          email:       String(row["Email"] ?? row["email"] ?? "").trim() || undefined,
          gender:      (["female","male","other"].includes(gender) ? gender : undefined) as Client["gender"],
          dob:         String(row["Date of Birth"] ?? row["DOB"] ?? row["dob"] ?? "").trim() || undefined,
          source:      "manual",
          tags:        String(row["Tags"] ?? row["tags"] ?? "").split(",").map(t=>t.trim()).filter(Boolean),
          notes:       String(row["Notes"] ?? row["notes"] ?? "").trim() || undefined,
          totalVisits: Number(row["Total Visits"] ?? 0) || 0,
          totalSpend:  Number(row["Total Spend"]  ?? 0) || 0,
          loyaltyPoints: Number(row["Loyalty Points"] ?? 0) || 0,
          createdAt:   String(row["Created At"] ?? new Date().toISOString().slice(0,10)),
        });
      }
      setParsed(newClients);
      setStep("preview");
    } catch (e) {
      setError(`Could not read file: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoading(false);
  }

  function confirmImport() {
    const skipped = 0;
    onImport(parsed);
    setResult({ added: parsed.length, skipped, errors: [] });
    setStep("done");
  }

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:18,width:"100%",maxWidth:520,padding:28,boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#5B21B6,#9333EA)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <FileSpreadsheet size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize:15,fontWeight:800,color:"#1a1a2e" }}>Import Clients</div>
              <div style={{ fontSize:11,color:"#9898b0" }}>XLSX or CSV file</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",display:"flex" }}><X size={18} color="#9898b0" /></button>
        </div>

        {/* Step: pick file */}
        {step === "pick" && (
          <>
            <label style={{ display:"block",border:"2px dashed #ddd6fe",borderRadius:14,padding:"32px 20px",textAlign:"center",cursor:"pointer",background:"#faf9ff",transition:"border-color 0.2s" }}
              onDragOver={e=>{e.preventDefault();}} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f);}}>
              <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}} />
              <Upload size={28} color="#7C3AED" style={{ marginBottom:10 }} />
              <div style={{ fontSize:14,fontWeight:700,color:"#5B21B6",marginBottom:4 }}>Click to choose file or drag & drop</div>
              <div style={{ fontSize:12,color:"#9898b0" }}>Supports .xlsx, .xls, .csv</div>
            </label>
            {loading && <div style={{ textAlign:"center",marginTop:16,color:"#7C3AED",fontSize:13,fontWeight:600 }}>Reading file…</div>}
            {error  && <div style={{ marginTop:12,padding:"10px 14px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,fontSize:13,color:"#dc2626" }}>{error}</div>}

            {/* Column guide + download template */}
            <div style={{ marginTop:18,padding:"14px 16px",background:"#f5f3ff",borderRadius:12,fontSize:12,color:"#5B21B6",lineHeight:1.8 }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
                <strong style={{ fontSize:12 }}>Column format</strong>
                <button
                  onClick={async () => {
                    const XLSX = await import("xlsx");
                    const sample = [
                      { "Name":"Sara Ahmed",  "Phone":"923001234567","Email":"sara@example.com","Gender":"female","Date of Birth":"1995-04-12","Source":"walk-in","Tags":"VIP, Regular","Notes":"Prefers mornings","Total Visits":5,"Total Spend":12500,"Loyalty Points":350,"Created At":"2024-01-15" },
                      { "Name":"Ali Hassan",  "Phone":"923009876543","Email":"ali@example.com", "Gender":"male",  "Date of Birth":"1988-11-30","Source":"whatsapp","Tags":"Regular",      "Notes":"",              "Total Visits":2,"Total Spend":4800, "Loyalty Points":120,"Created At":"2024-03-22" },
                      { "Name":"Hina Malik",  "Phone":"923011112233","Email":"",                "Gender":"female","Date of Birth":"",          "Source":"manual",  "Tags":"Bridal",       "Notes":"Bridal package", "Total Visits":1,"Total Spend":8000, "Loyalty Points":200,"Created At":"2024-06-01" },
                    ];
                    const ws = XLSX.utils.json_to_sheet(sample, { header: EXPORT_COLS });
                    // Bold the header row
                    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
                    for (let c = range.s.c; c <= range.e.c; c++) {
                      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
                      if (cell) cell.s = { font: { bold: true } };
                    }
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Clients Template");
                    XLSX.writeFile(wb, "clients-import-template.xlsx");
                  }}
                  style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:8,border:"1px solid #c4b5fd",background:"#fff",fontSize:11,fontWeight:700,color:"#5B21B6",cursor:"pointer",whiteSpace:"nowrap" }}>
                  <Download size={12} /> Download Template
                </button>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2px 16px",fontSize:11 }}>
                {[
                  ["Name","Required — client full name"],
                  ["Phone","Required — with country code"],
                  ["Email","Optional"],
                  ["Gender","female / male / other"],
                  ["Date of Birth","YYYY-MM-DD format"],
                  ["Source","walk-in / whatsapp / manual"],
                  ["Tags","Comma-separated, e.g. VIP, Regular"],
                  ["Notes","Any freeform note"],
                  ["Total Visits","Number"],
                  ["Total Spend","Amount in PKR"],
                  ["Loyalty Points","Number"],
                  ["Created At","YYYY-MM-DD format"],
                ].map(([col, hint]) => (
                  <div key={col}>
                    <span style={{ fontWeight:700,color:"#4c1d95" }}>{col}</span>
                    <span style={{ color:"#7c3aed",marginLeft:4 }}>— {hint}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step: preview */}
        {step === "preview" && (
          <>
            <div style={{ padding:"12px 16px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:12,marginBottom:16,fontSize:13,color:"#14532d",fontWeight:600 }}>
              ✓ Found <strong>{parsed.length}</strong> new client{parsed.length!==1?"s":""} ready to import
            </div>
            {parsed.length > 0 && (
              <div style={{ maxHeight:240,overflowY:"auto",border:"1px solid #e8e8f0",borderRadius:12,marginBottom:16 }}>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
                  <thead><tr style={{ background:"#f5f3ff" }}>
                    {["Name","Phone","Email","Tags"].map(h=><th key={h} style={{ padding:"8px 12px",textAlign:"left",fontWeight:700,color:"#5B21B6",fontSize:11 }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {parsed.slice(0,50).map((c,i)=>(
                      <tr key={c.id} style={{ borderTop:"1px solid #f0f0f8",background:i%2===0?"#fff":"#fdfcff" }}>
                        <td style={{ padding:"7px 12px",fontWeight:600,color:"#1a1a2e" }}>{c.name}</td>
                        <td style={{ padding:"7px 12px",color:"#6b6b8a" }}>{c.phone}</td>
                        <td style={{ padding:"7px 12px",color:"#6b6b8a" }}>{c.email||"—"}</td>
                        <td style={{ padding:"7px 12px",color:"#6b6b8a" }}>{c.tags.join(", ")||"—"}</td>
                      </tr>
                    ))}
                    {parsed.length>50&&<tr><td colSpan={4} style={{ padding:"8px 12px",color:"#9898b0",fontSize:11,textAlign:"center" }}>…and {parsed.length-50} more</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
            {parsed.length === 0 && (
              <div style={{ padding:"20px",textAlign:"center",color:"#9898b0",fontSize:13 }}>No new clients found — all rows already exist or are missing Name/Phone.</div>
            )}
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setStep("pick")} style={{ flex:1,padding:"11px 0",borderRadius:10,border:"1px solid #e8e8f0",background:"#fff",fontSize:13,fontWeight:600,color:"#6b6b8a",cursor:"pointer" }}>Back</button>
              <button onClick={confirmImport} disabled={parsed.length===0}
                style={{ flex:2,padding:"11px 0",borderRadius:10,border:"none",background:parsed.length>0?"linear-gradient(135deg,#5B21B6,#9333EA)":"#e8e8f0",fontSize:13,fontWeight:700,color:parsed.length>0?"#fff":"#b0b0c8",cursor:parsed.length>0?"pointer":"not-allowed" }}>
                Import {parsed.length} Client{parsed.length!==1?"s":""}
              </button>
            </div>
          </>
        )}

        {/* Step: done */}
        {step === "done" && result && (
          <div style={{ textAlign:"center",padding:"12px 0" }}>
            <div style={{ fontSize:44,marginBottom:12 }}>🎉</div>
            <div style={{ fontSize:18,fontWeight:800,color:"#1a1a2e",marginBottom:6 }}>Import Complete!</div>
            <div style={{ fontSize:14,color:"#6b6b8a",marginBottom:20 }}>
              <strong style={{ color:"#059669" }}>{result.added}</strong> client{result.added!==1?"s":""} added successfully
            </div>
            <button onClick={onClose} style={{ padding:"11px 36px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#5B21B6,#9333EA)",fontSize:13,fontWeight:700,color:"#fff",cursor:"pointer" }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Send Segment Modal ────────────────────────────────────────────────────────

const SEGMENT_META = {
  spend:  { label: "Top Spenders",           tplKey: "topSpenders",  color: "#7C3AED", vars: "{{name}}, {{salon_name}}, {{spend}}" },
  visits: { label: "Most Frequent Visitors", tplKey: "mostFrequent", color: "#0284c7", vars: "{{name}}, {{salon_name}}, {{visits}}" },
  absent: { label: "Long Absent Clients",    tplKey: "longAbsent",   color: "#dc2626", vars: "{{name}}, {{salon_name}}, {{discount}}, {{days}}" },
} as const;

function SendSegmentModal({ mode, clients, onClose }: {
  mode: "spend" | "visits" | "absent";
  clients: Client[];
  onClose: () => void;
}) {
  const meta = SEGMENT_META[mode];
  const wa = settingsStore.whatsapp as Record<string, string>;
  const salonName = (settingsStore.salon as Record<string, string>).name || "";
  const providerConfig = settingsStore.wasender as Record<string, string>;
  const activeCredential = providerConfig.provider === "botsailor" ? providerConfig.botSailorApiToken : providerConfig.apiKey;
  const discount = providerConfig.cancelDiscount || "10%";

  const [text, setText] = useState(wa[meta.tplKey] || "");
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [finished, setFinished] = useState(false);

  const today = Date.now();

  function buildMsg(c: Client) {
    const days = c.lastVisitDate
      ? Math.floor((today - new Date(c.lastVisitDate).getTime()) / 86400000)
      : 0;
    return text
      .replace(/\{\{name\}\}/g, c.name)
      .replace(/\{\{salon_name\}\}/g, salonName)
      .replace(/\{\{visits\}\}/g, String(c.totalVisits || 0))
      .replace(/\{\{spend\}\}/g, String(c.totalSpend || 0))
      .replace(/\{\{days\}\}/g, String(days))
      .replace(/\{\{discount\}\}/g, discount);
  }

  async function send() {
    if (!activeCredential || !text.trim() || clients.length === 0 || progress) return;
    setProgress({ done: 0, total: clients.length, failed: 0 });
    let done = 0, failed = 0;
    for (const c of clients) {
      if (!c.phone) { failed++; setProgress({ done: ++done, total: clients.length, failed }); continue; }
      const msg = buildMsg(c);
      try {
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...providerConfig, phone: normalizePhone(c.phone), text: msg }),
        });
        const data = await res.json() as { ok: boolean };
        if (data.ok) {
          appendLog({ type: "manual", clientName: c.name, phone: normalizePhone(c.phone), status: "sent", templateId: meta.tplKey });
        } else {
          failed++;
          appendLog({ type: "manual", clientName: c.name, phone: normalizePhone(c.phone), status: "failed", templateId: meta.tplKey });
        }
      } catch { failed++; }
      done++;
      setProgress({ done, total: clients.length, failed });
    }
    setFinished(true);
  }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div onClick={!progress ? onClose : undefined} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 500, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={17} color={meta.color} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>Send to {meta.label}</div>
              <div style={{ fontSize: 11, color: "#9898b0" }}>{clients.length} recipient{clients.length !== 1 ? "s" : ""}</div>
            </div>
          </div>
          {!progress && <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={18} color="#9898b0" /></button>}
        </div>

        {finished ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", marginBottom: 6 }}>Messages Sent!</div>
            <div style={{ fontSize: 13, color: "#6b6b8a", marginBottom: 20 }}>
              <span style={{ color: "#059669", fontWeight: 700 }}>{(progress?.done || 0) - (progress?.failed || 0)} sent</span>
              {(progress?.failed || 0) > 0 && <span style={{ color: "#dc2626", fontWeight: 700, marginLeft: 10 }}>{progress?.failed} failed</span>}
            </div>
            <button onClick={onClose} style={{ padding: "10px 32px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`, fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Done</button>
          </div>
        ) : progress ? (
          <div style={{ padding: "8px 0" }}>
            <div style={{ fontSize: 13, color: "#6b6b8a", marginBottom: 12 }}>Sending messages… {progress.done}/{progress.total}</div>
            <div style={{ height: 8, background: "#f0f0f8", borderRadius: 20, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}, ${meta.color}aa)`, borderRadius: 20, transition: "width 0.3s" }} />
            </div>
            {progress.failed > 0 && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 8 }}>{progress.failed} failed so far</div>}
          </div>
        ) : (
          <>
            {/* Template */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Message Template</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {meta.vars.split(", ").map(v => (
                  <button key={v} type="button" onClick={() => setText(t => t + v)}
                    style={{ padding: "2px 8px", borderRadius: 20, background: meta.color + "10", border: `1px solid ${meta.color}28`, color: meta.color, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                    + {v}
                  </button>
                ))}
              </div>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e4e4ee", fontSize: 13, color: "#1d1d2f", lineHeight: 1.65, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
              <div style={{ fontSize: 11, color: "#b0b0c8", marginTop: 4 }}>
                Edit this template in <strong>Messages → Templates → Segment Broadcasts</strong> to save it permanently.
              </div>
            </div>

            {/* Recipients preview */}
            <div style={{ background: "#f9f9fb", borderRadius: 10, padding: "10px 14px", marginBottom: 20, border: "1px solid #f0f0f8" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Recipients</div>
              {clients.slice(0, 5).map(c => (
                <div key={c.id} style={{ fontSize: 13, color: "#1a1a2e", marginBottom: 4 }}>
                  {c.name} <span style={{ color: "#9898b0" }}>· {c.phone}</span>
                </div>
              ))}
              {clients.length > 5 && <div style={{ fontSize: 12, color: "#b0b0c8", marginTop: 4 }}>…and {clients.length - 5} more</div>}
            </div>

            {!activeCredential && (
              <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12, color: "#dc2626" }}>
                WhatsApp API key not configured. Go to Account → WhatsApp Settings.
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
              <button onClick={send} disabled={!activeCredential || !text.trim()}
                style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 10, border: "none",
                  background: (!activeCredential || !text.trim()) ? "#e8e8f0" : `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`,
                  fontSize: 13, fontWeight: 700, color: (!activeCredential || !text.trim()) ? "#b0b0c8" : "#fff", cursor: (!activeCredential || !text.trim()) ? "not-allowed" : "pointer" }}>
                <Send size={14} /> Send to {clients.length} Client{clients.length !== 1 ? "s" : ""}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selected, setSelected] = useState<Client | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteSelected, setShowDeleteSelected] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sortMode, setSortMode] = useState<"spend" | "visits" | "absent">("spend");
  const [absentDays, setAbsentDays] = useState(60);
  const [showSendModal, setShowSendModal] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const storedAppts   = getStoredAppointments();
    const storedClients = getStoredClients();

    // Recompute stats from completed appointments, but never decrease below POS-recorded values
    const synced = storedClients.map((c) => {
      const done = storedAppts.filter((a) => a.clientId === c.id && a.status === "completed");
      if (done.length === 0) return c;
      const apptVisits    = done.length;
      const apptSpend     = done.reduce((s, a) => s + a.totalAmount, 0);
      const lastVisitDate = done.sort((a, b) => b.date.localeCompare(a.date))[0].date;
      // Use the higher of stored (POS-tracked) vs appointment-computed values
      const totalVisits = Math.max(c.totalVisits || 0, apptVisits);
      const totalSpend  = Math.max(c.totalSpend  || 0, apptSpend);
      return { ...c, totalVisits, totalSpend, lastVisitDate };
    });

    // Persist only if something actually changed
    if (JSON.stringify(synced) !== JSON.stringify(storedClients)) {
      saveClients(synced);
    }

    setClients(synced);
    setAppointments(storedAppts);
  }, []);

  const plan          = getCurrentPlan();
  const clientLimited = isAtLimit(plan.clientLimit, clients.length);

  const filtered = useMemo(() => {
    const todayMs = new Date().setHours(0, 0, 0, 0);
    let result = clients.filter((c) => {
      if (tagFilter !== "all" && !c.tags.includes(tagFilter)) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (sortMode === "absent") {
        const diffDays = c.lastVisitDate
          ? Math.floor((todayMs - new Date(c.lastVisitDate).getTime()) / 86400000)
          : Infinity;
        if (diffDays < absentDays) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? "").toLowerCase().includes(q);
      }
      return true;
    });
    if (sortMode === "visits") {
      result = result.sort((a, b) => b.totalVisits - a.totalVisits);
    } else if (sortMode === "absent") {
      result = result.sort((a, b) => {
        if (!a.lastVisitDate && !b.lastVisitDate) return 0;
        if (!a.lastVisitDate) return -1;
        if (!b.lastVisitDate) return 1;
        return a.lastVisitDate.localeCompare(b.lastVisitDate);
      });
    } else {
      result = result.sort((a, b) => b.totalSpend - a.totalSpend);
    }
    return result;
  }, [clients, search, tagFilter, sourceFilter, sortMode, absentDays]);

  const allTags = Array.from(new Set(clients.flatMap((c) => c.tags)));
  const allSources = Array.from(new Set(clients.map((c) => c.source)));
  const activeFilters = [tagFilter !== "all", sourceFilter !== "all"].filter(Boolean).length;

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const someFilteredSelected = filtered.some((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => { const next = new Set(prev); filtered.forEach((c) => next.delete(c.id)); return next; });
    } else {
      setSelectedIds((prev) => { const next = new Set(prev); filtered.forEach((c) => next.add(c.id)); return next; });
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  return (
    <div className="dash-page dashboard-polish" style={{ background: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 20 }}>

      {selected && (
        <ClientPanel
          client={selected}
          onClose={() => setSelected(null)}
          appointments={appointments}
          onUpdate={(updatedC) => {
            setClients((prevClients) => {
              const updatedList = prevClients.map((c) => c.id === updatedC.id ? updatedC : c);
              saveClients(updatedList);
              return updatedList;
            });
            setSelected(updatedC);
          }}
          onDelete={(id) => {
            setClients((prevClients) => {
              const updated = prevClients.filter((c) => c.id !== id);
              saveClients(updated);
              return updated;
            });
            setSelected(null);
          }}
        />
      )}
      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onAdd={(newC) => {
            setClients((prevClients) => {
              const updated = [newC, ...prevClients];
              saveClients(updated);
              return updated;
            });
          }}
        />
      )}

      {showSendModal && sortMode !== "spend" && (
        <SendSegmentModal
          mode={sortMode}
          clients={filtered}
          onClose={() => setShowSendModal(false)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          clientName={deleteTarget.name}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            setClients((prev) => {
              const updated = prev.filter((c) => c.id !== deleteTarget.id);
              saveClients(updated);
              return updated;
            });
            setDeleteTarget(null);
          }}
        />
      )}
      {showDeleteAll && (
        <DeleteAllConfirmModal
          count={clients.length}
          onCancel={() => setShowDeleteAll(false)}
          onConfirm={() => {
            saveClients([]);
            setClients([]);
            setSelectedIds(new Set());
            setShowDeleteAll(false);
          }}
        />
      )}
      {showImport && (
        <ImportModal
          existing={clients}
          onClose={() => setShowImport(false)}
          onImport={(newClients) => {
            setClients((prev) => {
              const merged = [...newClients, ...prev];
              saveClients(merged);
              return merged;
            });
          }}
        />
      )}

      {showDeleteSelected && (
        <DeleteAllConfirmModal
          count={selectedIds.size}
          onCancel={() => setShowDeleteSelected(false)}
          onConfirm={() => {
            setClients((prev) => {
              const updated = prev.filter((c) => !selectedIds.has(c.id));
              saveClients(updated);
              return updated;
            });
            setSelectedIds(new Set());
            setShowDeleteSelected(false);
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 850, fontSize: 24, color: "#1a1a2e", letterSpacing: "-0.025em" }}>Clients</div>
          <div style={{ fontSize: 12, color: "#9898b0", marginTop: 4, fontWeight: 500 }}>
            {filtered.length} clients
            {plan.clientLimit !== -1 && <span style={{ marginLeft: 8, color: clientLimited ? "#dc2626" : "#b0b0c8", fontWeight: 700 }}>· {clients.length}/{plan.clientLimit} on Free plan</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {clients.length > 0 && (
            <button
              onClick={() => setShowDeleteAll(true)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 12, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 13, fontWeight: 750, color: "#dc2626", cursor: "pointer", transition: "all 0.15s" }}
              className="hover-bg-light"
            >
              <Trash2 size={14} /> Delete All
            </button>
          )}

          {/* Import button */}
          <button
            onClick={() => setShowImport(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(124, 58, 237, 0.15)", background: "rgba(124, 58, 237, 0.04)", fontSize: 13, fontWeight: 750, color: "var(--accent)", cursor: "pointer", transition: "all 0.15s" }}
            className="hover-bg-light"
          >
            <Upload size={14} /> Import
          </button>

          {/* Export dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              disabled={clients.length === 0}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(124, 58, 237, 0.15)", background: "rgba(124, 58, 237, 0.04)", fontSize: 13, fontWeight: 750, color: clients.length === 0 ? "#b0b0c8" : "var(--accent)", cursor: clients.length === 0 ? "not-allowed" : "pointer", transition: "all 0.15s" }}
              className="hover-bg-light"
            >
              <Download size={14} /> Export <ChevronDown size={12} style={{ transform: showExportMenu ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>
            {showExportMenu && (
              <>
                <div onClick={() => setShowExportMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
                <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1px solid #e8e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", zIndex: 20, minWidth: 160, overflow: "hidden" }}>
                  {[
                    { fmt: "xlsx" as const, label: "Excel (.xlsx)", icon: "📊" },
                    { fmt: "csv"  as const, label: "CSV (.csv)",   icon: "📄" },
                  ].map(({ fmt, label, icon }) => (
                    <button key={fmt} onClick={() => { setShowExportMenu(false); exportClients(filtered.length < clients.length ? filtered : clients, fmt); }}
                      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", border: "none", background: "none", fontSize: 13, fontWeight: 750, color: "#1a1a2e", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f5f3ff")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                      <span>{icon}</span>{label}
                    </button>
                  ))}
                  {filtered.length < clients.length && (
                    <div style={{ padding: "6px 16px 10px", fontSize: 11, color: "#9898b0", borderTop: "1px solid #f0f0f8" }}>
                      Exports {filtered.length} filtered clients
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => !clientLimited && setShowAdd(true)}
            title={clientLimited ? `Free plan: ${plan.clientLimit} client limit reached. Upgrade to Pro for unlimited.` : ""}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, border: "none", background: clientLimited ? "#e8e8f0" : "var(--accent-gradient)", fontSize: 13, fontWeight: 750, color: clientLimited ? "#aaaabc" : "#fff", boxShadow: clientLimited ? "none" : "0 4px 14px var(--accent-glow)", cursor: clientLimited ? "not-allowed" : "pointer", transition: "all 0.18s ease" }}
            className={!clientLimited ? "page-header-btn" : ""}
          >
            <Plus size={16} /> Add Client
            {clientLimited && <span style={{ fontSize: 10, background: "#dc2626", color: "#fff", borderRadius: 20, padding: "1px 7px" }}>Limit reached</span>}
          </button>
        </div>
      </div>

      {clientLimited && (
        <div style={{
          padding: "14px 20px",
          borderRadius: 14,
          background: "#fef2f2",
          border: "1px solid #fecaca",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          boxShadow: "0 4px 12px rgba(220,38,38,0.03)"
        }}>
          <span style={{ fontSize: 13, color: "#991b1b", fontWeight: 700 }}>
            Free plan allows up to {plan.clientLimit} clients. Upgrade to Pro for unlimited client management.
          </span>
          <a href="/dashboard/billing" style={{ fontSize: 11, fontWeight: 800, color: "#7C3AED", textDecoration: "none", whiteSpace: "nowrap", background: "#fff", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 8, padding: "6px 12px", boxShadow: "0 2px 6px rgba(0,0,0,0.02)", transition: "all 0.15s" }} className="hover-bg-light">Upgrade Plan</a>
        </div>
      )}

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e3e0eb", borderRadius: 12, padding: "10px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.01)", transition: "border-color 0.15s" }}>
          <Search size={15} color="#b0b0c8" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, or email…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#1a1a2e", background: "transparent" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}><X size={14} color="#b0b0c8" /></button>}
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 12, border: `1px solid ${activeFilters > 0 ? "var(--accent-light)" : "#e3e0eb"}`, background: activeFilters > 0 ? "rgba(124, 58, 237, 0.04)" : "#fff", fontSize: 13, fontWeight: 750, color: activeFilters > 0 ? "var(--accent)" : "#6b6b8a", cursor: "pointer", transition: "all 0.15s" }} className="hover-bg-light">
          Filter
          {activeFilters > 0 && <span style={{ background: "var(--accent-gradient)", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px var(--accent-glow)" }}>{activeFilters}</span>}
          <ChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
      </div>

      {/* Sort / quick-filter pills */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {([
          { key: "spend",  label: "Top Spenders",   icon: <TrendingUp size={12} /> },
          { key: "visits", label: "Most Frequent",  icon: <TrendingUp size={12} /> },
          { key: "absent", label: "Long Absent",    icon: <Clock size={12} /> },
        ] as const).map(({ key, label, icon }) => (
          <button key={key} onClick={() => setSortMode(key)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 20,
              border: `1px solid ${sortMode === key ? "var(--accent-light)" : "#e3e0eb"}`,
              background: sortMode === key ? "var(--accent-gradient)" : "#fff",
              fontSize: 12, fontWeight: 750,
              color: sortMode === key ? "#fff" : "#6b6b8a",
              boxShadow: sortMode === key ? "0 2px 8px var(--accent-glow)" : "none",
              cursor: "pointer", transition: "all 0.18s ease" }}
            className={sortMode !== key ? "hover-bg-light" : ""}>
            {icon}{label}
          </button>
        ))}
        {sortMode === "absent" && (
          <select value={absentDays} onChange={(e) => setAbsentDays(Number(e.target.value))}
            style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid rgba(124, 58, 237, 0.15)", background: "rgba(124, 58, 237, 0.04)",
              fontSize: 12, fontWeight: 750, color: "var(--accent)", cursor: "pointer", outline: "none" }}>
            <option value={30}>30+ days</option>
            <option value={60}>60+ days</option>
            <option value={90}>90+ days</option>
            <option value={180}>6+ months</option>
          </select>
        )}
        {sortMode !== "spend" && (
          <>
            <span style={{ fontSize: 12, color: "#b0b0c8", marginLeft: 4, fontWeight: 600 }}>
              {filtered.length} client{filtered.length !== 1 ? "s" : ""}
            </span>
            {filtered.length > 0 && (
              <button onClick={() => setShowSendModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 20,
                  border: "none", background: "var(--accent-gradient)",
                  fontSize: 12, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "0 3px 8px var(--accent-glow)", transition: "transform 0.15s" }}
                className="hover-scale"
              >
                <Send size={11} /> Send Message
              </button>
            )}
          </>
        )}
      </div>

      {showFilters && (
        <div style={{
          background: "#fff",
          border: "1px solid rgba(226,223,235,.95)",
          borderRadius: 14,
          padding: "16px 20px",
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          alignItems: "flex-end",
          boxShadow: "0 8px 24px rgba(38,25,75,.03)"
        }}>
          {[
            { label: "Tag", value: tagFilter, onChange: setTagFilter, options: [["all", "All Tags"], ...allTags.map((t) => [t, t])] },
            { label: "Source", value: sourceFilter, onChange: setSourceFilter, options: [["all", "All Sources"], ...allSources.map((s) => [s, s])] },
          ].map(({ label, value, onChange, options }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
              <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e3e0eb", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff", cursor: "pointer" }}>
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
          {activeFilters > 0 && (
            <button onClick={() => { setTagFilter("all"); setSourceFilter("all"); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 12, fontWeight: 700, color: "#dc2626", cursor: "pointer", transition: "all 0.15s" }}>Clear all</button>
          )}
        </div>
      )}

      {/* Selection action bar */}
      {someFilteredSelected && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 12, background: "#1a1a2e", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{selectedIds.size} client{selectedIds.size !== 1 ? "s" : ""} selected</span>
          <button
            onClick={() => setShowDeleteSelected(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "none", background: "#dc2626", fontSize: 12, fontWeight: 800, color: "#fff", cursor: "pointer" }}>
            <Trash2 size={13} /> Delete Selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#ccc", fontSize: 12, fontWeight: 750, cursor: "pointer" }}>
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-scroll-wrap" style={{
        background: "#fff",
        borderRadius: 18,
        border: "1px solid rgba(226,223,235,.95)",
        boxShadow: "0 8px 28px rgba(38,25,75,.04)",
        overflow: "hidden"
      }}>
        <div className="table-scroll-inner">
        <div className="client-table-inner" style={{ background: "#fff" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1.2fr 1.1fr 1fr 1.1fr 90px 110px 130px", padding: "12px 20px", borderBottom: "1px solid #f0f0f5", background: "#faf9fd", alignItems: "center" }}>
          <div onClick={toggleSelectAll} style={{ cursor: "pointer", display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={allFilteredSelected}
              ref={el => { if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected; }}
              onChange={toggleSelectAll}
              style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#7C3AED" }}
            />
          </div>
          {["CLIENT", "PHONE", "SOURCE", "LAST VISIT", "VISITS", "TOTAL SPEND", ""].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#8e89a3", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#b0b0c8", fontSize: 14 }}>No clients match your search.</div>
        ) : filtered.map((client, i) => {
          const isLast = i === filtered.length - 1;
          const isChecked = selectedIds.has(client.id);
          return (
            <div
              key={client.id}
              role="link"
              tabIndex={0}
              aria-label={`Open ${client.name}'s profile`}
              onClick={() => router.push(`/dashboard/clients/${encodeURIComponent(client.id)}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/dashboard/clients/${encodeURIComponent(client.id)}`);
                }
              }}
              style={{ display: "grid", gridTemplateColumns: "40px 1.2fr 1.1fr 1fr 1.1fr 90px 110px 130px", padding: "14px 20px", borderBottom: isLast ? "none" : "1px solid #f8f8fc", alignItems: "center", cursor: "pointer", background: isChecked ? "#F5F3FF" : "transparent", transition: "background 0.2s" }}
              className="hover-bg-row"
            >
              {/* Checkbox */}
              <div onClick={(e) => { e.stopPropagation(); toggleOne(client.id); }} style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleOne(client.id)}
                  style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#7C3AED" }}
                />
              </div>
              {/* Client */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #9333EA15, #ec489915)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#9333EA", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 750, color: "#1a1a2e", letterSpacing: "-0.01em" }}>{client.name}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 3, flexWrap: "wrap" }}>
                    {client.tags.map((tag) => {
                      const tc = TAG_COLORS[tag] ?? { color: "#6b6b8a", bg: "#F5F3FF" };
                      return <span key={tag} style={{ fontSize: 9, fontWeight: 800, color: tc.color, background: tc.bg, padding: "1px 6px", borderRadius: 10, textTransform: "uppercase", letterSpacing: "0.02em" }}>{tag}</span>;
                    })}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#1a1a2e", fontWeight: 600 }}>{client.phone}</div>
              <div style={{ fontSize: 12, color: "#6b6b8a", textTransform: "capitalize", fontWeight: 500 }}>{client.source}</div>
              <div style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 500 }}>{fmtDate(client.lastVisitDate)}</div>
              <div style={{ fontSize: 13, fontWeight: 750, color: "#1a1a2e" }}>{client.totalVisits}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>{fmt(client.totalSpend)}</div>
              <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button
                  onClick={() => router.push(`/dashboard/clients/${encodeURIComponent(client.id)}`)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid #e3e0eb", background: "#fff", fontSize: 11, fontWeight: 700, color: "#6b6b8a", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}
                  className="hover-bg-light"
                >
                  <ExternalLink size={11} /> View
                </button>
                <button
                  onClick={() => setDeleteTarget(client)}
                  title="Delete client"
                  style={{ display: "flex", alignItems: "center", padding: "6px 8px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", cursor: "pointer", transition: "all 0.15s" }}
                >
                  <Trash2 size={12} color="#dc2626" />
                </button>
              </div>
            </div>
          );
        })}
        </div>{/* /client-table-inner */}
        </div>{/* /table-scroll-inner */}
      </div>{/* /table-scroll-wrap */}
    </div>
  );
}
