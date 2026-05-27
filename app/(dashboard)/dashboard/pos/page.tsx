"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search, Scissors, Package, Plus, Minus, Trash2, Phone,
  X, ShoppingCart, ReceiptText, Banknote, CreditCard,
  Smartphone, Zap, Tag, UserPlus, CheckCircle2, Printer,
  MessageSquare, RefreshCw, ArrowRight, User, Users,
} from "lucide-react";
import SalonInvoicePrint from "@/components/salon-invoice-print";
import {
  getStoredServices, getStoredClients, getStoredInventory,
  getStoredStaff, saveClients, saveInventory,
} from "@/lib/storage";
import {
  createSalonInvoice, calcTotals,
  type SalonInvoice, type SalonInvoiceItem,
} from "@/lib/salon-invoices";
import { settingsStore } from "@/lib/settings-store";
import { normalizePhone, appendLog } from "@/lib/whatsapp-scheduler";
import type { Service, Client, InventoryItem, Staff, PaymentMethod } from "@/lib/types";

// ─── Types ─────────────────────────────────────────────────────────────────

type CatalogTab = "all" | "services" | "products";
type DiscountType = "flat" | "pct";

interface CatalogItem {
  id: string;
  type: "service" | "product";
  name: string;
  price: number;
  category: string;
  stock?: number;
  unit?: string;
}

interface CartEntry {
  cartId: string;
  itemId: string;
  type: "service" | "product";
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PAY_METHODS: { value: PaymentMethod; label: string; icon: React.ElementType; color: string }[] = [
  { value: "cash",      label: "Cash",      icon: Banknote,   color: "#059669" },
  { value: "jazzcash",  label: "JazzCash",  icon: Smartphone, color: "#7C3AED" },
  { value: "easypaisa", label: "EasyPaisa", icon: Smartphone, color: "#059669" },
  { value: "raast",     label: "Raast",     icon: Zap,        color: "#0284c7" },
  { value: "card",      label: "Card",      icon: CreditCard, color: "#475569" },
  { value: "bank",      label: "Bank",      icon: CreditCard, color: "#0369a1" },
];

const CAT_COLORS: Record<string, string> = {
  hair: "#7C3AED", skin: "#0284c7", nails: "#ec4899",
  bridal: "#d97706", other: "#6b7280",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function pkr(n: number) {
  return "PKR " + Math.round(n).toLocaleString("en-PK");
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width: "100%", height: 38, padding: "0 12px",
  borderRadius: 9, border: "1px solid #e4e4ee",
  fontSize: 13, color: "#1d1d2f", outline: "none",
  background: "#fff", boxSizing: "border-box",
};

function PanelHead({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f8", background: "#fafafd", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#7c7c9a", textTransform: "uppercase", letterSpacing: "0.08em" }}>{children}</div>
      {right}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function POSPage() {

  // ── Data ──────────────────────────────────────────────────────────────────
  const [services,  setServices]  = useState<Service[]>([]);
  const [clients,   setClients]   = useState<Client[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [staff,     setStaff]     = useState<Staff[]>([]);

  useEffect(() => {
    setServices(getStoredServices().filter(s => s.isActive));
    setClients(getStoredClients());
    setInventory(getStoredInventory());
    setStaff(getStoredStaff().filter(s => s.isActive));
  }, []);

  // ── Customer ──────────────────────────────────────────────────────────────
  const [clientQ,          setClientQ]          = useState("");
  const [showDrop,         setShowDrop]          = useState(false);
  const [selectedClient,   setSelectedClient]    = useState<Client | null>(null);
  const [showNewForm,      setShowNewForm]        = useState(false);
  const [newName,          setNewName]            = useState("");
  const [newPhone,         setNewPhone]           = useState("");
  const [selectedStaffId,  setSelectedStaffId]   = useState("");
  const [saleNotes,        setSaleNotes]          = useState("");

  // ── Catalog ───────────────────────────────────────────────────────────────
  const [catalogTab,    setCatalogTab]    = useState<CatalogTab>("all");
  const [catalogSearch, setCatalogSearch] = useState("");

  // ── Cart ──────────────────────────────────────────────────────────────────
  const [cart,         setCart]         = useState<CartEntry[]>([]);
  const [discount,     setDiscount]     = useState<number>(0);
  const [discType,     setDiscType]     = useState<DiscountType>("flat");
  const [payMethod,    setPayMethod]    = useState<PaymentMethod>("cash");

  // ── Flow ──────────────────────────────────────────────────────────────────
  const [completing,   setCompleting]   = useState(false);
  const [printInvoice, setPrintInvoice] = useState<SalonInvoice | null>(null);
  const [completed,    setCompleted]    = useState(false);
  const [lastInvoice,  setLastInvoice]  = useState<SalonInvoice | null>(null);
  const [waStatus,     setWaStatus]     = useState<"idle" | "sent" | "failed">("idle");

  // ── Derived catalog items ─────────────────────────────────────────────────
  const catalogItems = useMemo<CatalogItem[]>(() => {
    const q = catalogSearch.toLowerCase();
    const svc: CatalogItem[] = (catalogTab !== "products" ? services : [])
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .map(s => ({ id: s.id, type: "service", name: s.name, price: s.price, category: s.category }));
    const prod: CatalogItem[] = (catalogTab !== "services" ? inventory : [])
      .filter(i => (i.retailPrice ?? 0) > 0)
      .filter(i => !q || i.name.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q))
      .map(i => ({ id: i.id, type: "product", name: `${i.brand ? i.brand + " " : ""}${i.name}`, price: i.retailPrice!, category: i.category, stock: i.currentStock, unit: i.unit }));
    return [...svc, ...prod];
  }, [services, inventory, catalogTab, catalogSearch]);

  // ── Client dropdown ───────────────────────────────────────────────────────
  const dropClients = useMemo(() => {
    const q = clientQ.toLowerCase();
    return q
      ? clients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 8)
      : clients.slice(0, 8);
  }, [clients, clientQ]);

  // ── Totals ────────────────────────────────────────────────────────────────
  const cartLineItems: SalonInvoiceItem[] = cart.map(e => ({
    id: e.cartId, type: e.type, description: e.name,
    qty: e.qty, unitPrice: e.unitPrice, total: e.total,
  }));
  const rawSubtotal    = cartLineItems.reduce((s, i) => s + i.total, 0);
  const discountAmount = discType === "pct" ? Math.round(rawSubtotal * discount / 100) : discount;
  const { subtotal, taxAmount, total } = calcTotals(cartLineItems, discountAmount);

  // ── Cart ops ──────────────────────────────────────────────────────────────
  function addToCart(item: CatalogItem) {
    setCart(prev => {
      const hit = prev.find(e => e.itemId === item.id);
      if (hit) {
        return prev.map(e => e.itemId === item.id
          ? { ...e, qty: e.qty + 1, total: (e.qty + 1) * e.unitPrice } : e);
      }
      return [...prev, {
        cartId: crypto.randomUUID(), itemId: item.id,
        type: item.type, name: item.name,
        qty: 1, unitPrice: item.price, total: item.price,
      }];
    });
  }

  function updateQty(cartId: string, delta: number) {
    setCart(prev => prev.map(e => e.cartId === cartId
      ? { ...e, qty: Math.max(1, e.qty + delta), total: Math.max(1, e.qty + delta) * e.unitPrice }
      : e));
  }

  function removeEntry(cartId: string) {
    setCart(prev => prev.filter(e => e.cartId !== cartId));
  }

  // ── Quick-add client ──────────────────────────────────────────────────────
  function quickAddClient() {
    if (!newName.trim()) return;
    const c: Client = {
      id: "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: newName.trim(), phone: newPhone.trim(),
      tags: [], source: "walk-in",
      createdAt: new Date().toISOString().slice(0, 10),
      totalVisits: 0, totalSpend: 0,
    };
    const updated = [c, ...clients];
    setClients(updated);
    saveClients(updated);
    setSelectedClient(c);
    setShowNewForm(false);
    setNewName(""); setNewPhone("");
  }

  // ── New sale reset ────────────────────────────────────────────────────────
  function startNewSale() {
    setCart([]); setDiscount(0); setSaleNotes(""); setPayMethod("cash");
    setSelectedClient(null); setClientQ(""); setSelectedStaffId("");
    setCompleted(false); setLastInvoice(null); setWaStatus("idle");
  }

  // ── Complete sale ─────────────────────────────────────────────────────────
  async function completeSale() {
    if (cart.length === 0 || completing) return;
    setCompleting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const staffMember = staff.find(s => s.id === selectedStaffId);

      // 1. Create invoice
      const invoice = createSalonInvoice({
        clientId:      selectedClient?.id || undefined,
        clientName:    selectedClient?.name || "Walk-in Customer",
        clientPhone:   selectedClient?.phone || "",
        clientEmail:   selectedClient?.email,
        staffName:     staffMember?.name || "",
        items:         cartLineItems,
        subtotal, discountAmount, taxAmount, total,
        paymentMethod: payMethod,
        date: today, status: "paid",
        notes: saleNotes.trim(),
      });

      // 2. Deduct inventory for products sold
      const soldProducts = cart.filter(e => e.type === "product");
      if (soldProducts.length > 0) {
        const updated = inventory.map(item => {
          const sold = soldProducts.find(e => e.itemId === item.id);
          return sold ? { ...item, currentStock: Math.max(0, item.currentStock - sold.qty) } : item;
        });
        setInventory(updated);
        saveInventory(updated);
      }

      // 3. Update client stats
      if (selectedClient?.id) {
        const updated = clients.map(c => c.id === selectedClient.id
          ? { ...c, totalVisits: c.totalVisits + 1, totalSpend: c.totalSpend + total, lastVisitDate: today }
          : c);
        setClients(updated);
        saveClients(updated);
      }

      // 4. Open print modal
      setLastInvoice(invoice);
      setPrintInvoice(invoice);
      setCompleted(true);

      // 5. Send WhatsApp
      await sendReceiptWA(invoice, selectedClient);

    } finally {
      setCompleting(false);
    }
  }

  // ── WhatsApp receipt ──────────────────────────────────────────────────────
  async function sendReceiptWA(invoice: SalonInvoice, client: Client | null) {
    if (!client?.phone) { setWaStatus("idle"); return; }

    const bs = settingsStore.botsailor as {
      apiToken: string; phoneNumberId: string;
      autoFollowup: boolean; followupTemplateId: string;
    };
    const salonName = (settingsStore.salon as { name: string }).name;
    const serviceList = invoice.items.filter(i => i.type === "service").map(i => i.description).join(", ") || invoice.items[0]?.description || "your service";
    const phone = normalizePhone(client.phone);

    // Try BotSailor API
    if (bs.apiToken && bs.phoneNumberId && bs.followupTemplateId) {
      try {
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiToken: bs.apiToken, phoneNumberId: bs.phoneNumberId,
            templateId: bs.followupTemplateId, phone,
            variables: { name: client.name, service: serviceList, salon_name: salonName },
          }),
        });
        const data = await res.json() as { ok: boolean; status: number };
        const ok = data.ok && data.status !== 401 && data.status !== 422 && data.status !== 400;
        appendLog({ type: "followup", clientName: client.name, phone, status: ok ? "sent" : "failed", templateId: bs.followupTemplateId });
        setWaStatus(ok ? "sent" : "failed");
        return;
      } catch { /* fall through */ }
    }

    // Fallback: build receipt and open WA web
    const wa = settingsStore.whatsapp as Record<string, string>;
    const tpl = wa.followup || "";
    const msg = tpl
      ? tpl.replace(/\{\{name\}\}/g, client.name).replace(/\{\{service\}\}/g, serviceList).replace(/\{\{salon_name\}\}/g, salonName)
      : `Hi ${client.name}! 🧾 Thanks for visiting *${salonName}*.\n\n` +
        `*Receipt ${invoice.number}*\n` +
        invoice.items.map(i => `• ${i.description} ×${i.qty} — ${pkr(i.total)}`).join("\n") +
        (invoice.discountAmount > 0 ? `\n• Discount — −${pkr(invoice.discountAmount)}` : "") +
        `\n\n*Total: ${pkr(invoice.total)}*\n\nSee you again soon! 💜`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    setWaStatus("sent");
  }

  // ── Salon settings ────────────────────────────────────────────────────────
  const salon = settingsStore.salon as { name: string; phone: string; email: string; address: string };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", background: "#f0f1f5", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Top bar ── */}
      <div style={{ padding: "16px 24px 14px", background: "#fff", borderBottom: "1px solid #ebebf5", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#1d1d2f", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#5B21B6,#9333EA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ReceiptText size={17} color="#fff" />
            </div>
            Point of Sale
          </h1>
          <p style={{ margin: "3px 0 0 43px", fontSize: 11, color: "#9393aa" }}>
            {new Date().toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {completed && (
            <button type="button" onClick={startNewSale}
              style={{ display: "flex", alignItems: "center", gap: 7, border: "none", borderRadius: 10, padding: "9px 20px", background: "linear-gradient(135deg,#5B21B6,#9333EA)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 3px 12px rgba(91,33,182,0.35)" }}>
              <Plus size={15} /> New Sale
            </button>
          )}
        </div>
      </div>

      {/* ── Sale complete banner ── */}
      {completed && lastInvoice && (
        <div style={{ padding: "12px 24px", background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", borderBottom: "1px solid #bbf7d0", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CheckCircle2 size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#065f46" }}>
              Sale Complete — {lastInvoice.number}
            </div>
            <div style={{ fontSize: 12, color: "#059669", marginTop: 2 }}>
              {pkr(lastInvoice.total)} · {lastInvoice.clientName}
              {waStatus === "sent" && <span style={{ marginLeft: 10, color: "#059669" }}>· ✓ WhatsApp sent</span>}
              {waStatus === "failed" && <span style={{ marginLeft: 10, color: "#d97706" }}>· WhatsApp not sent</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setPrintInvoice(lastInvoice)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "1px solid #059669", background: "#fff", color: "#059669", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              <Printer size={13} /> Print
            </button>
            {selectedClient?.phone && (
              <button type="button" onClick={() => sendReceiptWA(lastInvoice, selectedClient)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "1px solid #25d366", background: "#fff", color: "#25d366", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <MessageSquare size={13} /> Resend WhatsApp
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 3-panel body ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 320px", gap: 0, overflow: "hidden", margin: "14px 20px 14px" }}>

        {/* ══ PANEL 1: Customer ══ */}
        <div style={{ background: "#fff", borderRadius: "14px 0 0 14px", border: "1px solid #e8e8f0", borderRight: "none", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <PanelHead>Customer</PanelHead>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
            {!selectedClient ? (
              <>
                {/* Client search */}
                <div style={{ position: "relative" }}>
                  <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9999b0", pointerEvents: "none" }} />
                  <input
                    value={clientQ}
                    onChange={e => { setClientQ(e.target.value); setShowDrop(true); }}
                    onFocus={() => setShowDrop(true)}
                    onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                    placeholder="Search client…"
                    style={{ ...inp, paddingLeft: 32 }}
                  />
                  {showDrop && dropClients.length > 0 && (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e8e8f0", borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.10)", zIndex: 99, overflow: "hidden", maxHeight: 240, overflowY: "auto" }}>
                      {dropClients.map(c => (
                        <button key={c.id} type="button"
                          onMouseDown={() => { setSelectedClient(c); setClientQ(""); setShowDrop(false); }}
                          style={{ width: "100%", padding: "9px 12px", border: "none", background: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #f8f8fc" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#f5f4ff")}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        >
                          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#5B21B6,#9333EA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                            {c.name[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#1d1d2f" }}>{c.name}</div>
                            <div style={{ fontSize: 10, color: "#9999b0" }}>{c.phone || "No phone"}</div>
                          </div>
                          {c.totalVisits > 0 && (
                            <span style={{ fontSize: 9, fontWeight: 800, background: "#ede9fe", color: "#7C3AED", borderRadius: 20, padding: "1px 6px" }}>{c.totalVisits}x</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <button type="button"
                    onClick={() => setSelectedClient({ id: "", name: "Walk-in Customer", phone: "", tags: [], source: "walk-in", createdAt: "", totalVisits: 0, totalSpend: 0 })}
                    style={{ padding: "9px 0", borderRadius: 9, border: "1px dashed #d1d5db", background: "#fafafd", fontSize: 11, fontWeight: 700, color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <User size={12} /> Walk-in
                  </button>
                  <button type="button" onClick={() => setShowNewForm(v => !v)}
                    style={{ padding: "9px 0", borderRadius: 9, border: "1px solid #c4b5fd", background: "#faf8ff", fontSize: 11, fontWeight: 700, color: "#7C3AED", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <UserPlus size={12} /> New
                  </button>
                </div>

                {/* New client mini-form */}
                {showNewForm && (
                  <div style={{ padding: 12, border: "1px solid #ede9fe", borderRadius: 12, background: "#faf8ff", display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#7C3AED", marginBottom: 2 }}>Quick Add Client</div>
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name *" style={{ ...inp, height: 34 }} />
                    <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Phone (for WhatsApp)" style={{ ...inp, height: 34 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" onClick={() => setShowNewForm(false)} style={{ flex: 1, height: 32, borderRadius: 8, border: "1px solid #e8e8f0", background: "#fff", fontSize: 11, color: "#9999b0", cursor: "pointer" }}>Cancel</button>
                      <button type="button" onClick={quickAddClient} disabled={!newName.trim()}
                        style={{ flex: 2, height: 32, borderRadius: 8, border: "none", background: newName.trim() ? "#7C3AED" : "#e8e8f0", color: newName.trim() ? "#fff" : "#aaaabc", fontSize: 11, fontWeight: 700, cursor: newName.trim() ? "pointer" : "not-allowed" }}>
                        Add Client
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Selected client card */
              <div style={{ padding: 14, border: "1.5px solid #c4b5fd", borderRadius: 13, background: "#faf8ff", position: "relative" }}>
                <button type="button" onClick={() => setSelectedClient(null)}
                  style={{ position: "absolute", top: 9, right: 9, border: "none", background: "#ede9fe", borderRadius: 6, cursor: "pointer", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={12} color="#7C3AED" />
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#5B21B6,#9333EA)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff", flexShrink: 0, boxShadow: "0 2px 8px rgba(91,33,182,0.3)" }}>
                    {(selectedClient.name[0] || "W").toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1d1d2f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedClient.name}</div>
                    {selectedClient.phone
                      ? <div style={{ fontSize: 11, color: "#9999b0", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}><Phone size={10} />{selectedClient.phone}</div>
                      : <div style={{ fontSize: 10, color: "#c8c8d8", marginTop: 1 }}>No phone</div>
                    }
                  </div>
                </div>
                {selectedClient.id && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <div style={{ padding: "7px", borderRadius: 9, background: "rgba(124,58,237,0.07)", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#7C3AED" }}>{selectedClient.totalVisits}</div>
                      <div style={{ fontSize: 10, color: "#9999b0" }}>Visits</div>
                    </div>
                    <div style={{ padding: "7px", borderRadius: 9, background: "rgba(5,150,105,0.07)", textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#059669" }}>
                        {selectedClient.totalSpend >= 1000 ? `${(selectedClient.totalSpend / 1000).toFixed(1)}k` : selectedClient.totalSpend}
                      </div>
                      <div style={{ fontSize: 10, color: "#9999b0" }}>PKR spent</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ height: 1, background: "#f0f0f8", flexShrink: 0 }} />

            {/* Staff */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#7c7c9a", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Staff</label>
              <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} style={{ ...inp }}>
                <option value="">Any staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#7c7c9a", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Notes</label>
              <textarea value={saleNotes} onChange={e => setSaleNotes(e.target.value)} rows={3}
                placeholder="Special instructions…"
                style={{ ...inp, height: "auto", padding: "9px 12px", resize: "vertical", lineHeight: 1.5, fontSize: 12 }} />
            </div>
          </div>
        </div>

        {/* ══ PANEL 2: Catalog ══ */}
        <div style={{ background: "#fff", border: "1px solid #e8e8f0", display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "none", borderRight: "none" }}>
          {/* Catalog header */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f8", background: "#fafafd", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9999b0", pointerEvents: "none" }} />
              <input value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)}
                placeholder="Search services & products…"
                style={{ ...inp, paddingLeft: 30, height: 36 }} />
              {catalogSearch && (
                <button type="button" onClick={() => setCatalogSearch("")}
                  style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", padding: 2 }}>
                  <X size={12} color="#9999b0" />
                </button>
              )}
            </div>
            {/* Tab switcher */}
            <div style={{ display: "flex", gap: 2, background: "#ececf4", borderRadius: 9, padding: "3px", flexShrink: 0 }}>
              {(["all", "services", "products"] as CatalogTab[]).map(t => (
                <button key={t} type="button" onClick={() => setCatalogTab(t)}
                  style={{ border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: catalogTab === t ? "#fff" : "transparent", color: catalogTab === t ? "#1d1d2f" : "#9999b0", boxShadow: catalogTab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none", textTransform: "capitalize", transition: "all 0.12s" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {catalogItems.length === 0 ? (
              <div style={{ padding: "60px 0", textAlign: "center" }}>
                <Package size={36} color="#e0e0f0" style={{ display: "block", margin: "0 auto 14px" }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "#b0b0c8" }}>No items found</div>
                <div style={{ fontSize: 12, color: "#c8c8d8", marginTop: 5, lineHeight: 1.6 }}>
                  {catalogTab === "products"
                    ? "Add retail prices to inventory items to sell them here"
                    : "Add services in the Services section to display them here"}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                {catalogItems.map(item => {
                  const inCart = cart.find(e => e.itemId === item.id);
                  const color = item.type === "service" ? (CAT_COLORS[item.category] || "#7C3AED") : "#d97706";
                  const outOfStock = item.type === "product" && (item.stock ?? 999) === 0;
                  return (
                    <button key={item.id} type="button"
                      onClick={() => !outOfStock && addToCart(item)}
                      disabled={outOfStock}
                      style={{
                        textAlign: "left", border: `1.5px solid ${inCart ? color + "55" : "#e8e8f0"}`,
                        borderRadius: 12, padding: "13px", background: inCart ? color + "07" : "#fff",
                        cursor: outOfStock ? "not-allowed" : "pointer", opacity: outOfStock ? 0.5 : 1,
                        transition: "all 0.12s", position: "relative",
                      }}
                      onMouseEnter={e => { if (!outOfStock) e.currentTarget.style.borderColor = color + "80"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = inCart ? color + "55" : "#e8e8f0"; }}
                    >
                      {/* In-cart badge */}
                      {inCart && (
                        <div style={{ position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fff" }}>
                          {inCart.qty}
                        </div>
                      )}
                      {/* Icon */}
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                        {item.type === "service" ? <Scissors size={15} color={color} /> : <Package size={15} color={color} />}
                      </div>
                      {/* Name */}
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#1d1d2f", marginBottom: 3, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {item.name}
                      </div>
                      {/* Price */}
                      <div style={{ fontSize: 14, fontWeight: 900, color: color, marginBottom: 4 }}>{pkr(item.price)}</div>
                      {/* Stock / category badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", padding: "2px 7px", borderRadius: 20, background: color + "10", fontSize: 9, fontWeight: 700, color: color, letterSpacing: "0.04em" }}>
                          {item.type === "service" ? item.category : "product"}
                        </span>
                        {item.type === "product" && item.stock !== undefined && (
                          <span style={{ fontSize: 9, color: item.stock <= 3 ? "#dc2626" : "#9999b0", fontWeight: 600 }}>
                            {item.stock === 0 ? "Out of stock" : `${item.stock} ${item.unit || "left"}`}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══ PANEL 3: Cart ══ */}
        <div style={{ background: "#fff", borderRadius: "0 14px 14px 0", border: "1px solid #e8e8f0", borderLeft: "none", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <PanelHead
            right={cart.length > 0
              ? <button type="button" onClick={() => setCart([])}
                  style={{ border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#dc2626" }}>
                  <Trash2 size={11} /> Clear
                </button>
              : undefined
            }
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <ShoppingCart size={13} color="#7C3AED" />
              Cart
              {cart.length > 0 && (
                <span style={{ background: "#7C3AED", color: "#fff", borderRadius: 20, fontSize: 9, fontWeight: 900, padding: "1px 6px", lineHeight: 1.6 }}>
                  {cart.reduce((s, e) => s + e.qty, 0)}
                </span>
              )}
            </span>
          </PanelHead>

          {/* Cart items */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7 }}>
            {cart.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", color: "#b0b0c8", textAlign: "center" }}>
                <ShoppingCart size={36} color="#e0e0f0" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>Cart is empty</div>
                <div style={{ fontSize: 11, marginTop: 4, color: "#c8c8d8" }}>Tap a service or product to add it</div>
              </div>
            ) : (
              cart.map(entry => {
                const color = entry.type === "service" ? "#7C3AED" : "#d97706";
                return (
                  <div key={entry.cartId} style={{ padding: "10px 12px", borderRadius: 11, border: "1px solid #f0f0f8", background: "#fafafd" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6, marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1d1d2f", lineHeight: 1.3 }}>{entry.name}</div>
                        <div style={{ fontSize: 10, color: "#b0b0c8", marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ padding: "1px 6px", borderRadius: 20, background: color + "10", color, fontWeight: 700 }}>{entry.type}</span>
                          {pkr(entry.unitPrice)} each
                        </div>
                      </div>
                      <button type="button" onClick={() => removeEntry(entry.cartId)}
                        style={{ border: "none", background: "none", cursor: "pointer", padding: 2, color: "#c8c8d8" }}>
                        <X size={13} />
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {/* Qty control */}
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid #e8e8f0", borderRadius: 8, overflow: "hidden" }}>
                        <button type="button" onClick={() => entry.qty > 1 ? updateQty(entry.cartId, -1) : removeEntry(entry.cartId)}
                          style={{ width: 28, height: 28, border: "none", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Minus size={11} color="#9999b0" />
                        </button>
                        <div style={{ width: 32, textAlign: "center", fontSize: 13, fontWeight: 800, color: "#1d1d2f", background: "#fff" }}>{entry.qty}</div>
                        <button type="button" onClick={() => updateQty(entry.cartId, 1)}
                          style={{ width: 28, height: 28, border: "none", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Plus size={11} color={color} />
                        </button>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900, color }}>{pkr(entry.total)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart footer */}
          {cart.length > 0 && (
            <div style={{ borderTop: "1px solid #f0f0f8", padding: "12px 14px", flexShrink: 0 }}>

              {/* Subtotal row */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9999b0", marginBottom: 8 }}>
                <span>{cart.length} item{cart.length > 1 ? "s" : ""}</span>
                <span style={{ fontWeight: 700, color: "#1d1d2f" }}>{pkr(rawSubtotal)}</span>
              </div>

              {/* Discount row */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: discountAmount > 0 ? 6 : 10 }}>
                <Tag size={11} color="#9999b0" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9999b0", flexShrink: 0 }}>Discount</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
                  <input type="number" min={0} value={discount || ""} onChange={e => setDiscount(Math.max(0, Number(e.target.value)))}
                    placeholder="0"
                    style={{ width: 70, height: 30, padding: "0 8px", borderRadius: 7, border: "1px solid #e4e4ee", fontSize: 12, textAlign: "right", outline: "none", background: "#fff" }} />
                  <select value={discType} onChange={e => setDiscType(e.target.value as DiscountType)}
                    style={{ height: 30, borderRadius: 7, border: "1px solid #e4e4ee", fontSize: 11, padding: "0 6px", outline: "none", background: "#fff", color: "#5a5a78" }}>
                    <option value="flat">PKR</option>
                    <option value="pct">%</option>
                  </select>
                </div>
              </div>

              {discountAmount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#059669", marginBottom: 10, fontWeight: 700 }}>
                  <span>− Discount</span>
                  <span>− {pkr(discountAmount)}</span>
                </div>
              )}

              {/* Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: 12, background: "linear-gradient(135deg,#5B21B6,#9333EA)", marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{pkr(total)}</span>
              </div>

              {/* Payment method */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#9999b0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>Payment</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
                  {PAY_METHODS.map(pm => {
                    const Icon = pm.icon;
                    const sel = payMethod === pm.value;
                    return (
                      <button key={pm.value} type="button" onClick={() => setPayMethod(pm.value)}
                        style={{ padding: "7px 4px", borderRadius: 9, border: `1.5px solid ${sel ? pm.color : "#e8e8f0"}`, background: sel ? pm.color + "12" : "#fff", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.12s" }}>
                        <Icon size={13} color={sel ? pm.color : "#9999b0"} />
                        <span style={{ fontSize: 9, fontWeight: 800, color: sel ? pm.color : "#9999b0" }}>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Complete sale */}
              <button type="button" onClick={completeSale} disabled={completing}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                  background: completing ? "#e8e8f0" : "linear-gradient(135deg,#5B21B6,#9333EA)",
                  color: completing ? "#aaaabc" : "#fff",
                  fontSize: 14, fontWeight: 900, cursor: completing ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: completing ? "none" : "0 4px 18px rgba(91,33,182,0.38)",
                  letterSpacing: "-0.01em", transition: "all 0.15s",
                }}>
                {completing
                  ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Processing…</>
                  : <><ReceiptText size={16} /> Complete Sale &amp; Print</>
                }
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Print modal ── */}
      {printInvoice && (
        <SalonInvoicePrint
          invoice={printInvoice}
          salonName={salon.name}
          salonPhone={salon.phone}
          salonEmail={salon.email}
          salonAddress={salon.address}
          onClose={() => setPrintInvoice(null)}
        />
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}