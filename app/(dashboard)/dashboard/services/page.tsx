"use client";

import { useState, useEffect } from "react";
import { getStoredServices, saveServices, getStoredStaff } from "@/lib/storage";
import type { Service, Staff } from "@/lib/types";
import { X, Plus, Clock, Scissors, DollarSign, Users, Sparkles, Check, Pencil, Trash2, Package as PackageIcon } from "lucide-react";
import PageTitle from "@/components/page-title";

const CATEGORY_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  hair:   { label: "Hair Care", bg: "#EDE9FE", color: "#7C3AED" },
  skin:   { label: "Skin Care", bg: "#e0f2fe", color: "#0369a1" },
  nails:  { label: "Nails",     bg: "#ecfdf5", color: "#059669" },
  bridal: { label: "Bridal",    bg: "#fdf2f8", color: "#db2777" },
  piercing: { label: "Ear Piercing", bg: "#fff7ed", color: "#c2410c" },
  package: { label: "Deals & Packages", bg: "#fef9c3", color: "#a16207" },
};

const PRESET_CATEGORIES = ["hair", "skin", "nails", "bridal", "piercing", "package"];
const catLabel = (cat: string) => CATEGORY_LABELS[cat]?.label ?? (cat.charAt(0).toUpperCase() + cat.slice(1));

import { fmtCurrency as fmt } from "@/lib/format";

// ── Add/Edit Service Modal ────────────────────────────────────────────────────
function AddEditServiceModal({ onClose, onSave, staffList, servicesList, serviceToEdit }: {
  onClose: () => void; onSave: (s: Service) => void; staffList: Staff[]; servicesList: Service[]; serviceToEdit?: Service;
}) {
  const isEditing = !!serviceToEdit;
  const isEditingPackage = serviceToEdit?.category === "package";
  const editedCategoryIsCustom = !!serviceToEdit && !isEditingPackage && !PRESET_CATEGORIES.includes(serviceToEdit.category);
  // Services this package can bundle — excludes other packages (no nesting) and itself.
  const selectableServices = servicesList.filter((s) => !s.packageServiceIds?.length && s.id !== serviceToEdit?.id);

  const [form, setForm] = useState({
    isPackage:         isEditingPackage,
    packageServiceIds: serviceToEdit?.packageServiceIds ?? [] as string[],
    customServices:    serviceToEdit?.customServices ?? [] as { name: string; price?: number; durationMin?: number }[],
    name:             serviceToEdit?.name ?? "",
    category:         editedCategoryIsCustom ? "custom" : (serviceToEdit?.category ?? "hair"),
    customCategory:   editedCategoryIsCustom ? serviceToEdit!.category : "",
    durationMin:      serviceToEdit ? String(serviceToEdit.durationMin) : "60",
    price:            serviceToEdit ? String(serviceToEdit.price) : "",
    variablePrice:    serviceToEdit?.variablePrice ?? false,
    priceRangeMin:    serviceToEdit?.priceRangeMin ? String(serviceToEdit.priceRangeMin) : "",
    priceRangeMax:    serviceToEdit?.priceRangeMax ? String(serviceToEdit.priceRangeMax) : "",
    assignedStaffIds: serviceToEdit?.assignedStaffIds ?? [] as string[],
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const [done, setDone] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customDuration, setCustomDuration] = useState("");

  const price = Number(form.price) || 0;
  const rangeMin = Number(form.priceRangeMin) || 0;
  const rangeMax = Number(form.priceRangeMax) || 0;
  const durationMin = Number(form.durationMin);
  const canSubmit = Boolean(
    form.name.trim()
    && (form.variablePrice
      ? (form.priceRangeMin && form.priceRangeMax && rangeMin > 0 && rangeMax >= rangeMin)
      : (Number.isFinite(price) && price > 0))
    && Number.isFinite(durationMin)
    && durationMin > 0
    && (form.isPackage ? (form.packageServiceIds.length + form.customServices.length) >= 2 : (form.category !== "custom" || form.customCategory.trim())),
  );

  const includedServices = selectableServices.filter((s) => form.packageServiceIds.includes(s.id));
  const includedTotal    = includedServices.reduce((s, sv) => s + sv.price, 0) + form.customServices.reduce((s, cs) => s + (cs.price ?? 0), 0);
  const includedDuration = includedServices.reduce((s, sv) => s + sv.durationMin, 0) + form.customServices.reduce((s, cs) => s + (cs.durationMin ?? 0), 0);

  // Suggest a deal price/duration = sum of included services' + custom services' price/duration;
  // both remain editable afterward, same as the pre-existing duration suggestion.
  const recalcPackageTotals = (ids: string[], customs: typeof form.customServices) => {
    const included = selectableServices.filter((s) => ids.includes(s.id));
    const sumDuration = included.reduce((s, sv) => s + sv.durationMin, 0) + customs.reduce((s, cs) => s + (cs.durationMin ?? 0), 0);
    const sumPrice    = included.reduce((s, sv) => s + sv.price, 0)       + customs.reduce((s, cs) => s + (cs.price ?? 0), 0);
    if (sumDuration > 0) set("durationMin", String(sumDuration));
    set("price", sumPrice > 0 ? String(sumPrice) : "");
  };

  const togglePackageService = (id: string) => {
    const cur = form.packageServiceIds.includes(id)
      ? form.packageServiceIds.filter((x: string) => x !== id)
      : [...form.packageServiceIds, id];
    set("packageServiceIds", cur);
    recalcPackageTotals(cur, form.customServices);
  };

  const addCustomService = () => {
    if (!customName.trim()) return;
    const entry = {
      name:        customName.trim(),
      price:       customPrice ? Number(customPrice) : undefined,
      durationMin: customDuration ? Number(customDuration) : undefined,
    };
    const cur = [...form.customServices, entry];
    set("customServices", cur);
    recalcPackageTotals(form.packageServiceIds, cur);
    setCustomName(""); setCustomPrice(""); setCustomDuration("");
  };

  const removeCustomService = (idx: number) => {
    const cur = form.customServices.filter((_, i) => i !== idx);
    set("customServices", cur);
    recalcPackageTotals(form.packageServiceIds, cur);
  };

  const toggleStaff = (id: string) => {
    const cur = [...form.assignedStaffIds];
    set("assignedStaffIds", cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  const handleSave = () => {
    if (!canSubmit) return;
    onSave({
      id:               serviceToEdit?.id ?? "sv" + Date.now(),
      name:             form.name.trim(),
      category:         form.isPackage ? "package" : (form.category === "custom" ? form.customCategory.trim() : form.category),
      durationMin,
      price:            form.variablePrice ? rangeMin : price,
      variablePrice:    form.variablePrice,
      priceRangeMin:    form.variablePrice ? rangeMin : undefined,
      priceRangeMax:    form.variablePrice ? rangeMax : undefined,
      packageServiceIds: form.isPackage ? form.packageServiceIds : undefined,
      customServices:   form.isPackage ? form.customServices : undefined,
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
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 460, maxHeight: "90vh", overflowY: "auto", overflowX: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>{isEditing ? "Edit Service" : "Add Service"}</div>
          <button type="button" onClick={onClose} aria-label="Close service form" style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={18} color="#6b6b8a" /></button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
          style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div style={{ display: "flex", gap: 6, background: "#f4f4f9", border: "1px solid #e3e0eb", borderRadius: 12, padding: 4 }}>
            {([["single", "Single Service"], ["package", "Deal / Package"]] as const).map(([val, label]) => {
              const active = (val === "package") === form.isPackage;
              return (
                <button key={val} type="button" onClick={() => set("isPackage", val === "package")}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 9, border: "none",
                    background: active ? "var(--accent-gradient)" : "transparent",
                    color: active ? "#fff" : "#6b6b8a", fontSize: 13, fontWeight: 750, cursor: "pointer",
                    boxShadow: active ? "0 4px 10px var(--accent-glow)" : "none", transition: "all 0.18s ease",
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {form.isPackage ? "Deal / Package Name" : "Service Name"}
            </label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={form.isPackage ? "e.g. Bridal Glow Combo" : "e.g. Hydrafacial Premium"}
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
          </div>

          {form.isPackage ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Duration (Minutes)</label>
              <input type="number" value={form.durationMin} onChange={(e) => set("durationMin", e.target.value)} placeholder="e.g. 60"
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Category</label>
                <select value={form.category} onChange={(e) => set("category", e.target.value)}
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff" }}>
                  <option value="hair">Hair Care</option>
                  <option value="skin">Skin Care</option>
                  <option value="nails">Nails</option>
                  <option value="bridal">Bridal</option>
                  <option value="piercing">Ear Piercing</option>
                  <option value="custom">Custom…</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Duration (Minutes)</label>
                <input type="number" value={form.durationMin} onChange={(e) => set("durationMin", e.target.value)} placeholder="e.g. 60"
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
              </div>
            </div>
          )}
          {!form.isPackage && form.category === "custom" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Custom Category Name</label>
              <input type="text" value={form.customCategory} onChange={(e) => set("customCategory", e.target.value)} placeholder="e.g. Massage"
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
            </div>
          )}

          {form.isPackage && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Included Services (2 or more, existing or custom)
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto", border: "1px solid #e8e8f0", borderRadius: 8, padding: 8 }}>
                {selectableServices.map((sv) => {
                  const checked = form.packageServiceIds.includes(sv.id);
                  return (
                    <div key={sv.id} onClick={() => togglePackageService(sv.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: checked ? "#fef9c3" : "transparent" }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, border: "1px solid #a16207", display: "flex", alignItems: "center", justifyContent: "center", background: checked ? "#a16207" : "#fff", flexShrink: 0 }}>
                        {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a2e", flex: 1 }}>{sv.name}</span>
                      <span style={{ fontSize: 11, color: "#9898b0" }}>{fmt(sv.price)} · {sv.durationMin}m</span>
                    </div>
                  );
                })}
                {selectableServices.length === 0 && <div style={{ fontSize: 12, color: "#9898b0", padding: "6px 8px" }}>Add some individual services first</div>}
              </div>

              <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>
                Custom Services (not in your service list)
              </label>
              {form.customServices.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {form.customServices.map((cs, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, background: "#fef9c3" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a2e", flex: 1 }}>{cs.name}</span>
                      <span style={{ fontSize: 11, color: "#9898b0" }}>
                        {cs.price ? fmt(cs.price) : "—"} {cs.durationMin ? `· ${cs.durationMin}m` : ""}
                      </span>
                      <button type="button" onClick={() => removeCustomService(idx)} aria-label={`Remove ${cs.name}`}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2 }}>
                        <X size={13} color="#a16207" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Service name"
                  style={{ flex: "2 1 120px", minWidth: 0, padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 12, color: "#1a1a2e", outline: "none" }} />
                <input type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="Price"
                  style={{ flex: "1 1 60px", minWidth: 0, padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 12, color: "#1a1a2e", outline: "none" }} />
                <input type="number" value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} placeholder="Mins"
                  style={{ flex: "1 1 60px", minWidth: 0, padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 12, color: "#1a1a2e", outline: "none" }} />
                <button type="button" onClick={addCustomService} disabled={!customName.trim()}
                  style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 8, border: "none", background: customName.trim() ? "#a16207" : "#e8e8f0", color: customName.trim() ? "#fff" : "#b0b0c8", fontSize: 12, fontWeight: 700, cursor: customName.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 4 }}>
                  <Plus size={13} /> Add
                </button>
              </div>

              {(includedServices.length > 0 || form.customServices.length > 0) && (
                <div style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 500 }}>
                  Booked separately: <strong style={{ color: "#1a1a2e" }}>{fmt(includedTotal)}</strong> for {includedDuration} min
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {!form.variablePrice && (
              <>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{form.isPackage ? "Deal Price (PKR)" : "Price (PKR)"}</label>
                <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 3500"
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
              </>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 2 }}>
              <input type="checkbox" checked={form.variablePrice} onChange={(e) => set("variablePrice", e.target.checked)}
                style={{ width: 14, height: 14, accentColor: "#7C3AED", cursor: "pointer" }} />
              <span style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 500 }}>Price is not fixed (varies per client, charge decided at checkout)</span>
            </label>
          </div>
          {form.variablePrice && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Min Price (PKR)</label>
                <input type="number" value={form.priceRangeMin} onChange={(e) => set("priceRangeMin", e.target.value)} placeholder="e.g. 3500"
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Max Price (PKR)</label>
                <input type="number" value={form.priceRangeMax} onChange={(e) => set("priceRangeMax", e.target.value)} placeholder="e.g. 6000"
                  style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
              </div>
            </div>
          )}
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
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={!canSubmit} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: canSubmit ? "#7C3AED" : "#e8e8f0", fontSize: 13, fontWeight: 600, color: canSubmit ? "#fff" : "#b0b0c8", cursor: canSubmit ? "pointer" : "not-allowed" }}>
              {isEditing ? "Save Changes" : "Add Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 340, padding: "32px 28px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Trash2 size={22} color="#dc2626" />
        </div>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e", marginBottom: 8 }}>Delete Service?</div>
        <div style={{ fontSize: 13, color: "#6b6b8a", marginBottom: 24 }}>
          This will permanently delete <strong>{name}</strong> and cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#dc2626", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Delete</button>
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
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setServices(getStoredServices());
    setStaff(getStoredStaff());
  }, []);

  const handleSaveService = (savedService: Service) => {
    setServices((current) => {
      const exists = current.some((service) => service.id === savedService.id);
      const updated = exists
        ? current.map((service) => service.id === savedService.id ? savedService : service)
        : [...current, savedService];
      saveServices(updated);
      return updated;
    });
  };

  const toggleServiceStatus = (id: string) => {
    const updated = services.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    setServices(updated);
    saveServices(updated);
  };

  const handleDeleteService = (id: string) => {
    const updated = services.filter(s => s.id !== id);
    setServices(updated);
    saveServices(updated);
    setDeleteTarget(null);
  };

  const filteredServices = filter === "all" ? services : services.filter(s => s.category === filter);
  const customCategories = Array.from(new Set(services.map(s => s.category))).filter(c => !PRESET_CATEGORIES.includes(c));
  const tabCategories = ["all", ...PRESET_CATEGORIES, ...customCategories];

  const totalCount  = services.length;
  const maxPrice    = services.reduce((m, s) => s.price > m ? s.price : m, 0);
  const avgDuration = totalCount > 0 ? Math.round(services.reduce((s, a) => s + a.durationMin, 0) / totalCount) : 0;
  const activeCount = services.filter(s => s.isActive).length;

  return (
    <div className="dash-page dashboard-polish" style={{ background: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 20 }}>
      {(showAdd || editingService) && (
        <AddEditServiceModal
          onClose={() => { setShowAdd(false); setEditingService(null); }}
          onSave={handleSaveService}
          staffList={staff}
          servicesList={services}
          serviceToEdit={editingService ?? undefined}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          onConfirm={() => handleDeleteService(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <PageTitle
          icon={<Scissors size={24} />}
          title="Services"
          subtitle={
            <>
            {services.length} salon services · <span style={{ color: "var(--accent)", fontWeight: 700 }}>{activeCount} active</span>
            </>
          }
        />
        <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, border: "none", background: "var(--accent-gradient)", fontSize: 13, fontWeight: 750, color: "#fff", boxShadow: "0 4px 14px var(--accent-glow)", cursor: "pointer", transition: "all 0.18s ease" }} className="page-header-btn">
          <Plus size={16} /> Add Service
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid-4" style={{ marginBottom: 4 }}>
        {[
          { label: "Total Services",    value: totalCount,       icon: <Scissors size={18} />,  color: "var(--accent)", bg: "rgba(124, 58, 237, 0.08)" },
          { label: "Active Services",   value: activeCount,      icon: <Sparkles size={18} />,  color: "#059669", bg: "rgba(5, 150, 105, 0.08)" },
          { label: "Average Duration",  value: `${avgDuration} min`, icon: <Clock size={18} />, color: "#3b82f6", bg: "rgba(59, 130, 246, 0.08)" },
          { label: "Highest Price",     value: fmt(maxPrice),    icon: <DollarSign size={18} />, color: "#db2777", bg: "rgba(219, 39, 119, 0.08)" },
        ].map((stat, i) => (
          <div key={i} style={{
            background: "#fff",
            borderRadius: 18,
            border: "1px solid rgba(226,223,235,.95)",
            boxShadow: "0 8px 28px rgba(38,25,75,.04)",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: 16
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: stat.bg, color: stat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: "#9898b0", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e", marginTop: 6, letterSpacing: "-0.01em" }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="filter-tabs" style={{ display: "flex", gap: 6, background: "#f4f4f9", border: "1px solid #e3e0eb", borderRadius: 12, padding: 4, alignSelf: "flex-start", marginBottom: 4 }}>
        {tabCategories.map((cat) => {
          const active = filter === cat;
          return (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{
                padding: "7px 16px",
                borderRadius: 9,
                border: "none",
                background: active ? "var(--accent-gradient)" : "transparent",
                color: active ? "#fff" : "#6b6b8a",
                fontSize: 13,
                fontWeight: 750,
                cursor: "pointer",
                boxShadow: active ? "0 4px 10px var(--accent-glow)" : "none",
                transition: "all 0.18s ease"
              }}>
              {cat === "all" ? "All Services" : catLabel(cat)}
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
            const badge    = CATEGORY_LABELS[sv.category] || { label: catLabel(sv.category), bg: "#f3f4f6", color: "#4b5563" };
            const assigned = staff.filter((st) => sv.assignedStaffIds.includes(st.id));
            const isPkg = sv.category === "package";
            const includedNames = isPkg
              ? [
                  ...(sv.packageServiceIds
                    ?.map((id) => services.find((s) => s.id === id)?.name)
                    .filter((n): n is string => Boolean(n)) ?? []),
                  ...(sv.customServices?.map((cs) => cs.name) ?? []),
                ]
              : undefined;
            return (
              <div key={sv.id} style={{ background: "#fff", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", background: badge.bg, color: badge.color, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {includedNames && <PackageIcon size={10} />}
                      {badge.label}
                    </span>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e", marginTop: 12, letterSpacing: "-0.01em" }}>{sv.name}</div>
                    {includedNames && includedNames.length > 0 && (
                      <div style={{ fontSize: 11, color: "#9898b0", marginTop: 4 }}>Includes: {includedNames.join(", ")}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button type="button" onClick={() => setEditingService(sv)} aria-label={`Edit ${sv.name}`}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #EDE9FE", background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
                      className="hover-bg-light">
                      <Pencil size={14} color="#7C3AED" />
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(sv)} aria-label={`Delete ${sv.name}`}
                      style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #fee2e2", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}>
                      <Trash2 size={14} color="#dc2626" />
                    </button>
                    <button type="button" onClick={() => toggleServiceStatus(sv.id)} aria-label={`${sv.isActive ? "Deactivate" : "Activate"} ${sv.name}`} aria-pressed={sv.isActive} style={{ width: 40, height: 20, padding: 0, border: "none", borderRadius: 10, background: sv.isActive ? "#059669" : "#e0e0ec", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", top: 2, left: sv.isActive ? 22 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                    </button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: "1px solid #f8f8fc", borderBottom: "1px solid #f8f8fc", padding: "14px 0" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#9898b0", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Price</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "var(--accent)", marginTop: 4 }}>
                      {sv.variablePrice
                        ? (sv.priceRangeMin && sv.priceRangeMax ? `${fmt(sv.priceRangeMin)} - ${fmt(sv.priceRangeMax)}` : "Varies")
                        : fmt(sv.price)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#9898b0", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Duration</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><Clock size={13} color="#9898b0" />{sv.durationMin} min</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#9898b0", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}><Users size={12} /> Assigned Staff ({assigned.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {assigned.length > 0 ? assigned.map((st) => (
                      <span key={st.id} style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.color + "12", padding: "3px 10px", borderRadius: 12 }}>{st.name}</span>
                    )) : <span style={{ fontSize: 12, color: "#9898b0", fontStyle: "italic", fontWeight: 500 }}>No staff assigned</span>}
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
