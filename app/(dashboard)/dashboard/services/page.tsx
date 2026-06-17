"use client";

import { useState, useEffect } from "react";
import { getStoredServices, saveServices, getStoredStaff } from "@/lib/storage";
import type { Service, Staff, ServiceCategory } from "@/lib/types";
import { X, Plus, Clock, Scissors, DollarSign, Users, Sparkles, Check, Pencil } from "lucide-react";

const CATEGORY_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  hair:   { label: "Hair Care", bg: "#EDE9FE", color: "#7C3AED" },
  skin:   { label: "Skin Care", bg: "#e0f2fe", color: "#0369a1" },
  nails:  { label: "Nails",     bg: "#ecfdf5", color: "#059669" },
  bridal: { label: "Bridal",    bg: "#fdf2f8", color: "#db2777" },
};

import { fmtCurrency as fmt } from "@/lib/format";

// ── Add/Edit Service Modal ────────────────────────────────────────────────────
function AddEditServiceModal({ onClose, onSave, staffList, serviceToEdit }: {
  onClose: () => void; onSave: (s: Service) => void; staffList: Staff[]; serviceToEdit?: Service;
}) {
  const isEditing = !!serviceToEdit;
  const [form, setForm] = useState({
    name:             serviceToEdit?.name ?? "",
    category:         serviceToEdit?.category ?? "hair",
    durationMin:      serviceToEdit ? String(serviceToEdit.durationMin) : "60",
    price:            serviceToEdit ? String(serviceToEdit.price) : "",
    assignedStaffIds: serviceToEdit?.assignedStaffIds ?? [] as string[],
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const [done, setDone] = useState(false);

  const canSubmit = form.name && form.price && Number(form.price) > 0 && form.durationMin;

  const toggleStaff = (id: string) => {
    const cur = [...form.assignedStaffIds];
    set("assignedStaffIds", cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  const handleSave = () => {
    if (!canSubmit) return;
    onSave({
      id:               serviceToEdit?.id ?? "sv" + Date.now(),
      name:             form.name,
      category:         form.category as ServiceCategory,
      durationMin:      Number(form.durationMin),
      price:            Number(form.price),
      assignedStaffIds: form.assignedStaffIds,
      isActive:         serviceToEdit?.isActive ?? true,
    });
    setDone(true);
  };

  if (done) return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 360, padding: "48px 32px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, color: "#059669" }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e", marginBottom: 8 }}>{isEditing ? "Service Updated" : "Service Added"}</div>
        <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 24 }}>{isEditing ? "The service has been updated." : "The service has been saved."}</div>
        <button onClick={onClose} style={{ padding: "10px 32px", borderRadius: 10, background: "#7C3AED", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>{isEditing ? "Edit Service" : "Add Service"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={18} color="#6b6b8a" /></button>
        </div>
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Service Name</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Hydrafacial Premium"
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Category</label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff" }}>
                <option value="hair">Hair Care</option>
                <option value="skin">Skin Care</option>
                <option value="nails">Nails</option>
                <option value="bridal">Bridal</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Duration (Minutes)</label>
              <input type="number" value={form.durationMin} onChange={(e) => set("durationMin", e.target.value)} placeholder="e.g. 60"
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Price (PKR)</label>
            <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 3500"
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Assign Stylists</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 140, overflowY: "auto", border: "1px solid #e8e8f0", borderRadius: 8, padding: 8 }}>
              {staffList.map((st) => {
                const checked = form.assignedStaffIds.includes(st.id);
                return (
                  <div key={st.id} onClick={() => toggleStaff(st.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: checked ? "#f4f0fe" : "transparent" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: "1px solid #7C3AED", display: "flex", alignItems: "center", justifyContent: "center", background: checked ? "#7C3AED" : "#fff" }}>
                      {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a2e" }}>{st.name}</span>
                  </div>
                );
              })}
              {staffList.length === 0 && <div style={{ fontSize: 12, color: "#9898b0", padding: "6px 8px" }}>No staff added yet</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSave} disabled={!canSubmit} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: canSubmit ? "#7C3AED" : "#e8e8f0", fontSize: 13, fontWeight: 600, color: canSubmit ? "#fff" : "#b0b0c8", cursor: canSubmit ? "pointer" : "not-allowed" }}>
              {isEditing ? "Save Changes" : "Add Service"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setServices(getStoredServices());
    setStaff(getStoredStaff());
  }, []);

  const handleSaveService = (savedService: Service) => {
    const exists = services.some(s => s.id === savedService.id);
    const updated = exists
      ? services.map(s => s.id === savedService.id ? savedService : s)
      : [...services, savedService];
    setServices(updated);
    saveServices(updated);
  };

  const toggleServiceStatus = (id: string) => {
    const updated = services.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    setServices(updated);
    saveServices(updated);
  };

  const filteredServices = filter === "all" ? services : services.filter(s => s.category === filter);

  const totalCount  = services.length;
  const maxPrice    = services.reduce((m, s) => s.price > m ? s.price : m, 0);
  const avgDuration = totalCount > 0 ? Math.round(services.reduce((s, a) => s + a.durationMin, 0) / totalCount) : 0;
  const activeCount = services.filter(s => s.isActive).length;

  return (
    <div className="dash-page" style={{ background: "#f4f5f7", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 16 }}>
      {(showAdd || editingService) && (
        <AddEditServiceModal
          onClose={() => { setShowAdd(false); setEditingService(null); }}
          onSave={handleSaveService}
          staffList={staff}
          serviceToEdit={editingService ?? undefined}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#1a1a2e" }}>Services</div>
          <div style={{ fontSize: 13, color: "#9898b0", marginTop: 2 }}>{services.length} salon services · {activeCount} active</div>
        </div>
        <button onClick={() => setShowAdd(true)} className="page-header-btn" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: "#7C3AED", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
          <Plus size={16} /> Add Service
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid-4">
        {[
          { label: "Total Services",    value: totalCount,       icon: <Scissors size={18} color="#7C3AED" />,  bg: "#F5F3FF" },
          { label: "Active Services",   value: activeCount,      icon: <Sparkles size={18} color="#059669" />,  bg: "#ecfdf5" },
          { label: "Average Duration",  value: `${avgDuration} min`, icon: <Clock size={18} color="#0284c7" />, bg: "#f0f9ff" },
          { label: "Highest Price",     value: fmt(maxPrice),    icon: <DollarSign size={18} color="#db2777" />, bg: "#fdf2f8" },
        ].map((stat, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: "#9898b0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", marginTop: 4 }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="filter-tabs" style={{ borderBottom: "1px solid #ebebf0" }}>
        {["all", "hair", "skin", "nails", "bridal"].map((cat) => {
          const active = filter === cat;
          return (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: active ? "#7C3AED" : "transparent", color: active ? "#fff" : "#6b6b8a", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              {cat === "all" ? "All Services" : CATEGORY_LABELS[cat]?.label}
            </button>
          );
        })}
      </div>

      {/* Service cards */}
      {filteredServices.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "#b0b0c8" }}>
          <Scissors size={36} style={{ display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 15, fontWeight: 700 }}>No services yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Click &quot;Add Service&quot; to get started</div>
        </div>
      ) : (
        <div className="cards-grid-auto">
          {filteredServices.map((sv) => {
            const badge    = CATEGORY_LABELS[sv.category] || { label: sv.category, bg: "#f3f4f6", color: "#4b5563" };
            const assigned = staff.filter((st) => sv.assignedStaffIds.includes(st.id));
            return (
              <div key={sv.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: badge.bg, color: badge.color, padding: "3px 8px", borderRadius: 20 }}>{badge.label}</span>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginTop: 8 }}>{sv.name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => setEditingService(sv)}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #EDE9FE", background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#EDE9FE"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#F5F3FF"; }}>
                      <Pencil size={14} color="#7C3AED" />
                    </button>
                    <div onClick={() => toggleServiceStatus(sv.id)} style={{ width: 40, height: 20, borderRadius: 10, background: sv.isActive ? "#059669" : "#e0e0ec", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", top: 2, left: sv.isActive ? 22 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: "1px solid #f4f4f8", borderBottom: "1px solid #f4f4f8", padding: "12px 0" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#b0b0c8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Price</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#7C3AED", marginTop: 2 }}>{fmt(sv.price)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#b0b0c8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Duration</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} color="#9898b0" />{sv.durationMin} min</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#b0b0c8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}><Users size={12} /> Assigned Staff ({assigned.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {assigned.length > 0 ? assigned.map((st) => (
                      <span key={st.id} style={{ fontSize: 11, fontWeight: 500, color: st.color, background: st.color + "15", padding: "2px 8px", borderRadius: 12 }}>{st.name}</span>
                    )) : <span style={{ fontSize: 12, color: "#9898b0", fontStyle: "italic" }}>No staff assigned</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}