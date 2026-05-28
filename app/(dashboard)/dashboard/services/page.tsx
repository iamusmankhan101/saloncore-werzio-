"use client";

import { useState, useEffect } from "react";
import { getStoredServices, saveServices, getStoredStaff, getStoredInventory, saveInventory } from "@/lib/storage";
import type { Service, Staff, ServiceCategory, InventoryItem, InventoryCategory, InventoryUnit } from "@/lib/types";
import { X, Plus, Clock, Scissors, DollarSign, Users, Sparkles, Check, Pencil, Package, Tag, ToggleLeft, ToggleRight } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  hair:   { label: "Hair Care", bg: "#EDE9FE", color: "#7C3AED" },
  skin:   { label: "Skin Care", bg: "#e0f2fe", color: "#0369a1" },
  nails:  { label: "Nails",     bg: "#ecfdf5", color: "#059669" },
  bridal: { label: "Bridal",    bg: "#fdf2f8", color: "#db2777" },
};

const INV_CATEGORY_LABELS: Record<string, string> = {
  "hair-color": "Hair Color", "skin-care": "Skin Care",
  nail: "Nail", tools: "Tools", consumables: "Consumables", retail: "Retail",
};
const INV_UNITS: InventoryUnit[] = ["ml", "g", "pcs", "box", "bottle", "tube"];
const INV_CATEGORIES: InventoryCategory[] = ["hair-color", "skin-care", "nail", "tools", "consumables", "retail"];

function fmt(n: number) { return "PKR " + n.toLocaleString("en-PK"); }

// ─── Shared input style ───────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0",
  fontSize: 13, color: "#1a1a2e", outline: "none", width: "100%", boxSizing: "border-box",
};

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{children}</label>;
}

// ─── Add/Edit Service Modal ───────────────────────────────────────────────────
function AddEditServiceModal({ onClose, onSave, staffList, serviceToEdit }: {
  onClose: () => void; onSave: (s: Service) => void; staffList: Staff[]; serviceToEdit?: Service;
}) {
  const isEditing = !!serviceToEdit;
  const [form, setForm] = useState({
    name: serviceToEdit?.name ?? "",
    category: serviceToEdit?.category ?? "hair",
    durationMin: serviceToEdit ? String(serviceToEdit.durationMin) : "60",
    price: serviceToEdit ? String(serviceToEdit.price) : "",
    assignedStaffIds: serviceToEdit?.assignedStaffIds ?? [] as string[],
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const [done, setDone] = useState(false);

  const canSubmit = form.name && form.price && Number(form.price) > 0 && form.durationMin;

  const toggleStaff = (id: string) => {
    const current = [...form.assignedStaffIds];
    set("assignedStaffIds", current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  };

  const handleSave = () => {
    if (!canSubmit) return;
    onSave({
      id: serviceToEdit?.id ?? "sv" + Date.now(),
      name: form.name,
      category: form.category as ServiceCategory,
      durationMin: Number(form.durationMin),
      price: Number(form.price),
      assignedStaffIds: form.assignedStaffIds,
      isActive: serviceToEdit?.isActive ?? true,
    });
    setDone(true);
  };

  if (done) return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 360, padding: "48px 32px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, color: "#059669" }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e", marginBottom: 8 }}>{isEditing ? "Service Updated" : "Service Added"}</div>
        <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 24 }}>{isEditing ? "The service has been updated." : "The service has been saved."}</div>
        <button onClick={onClose} style={{ padding: "10px 32px", borderRadius: 10, background: "#7C3AED", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>{isEditing ? "Edit Service" : "Add Service"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#6b6b8a" /></button>
        </div>
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>Service Name</Label>
            <input style={INP} type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Hydrafacial Premium" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Category</Label>
              <select value={form.category} onChange={(e) => set("category", e.target.value)} style={{ ...INP, background: "#fff" }}>
                <option value="hair">Hair Care</option>
                <option value="skin">Skin Care</option>
                <option value="nails">Nails</option>
                <option value="bridal">Bridal</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Duration (Minutes)</Label>
              <input style={INP} type="number" value={form.durationMin} onChange={(e) => set("durationMin", e.target.value)} placeholder="60" />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>Price (PKR)</Label>
            <input style={INP} type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 3500" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Label>Assign Stylists</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 140, overflowY: "auto", border: "1px solid #e8e8f0", borderRadius: 8, padding: 8 }}>
              {staffList.map((st) => {
                const checked = form.assignedStaffIds.includes(st.id);
                return (
                  <div key={st.id} onClick={() => toggleStaff(st.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: checked ? "#f4f0fe" : "transparent" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: "1px solid #7C3AED", display: "flex", alignItems: "center", justifyContent: "center", background: checked ? "#7C3AED" : "#fff", flexShrink: 0 }}>
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

// ─── Add/Edit Product Modal ───────────────────────────────────────────────────
function AddEditProductModal({ onClose, onSave, productToEdit }: {
  onClose: () => void;
  onSave: (p: InventoryItem) => void;
  productToEdit?: InventoryItem;
}) {
  const isEditing = !!productToEdit;
  const [form, setForm] = useState({
    name:         productToEdit?.name ?? "",
    brand:        productToEdit?.brand ?? "",
    category:     (productToEdit?.category ?? "retail") as InventoryCategory,
    unit:         (productToEdit?.unit ?? "pcs") as InventoryUnit,
    currentStock: productToEdit ? String(productToEdit.currentStock) : "0",
    minStock:     productToEdit ? String(productToEdit.minStock) : "3",
    costPrice:    productToEdit ? String(productToEdit.costPrice) : "",
    retailPrice:  productToEdit ? String(productToEdit.retailPrice ?? "") : "",
    supplier:     productToEdit?.supplier ?? "",
    notes:        productToEdit?.notes ?? "",
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const [done, setDone] = useState(false);

  const canSubmit = form.name.trim() && Number(form.retailPrice) > 0;

  const handleSave = () => {
    if (!canSubmit) return;
    onSave({
      id:           productToEdit?.id ?? "inv_" + Date.now().toString(36),
      name:         form.name.trim(),
      brand:        form.brand.trim(),
      category:     form.category,
      unit:         form.unit,
      currentStock: Number(form.currentStock) || 0,
      minStock:     Number(form.minStock) || 3,
      costPrice:    Number(form.costPrice) || 0,
      retailPrice:  Number(form.retailPrice),
      supplier:     form.supplier.trim() || undefined,
      notes:        form.notes.trim() || undefined,
    });
    setDone(true);
  };

  if (done) return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 360, padding: "48px 32px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, color: "#059669" }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e", marginBottom: 8 }}>{isEditing ? "Product Updated" : "Product Added"}</div>
        <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 24 }}>Available in POS catalog and Inventory.</div>
        <button onClick={onClose} style={{ padding: "10px 32px", borderRadius: 10, background: "#7C3AED", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 500, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>{isEditing ? "Edit Product" : "Add Retail Product"}</div>
            <div style={{ fontSize: 12, color: "#9898b0", marginTop: 2 }}>Products with a retail price appear in POS for sale</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#6b6b8a" /></button>
        </div>

        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Name + Brand */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Product Name *</Label>
              <input style={INP} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Argan Shampoo" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Brand</Label>
              <input style={INP} value={form.brand} onChange={e => set("brand", e.target.value)} placeholder="e.g. L'Oréal" />
            </div>
          </div>

          {/* Category + Unit */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Category</Label>
              <select value={form.category} onChange={e => set("category", e.target.value)} style={{ ...INP, background: "#fff" }}>
                {INV_CATEGORIES.map(c => <option key={c} value={c}>{INV_CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Unit</Label>
              <select value={form.unit} onChange={e => set("unit", e.target.value)} style={{ ...INP, background: "#fff" }}>
                {INV_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div style={{ padding: "14px 16px", background: "#faf8ff", borderRadius: 12, border: "1px solid #ede9fe" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Pricing</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Cost Price (PKR)</Label>
                <input style={INP} type="number" min={0} value={form.costPrice} onChange={e => set("costPrice", e.target.value)} placeholder="What you pay" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Retail Price (PKR) *</Label>
                <input style={{ ...INP, border: "1.5px solid #7C3AED", background: "#fff" }} type="number" min={0} value={form.retailPrice} onChange={e => set("retailPrice", e.target.value)} placeholder="What client pays" />
              </div>
            </div>
            {Number(form.retailPrice) > 0 && Number(form.costPrice) > 0 && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#059669", fontWeight: 600 }}>
                Margin: PKR {(Number(form.retailPrice) - Number(form.costPrice)).toLocaleString("en-PK")} ({Math.round(((Number(form.retailPrice) - Number(form.costPrice)) / Number(form.retailPrice)) * 100)}%)
              </div>
            )}
          </div>

          {/* Stock */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Current Stock</Label>
              <input style={INP} type="number" min={0} value={form.currentStock} onChange={e => set("currentStock", e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Min Stock Alert</Label>
              <input style={INP} type="number" min={0} value={form.minStock} onChange={e => set("minStock", e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label>Supplier</Label>
              <input style={INP} value={form.supplier} onChange={e => set("supplier", e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Label>Notes</Label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} placeholder="Optional notes"
              style={{ ...INP, resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }} />
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSave} disabled={!canSubmit} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: canSubmit ? "#7C3AED" : "#e8e8f0", fontSize: 13, fontWeight: 600, color: canSubmit ? "#fff" : "#b0b0c8", cursor: canSubmit ? "pointer" : "not-allowed" }}>
              {isEditing ? "Save Changes" : "Add Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type PageTab = "services" | "products";

export default function ServicesPage() {
  const [tab, setTab] = useState<PageTab>("services");

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [filter, setFilter] = useState("all");

  // Products state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null);

  useEffect(() => {
    setServices(getStoredServices());
    setStaff(getStoredStaff());
    setInventory(getStoredInventory());
  }, []);

  // ── Service handlers ──────────────────────────────────────────────────────
  const handleSaveService = (savedService: Service) => {
    const exists = services.some(s => s.id === savedService.id);
    const updated = exists ? services.map(s => s.id === savedService.id ? savedService : s) : [...services, savedService];
    setServices(updated);
    saveServices(updated);
  };

  const toggleServiceStatus = (id: string) => {
    const updated = services.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
    setServices(updated);
    saveServices(updated);
  };

  // ── Product handlers ──────────────────────────────────────────────────────
  const handleSaveProduct = (product: InventoryItem) => {
    const exists = inventory.some(i => i.id === product.id);
    const updated = exists ? inventory.map(i => i.id === product.id ? product : i) : [...inventory, product];
    setInventory(updated);
    saveInventory(updated);
  };

  const toggleProductRetail = (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    // Toggle retail availability — if it has a retailPrice, clear it; otherwise set it to costPrice or 0
    const updated = inventory.map(i =>
      i.id === id ? { ...i, retailPrice: i.retailPrice ? undefined : (i.costPrice || 0) } : i
    );
    setInventory(updated);
    saveInventory(updated);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredServices = filter === "all" ? services : services.filter(s => s.category === filter);
  const retailProducts   = inventory.filter(i => (i.retailPrice ?? 0) > 0);
  const allProducts      = inventory; // show all in the products tab

  const totalCount   = services.length;
  const activeCount  = services.filter(s => s.isActive).length;
  const avgDuration  = totalCount > 0 ? Math.round(services.reduce((s, a) => s + a.durationMin, 0) / totalCount) : 0;
  const maxPrice     = services.reduce((m, s) => s.price > m ? s.price : m, 0);

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Modals */}
      {(showAdd || editingService) && (
        <AddEditServiceModal
          onClose={() => { setShowAdd(false); setEditingService(null); }}
          onSave={handleSaveService}
          staffList={staff}
          serviceToEdit={editingService ?? undefined}
        />
      )}
      {(showAddProduct || editingProduct) && (
        <AddEditProductModal
          onClose={() => { setShowAddProduct(false); setEditingProduct(null); }}
          onSave={handleSaveProduct}
          productToEdit={editingProduct ?? undefined}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#1a1a2e" }}>Services & Products</div>
          <div style={{ fontSize: 13, color: "#9898b0", marginTop: 2 }}>
            {tab === "services" ? `${services.length} services · ${activeCount} active` : `${allProducts.length} products · ${retailProducts.length} available in POS`}
          </div>
        </div>
        {tab === "services" ? (
          <button onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: "#7C3AED", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
            <Plus size={16} /> Add Service
          </button>
        ) : (
          <button onClick={() => setShowAddProduct(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: "#d97706", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #e8e8f0", borderRadius: 12, padding: 4, width: "fit-content" }}>
        {([
          { id: "services", label: "Services", icon: Scissors },
          { id: "products", label: "Retail Products", icon: Package },
        ] as { id: PageTab; label: string; icon: React.ElementType }[]).map(t => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 9, border: "none", background: active ? "linear-gradient(135deg,#5B21B6,#9333EA)" : "transparent", color: active ? "#fff" : "#6b6b8a", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
              <Icon size={14} /> {t.label}
              {t.id === "products" && retailProducts.length > 0 && (
                <span style={{ background: active ? "rgba(255,255,255,0.25)" : "#7C3AED", color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "1px 7px" }}>
                  {retailProducts.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══════════ SERVICES TAB ══════════ */}
      {tab === "services" && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { label: "Total Services",     value: totalCount,       icon: <Scissors size={18} color="#7C3AED" />, bg: "#F5F3FF" },
              { label: "Active Services",    value: activeCount,      icon: <Sparkles size={18} color="#059669" />, bg: "#ecfdf5" },
              { label: "Average Duration",   value: `${avgDuration} min`, icon: <Clock size={18} color="#0284c7" />, bg: "#f0f9ff" },
              { label: "Highest Price",      value: fmt(maxPrice),    icon: <DollarSign size={18} color="#db2777" />, bg: "#fdf2f8" },
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
          <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #ebebf0", paddingBottom: 4 }}>
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
              <div style={{ fontSize: 13, marginTop: 6 }}>Click "Add Service" to get started</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {filteredServices.map((sv) => {
                const badge = CATEGORY_LABELS[sv.category] || { label: sv.category, bg: "#f3f4f6", color: "#4b5563" };
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
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={13} color="#9898b0" />{sv.durationMin} min
                        </div>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#b0b0c8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                        <Users size={12} /> Assigned Staff ({assigned.length})
                      </div>
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
        </>
      )}

      {/* ══════════ PRODUCTS TAB ══════════ */}
      {tab === "products" && (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { label: "Total Products",    value: allProducts.length,    icon: <Package size={18} color="#d97706" />,  bg: "#fffbeb" },
              { label: "Available in POS",  value: retailProducts.length, icon: <Tag size={18} color="#7C3AED" />,     bg: "#f5f3ff" },
              { label: "Low / Out of Stock",value: inventory.filter(i => i.currentStock <= i.minStock).length, icon: <Sparkles size={18} color="#dc2626" />, bg: "#fef2f2" },
              { label: "Retail Value",      value: fmt(retailProducts.reduce((s, i) => s + (i.retailPrice ?? 0) * i.currentStock, 0)), icon: <DollarSign size={18} color="#059669" />, bg: "#ecfdf5" },
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

          {/* Info banner */}
          <div style={{ padding: "10px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={14} color="#d97706" />
            Products with a <strong>retail price</strong> appear in the POS catalog for sale. Toggle the POS switch to enable/disable individual products.
          </div>

          {/* Products list */}
          {allProducts.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: "#b0b0c8" }}>
              <Package size={36} style={{ display: "block", margin: "0 auto 12px" }} />
              <div style={{ fontSize: 15, fontWeight: 700 }}>No products yet</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Click "Add Product" to add retail products for sale in POS</div>
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 110px 110px 120px 80px", padding: "10px 20px", background: "#fafafa", borderBottom: "1px solid #f0f0f8" }}>
                {["PRODUCT", "CATEGORY", "STOCK", "COST", "RETAIL PRICE", "MARGIN", "IN POS"].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", letterSpacing: "0.07em" }}>{h}</div>
                ))}
              </div>
              {allProducts.map((item, i) => {
                const isRetail  = (item.retailPrice ?? 0) > 0;
                const margin    = isRetail && item.costPrice ? Math.round(((item.retailPrice! - item.costPrice) / item.retailPrice!) * 100) : null;
                const isLow     = item.currentStock <= item.minStock;
                const catLabel  = INV_CATEGORY_LABELS[item.category] ?? item.category;
                return (
                  <div key={item.id}
                    style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 110px 110px 120px 80px", padding: "13px 20px", borderBottom: i < allProducts.length - 1 ? "1px solid #f4f4f8" : "none", alignItems: "center" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Package size={15} color="#d97706" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{item.brand ? `${item.brand} ` : ""}{item.name}</div>
                        <div style={{ fontSize: 11, color: "#9898b0", marginTop: 1 }}>{item.unit}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", borderRadius: 20, padding: "2px 8px", width: "fit-content" }}>{catLabel}</span>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isLow ? "#dc2626" : "#1a1a2e" }}>
                      {item.currentStock} {item.unit}
                      {isLow && <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 700 }}>Low stock</div>}
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>{item.costPrice ? fmt(item.costPrice) : "—"}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isRetail ? "#7C3AED" : "#c8c8d8" }}>
                      {isRetail ? fmt(item.retailPrice!) : "—"}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: margin !== null ? "#059669" : "#c8c8d8" }}>
                      {margin !== null ? `${margin}%` : "—"}
                    </div>
                    {/* POS toggle + edit */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => toggleProductRetail(item.id)}
                        title={isRetail ? "Remove from POS" : "Enable in POS"}
                        style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
                        {isRetail
                          ? <ToggleRight size={24} color="#7C3AED" />
                          : <ToggleLeft size={24} color="#c8c8d8" />}
                      </button>
                      <button onClick={() => setEditingProduct(item)}
                        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e8e8f0", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <Pencil size={12} color="#9898b0" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}