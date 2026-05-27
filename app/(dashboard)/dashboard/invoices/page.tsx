"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, Eye, Trash2, CheckCircle, Clock, X,
  FileText, Scissors, Package, ReceiptText, Pencil,
} from "lucide-react";
import {
  getSalonInvoices, createSalonInvoice, updateSalonInvoice,
  deleteSalonInvoice, markSalonInvoicePaid, calcTotals, newBlankItem,
  type SalonInvoice, type SalonInvoiceItem, type SalonInvoiceItemType,
} from "@/lib/salon-invoices";
import { getStoredClients, getStoredStaff, getStoredServices, getStoredInventory } from "@/lib/storage";
import type { Client, Staff, Service, InventoryItem, PaymentMethod } from "@/lib/types";
import { settingsStore } from "@/lib/settings-store";
import SalonInvoicePrint from "@/components/salon-invoice-print";

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmt(n: number) { return "PKR " + Math.round(n).toLocaleString("en-PK"); }
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
}
function today() { return new Date().toISOString().slice(0, 10); }

// ─── Constants ────────────────────────────────────────────────────────────────

const PAY_METHODS: { id: PaymentMethod | ""; label: string }[] = [
  { id: "cash",       label: "Cash" },
  { id: "easypaisa",  label: "EasyPaisa" },
  { id: "jazzcash",   label: "JazzCash" },
  { id: "raast",      label: "Raast" },
  { id: "card",       label: "Card" },
  { id: "bank",       label: "Bank Transfer" },
];

const STATUS_META = {
  paid:   { label: "Paid",   color: "#059669", bg: "#ecfdf5", icon: CheckCircle },
  unpaid: { label: "Unpaid", color: "#d97706", bg: "#fffbeb", icon: Clock },
};

// ─── Shared input / select styles ─────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e",
  background: "#fff", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#9898b0",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block",
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "#7C3AED" }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #ebebf0", padding: "18px 22px", flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#9898b0", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Separator ────────────────────────────────────────────────────────────────

function Row({ style, children }: { style?: React.CSSProperties; children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12, ...style }}>{children}</div>;
}

// ─── Item row in the form ─────────────────────────────────────────────────────

interface ItemRowProps {
  item: SalonInvoiceItem;
  onChange: (updated: SalonInvoiceItem) => void;
  onRemove: () => void;
  services: Service[];
  inventory: InventoryItem[];
  idx: number;
}

function ItemRow({ item, onChange, onRemove, services, inventory, idx }: ItemRowProps) {
  function set<K extends keyof SalonInvoiceItem>(key: K, val: SalonInvoiceItem[K]) {
    const updated = { ...item, [key]: val };
    // Auto-recalc total when qty or unitPrice changes
    if (key === "qty" || key === "unitPrice") {
      updated.total = (key === "qty" ? (val as number) : updated.qty) *
                      (key === "unitPrice" ? (val as number) : updated.unitPrice);
    }
    if (key === "total") updated.total = val as number;
    onChange(updated);
  }

  function handleDescriptionChange(desc: string) {
    // If they pick from a service, auto-fill price
    if (item.type === "service") {
      const svc = services.find((s) => s.name === desc);
      if (svc) { onChange({ ...item, description: desc, unitPrice: svc.price, total: svc.price * item.qty }); return; }
    }
    if (item.type === "product") {
      const inv = inventory.find((i) => i.name === desc);
      if (inv && inv.retailPrice) { onChange({ ...item, description: desc, unitPrice: inv.retailPrice, total: inv.retailPrice * item.qty }); return; }
    }
    set("description", desc);
  }

  const svcOptions = services.filter((s) => s.isActive).map((s) => s.name);
  const prodOptions = inventory.filter((i) => i.retailPrice).map((i) => i.name);
  const options = item.type === "service" ? svcOptions : prodOptions;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 80px 120px 120px 36px", gap: 8, alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f4f4f8" }}>
      {/* Type badge */}
      <select
        value={item.type}
        onChange={(e) => onChange({ ...item, type: e.target.value as SalonInvoiceItemType, description: "" })}
        style={{ ...inputStyle, padding: "7px 8px", fontSize: 12 }}
      >
        <option value="service">Service</option>
        <option value="product">Product</option>
      </select>

      {/* Description (with datalist autocomplete) */}
      <div>
        <input
          list={`desc-list-${idx}`}
          value={item.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder={item.type === "service" ? "Service name…" : "Product name…"}
          style={inputStyle}
        />
        <datalist id={`desc-list-${idx}`}>
          {options.map((o) => <option key={o} value={o} />)}
        </datalist>
      </div>

      {/* Qty */}
      <input
        type="number" min={1} value={item.qty}
        onChange={(e) => set("qty", Math.max(1, Number(e.target.value)))}
        style={inputStyle}
      />

      {/* Unit Price */}
      <input
        type="number" min={0} value={item.unitPrice}
        onChange={(e) => set("unitPrice", Number(e.target.value))}
        placeholder="Price"
        style={inputStyle}
      />

      {/* Total (read-only) */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED", textAlign: "right", padding: "0 4px" }}>
        {fmt(item.total)}
      </div>

      {/* Remove */}
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <X size={14} color="#dc2626" />
      </button>
    </div>
  );
}

// ─── Invoice Form Modal ───────────────────────────────────────────────────────

interface FormState {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  staffName: string;
  items: SalonInvoiceItem[];
  discountAmount: number;
  paymentMethod: PaymentMethod | "";
  date: string;
  status: "paid" | "unpaid";
  notes: string;
}

function blankForm(): FormState {
  return {
    clientName: "", clientPhone: "", clientEmail: "",
    staffName: "", items: [newBlankItem()],
    discountAmount: 0, paymentMethod: "cash",
    date: today(), status: "paid", notes: "",
  };
}

interface InvoiceFormProps {
  onClose: () => void;
  onSave: (inv: SalonInvoice) => void;
  editing?: SalonInvoice;
  clients: Client[];
  staff: Staff[];
  services: Service[];
  inventory: InventoryItem[];
}

function InvoiceForm({ onClose, onSave, editing, clients, staff, services, inventory }: InvoiceFormProps) {
  const [form, setForm] = useState<FormState>(() => {
    if (editing) {
      return {
        clientName: editing.clientName,
        clientPhone: editing.clientPhone,
        clientEmail: editing.clientEmail ?? "",
        staffName: editing.staffName,
        items: editing.items,
        discountAmount: editing.discountAmount,
        paymentMethod: editing.paymentMethod,
        date: editing.date,
        status: editing.status,
        notes: editing.notes ?? "",
      };
    }
    return blankForm();
  });

  const { subtotal, taxAmount, total } = calcTotals(form.items, form.discountAmount);

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function updateItem(idx: number, updated: SalonInvoiceItem) {
    const items = form.items.map((it, i) => (i === idx ? updated : it));
    setField("items", items);
  }

  function removeItem(idx: number) {
    setField("items", form.items.filter((_, i) => i !== idx));
  }

  function addItem() {
    setField("items", [...form.items, newBlankItem()]);
  }

  function handleClientSelect(name: string) {
    setField("clientName", name);
    const c = clients.find((cl) => cl.name === name);
    if (c) { setField("clientPhone", c.phone); setField("clientEmail", c.email ?? ""); }
  }

  function handleSave() {
    if (!form.clientName.trim()) { alert("Please enter client name."); return; }
    if (form.items.length === 0) { alert("Add at least one item."); return; }
    const draft = {
      clientName: form.clientName.trim(),
      clientPhone: form.clientPhone.trim(),
      clientEmail: form.clientEmail.trim() || undefined,
      staffName: form.staffName.trim(),
      items: form.items,
      subtotal, taxAmount, total,
      discountAmount: form.discountAmount,
      paymentMethod: form.paymentMethod,
      date: form.date,
      status: form.status,
      notes: form.notes.trim() || undefined,
    };
    let inv: SalonInvoice;
    if (editing) {
      inv = { ...editing, ...draft };
      updateSalonInvoice(inv);
    } else {
      inv = createSalonInvoice(draft);
    }
    onSave(inv);
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 760, boxShadow: "0 24px 70px rgba(0,0,0,0.25)", overflow: "hidden" }}
      >
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg,#5B21B6,#9333EA)", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ReceiptText size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {editing ? "Edit Invoice" : "New Invoice"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
                {editing ? editing.number : "Create Client Invoice"}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.18)", border: "none", cursor: "pointer", padding: 8, borderRadius: 9, display: "flex" }}>
            <X size={16} color="#fff" />
          </button>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Client ── */}
          <div style={{ background: "#f8f8fc", borderRadius: 14, border: "1px solid #ebebf0", padding: "18px 20px" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1a2e", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <FileText size={15} color="#7C3AED" /> Client Details
            </div>
            <Row>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Client Name *</label>
                <input
                  list="client-list" value={form.clientName}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  placeholder="Type or pick a client…"
                  style={inputStyle}
                />
                <datalist id="client-list">
                  {clients.map((c) => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Phone</label>
                <input value={form.clientPhone} onChange={(e) => setField("clientPhone", e.target.value)} placeholder="+92 300 000 0000" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Email (optional)</label>
                <input value={form.clientEmail} onChange={(e) => setField("clientEmail", e.target.value)} placeholder="client@email.com" style={inputStyle} />
              </div>
            </Row>
          </div>

          {/* ── Appointment info ── */}
          <div style={{ background: "#f8f8fc", borderRadius: 14, border: "1px solid #ebebf0", padding: "18px 20px" }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1a2e", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <Scissors size={15} color="#7C3AED" /> Service Info
            </div>
            <Row>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Stylist / Staff</label>
                <input
                  list="staff-list" value={form.staffName}
                  onChange={(e) => setField("staffName", e.target.value)}
                  placeholder="Pick a staff member…"
                  style={inputStyle}
                />
                <datalist id="staff-list">
                  {staff.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.name} />)}
                </datalist>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Invoice Date</label>
                <input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Status</label>
                <select value={form.status} onChange={(e) => setField("status", e.target.value as "paid" | "unpaid")} style={inputStyle}>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
            </Row>
          </div>

          {/* ── Items ── */}
          <div style={{ background: "#f8f8fc", borderRadius: 14, border: "1px solid #ebebf0", padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 7 }}>
                <Package size={15} color="#7C3AED" /> Line Items
              </div>
              <button
                onClick={addItem}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid #7C3AED", background: "#EDE9FE", fontSize: 12, fontWeight: 700, color: "#7C3AED", cursor: "pointer" }}
              >
                <Plus size={13} /> Add Item
              </button>
            </div>

            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 80px 120px 120px 36px", gap: 8, padding: "6px 0", borderBottom: "2px solid #ebebf0" }}>
              {["Type", "Description", "Qty", "Unit Price", "Total", ""].map((h) => (
                <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
              ))}
            </div>

            {form.items.map((item, i) => (
              <ItemRow
                key={item.id} idx={i} item={item}
                onChange={(u) => updateItem(i, u)}
                onRemove={() => removeItem(i)}
                services={services} inventory={inventory}
              />
            ))}

            {form.items.length === 0 && (
              <div style={{ padding: "20px 0", textAlign: "center", fontSize: 13, color: "#b0b0c8" }}>No items yet — click Add Item</div>
            )}

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#6b6b8a", borderBottom: "1px solid #f0f0f8" }}>
                  <span>Subtotal</span><span style={{ fontWeight: 600, color: "#1a1a2e" }}>{fmt(subtotal)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "#6b6b8a", borderBottom: "1px solid #f0f0f8", gap: 8 }}>
                  <span style={{ whiteSpace: "nowrap" }}>Discount (PKR)</span>
                  <input
                    type="number" min={0} value={form.discountAmount}
                    onChange={(e) => setField("discountAmount", Math.max(0, Number(e.target.value)))}
                    style={{ ...inputStyle, width: 100, padding: "4px 8px", textAlign: "right" }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", marginTop: 8, background: "linear-gradient(135deg,#5B21B6,#9333EA)", borderRadius: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Total</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Payment & Notes ── */}
          <Row>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Payment Method</label>
              <select value={form.paymentMethod} onChange={(e) => setField("paymentMethod", e.target.value as PaymentMethod)} style={inputStyle}>
                <option value="">— Select —</option>
                {PAY_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Notes (optional)</label>
              <input value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Any additional notes…" style={inputStyle} />
            </div>
          </Row>

          {/* ── Actions ── */}
          <Row style={{ justifyContent: "flex-end", paddingTop: 4 }}>
            <button onClick={onClose} style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSave} style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#5B21B6,#9333EA)", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
              {editing ? "Save Changes" : "Create Invoice"}
            </button>
          </Row>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<SalonInvoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all");

  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<SalonInvoice | undefined>();
  const [viewingInvoice, setViewingInvoice] = useState<SalonInvoice | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const salon = settingsStore.salon;

  function reload() {
    setInvoices(getSalonInvoices());
    setClients(getStoredClients());
    setStaff(getStoredStaff());
    setServices(getStoredServices());
    setInventory(getStoredInventory());
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const paid = invoices.filter((i) => i.status === "paid");
    const unpaid = invoices.filter((i) => i.status === "unpaid");
    return {
      total: invoices.length,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      totalRevenue: paid.reduce((s, i) => s + i.total, 0),
      outstanding: unpaid.reduce((s, i) => s + i.total, 0),
    };
  }, [invoices]);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((inv) => {
      const matchSearch = !q || inv.clientName.toLowerCase().includes(q) || inv.number.toLowerCase().includes(q) || inv.staffName.toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || inv.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, filterStatus]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSaved(inv: SalonInvoice) {
    reload();
    setShowForm(false);
    setEditingInvoice(undefined);
    setViewingInvoice(inv); // open print view after saving
  }

  function handleMarkPaid(id: string) {
    markSalonInvoicePaid(id);
    reload();
    if (viewingInvoice?.id === id) {
      setViewingInvoice((prev) => prev ? { ...prev, status: "paid" } : prev);
    }
  }

  function handleDelete(id: string) {
    deleteSalonInvoice(id);
    setDeleteConfirm(null);
    reload();
    if (viewingInvoice?.id === id) setViewingInvoice(null);
  }

  function openEdit(inv: SalonInvoice) {
    setEditingInvoice(inv);
    setShowForm(true);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Print modal ── */}
      {viewingInvoice && (
        <SalonInvoicePrint
          invoice={viewingInvoice}
          salonName={salon.name}
          salonPhone={salon.phone}
          salonEmail={salon.email}
          salonAddress={salon.address}
          onClose={() => setViewingInvoice(null)}
          onMarkPaid={() => handleMarkPaid(viewingInvoice.id)}
        />
      )}

      {/* ── Invoice Form Modal ── */}
      {showForm && (
        <InvoiceForm
          onClose={() => { setShowForm(false); setEditingInvoice(undefined); }}
          onSave={handleSaved}
          editing={editingInvoice}
          clients={clients} staff={staff} services={services} inventory={inventory}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div onClick={() => setDeleteConfirm(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 360, width: "100%", boxShadow: "0 16px 50px rgba(0,0,0,0.2)", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 size={22} color="#dc2626" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 6 }}>Delete Invoice?</div>
            <div style={{ fontSize: 13, color: "#6b6b8a", marginBottom: 24 }}>This action cannot be undone.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#1a1a2e" }}>Client Invoices</div>
          <div style={{ fontSize: 13, color: "#9898b0", marginTop: 2 }}>Generate branded invoices for services & products</div>
        </div>
        <button
          onClick={() => { setEditingInvoice(undefined); setShowForm(true); }}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#5B21B6,#9333EA)", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px rgba(91,33,182,0.35)" }}
        >
          <Plus size={16} /> New Invoice
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "flex", gap: 16 }}>
        <StatCard label="Total Invoices" value={String(stats.total)} sub={`${stats.paidCount} paid · ${stats.unpaidCount} unpaid`} />
        <StatCard label="Revenue Collected" value={fmt(stats.totalRevenue)} color="#059669" />
        <StatCard label="Outstanding" value={fmt(stats.outstanding)} color="#d97706" sub={`${stats.unpaidCount} unpaid invoice${stats.unpaidCount !== 1 ? "s" : ""}`} />
      </div>

      {/* ── Table card ── */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>

        {/* Toolbar */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", gap: 12 }}>
          {/* Search */}
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={14} color="#b0b0c8" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client, number, or staff…"
              style={{ ...inputStyle, paddingLeft: 34, maxWidth: 360 }}
            />
          </div>
          {/* Status filter */}
          {(["all", "paid", "unpaid"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
                border: filterStatus === s ? "none" : "1px solid #e8e8f0",
                background: filterStatus === s ? "linear-gradient(135deg,#5B21B6,#9333EA)" : "#fff",
                color: filterStatus === s ? "#fff" : "#6b6b8a",
              }}
            >
              {s === "all" ? "All" : s === "paid" ? "Paid" : "Unpaid"}
            </button>
          ))}
        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 160px 120px 100px 90px 128px", padding: "10px 24px", borderBottom: "1px solid #f0f0f8", background: "#fafafa" }}>
          {["Invoice #", "Client", "Staff", "Date", "Amount", "Status", "Actions"].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#f4f5f7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <ReceiptText size={26} color="#b0b0c8" />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }}>No invoices yet</div>
            <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 20 }}>Create your first client invoice to get started</div>
            <button
              onClick={() => setShowForm(true)}
              style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#5B21B6,#9333EA)", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}
            >
              <Plus size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />New Invoice
            </button>
          </div>
        ) : (
          filtered.map((inv, i) => {
            const sm = STATUS_META[inv.status];
            const Icon = sm.icon;
            return (
              <div
                key={inv.id}
                style={{
                  display: "grid", gridTemplateColumns: "140px 1fr 160px 120px 100px 90px 128px",
                  padding: "13px 24px",
                  borderBottom: i < filtered.length - 1 ? "1px solid #f4f4f8" : "none",
                  alignItems: "center",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: "#7C3AED", fontFamily: "monospace" }}>{inv.number}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{inv.clientName}</div>
                  <div style={{ fontSize: 11, color: "#9898b0" }}>{inv.clientPhone}</div>
                </div>
                <div style={{ fontSize: 13, color: "#4a4a6a" }}>{inv.staffName || "—"}</div>
                <div style={{ fontSize: 12, color: "#6b6b8a" }}>{fmtDate(inv.date)}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>{fmt(inv.total)}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: sm.bg, fontSize: 11, fontWeight: 700, color: sm.color }}>
                  <Icon size={10} /> {sm.label}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {/* View/Print */}
                  <button
                    onClick={() => setViewingInvoice(inv)}
                    title="View / Print"
                    style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #e8e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <Eye size={13} color="#9898b0" />
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => openEdit(inv)}
                    title="Edit"
                    style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #e8e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <Pencil size={13} color="#9898b0" />
                  </button>
                  {/* Mark paid */}
                  {inv.status === "unpaid" && (
                    <button
                      onClick={() => handleMarkPaid(inv.id)}
                      title="Mark Paid"
                      style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #bbf7d0", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                      <CheckCircle size={13} color="#059669" />
                    </button>
                  )}
                  {/* Delete */}
                  <button
                    onClick={() => setDeleteConfirm(inv.id)}
                    title="Delete"
                    style={{ width: 30, height: 30, borderRadius: 7, border: "1px solid #fecaca", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <Trash2 size={13} color="#dc2626" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}