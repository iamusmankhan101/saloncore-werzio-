"use client";

import { useState, useMemo, useEffect } from "react";
import { CLIENTS, APPOINTMENTS, BEAUTY_PROFILES } from "@/lib/mock-data";
import { getStoredAppointments, getStoredClients, saveClients } from "@/lib/storage";
import type { Client, Appointment } from "@/lib/types";
import { Search, X, Plus, Phone, Mail, Calendar, Star, TrendingUp, Heart, ChevronDown } from "lucide-react";
import { getCurrentPlan, isAtLimit } from "@/lib/plan-limits";

const TAG_COLORS: Record<string, { color: string; bg: string }> = {
  VIP:      { color: "#7C3AED", bg: "#EDE9FE" },
  Regular:  { color: "#059669", bg: "#ecfdf5" },
  Bridal:   { color: "#db2777", bg: "#fdf2f8" },
  New:      { color: "#0369a1", bg: "#e0f2fe" },
  "At-Risk":{ color: "#dc2626", bg: "#fef2f2" },
};

function fmt(n: number) { return "PKR " + n.toLocaleString("en-PK"); }

function fmtDate(s?: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Client Detail Panel ───────────────────────────────────────────────────────
function ClientPanel({ client, onClose, appointments, onUpdate }: { client: Client; onClose: () => void; appointments: Appointment[]; onUpdate?: (c: Client) => void }) {
  const appts = appointments.filter((a) => a.clientId === client.id);
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
  const setE = (k: string, v: string) => setEditForm((f) => ({ ...f, [k]: v }));

  const displayName = saved ? editForm.name : client.name;
  const displayPhone = saved ? editForm.phone : client.phone;
  const displayEmail = saved ? editForm.email : client.email;
  const displayDob = saved ? editForm.dob : client.dob;
  const displaySource = saved ? editForm.source : client.source;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #EDE9FE, #fdf2f8)", padding: "28px 24px 20px", borderBottom: "1px solid #f0f0f8", position: "relative" }}>
          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
            {!editing && (
              <button onClick={() => setEditing(true)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #EDE9FE", background: "#fff", fontSize: 11, fontWeight: 600, color: "#7C3AED", cursor: "pointer" }}>
                Edit
              </button>
            )}
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

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "Total Visits", value: client.totalVisits, icon: <Calendar size={13} color="#9898b0" /> },
              { label: "Total Spend", value: fmt(client.totalSpend), icon: <TrendingUp size={13} color="#9898b0" /> },
              { label: "Avg Rating", value: client.averageRating ? `${client.averageRating} ★` : "—", icon: <Star size={13} color="#9898b0" /> },
            ].map((s) => (
              <div key={s.label} style={{ background: "#f9f9fb", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>{s.icon}<span style={{ fontSize: 10, color: "#9898b0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span></div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{s.value}</div>
              </div>
            ))}
          </div>

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
                <InfoLine icon={<Calendar size={13} color="#9898b0" />} label={`Last visit: ${fmtDate(client.lastVisitDate)}`} />
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

          {/* Appointment history */}
          {appts.length > 0 && (
            <PanelSection title="Appointment History">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {appts.map((a) => (
                  <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f9f9fb", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{a.serviceNames.join(", ")}</div>
                      <div style={{ fontSize: 11, color: "#9898b0" }}>{fmtDate(a.date)} · {a.staffName.split(" ")[0]}</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED" }}>{fmt(a.totalAmount)}</span>
                  </div>
                ))}
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
  const [form, setForm] = useState({ name: "", phone: "", email: "", dob: "", source: "whatsapp", tag: "" });
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
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selected, setSelected] = useState<Client | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    setClients(getStoredClients());
    setAppointments(getStoredAppointments());
  }, []);

  const plan          = getCurrentPlan();
  const clientLimited = isAtLimit(plan.clientLimit, clients.length);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (tagFilter !== "all" && !c.tags.includes(tagFilter)) return false;
      if (sourceFilter !== "all" && c.source !== sourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email ?? "").toLowerCase().includes(q);
      }
      return true;
    }).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [clients, search, tagFilter, sourceFilter]);

  const allTags = Array.from(new Set(clients.flatMap((c) => c.tags)));
  const allSources = Array.from(new Set(clients.map((c) => c.source)));
  const activeFilters = [tagFilter !== "all", sourceFilter !== "all"].filter(Boolean).length;

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

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

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#1a1a2e" }}>Clients</div>
          <div style={{ fontSize: 13, color: "#9898b0", marginTop: 2 }}>
            {filtered.length} clients
            {plan.clientLimit !== -1 && <span style={{ marginLeft: 8, color: clientLimited ? "#dc2626" : "#b0b0c8" }}>· {clients.length}/{plan.clientLimit} on Free plan</span>}
          </div>
        </div>
        <button
          onClick={() => !clientLimited && setShowAdd(true)}
          title={clientLimited ? `Free plan: ${plan.clientLimit} client limit reached. Upgrade to Pro for unlimited.` : ""}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: clientLimited ? "#e8e8f0" : "#7C3AED", fontSize: 13, fontWeight: 600, color: clientLimited ? "#aaaabc" : "#fff", cursor: clientLimited ? "not-allowed" : "pointer" }}>
          <Plus size={16} /> Add Client
          {clientLimited && <span style={{ fontSize: 10, background: "#dc2626", color: "#fff", borderRadius: 20, padding: "1px 7px" }}>Limit reached</span>}
        </button>
      </div>

      {clientLimited && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
            Free plan allows up to {plan.clientLimit} clients. Upgrade to Pro for unlimited client management.
          </span>
          <a href="/dashboard/billing" style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", textDecoration: "none", whiteSpace: "nowrap", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 7, padding: "5px 12px" }}>Upgrade →</a>
        </div>
      )}

      {/* Search + filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e8e8f0", borderRadius: 10, padding: "9px 14px" }}>
          <Search size={15} color="#b0b0c8" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, or email…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#1a1a2e", background: "transparent" }} />
          {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}><X size={14} color="#b0b0c8" /></button>}
        </div>
        <button onClick={() => setShowFilters(!showFilters)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: `1px solid ${activeFilters > 0 ? "#7C3AED" : "#e8e8f0"}`, background: activeFilters > 0 ? "#F5F3FF" : "#fff", fontSize: 13, fontWeight: 500, color: activeFilters > 0 ? "#7C3AED" : "#6b6b8a", cursor: "pointer" }}>
          Filter
          {activeFilters > 0 && <span style={{ background: "linear-gradient(135deg, #5B21B6, #9333EA)", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeFilters}</span>}
          <ChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
      </div>

      {showFilters && (
        <div style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          {[
            { label: "Tag", value: tagFilter, onChange: setTagFilter, options: [["all", "All Tags"], ...allTags.map((t) => [t, t])] },
            { label: "Source", value: sourceFilter, onChange: setSourceFilter, options: [["all", "All Sources"], ...allSources.map((s) => [s, s])] },
          ].map(({ label, value, onChange, options }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
              <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff", cursor: "pointer" }}>
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
          {activeFilters > 0 && (
            <button onClick={() => { setTagFilter("all"); setSourceFilter("all"); }} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}>Clear all</button>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 100px 120px 110px 120px", padding: "10px 20px", borderBottom: "1px solid #f0f0f8", background: "#fafafa" }}>
          {["CLIENT", "PHONE", "SOURCE", "LAST VISIT", "VISITS", "TOTAL SPEND"].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#b0b0c8", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#b0b0c8", fontSize: 14 }}>No clients match your search.</div>
        ) : filtered.map((client, i) => {
          const isLast = i === filtered.length - 1;
          return (
            <div
              key={client.id}
              onClick={() => setSelected(client)}
              style={{ display: "grid", gridTemplateColumns: "1fr 130px 100px 120px 110px 120px", padding: "13px 20px", borderBottom: isLast ? "none" : "1px solid #f4f4f8", alignItems: "center", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* Client */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #9333EA22, #ec489922)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#9333EA", flexShrink: 0 }}>
                  {client.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{client.name}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                    {client.tags.map((tag) => {
                      const tc = TAG_COLORS[tag] ?? { color: "#6b6b8a", bg: "#F5F3FF" };
                      return <span key={tag} style={{ fontSize: 9, fontWeight: 600, color: tc.color, background: tc.bg, padding: "1px 6px", borderRadius: 10 }}>{tag}</span>;
                    })}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#1a1a2e" }}>{client.phone}</div>
              <div style={{ fontSize: 12, color: "#6b6b8a", textTransform: "capitalize" }}>{client.source}</div>
              <div style={{ fontSize: 12, color: "#6b6b8a" }}>{fmtDate(client.lastVisitDate)}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{client.totalVisits}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{fmt(client.totalSpend)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
