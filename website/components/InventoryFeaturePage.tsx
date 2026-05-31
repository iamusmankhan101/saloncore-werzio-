import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, Package, AlertTriangle, ShoppingCart,
  Tag, Search, BarChart2, Layers,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import styles from "./SchedulingFeaturePage.module.css";

/* ─── helpers ────────────────────────────────────────────── */
type StatusKey = "ok" | "low" | "out";
const STATUS = {
  ok:  { label: "In Stock",     c: "#059669", bg: "#dcfce7" },
  low: { label: "Low Stock",    c: "#d97706", bg: "#fef3c7" },
  out: { label: "Out of Stock", c: "#dc2626", bg: "#fef2f2" },
} as const;
const CAT = {
  "Hair Color":  { c: "#7c3aed", bg: "#ede9fe" },
  "Skin Care":   { c: "#db2777", bg: "#fdf2f8" },
  "Nail":        { c: "#0284c7", bg: "#dbeafe" },
  "Tools":       { c: "#d97706", bg: "#fef3c7" },
  "Consumables": { c: "#059669", bg: "#dcfce7" },
  "Retail":      { c: "#6b7280", bg: "#f3f4f6" },
} as const;

/* ─── hero ───────────────────────────────────────────────── */
function HeroInventory() {
  const items = [
    { name: "Loreal Hair Color 7.3", cat: "Hair Color", stock: 3,  min: 10, status: "low" as StatusKey, cost: "PKR 1,200", retail: "PKR 2,800" },
    { name: "Wella Developer 20vol", cat: "Hair Color", stock: 18, min: 10, status: "ok"  as StatusKey, cost: "PKR 480",   retail: "PKR 950" },
    { name: "OPI Nail Polish Set",   cat: "Nail",       stock: 0,  min: 5,  status: "out" as StatusKey, cost: "PKR 3,200", retail: "PKR 5,500" },
    { name: "Skin Serum SPF50",      cat: "Skin Care",  stock: 4,  min: 8,  status: "low" as StatusKey, cost: "PKR 900",   retail: "PKR 2,200" },
  ];
  return (
    <div className={styles.heroCard} aria-label="Werzio inventory preview">
      <div className={styles.heroCardTop}>
        <div><span>Inventory</span><strong>42 Products</strong></div>
        <button type="button">Add Product</button>
      </div>

      {/* alert banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, background: "#fef3c7", border: "1px solid #fcd34d", marginBottom: 12 }}>
        <AlertTriangle size={14} color="#d97706" />
        <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#92400e" }}>5 items need attention — 2 out of stock, 3 low</span>
      </div>

      {items.map((it) => {
        const s = STATUS[it.status];
        const c = CAT[it.cat as keyof typeof CAT];
        return (
          <div key={it.name} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: 8, padding: "9px 0", borderBottom: "1px solid #f5f3ff" }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#17112a" }}>{it.name}</div>
              <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: "0.62rem", fontWeight: 900, background: c.bg, color: c.c }}>{it.cat}</span>
            </div>
            <div style={{ textAlign: "right", fontSize: "0.72rem" }}>
              <div style={{ fontWeight: 900, color: "#17112a" }}>{it.stock} / {it.min} min</div>
              <div style={{ color: "#9ca3af" }}>cost {it.cost}</div>
            </div>
            <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 900, background: s.bg, color: s.c, whiteSpace: "nowrap" as const }}>{s.label}</span>
          </div>
        );
      })}

      <div className={styles.floatingNote} style={{ right: -20, top: 190 }}>
        <AlertTriangle size={13} />
        <span>WhatsApp alert sent</span>
      </div>
    </div>
  );
}

/* ─── feature visuals ────────────────────────────────────── */
function StockTrackingPanel() {
  const items = [
    { name: "Loreal Hair Color", stock: 3,  min: 10, status: "low" as StatusKey },
    { name: "Wella Developer",   stock: 18, min: 10, status: "ok"  as StatusKey },
    { name: "OPI Nail Polish",   stock: 0,  min: 5,  status: "out" as StatusKey },
    { name: "Skin Serum SPF50",  stock: 4,  min: 8,  status: "low" as StatusKey },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#17112a", marginBottom: 12 }}>Live stock levels</div>
      {items.map((it) => {
        const s = STATUS[it.status];
        const pct = Math.min(100, Math.round((it.stock / (it.min * 2)) * 100));
        return (
          <div key={it.name} className={styles.staffRow}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <strong style={{ fontSize: "0.84rem", color: "#17112a" }}>{it.name}</strong>
                <span style={{ fontSize: "0.72rem", fontWeight: 900, color: s.c }}>{it.stock} pcs</span>
              </div>
              <div style={{ height: 5, background: "#f0f0f8", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: s.c, borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: "0.62rem", color: "#9ca3af", marginTop: 2 }}>Min: {it.min} · {s.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CategoriesPanel() {
  const cats = Object.entries(CAT).map(([name, { c, bg }]) => ({ name, c, bg }));
  const units = ["ml", "g", "pcs", "box", "bottle", "tube"];
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader} style={{ marginBottom: 14 }}>
        <Layers size={16} />
        <span style={{ fontWeight: 900, color: "#17112a" }}>6 categories · 6 units</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 14 }}>
        {cats.map((c) => (
          <div key={c.name} style={{ padding: "8px 10px", borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.c, flexShrink: 0 }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 900, color: c.c }}>{c.name}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
        {units.map((u) => (
          <span key={u} style={{ padding: "4px 10px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 900, background: "#f5f3ff", color: "#7c3aed" }}>{u}</span>
        ))}
      </div>
    </div>
  );
}

function POSDeductPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#17112a", marginBottom: 12 }}>Auto-deduction on POS sale</div>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>SN</div>
        <div><strong style={{ color: "#17112a", fontSize: "0.9rem" }}>Sana Nawaz</strong><span>POS Checkout</span></div>
      </div>
      {[
        { label: "Hair Color Service", type: "Service", note: "No deduction" },
        { label: "Loreal Serum ×2",   type: "Product", note: "−2 from stock", alert: true },
        { label: "OPI Nail Polish ×1", type: "Product", note: "−1 from stock", alert: true },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {row.label}
              <span style={{ padding: "1px 6px", borderRadius: 999, fontSize: "0.6rem", fontWeight: 900, background: row.type === "Product" ? "#fef3c7" : "#ede9fe", color: row.type === "Product" ? "#d97706" : "#7c3aed" }}>{row.type}</span>
            </span>
            <strong style={{ color: row.alert ? "#059669" : "#9ca3af", fontSize: "0.78rem" }}>{row.note}</strong>
          </div>
        </div>
      ))}
      <div style={{ padding: "9px 12px", borderRadius: 10, background: "#dcfce7", border: "1px solid #bbf7d0", fontSize: "0.73rem", fontWeight: 900, color: "#166534" }}>
        ✓ Stock updated automatically after checkout
      </div>
    </div>
  );
}

function RetailPricingPanel() {
  const items = [
    { name: "Loreal Serum",    cost: 900,  retail: 2200, listed: true  },
    { name: "OPI Nail Polish", cost: 3200, retail: 5500, listed: true  },
    { name: "Wella Developer", cost: 480,  retail: 950,  listed: false },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["Stock Management", "Retail Products"].map((t, i) => (
          <span key={t} style={{ padding: "5px 12px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 900, background: i === 1 ? "#7c3aed" : "#f5f3ff", color: i === 1 ? "#fff" : "#5b21b6" }}>{t}</span>
        ))}
      </div>
      {items.map((it) => {
        const margin = Math.round(((it.retail - it.cost) / it.retail) * 100);
        return (
          <div key={it.name} className={styles.staffRow}>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "0.84rem", color: "#17112a" }}>{it.name}</strong>
              <span style={{ fontSize: "0.68rem", color: "#9ca3af" }}>Cost PKR {it.cost.toLocaleString()} → Retail PKR {it.retail.toLocaleString()}</span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#059669" }}>{margin}% margin</div>
              <span style={{ padding: "2px 7px", borderRadius: 999, fontSize: "0.62rem", fontWeight: 900, background: it.listed ? "#dcfce7" : "#f3f4f6", color: it.listed ? "#166534" : "#6b7280" }}>
                {it.listed ? "In POS" : "Not listed"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LowStockAlertPanel() {
  return (
    <div className={styles.messagesPanel}>
      <div className={styles.messageHeader}>
        <Package size={17} />
        <span>Glow Studio · Low stock alert</span>
      </div>
      <div className={styles.chatBubble}>
        ⚠️ <strong>Low Stock Alert</strong> — Glow Studio:<br /><br />
        • Loreal Hair Color 7.3 — <strong>3 pcs left</strong> (min: 10) · Supplier: Loreal Distributor<br />
        • Skin Serum SPF50 — <strong>4 bottles left</strong> (min: 8) · Supplier: Skin First PK<br />
        • OPI Nail Polish Set — <strong>Out of stock</strong> (min: 5)<br /><br />
        Please restock soon.
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {[
          { label: "Sent to",   value: "Owner WhatsApp" },
          { label: "Frequency", value: "Once per item per day" },
          { label: "Trigger",   value: "Stock ≤ minimum threshold" },
        ].map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", padding: "4px 0", borderBottom: "1px solid #f5f3ff" }}>
            <span style={{ color: "#9ca3af", fontWeight: 700 }}>{r.label}</span>
            <strong style={{ color: "#17112a" }}>{r.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchFilterPanel() {
  const items = [
    { name: "Loreal Hair Color", brand: "Loreal", cat: "Hair Color", status: "low" as StatusKey },
    { name: "OPI Nail Polish",   brand: "OPI",    cat: "Nail",       status: "out" as StatusKey },
    { name: "Wella Developer",   brand: "Wella",  cat: "Hair Color", status: "ok"  as StatusKey },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 8, background: "#f5f3ff", border: "1px solid #ede9fe", fontSize: "0.75rem", color: "#746b83" }}>
          <Search size={12} /> Search name, brand, supplier…
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" as const }}>
        {["All", "Hair Color", "Low Stock", "Out of Stock"].map((f, i) => (
          <span key={f} style={{ padding: "4px 10px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 900, background: i === 0 ? "#7c3aed" : "#f5f3ff", color: i === 0 ? "#fff" : "#5b21b6" }}>{f}</span>
        ))}
      </div>
      {items.map((it) => {
        const s = STATUS[it.status];
        const c = CAT[it.cat as keyof typeof CAT];
        return (
          <div key={it.name} className={styles.staffRow}>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: "0.84rem", color: "#17112a" }}>{it.name}</strong>
              <span style={{ fontSize: "0.68rem", color: "#9ca3af" }}>{it.brand}</span>
            </div>
            <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 900, background: c.bg, color: c.c, marginRight: 6 }}>{it.cat}</span>
            <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 900, background: s.bg, color: s.c }}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function StockOverviewPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#17112a", marginBottom: 12 }}>Stock overview</div>
      {[
        { label: "Total products", value: "42",            color: "#17112a" },
        { label: "Total value",    value: "PKR 1,84,000",  color: "#059669" },
        { label: "Low stock items",value: "8",             color: "#d97706" },
        { label: "Out of stock",   value: "3",             color: "#dc2626" },
        { label: "Retail value",   value: "PKR 3,42,000",  color: "#7c3aed" },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div>
            <span>{row.label}</span>
            <strong style={{ color: row.color }}>{row.value}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── feature rows ───────────────────────────────────────── */
const rows = [
  {
    eyebrow: "Stock tracking",
    title: "See every product's live stock level against its minimum",
    body: "Each inventory item has a current stock and a minimum stock threshold you define. Werzio colour-codes every item as In Stock (green), Low Stock (orange), or Out of Stock (red) — instantly visible across the inventory list.",
    visual: <StockTrackingPanel />,
  },
  {
    eyebrow: "6 categories · 6 units",
    title: "Organise every product by category and unit of measurement",
    body: "Assign each product to one of six categories — Hair Color, Skin Care, Nail, Tools, Consumables, or Retail — and track it in the right unit (ml, g, pcs, box, bottle, or tube). Category badges appear everywhere for instant visual recognition.",
    visual: <CategoriesPanel />,
  },
  {
    eyebrow: "POS auto-deduction",
    title: "Product stock drops automatically when sold at checkout",
    body: "When a product is added to a POS sale and the client checks out, Werzio reduces its inventory count immediately. Stock can never go below zero. The low-stock alert check runs automatically after every sale.",
    visual: <POSDeductPanel />,
  },
  {
    eyebrow: "Retail pricing",
    title: "Set retail prices and list products directly in POS",
    body: "Add a retail price to any inventory item and toggle it live in the POS catalog. The retail tab shows your cost price, retail price, and profit margin per item. Products without a retail price stay in stock management only and never appear at checkout.",
    visual: <RetailPricingPanel />,
  },
  {
    eyebrow: "WhatsApp low-stock alerts",
    title: "Get a WhatsApp message when products run low",
    body: "When any item's stock falls to or below its minimum threshold, Werzio sends a single daily WhatsApp alert to the salon owner. The message lists every low or out-of-stock item with its current quantity, minimum, and supplier name.",
    visual: <LowStockAlertPanel />,
  },
  {
    eyebrow: "Search and filter",
    title: "Find any product by name, brand, category, or stock status",
    body: "Search across all inventory by product name, brand, or supplier. Filter by category or stock status — or combine both to see only Low Stock Hair Color items, for example. The overview cards always show total value, low-stock count, and out-of-stock count.",
    visual: <SearchFilterPanel />,
  },
  {
    eyebrow: "Stock overview",
    title: "Total inventory value, low stock count, and retail value at a glance",
    body: "The inventory dashboard shows total product count, total cost value (cost × stock), how many items are low or out of stock, and total retail value of listed products — updated the moment any sale or restock is recorded.",
    visual: <StockOverviewPanel />,
  },
];

/* ─── page ───────────────────────────────────────────────── */
export default function InventoryFeaturePage() {
  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.kicker}>
                <Package size={16} />
                Inventory management
              </div>
              <h1>Never run out of stock mid-appointment again</h1>
              <p>
                Werzio tracks every product in your salon — stock levels, minimum thresholds, cost and retail prices, auto-deduction on sales, and WhatsApp alerts when anything runs low.
              </p>
              <div className={styles.heroActions}>
                <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className={styles.primaryCta}>
                  Start free trial <ArrowRight size={17} />
                </a>
                <Link href="/#pricing" className={styles.secondaryCta}>View pricing</Link>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.imageChip}>
                <Image src="/werzio-logo.png" alt="" width={96} height={96} />
                <span>Werzio Inventory</span>
              </div>
              <HeroInventory />
            </div>
          </div>
          <div className={styles.wave} aria-hidden="true" />
        </section>

        <section className={styles.featureStack}>
          {rows.map((row, i) => (
            <article key={row.title} className={`${styles.featureRow} ${i % 2 ? styles.flip : ""}`}>
              <div className={styles.rowCopy}>
                <span>{row.eyebrow}</span>
                <h2>{row.title}</h2>
                <p>{row.body}</p>
              </div>
              <div className={styles.rowVisual}>{row.visual}</div>
            </article>
          ))}
        </section>

        <section className={styles.ctaBand}>
          <div>
            <span>Available on Werzio Pro and Premium</span>
            <h2>Stop guessing your stock — track it live</h2>
          </div>
          <div className={styles.ctaActions}>
            <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className={styles.primaryCta}>
              Start free trial <ArrowRight size={17} />
            </a>
            <Link href="/#pricing" className={styles.secondaryDark}>View pricing</Link>
          </div>
        </section>

        <section className={styles.miniStats} aria-label="Inventory management advantages">
          <div>
            <AlertTriangle size={19} />
            <strong>Low-stock alerts</strong>
            <span>Daily WhatsApp alert to the owner when any product hits its minimum threshold.</span>
          </div>
          <div>
            <ShoppingCart size={19} />
            <strong>POS auto-deduction</strong>
            <span>Stock drops automatically the moment a product is sold at checkout.</span>
          </div>
          <div>
            <Tag size={19} />
            <strong>Retail pricing</strong>
            <span>Set retail prices, view margins, and list products directly in POS.</span>
          </div>
          <div>
            <BarChart2 size={19} />
            <strong>Total value tracking</strong>
            <span>Cost value and retail value of your full inventory, always up to date.</span>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
