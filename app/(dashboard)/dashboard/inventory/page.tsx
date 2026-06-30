"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { getStoredInventory, saveInventory } from "@/lib/storage";
import { checkLowStockAlerts } from "@/lib/whatsapp-scheduler";
import { settingsStore } from "@/lib/settings-store";
import type { InventoryItem, InventoryCategory, InventoryUnit } from "@/lib/types";
import DashboardHeader from "@/components/dashboard-header";
import MobilePageHeader from "@/components/mobile-page-header";
import {
  Search, X, Plus, AlertTriangle, Package, ChevronDown,
  Edit2, Trash2, Bell, Copy, CheckCircle, TrendingDown,
  MessageCircle, DollarSign, Tag, ToggleLeft, ToggleRight,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<InventoryCategory, { label: string; color: string; bg: string }> = {
  "hair-color":  { label: "Hair Color",   color: "#7C3AED", bg: "#EDE9FE" },
  "skin-care":   { label: "Skin Care",    color: "#db2777", bg: "#fdf2f8" },
  "nail":        { label: "Nail",         color: "#0369a1", bg: "#e0f2fe" },
  "tools":       { label: "Tools",        color: "#d97706", bg: "#fffbeb" },
  "consumables": { label: "Consumables",  color: "#059669", bg: "#ecfdf5" },
  "retail":      { label: "Retail",       color: "#6b7280", bg: "#f9fafb" },
};

const UNITS: InventoryUnit[]      = ["ml", "g", "pcs", "box", "bottle", "tube"];
const CATEGORIES = Object.keys(CATEGORY_CONFIG) as InventoryCategory[];

import { fmtCurrency as fmt } from "@/lib/format";
const fmtV = (n: number) => {
  const currency = settingsStore.salon.currency || "PKR";
  return n >= 1_000_000 ? `${currency} ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000   ? `${currency} ${Math.round(n / 1_000)}K`
    : fmt(n);
};

function stockStatus(item: InventoryItem): "out" | "low" | "ok" {
  if (item.currentStock === 0)              return "out";
  if (item.currentStock <= item.minStock)   return "low";
  return "ok";
}

const STATUS_BADGE = {
  out: { label: "Out of Stock", color: "#dc2626", bg: "#fef2f2" },
  low: { label: "Low Stock",    color: "#d97706", bg: "#fffbeb" },
  ok:  { label: "In Stock",     color: "#059669", bg: "#ecfdf5" },
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e",
  outline: "none", background: "#fff",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      {children}
    </div>
  );
}

// ── Item Form (shared by Add + Edit modals) ───────────────────────────────────
type ItemForm = {
  name: string; brand: string; category: InventoryCategory | "";
  unit: InventoryUnit; currentStock: string; minStock: string;
  costPrice: string; retailPrice: string; supplier: string; notes: string;
};

const EMPTY_FORM: ItemForm = {
  name: "", brand: "", category: "", unit: "pcs",
  currentStock: "", minStock: "", costPrice: "",
  retailPrice: "", supplier: "", notes: "",
};

function itemToForm(item: InventoryItem): ItemForm {
  return {
    name: item.name, brand: item.brand, category: item.category,
    unit: item.unit,
    currentStock: String(item.currentStock), minStock: String(item.minStock),
    costPrice: String(item.costPrice), retailPrice: item.retailPrice ? String(item.retailPrice) : "",
    supplier: item.supplier ?? "", notes: item.notes ?? "",
  };
}

function formToItem(form: ItemForm, existing?: InventoryItem): InventoryItem {
  return {
    id: existing?.id ?? "i_" + Date.now(),
    name: form.name, brand: form.brand,
    category: form.category as InventoryCategory,
    unit: form.unit,
    currentStock: Number(form.currentStock),
    minStock: Number(form.minStock),
    costPrice: Number(form.costPrice),
    retailPrice: form.retailPrice ? Number(form.retailPrice) : undefined,
    supplier: form.supplier || undefined,
    notes: form.notes || undefined,
    lastRestocked: existing?.lastRestocked ?? new Date().toLocaleDateString("en-CA"),
  };
}

function ItemFormFields({ form, set }: { form: ItemForm; set: (k: keyof ItemForm, v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Item Name *"><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Wella Koleston 8/0" style={INP} /></Field>
        <Field label="Brand *"><input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Wella" style={INP} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Category *">
          <select value={form.category} onChange={(e) => set("category", e.target.value)} style={INP}>
            <option value="">Select…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>)}
          </select>
        </Field>
        <Field label="Unit *">
          <select value={form.unit} onChange={(e) => set("unit", e.target.value)} style={INP}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Current Stock *"><input type="number" min="0" value={form.currentStock} onChange={(e) => set("currentStock", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="Min Stock (alert threshold) *"><input type="number" min="0" value={form.minStock} onChange={(e) => set("minStock", e.target.value)} placeholder="0" style={INP} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Cost Price (PKR) *"><input type="number" min="0" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="0" style={INP} /></Field>
        <Field label="Retail Price (PKR)"><input type="number" min="0" value={form.retailPrice} onChange={(e) => set("retailPrice", e.target.value)} placeholder="0" style={INP} /></Field>
      </div>
      <Field label="Supplier"><input value={form.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="e.g. Wella Pakistan" style={INP} /></Field>
      <Field label="Notes"><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any notes…" rows={2} style={{ ...INP, resize: "none", lineHeight: 1.5 }} /></Field>
    </div>
  );
}

// ── Add Modal ─────────────────────────────────────────────────────────────────
function AddModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: InventoryItem) => void }) {
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [done, setDone] = useState(false);
  const set = useCallback((k: keyof ItemForm, v: string) => setForm((f) => ({ ...f, [k]: v })), []);
  const canSubmit = form.name && form.brand && form.category && form.currentStock && form.minStock && form.costPrice;

  if (done) return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e", marginBottom: 6 }}>Item Added!</div>
        <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 24 }}>Inventory updated successfully.</div>
        <button onClick={onClose} style={{ padding: "10px 32px", borderRadius: 10, background: "linear-gradient(135deg, #5B21B6, #9333EA)", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
      </div>
    </Overlay>
  );

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Add Inventory Item" onClose={onClose} />
      <div style={{ padding: "22px 24px" }}>
        <ItemFormFields form={form} set={set} />
        <div style={{ display: "flex", gap: 10, paddingTop: 18, marginTop: 6, borderTop: "1px solid #f0f0f8" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { if (canSubmit) { onAdd(formToItem(form)); setDone(true); } }} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: canSubmit ? "linear-gradient(135deg, #5B21B6, #9333EA)" : "#e8e8f0", fontSize: 13, fontWeight: 600, color: canSubmit ? "#fff" : "#b0b0c8", cursor: canSubmit ? "pointer" : "not-allowed" }}>
            Add Item
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ item, onClose, onSave }: { item: InventoryItem; onClose: () => void; onSave: (updated: InventoryItem) => void }) {
  const [form, setForm] = useState<ItemForm>(() => itemToForm(item));
  const [saved, setSaved] = useState(false);
  const set = useCallback((k: keyof ItemForm, v: string) => setForm((f) => ({ ...f, [k]: v })), []);
  const canSubmit = form.name && form.brand && form.category && form.currentStock && form.minStock && form.costPrice;

  if (saved) return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e", marginBottom: 6 }}>Changes Saved!</div>
        <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 24 }}>{item.name} has been updated.</div>
        <button onClick={onClose} style={{ padding: "10px 32px", borderRadius: 10, background: "linear-gradient(135deg, #5B21B6, #9333EA)", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
      </div>
    </Overlay>
  );

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title={`Edit — ${item.name}`} onClose={onClose} />
      <div style={{ padding: "22px 24px" }}>
        <ItemFormFields form={form} set={set} />
        <div style={{ display: "flex", gap: 10, paddingTop: 18, marginTop: 6, borderTop: "1px solid #f0f0f8" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
          <button
            onClick={() => { if (canSubmit) { onSave(formToItem(form, item)); setSaved(true); } }}
            style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: canSubmit ? "linear-gradient(135deg, #5B21B6, #9333EA)" : "#e8e8f0", fontSize: 13, fontWeight: 600, color: canSubmit ? "#fff" : "#b0b0c8", cursor: canSubmit ? "pointer" : "not-allowed" }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ item, onClose, onDelete }: { item: InventoryItem; onClose: () => void; onDelete: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ padding: "32px 28px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Trash2 size={22} color="#dc2626" />
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e", marginBottom: 8 }}>Remove Item?</div>
        <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 24, lineHeight: 1.6 }}>
          <strong style={{ color: "#1a1a2e" }}>{item.name}</strong> will be permanently removed from inventory.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { onDelete(); onClose(); }} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Delete</button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Restock Reminder Modal ────────────────────────────────────────────────────
function ReminderModal({ alertItems, onClose }: { alertItems: InventoryItem[]; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [apiResult, setApiResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const ws = settingsStore.wasender as { apiKey: string; ownerPhone: string };
  const salonName = settingsStore.salon.name as string;

  const message = [
    `🔔 *Salon Inventory Restock Alert*`,
    `Date: ${new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
    ``,
    `The following items need restocking:`,
    ``,
    ...alertItems.map((item) => {
      const st = stockStatus(item);
      const icon = st === "out" ? "🔴" : "🟡";
      return `${icon} *${item.name}* (${item.brand})\n   Current: ${item.currentStock} ${item.unit} | Min: ${item.minStock} ${item.unit}${item.supplier ? `\n   Supplier: ${item.supplier}` : ""}`;
    }),
    ``,
    `Please reorder ASAP. — ${salonName || "Salon Central"}`,
  ].join("\n");

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const sendViaApi = async () => {
    if (!ws.apiKey) {
      setApiResult({ ok: false, msg: "WaSender API key not set in Account → WhatsApp Settings" });
      return;
    }
    if (!ws.ownerPhone) {
      setApiResult({ ok: false, msg: "Owner WhatsApp number not set in Account → WhatsApp Settings" });
      return;
    }
    setSending(true);
    setApiResult(null);
    try {
      const lowstockTemplate = (settingsStore.whatsapp as { lowstock: string }).lowstock;
      const itemList = alertItems.map((i) => `${i.name} (${i.currentStock} ${i.unit} left)`).join(", ");
      const phone = ws.ownerPhone.replace(/\D/g, "");
      const text = (lowstockTemplate || "⚠️ Low Stock Alert from {{salon_name}}: {{count}} item(s) running low — {{items}}.")
        .replace(/\{\{items\}\}/g, itemList)
        .replace(/\{\{count\}\}/g, String(alertItems.length))
        .replace(/\{\{salon_name\}\}/g, salonName);
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: ws.apiKey, phone, text }),
      });
      const data = await res.json() as { ok: boolean };
      setApiResult(data.ok
        ? { ok: true, msg: `Sent to ${phone}` }
        : { ok: false, msg: "Failed — check your WaSender API key" });
    } catch (err) {
      setApiResult({ ok: false, msg: String(err) });
    }
    setSending(false);
  };

  return (
    <Overlay onClose={onClose}>
      <ModalHeader title="Low Stock Reminder" onClose={onClose} />
      <div style={{ padding: "20px 24px 24px" }}>
        <div style={{ fontSize: 13, color: "#6b6b8a", marginBottom: 14 }}>
          {alertItems.length} item{alertItems.length !== 1 ? "s" : ""} need restocking. Send a reminder message:
        </div>

        {/* Alert items list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {alertItems.map((item) => {
            const st = stockStatus(item);
            return (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: st === "out" ? "#fef2f2" : "#fffbeb", borderRadius: 10, border: `1px solid ${st === "out" ? "#fecaca" : "#fed7aa"}` }}>
                <AlertTriangle size={14} color={st === "out" ? "#dc2626" : "#d97706"} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "#9898b0" }}>{item.brand} · {item.currentStock}/{item.minStock} {item.unit}{item.supplier ? ` · ${item.supplier}` : ""}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: st === "out" ? "#dc2626" : "#d97706", background: st === "out" ? "#fef2f2" : "#fffbeb", padding: "2px 8px", borderRadius: 20, border: `1px solid ${st === "out" ? "#fecaca" : "#fed7aa"}` }}>
                  {st === "out" ? "Out" : "Low"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Message preview */}
        <div style={{ background: "#f8f8fc", border: "1px solid #e8e8f0", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#6b6b8a", fontFamily: "monospace", whiteSpace: "pre-wrap", maxHeight: 160, overflowY: "auto", marginBottom: 18, lineHeight: 1.7 }}>
          {message}
        </div>

        {/* API result */}
        {apiResult && (
          <div style={{ marginBottom: 12, padding: "9px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, color: apiResult.ok ? "#059669" : "#dc2626", background: apiResult.ok ? "#ecfdf5" : "#fef2f2" }}>
            {apiResult.msg}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={copyToClipboard}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: copied ? "#059669" : "#6b6b8a", cursor: "pointer" }}
          >
            {copied ? <CheckCircle size={15} /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy Text"}
          </button>
          <button
            onClick={openWhatsApp}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 10, border: "none", background: "#25D366", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}
          >
            <MessageCircle size={14} /> WhatsApp Web
          </button>
          <button
            onClick={sendViaApi}
            disabled={sending}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 10, border: "none", background: sending ? "#e8e8f0" : "linear-gradient(135deg,#5B21B6,#9333EA)", fontSize: 12, fontWeight: 700, color: sending ? "#aaaabc" : "#fff", cursor: sending ? "not-allowed" : "pointer" }}
          >
            <Bell size={14} /> {sending ? "Sending..." : "Send via API"}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Shared modal helpers ──────────────────────────────────────────────────────
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} className="modal-overlay" style={{ zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 500, maxWidth: "100%", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>{title}</div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}><X size={18} color="#9898b0" /></button>
    </div>
  );
}

// ── Item Table Row ─────────────────────────────────────────────────────────────
function ItemRow({ item, isLast, onEdit, onDelete }: {
  item: InventoryItem; isLast: boolean;
  onEdit: () => void; onDelete: () => void;
}) {
  const status = stockStatus(item);
  const badge  = STATUS_BADGE[status];
  const cat    = CATEGORY_CONFIG[item.category];
  const rowBg  = status === "out" ? "#fff0f0" : status === "low" ? "#fffbeb" : "transparent";
  const leftBorder = status === "out" ? "4px solid #dc2626" : status === "low" ? "4px solid #f59e0b" : "4px solid transparent";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "2.2fr 110px 130px 100px 130px 110px 90px",
      padding: "13px 20px",
      borderBottom: isLast ? "none" : "1px solid #f4f4f8",
      borderLeft: leftBorder,
      alignItems: "center",
      background: rowBg,
      transition: "background 0.15s",
    }}>
      {/* Name + brand */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 }}>
          {item.name}
          {status !== "ok" && <AlertTriangle size={12} color={badge.color} />}
        </div>
        <div style={{ fontSize: 11, color: "#9898b0", marginTop: 1 }}>
          {item.brand}{item.supplier ? ` · ${item.supplier}` : ""}
        </div>
      </div>

      {/* Category */}
      <span style={{ fontSize: 11, fontWeight: 600, color: cat.color, background: cat.bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", width: "fit-content" }}>
        {cat.label}
      </span>

      {/* Stock */}
      <div>
        <span style={{ fontSize: 13, fontWeight: 700, color: status === "out" ? "#dc2626" : status === "low" ? "#d97706" : "#1a1a2e" }}>
          {item.currentStock} {item.unit}
        </span>
        <div style={{ fontSize: 10, color: "#b0b0c8", marginTop: 1 }}>
          Min: {item.minStock} {item.unit}
        </div>
      </div>

      {/* Last restocked */}
      <div style={{ fontSize: 11, color: "#9898b0" }}>
        {item.lastRestocked ? new Date(item.lastRestocked + "T12:00:00").toLocaleDateString("en-PK", { day: "numeric", month: "short" }) : "—"}
      </div>

      {/* Cost / retail */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{fmt(item.costPrice)}</div>
        {item.retailPrice && <div style={{ fontSize: 10, color: "#9898b0" }}>Retail: {fmt(item.retailPrice)}</div>}
      </div>

      {/* Status badge */}
      <span style={{ fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap", width: "fit-content" }}>
        {badge.label}
      </span>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button onClick={onEdit} title="Edit" style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #e8e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Edit2 size={13} color="#7C3AED" />
        </button>
        <button onClick={onDelete} title="Delete" style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid #fecaca", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Trash2 size={13} color="#dc2626" />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [tab, setTab]                   = useState<"stock" | "retail">("stock");
  const [items, setItems]               = useState<InventoryItem[]>([]);
  const [search, setSearch]             = useState("");
  const [catFilter, setCatFilter]       = useState<InventoryCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "low" | "out" | "ok">("all");
  const [showFilters, setShowFilters]   = useState(false);
  const [showAdd, setShowAdd]           = useState(false);
  const [editItem, setEditItem]         = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem]     = useState<InventoryItem | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);

  useEffect(() => {
    setItems(getStoredInventory());
    checkLowStockAlerts();
  }, []);

  const persist = useCallback((updated: InventoryItem[]) => {
    setItems(updated);
    saveInventory(updated);
    checkLowStockAlerts();
  }, []);

  const toggleRetail = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    persist(items.map(i => i.id === id
      ? { ...i, retailPrice: i.retailPrice ? undefined : (i.costPrice || 0) }
      : i
    ));
  }, [items, persist]);

  const retailItems = useMemo(() => items.filter(i => (i.retailPrice ?? 0) > 0), [items]);

  const totalValue = useMemo(() => items.reduce((s, i) => s + i.costPrice * i.currentStock, 0), [items]);
  const alertItems = useMemo(() => items.filter((i) => stockStatus(i) !== "ok"), [items]);
  const lowCount   = alertItems.filter((i) => stockStatus(i) === "low").length;
  const outCount   = alertItems.filter((i) => stockStatus(i) === "out").length;

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (catFilter !== "all" && item.category !== catFilter) return false;
      if (statusFilter !== "all" && stockStatus(item) !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          (item.supplier ?? "").toLowerCase().includes(q) ||
          CATEGORY_CONFIG[item.category].label.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, search, catFilter, statusFilter]);

  const activeFilters = [catFilter !== "all", statusFilter !== "all"].filter(Boolean).length;

  return (
    <div className="dashboard-polish" style={{ background: "#f4f5f7", minHeight: "100vh" }}>

      {/* ── Modals (shared) ── */}
      {showAdd    && <AddModal    onClose={() => setShowAdd(false)}    onAdd={(item) => persist([item, ...items])} />}
      {editItem   && <EditModal   item={editItem} onClose={() => setEditItem(null)} onSave={(updated) => persist(items.map((i) => i.id === updated.id ? updated : i))} />}
      {deleteItem && <DeleteModal item={deleteItem} onClose={() => setDeleteItem(null)} onDelete={() => persist(items.filter((i) => i.id !== deleteItem.id))} />}
      {showReminder && <ReminderModal alertItems={alertItems} onClose={() => setShowReminder(false)} />}

      {/* ══════════ MOBILE LAYOUT ══════════ */}

      {/* Mobile app bar */}
      <MobilePageHeader
        title="Inventory"
        subtitle={tab === "stock"
          ? `${items.length} items · ${fmtV(totalValue)}`
          : `${retailItems.length} in POS`}
        action={{ label: "+ Add", onClick: () => setShowAdd(true) }}
      />

      {/* Mobile hero card */}
      {tab === "stock" && (
        <div className="mobile-hero-card mobile-only">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div className="mobile-hero-label">Total Inventory Value</div>
              <div className="mobile-hero-value">{fmtV(totalValue)}</div>
              <div className="mobile-hero-sub">{items.length} item{items.length !== 1 ? "s" : ""} tracked</div>
            </div>
            {alertItems.length > 0 && !alertDismissed && (
              <button
                onClick={() => setShowReminder(true)}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                <Bell size={12} />
                {alertItems.length} alert{alertItems.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 18 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, textTransform: "uppercase" }}>Low Stock</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: lowCount > 0 ? "#fde68a" : "rgba(255,255,255,0.9)" }}>{lowCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, textTransform: "uppercase" }}>Out of Stock</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: outCount > 0 ? "#fca5a5" : "rgba(255,255,255,0.9)" }}>{outCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, textTransform: "uppercase" }}>Categories</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "rgba(255,255,255,0.9)" }}>{CATEGORIES.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile tab bar */}
      <div className="mobile-tab-bar mobile-only">
        {([
          { id: "stock",  label: "Stock", icon: Package },
          { id: "retail", label: "Retail", icon: Tag },
        ] as { id: "stock" | "retail"; label: string; icon: React.ElementType }[]).map(t => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`mobile-tab-btn ${active ? "active" : ""}`}>
              <Icon size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 5 }} />
              {t.label}
              {t.id === "retail" && retailItems.length > 0 && (
                <span style={{ marginLeft: 5, background: active ? "rgba(255,255,255,0.25)" : "#7C3AED", color: "#fff", borderRadius: 20, fontSize: 9, fontWeight: 800, padding: "1px 6px" }}>
                  {retailItems.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile stock tab */}
      {tab === "stock" && (
        <div className="mobile-only">
          {/* Alert banner */}
          {alertItems.length > 0 && !alertDismissed && (
            <div className="mobile-alert-banner" style={{ background: outCount > 0 ? "#fef2f2" : "#fffbeb", border: `1px solid ${outCount > 0 ? "#fecaca" : "#fde68a"}`, color: outCount > 0 ? "#dc2626" : "#d97706" }}>
              <AlertTriangle size={16} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {outCount > 0 ? `${outCount} out of stock` : ""}{outCount > 0 && lowCount > 0 ? ", " : ""}{lowCount > 0 ? `${lowCount} running low` : ""}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, marginTop: 1, opacity: 0.8 }}>Tap bell to send restock reminder</div>
              </div>
              <button onClick={() => setShowReminder(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Bell size={15} color={outCount > 0 ? "#dc2626" : "#d97706"} />
              </button>
              <button onClick={() => setAlertDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={14} color={outCount > 0 ? "#dc2626" : "#d97706"} />
              </button>
            </div>
          )}

          {/* Search */}
          <div className="mobile-search-bar">
            <Search size={16} color="#9898b0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, brand, supplier…" />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                <X size={14} color="#9898b0" />
              </button>
            )}
          </div>

          {/* Category filter chips */}
          <div className="mobile-filter-row">
            <button type="button" className={`mobile-filter-chip ${catFilter === "all" ? "active" : ""}`} onClick={() => setCatFilter("all")}>All</button>
            {CATEGORIES.map(c => (
              <button key={c} type="button" className={`mobile-filter-chip ${catFilter === c ? "active" : ""}`} onClick={() => setCatFilter(c)}>
                {CATEGORY_CONFIG[c].label}
              </button>
            ))}
          </div>

          {/* Status filter chips */}
          <div className="mobile-filter-row" style={{ paddingTop: 0 }}>
            {(["all", "ok", "low", "out"] as const).map(s => (
              <button key={s} type="button" className={`mobile-filter-chip ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
                {s === "all" ? "All Status" : s === "ok" ? "In Stock" : s === "low" ? "Low Stock" : "Out of Stock"}
              </button>
            ))}
          </div>

          {/* Item list */}
          {filtered.length === 0 ? (
            <div className="mobile-empty">
              <div className="mobile-empty-icon"><Package size={26} color="#c8c8e0" /></div>
              <div className="mobile-empty-title">{items.length === 0 ? "No items yet" : "No items match"}</div>
              <div className="mobile-empty-sub">
                {items.length === 0
                  ? "Tap + Add to add your first inventory item."
                  : "Try adjusting your search or filters."}
              </div>
            </div>
          ) : (
            <div className="mobile-list">
              {filtered.map((item) => {
                const status = stockStatus(item);
                const badge  = STATUS_BADGE[status];
                const cat    = CATEGORY_CONFIG[item.category];
                const maxStock = Math.max(item.minStock * 3, item.currentStock, 1);
                const stockPct = Math.min(100, Math.round((item.currentStock / maxStock) * 100));
                const barColor = status === "out" ? "#dc2626" : status === "low" ? "#d97706" : "#059669";
                return (
                  <div key={item.id} className="mobile-list-card" onClick={() => setEditItem(item)}
                    style={status !== "ok" ? { borderLeft: `4px solid ${badge.color}`, background: status === "out" ? "#fff0f0" : "#fffbeb" } : {}}
                  >
                    <div className="mobile-list-icon" style={{ background: cat.bg }}>
                      <Package size={17} color={cat.color} />
                    </div>
                    <div className="mobile-list-body">
                      <div className="mobile-list-title">{item.name}</div>
                      <div className="mobile-list-sub">
                        {item.brand}{item.supplier ? ` · ${item.supplier}` : ""} · {fmt(item.costPrice)}
                      </div>
                      <div className="mobile-stock-bar-wrap">
                        <div className="mobile-stock-bar" style={{ width: `${stockPct}%`, background: barColor }} />
                      </div>
                    </div>
                    <div className="mobile-list-right">
                      <div className="mobile-list-amount" style={{ fontSize: 13, color: status === "out" ? "#dc2626" : status === "low" ? "#d97706" : "#1a1a2e" }}>
                        {item.currentStock} {item.unit}
                      </div>
                      <span className="mobile-badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Count footer */}
          {filtered.length > 0 && (
            <div style={{ padding: "12px 16px 8px", textAlign: "center" }}>
              <span style={{ fontSize: 11, color: "#b0b0c8", fontWeight: 600 }}>
                {filtered.length} of {items.length} items · {fmtV(filtered.reduce((s, i) => s + i.costPrice * i.currentStock, 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Mobile retail tab */}
      {tab === "retail" && (
        <div className="mobile-only">
          {/* Info banner */}
          <div className="mobile-alert-banner" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
            <Tag size={15} color="#d97706" />
            <div style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
              Items with a retail price appear in the POS catalog. Toggle to enable/disable.
            </div>
          </div>

          {/* Retail stats scroll */}
          <div className="mobile-stat-scroll">
            {[
              { label: "In POS",    value: String(retailItems.length), color: "#7C3AED" },
              { label: "Not Listed", value: String(items.filter(i => !(i.retailPrice ?? 0)).length), color: "#9898b0" },
              { label: "Low/Out",   value: String(retailItems.filter(i => i.currentStock <= i.minStock).length), color: "#dc2626" },
              { label: "Retail Value", value: fmtV(retailItems.reduce((s, i) => s + (i.retailPrice ?? 0) * i.currentStock, 0)), color: "#059669" },
            ].map(s => (
              <div key={s.label} className="mobile-stat-card">
                <div className="mobile-stat-card-label">{s.label}</div>
                <div className="mobile-stat-card-value" style={{ fontSize: s.value.length > 8 ? 13 : 18, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Retail list */}
          {items.length === 0 ? (
            <div className="mobile-empty">
              <div className="mobile-empty-icon"><Tag size={26} color="#c8c8e0" /></div>
              <div className="mobile-empty-title">No items yet</div>
              <div className="mobile-empty-sub">Add inventory items first, then enable them for POS retail.</div>
            </div>
          ) : (
            <div className="mobile-list">
              {items.map((item) => {
                const isRetail = (item.retailPrice ?? 0) > 0;
                const cat      = CATEGORY_CONFIG[item.category];
                const isLow    = item.currentStock <= item.minStock;
                const margin   = isRetail && item.costPrice ? Math.round(((item.retailPrice! - item.costPrice) / item.retailPrice!) * 100) : null;
                return (
                  <div key={item.id} className="mobile-list-card">
                    <div className="mobile-list-icon" style={{ background: cat.bg }}>
                      <Package size={17} color={cat.color} />
                    </div>
                    <div className="mobile-list-body">
                      <div className="mobile-list-title">{item.name}</div>
                      <div className="mobile-list-sub">
                        {item.brand} · {item.currentStock} {item.unit}{isLow ? " ⚠️" : ""}
                        {isRetail
                          ? ` · ${fmt(item.retailPrice!)}${margin !== null ? ` (${margin}%)` : ""}`
                          : " · Not listed"}
                      </div>
                    </div>
                    <div className="mobile-list-right" style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setEditItem(item)}
                        style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #e8e8f0", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      >
                        <Edit2 size={13} color="#9898b0" />
                      </button>
                      <button type="button" onClick={() => toggleRetail(item.id)} style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
                        {isRetail ? <ToggleRight size={28} color="#7C3AED" /> : <ToggleLeft size={28} color="#c8c8d8" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {items.length > 0 && (
            <div style={{ padding: "12px 16px 8px", textAlign: "center" }}>
              <span style={{ fontSize: 11, color: "#b0b0c8", fontWeight: 600 }}>
                {retailItems.length} of {items.length} items enabled for POS
              </span>
            </div>
          )}
        </div>
      )}

      {/* ══════════ DESKTOP LAYOUT ══════════ */}
      <div className="dash-page dashboard-polish desktop-only" style={{ background: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 20 }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 850, fontSize: 24, color: "#1a1a2e", letterSpacing: "-0.025em", display: "flex", alignItems: "center", gap: 10 }}>
              Inventory
              {tab === "stock" && alertItems.length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 750, background: outCount > 0 ? "#fef2f2" : "#fffbeb", color: outCount > 0 ? "#dc2626" : "#d97706", border: `1px solid ${outCount > 0 ? "#fecaca" : "#fed7aa"}`, borderRadius: 20, padding: "3px 10px", boxShadow: `0 2px 8px ${outCount > 0 ? "rgba(220,38,38,0.1)" : "rgba(217,119,6,0.1)"}` }}>
                  {alertItems.length} alert{alertItems.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#9898b0", marginTop: 4, fontWeight: 500 }}>
              {tab === "stock"
                ? `${items.length} items · ${fmtV(totalValue)} total value`
                : `${retailItems.length} products available in POS · ${items.filter(i => !(i.retailPrice ?? 0)).length} not listed`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {tab === "stock" && alertItems.length > 0 && (
              <button onClick={() => setShowReminder(true)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 12, border: "1px solid #fed7aa", background: "#fffbeb", fontSize: 13, fontWeight: 750, color: "#d97706", cursor: "pointer", transition: "all 0.15s" }}
                className="hover-bg-light"
              >
                <Bell size={14} /> Send Reminder
              </button>
            )}
            <button onClick={() => setShowAdd(true)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 12, border: "none", background: "var(--accent-gradient)", fontSize: 13, fontWeight: 750, color: "#fff", cursor: "pointer", boxShadow: "0 4px 14px var(--accent-glow)", transition: "all 0.18s ease" }}
              className="page-header-btn hover-scale"
            >
              <Plus size={16} /> {tab === "retail" ? "Add Product" : "Add Item"}
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, background: "#fff", border: "1px solid #e3e0eb", borderRadius: 14, padding: 5, width: "fit-content", boxShadow: "0 2px 8px rgba(0,0,0,0.01)" }}>
          {([
            { id: "stock",  label: "Stock Management", icon: Package },
            { id: "retail", label: "Retail Products",  icon: Tag },
          ] as { id: "stock" | "retail"; label: string; icon: React.ElementType }[]).map(t => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10, border: "none", background: active ? "var(--accent-gradient)" : "transparent", color: active ? "#fff" : "#6b6b8a", fontSize: 13, fontWeight: 750, cursor: "pointer", transition: "all 0.15s", boxShadow: active ? "0 3px 10px var(--accent-glow)" : "none" }}>
                <Icon size={14} />
                {t.label}
                {t.id === "retail" && retailItems.length > 0 && (
                  <span style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(124,58,237,0.1)", color: active ? "#fff" : "var(--accent)", borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "2px 8px", marginLeft: 4 }}>
                    {retailItems.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Retail Products Tab ── */}
        {tab === "retail" && (
          <>
            <div style={{ padding: "12px 18px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, fontSize: 13, color: "#92400e", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 8px rgba(217,119,6,0.05)" }}>
              <Tag size={16} color="#d97706" />
              Items with a <strong style={{ fontWeight: 800 }}>retail price</strong> appear in the POS catalog for sale. Toggle the switch to enable/disable an item for POS retail.
            </div>

            <div className="stats-grid-4">
              {[
                { label: "Listed in POS",   value: retailItems.length,  iconColor: "var(--accent)", bg: "rgba(124, 58, 237, 0.08)" },
                { label: "Not Listed",      value: items.filter(i => !(i.retailPrice ?? 0)).length, iconColor: "#6b6b8a", bg: "#f4f4f8" },
                { label: "Low/Out Stock",   value: retailItems.filter(i => i.currentStock <= i.minStock).length, iconColor: "#dc2626", bg: "#fef2f2" },
                { label: "Retail Value",    value: fmtV(retailItems.reduce((s, i) => s + (i.retailPrice ?? 0) * i.currentStock, 0)), iconColor: "#059669", bg: "#ecfdf5" },
              ].map(({ label, value, iconColor, bg }) => (
                <div key={label} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(226,223,235,0.8)", padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Tag size={22} color={iconColor} />
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 850, color: iconColor, lineHeight: 1.1 }}>{value}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="table-scroll-wrap" style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(226,223,235,.95)", boxShadow: "0 8px 28px rgba(38,25,75,.04)", overflow: "hidden" }}>
              <div className="table-scroll-inner">
                <div className="inv-table-inner" style={{ background: "#fff" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 90px 110px 120px 110px 100px", padding: "12px 20px", background: "#faf9fd", borderBottom: "1px solid #f0f0f5", alignItems: "center" }}>
                    {["PRODUCT", "CATEGORY", "STOCK", "COST PRICE", "RETAIL PRICE", "MARGIN", "IN POS"].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#8e89a3", letterSpacing: "0.08em" }}>{h}</div>
                    ))}
                  </div>

                  {items.length === 0 ? (
                    <div style={{ padding: "56px 20px", textAlign: "center" }}>
                      <Package size={32} color="#e0e0f0" style={{ marginBottom: 12 }} />
                      <div style={{ fontSize: 14, color: "#b0b0c8", fontWeight: 600 }}>No items in inventory yet</div>
                      <div style={{ fontSize: 12, color: "#c8c8d8", marginTop: 4 }}>Add items first, then enable them for POS retail</div>
                    </div>
                  ) : (
                    items.map((item, i) => {
                      const isRetail = (item.retailPrice ?? 0) > 0;
                      const margin   = isRetail && item.costPrice ? Math.round(((item.retailPrice! - item.costPrice) / item.retailPrice!) * 100) : null;
                      const isLow    = item.currentStock <= item.minStock;
                      const cat      = CATEGORY_CONFIG[item.category];
                      return (
                        <div key={item.id}
                          className="hover-bg-row"
                          style={{ display: "grid", gridTemplateColumns: "1fr 110px 90px 110px 120px 110px 100px", padding: "14px 20px", borderBottom: i < items.length - 1 ? "1px solid #f8f8fc" : "none", alignItems: "center", background: isRetail ? "#fafffe" : "transparent", transition: "background 0.2s" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                              <Package size={17} color={cat.color} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 750, color: "#1a1a2e", letterSpacing: "-0.01em" }}>{item.brand ? `${item.brand} ` : ""}{item.name}</div>
                              <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2, fontWeight: 500 }}>{item.unit}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 750, color: cat.color, background: cat.bg, borderRadius: 10, padding: "2px 8px", width: "fit-content", textTransform: "uppercase", letterSpacing: "0.03em" }}>{cat.label}</span>
                          <div style={{ fontSize: 13, fontWeight: 750, color: isLow ? "#dc2626" : "#1a1a2e" }}>
                            {item.currentStock} {item.unit}
                            {isLow && <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 800, marginTop: 2 }}>Low</div>}
                          </div>
                          <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>{item.costPrice ? fmt(item.costPrice) : "—"}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: isRetail ? "var(--accent)" : "#c8c8d8" }}>
                            {isRetail ? fmt(item.retailPrice!) : <span style={{ fontSize: 11, color: "#c8c8d8", fontWeight: 600 }}>Not set</span>}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 750, color: margin !== null && margin > 0 ? "#059669" : "#c8c8d8" }}>
                            {margin !== null ? `${margin}%` : "—"}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button onClick={() => toggleRetail(item.id)} title={isRetail ? "Remove from POS" : "Enable in POS"}
                              style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", transition: "transform 0.15s" }}
                              className="hover-scale"
                            >
                              {isRetail
                                ? <ToggleRight size={30} color="var(--accent)" />
                                : <ToggleLeft  size={30} color="#c8c8d8" />}
                            </button>
                            <button onClick={() => setEditItem(item)}
                              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e3e0eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
                              className="hover-bg-light"
                            >
                              <Edit2 size={13} color="#9898b0" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {items.length > 0 && (
                    <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f5", background: "#faf9fd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#9898b0", fontWeight: 600 }}>{retailItems.length} of {items.length} items enabled for POS</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)" }}>Retail value: {fmtV(retailItems.reduce((s, i) => s + (i.retailPrice ?? 0) * i.currentStock, 0))}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Stock Management Tab ── */}
        {tab === "stock" && <>
          <div className="stats-grid-4">
            {[
              { label: "Total Items",  value: items.length,     icon: Package,       iconColor: "var(--accent)", bg: "rgba(124, 58, 237, 0.08)", valColor: "var(--accent)" },
              { label: "Total Value",  value: fmtV(totalValue), icon: DollarSign,    iconColor: "#059669", bg: "#ecfdf5", valColor: "#059669", small: true },
              { label: "Low Stock",    value: lowCount,         icon: TrendingDown,  iconColor: "#d97706", bg: "#fffbeb", valColor: "#d97706" },
              { label: "Out of Stock", value: outCount,         icon: AlertTriangle, iconColor: "#dc2626", bg: "#fef2f2", valColor: "#dc2626" },
            ].map(({ label, value, icon: Icon, iconColor, bg, valColor, small }) => (
              <div key={label} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(226,223,235,0.8)", padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={22} color={iconColor} />
                </div>
                <div>
                  <div style={{ fontSize: small ? 18 : 24, fontWeight: 850, color: valColor, lineHeight: 1.1 }}>{value}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {alertItems.length > 0 && !alertDismissed && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #fed7aa", boxShadow: "0 8px 24px rgba(217,119,6,0.06)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "linear-gradient(135deg, #fffbeb, #fff7ed)", borderBottom: "1px solid #fed7aa" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(217,119,6,0.15)" }}>
                    <Bell size={18} color="#d97706" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.01em" }}>
                      Stock Alert — {outCount > 0 ? `${outCount} out of stock` : ""}{outCount > 0 && lowCount > 0 ? ", " : ""}{lowCount > 0 ? `${lowCount} running low` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: "#92400e", marginTop: 2, fontWeight: 500 }}>Restock these items to avoid service disruptions</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowReminder(true)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", background: "#25D366", fontSize: 13, fontWeight: 750, color: "#fff", cursor: "pointer", boxShadow: "0 4px 12px rgba(37,211,102,0.2)", transition: "transform 0.15s" }}
                    className="hover-scale"
                  >
                    <MessageCircle size={14} /> WhatsApp Reminder
                  </button>
                  <button
                    onClick={() => setAlertDismissed(true)}
                    style={{ background: "rgba(255,255,255,0.5)", border: "1px solid #fed7aa", borderRadius: 10, cursor: "pointer", padding: "8px", display: "flex", alignItems: "center", color: "#92400e", transition: "background 0.15s" }}
                    className="hover-bg-light"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="stats-grid-3" style={{ gap: 0 }}>
                {alertItems.slice(0, 6).map((item, i) => {
                  const st = stockStatus(item);
                  return (
                    <div
                      key={item.id}
                      style={{ padding: "14px 20px", borderRight: (i + 1) % 3 !== 0 ? "1px solid #fef3c7" : "none", borderBottom: i < 3 && alertItems.length > 3 ? "1px solid #fef3c7" : "none", display: "flex", alignItems: "center", gap: 12, transition: "background 0.15s" }}
                      className="hover-bg-light"
                    >
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: st === "out" ? "#dc2626" : "#d97706", flexShrink: 0, boxShadow: `0 0 0 3px ${st === "out" ? "#fef2f2" : "#fffbeb"}` }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2, fontWeight: 600 }}>{item.currentStock}/{item.minStock} {item.unit}</div>
                      </div>
                      <button onClick={() => setEditItem(item)} style={{ fontSize: 11, fontWeight: 750, color: "var(--accent)", background: "rgba(124, 58, 237, 0.06)", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s" }}>
                        Restock
                      </button>
                    </div>
                  );
                })}
              </div>
              {alertItems.length > 6 && (
                <div style={{ padding: "12px 20px", borderTop: "1px solid #fef3c7", fontSize: 13, color: "#92400e", textAlign: "center", fontWeight: 600 }}>
                  +{alertItems.length - 6} more items need attention —{" "}
                  <button onClick={() => setStatusFilter("low")} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 800, fontSize: 13, cursor: "pointer", padding: 0 }}>View all</button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e3e0eb", borderRadius: 12, padding: "10px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.01)", transition: "border-color 0.15s" }}>
              <Search size={15} color="#b0b0c8" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, brand, or supplier…"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#1a1a2e", background: "transparent" }}
              />
              {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}><X size={14} color="#b0b0c8" /></button>}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 12, border: `1px solid ${activeFilters > 0 ? "var(--accent-light)" : "#e3e0eb"}`, background: activeFilters > 0 ? "rgba(124, 58, 237, 0.04)" : "#fff", fontSize: 13, fontWeight: 750, color: activeFilters > 0 ? "var(--accent)" : "#6b6b8a", cursor: "pointer", transition: "all 0.15s" }}
              className="hover-bg-light"
            >
              Filters
              {activeFilters > 0 && (
                <span style={{ background: "var(--accent-gradient)", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px var(--accent-glow)" }}>
                  {activeFilters}
                </span>
              )}
              <ChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
          </div>

          {showFilters && (
            <div style={{ background: "#fff", border: "1px solid rgba(226,223,235,.95)", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end", boxShadow: "0 8px 24px rgba(38,25,75,.03)" }}>
              {[
                {
                  label: "Category", value: catFilter,
                  onChange: (v: string) => setCatFilter(v as InventoryCategory | "all"),
                  options: [["all", "All Categories"], ...CATEGORIES.map((c) => [c, CATEGORY_CONFIG[c].label])] as [string, string][],
                },
                {
                  label: "Stock Status", value: statusFilter,
                  onChange: (v: string) => setStatusFilter(v as "all" | "low" | "out" | "ok"),
                  options: [["all", "All"], ["ok", "In Stock"], ["low", "Low Stock"], ["out", "Out of Stock"]] as [string, string][],
                },
              ].map(({ label, value, onChange, options }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
                  <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e3e0eb", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff", cursor: "pointer" }}>
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              {activeFilters > 0 && (
                <button onClick={() => { setCatFilter("all"); setStatusFilter("all"); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 12, fontWeight: 700, color: "#dc2626", cursor: "pointer", transition: "all 0.15s" }}>
                  Clear all
                </button>
              )}
            </div>
          )}

          <div className="table-scroll-wrap" style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(226,223,235,.95)", boxShadow: "0 8px 28px rgba(38,25,75,.04)", overflow: "hidden" }}>
            <div className="table-scroll-inner">
              <div className="inv-table-inner" style={{ background: "#fff" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2.2fr 110px 130px 100px 130px 110px 90px", padding: "12px 20px", borderBottom: "1px solid #f0f0f5", background: "#faf9fd", alignItems: "center" }}>
                  {["ITEM", "CATEGORY", "STOCK", "RESTOCKED", "COST PRICE", "STATUS", "ACTIONS"].map((h) => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#8e89a3", letterSpacing: "0.08em" }}>{h}</div>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <div style={{ padding: "56px 20px", textAlign: "center" }}>
                    <Package size={32} color="#e0e0f0" style={{ marginBottom: 12 }} />
                    <div style={{ fontSize: 14, color: "#b0b0c8", fontWeight: 600 }}>No items match your filters</div>
                    <div style={{ fontSize: 12, color: "#c8c8d8", marginTop: 4 }}>Try adjusting your search or filter</div>
                  </div>
                ) : (
                  filtered.map((item, i) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      isLast={i === filtered.length - 1}
                      onEdit={() => setEditItem(item)}
                      onDelete={() => setDeleteItem(item)}
                    />
                  ))
                )}

                {filtered.length > 0 && (
                  <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f5", background: "#faf9fd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "#9898b0", fontWeight: 600 }}>
                      Showing {filtered.length} of {items.length} items
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)" }}>
                      Total value: {fmtV(filtered.reduce((s, i) => s + i.costPrice * i.currentStock, 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>}
      </div>{/* /desktop-only */}
    </div>
  );
}
