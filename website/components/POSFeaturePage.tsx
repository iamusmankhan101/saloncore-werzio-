"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShoppingCart,
  Receipt,
  Banknote,
  Users,
  Package,
  Sparkles,
  CalendarDays,
  Tag,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import DemoModal from "./DemoModal";
import styles from "./SchedulingFeaturePage.module.css";

/* ─── hero POS card ─────────────────────────────────────── */
function HeroPOS() {
  return (
    <div className={styles.heroCard} aria-label="Salon Central POS preview">
      <div className={styles.heroCardTop}>
        <div>
          <span>Point of Sale</span>
          <strong>New Sale</strong>
        </div>
        <button type="button">Checkout</button>
      </div>

      {/* client strip */}
      <div className={styles.clientStrip} style={{ marginBottom: 14 }}>
        <div className={styles.avatar}>SN</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.92rem" }}>Sana Nawaz</strong>
          <span>24 visits · PKR 186,000 lifetime</span>
        </div>
      </div>

      {/* cart rows */}
      {[
        { name: "Hair Color", type: "Service", price: "PKR 4,500", bg: "#ede9fe", dot: "#7c3aed" },
        { name: "Keratin Treatment", type: "Service", price: "PKR 6,000", bg: "#dcfce7", dot: "#059669" },
        { name: "Loreal Serum", type: "Product", price: "PKR 2,200", bg: "#fff3e4", dot: "#d97706" },
      ].map((item) => (
        <div
          key={item.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 12px",
            borderRadius: 12,
            background: item.bg,
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.dot, display: "inline-block" }} />
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#17112a" }}>{item.name}</div>
              <div style={{ fontSize: "0.7rem", color: "#746b83" }}>{item.type}</div>
            </div>
          </div>
          <strong style={{ fontSize: "0.85rem", color: "#17112a" }}>{item.price}</strong>
        </div>
      ))}

      {/* totals */}
      <div style={{ borderTop: "1px solid #ede9fe", marginTop: 8, paddingTop: 10, display: "grid", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#746b83" }}>
          <span>Subtotal</span><span>PKR 12,700</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#059669" }}>
          <span>Discount 10%</span><span>- PKR 1,270</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", fontWeight: 900, color: "#17112a" }}>
          <span>Total</span><span>PKR 11,430</span>
        </div>
      </div>

      <div className={styles.floatingNote} style={{ right: -18, top: 210 }}>
        <Receipt size={15} />
        <span>Invoice sent via WhatsApp</span>
      </div>
    </div>
  );
}

/* ─── feature row visuals ───────────────────────────────── */
function CatalogPanel() {
  const services = [
    { name: "Hair Color", cat: "Hair", price: "PKR 4,500", dot: "#7c3aed" },
    { name: "Hydra Facial", cat: "Skin", price: "PKR 3,200", dot: "#0284c7" },
    { name: "Nail Extension", cat: "Nails", price: "PKR 2,800", dot: "#ec4899" },
    { name: "Loreal Shampoo", cat: "Product", price: "PKR 1,800", dot: "#d97706", stock: "12 left" },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {["All", "Services", "Products"].map((tab, i) => (
          <span
            key={tab}
            style={{
              padding: "5px 14px",
              borderRadius: 999,
              fontSize: "0.72rem",
              fontWeight: 800,
              background: i === 0 ? "#7c3aed" : "#f5f3ff",
              color: i === 0 ? "#fff" : "#5b21b6",
            }}
          >
            {tab}
          </span>
        ))}
      </div>
      {services.map((s) => (
        <div key={s.name} className={styles.staffRow}>
          <div className={styles.avatarSmall} style={{ background: s.dot + "22", color: s.dot, fontSize: "0.6rem", fontWeight: 900 }}>
            {s.cat[0]}
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.88rem", color: "#17112a" }}>{s.name}</strong>
            <span style={{ fontSize: "0.7rem" }}>{s.stock ?? s.cat}</span>
          </div>
          <em>{s.price}</em>
        </div>
      ))}
    </div>
  );
}

function CartPanel() {
  return (
    <div className={styles.checkoutPanel}>
      {[
        { name: "Hair Color", qty: 1, price: "PKR 4,500" },
        { name: "Keratin Treatment", qty: 1, price: "PKR 6,000" },
      ].map((item) => (
        <div key={item.name} className={styles.checkoutBody}>
          <div>
            <span>{item.name}</span>
            <strong>× {item.qty} · {item.price}</strong>
          </div>
        </div>
      ))}
      <div style={{ display: "grid", gap: 6, padding: "10px 14px", background: "#f8f7ff", borderRadius: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#746b83" }}>
          <span>Discount type</span><strong style={{ color: "#17112a" }}>10 %</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#746b83" }}>
          <span>Subtotal</span><span>PKR 10,500</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.92rem", fontWeight: 900, color: "#17112a" }}>
          <span>Total</span><span>PKR 9,450</span>
        </div>
      </div>
      <button type="button">Process payment</button>
    </div>
  );
}

function PaymentPanel() {
  const methods = [
    { label: "Cash", color: "#059669", bg: "#dcfce7" },
    { label: "JazzCash", color: "#d97706", bg: "#fef3c7" },
    { label: "EasyPaisa", color: "#059669", bg: "#d1fae5" },
    { label: "Raast", color: "#0284c7", bg: "#dbeafe" },
    { label: "Card", color: "#7c3aed", bg: "#ede9fe" },
    { label: "Bank Transfer", color: "#374151", bg: "#f3f4f6" },
  ];
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader}>
        <Banknote size={17} />
        <span>Payment method</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
        {methods.map((m) => (
          <div
            key={m.label}
            style={{
              padding: "12px 10px",
              borderRadius: 14,
              background: m.bg,
              color: m.color,
              fontWeight: 900,
              fontSize: "0.82rem",
              textAlign: "center",
              border: m.label === "Cash" ? `2px solid ${m.color}` : "none",
            }}
          >
            {m.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>SN</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.95rem" }}>Sana Nawaz</strong>
          <span>VIP client · Lahore</span>
        </div>
      </div>
      {[
        { label: "Total visits", value: "24" },
        { label: "Lifetime spend", value: "PKR 186,000" },
        { label: "Last visit", value: "3 days ago" },
        { label: "Loyalty points", value: "1,860 pts" },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div>
            <span>{row.label}</span>
            <strong style={{ color: row.label === "Loyalty points" ? "#7c3aed" : "#17112a" }}>{row.value}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function InvoicePanel() {
  return (
    <div
      className={styles.messagesPanel}
      style={{ background: "#fff", border: "1px solid #ede9fe", borderRadius: 16, padding: 16 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#746b83" }}>INVOICE</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#17112a" }}>SI-2026-0042</div>
        </div>
        <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 10px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 900 }}>PAID</span>
      </div>
      <div style={{ fontSize: "0.75rem", color: "#746b83", marginBottom: 10 }}>Sana Nawaz · Zara K. · 28 May 2026</div>
      {[
        { item: "Hair Color", amt: "PKR 4,500" },
        { item: "Keratin Treatment", amt: "PKR 6,000" },
        { item: "Discount 10%", amt: "-PKR 1,050" },
      ].map((row) => (
        <div key={row.item} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f5f3ff", fontSize: "0.8rem" }}>
          <span style={{ color: "#312a3d" }}>{row.item}</span>
          <strong style={{ color: row.amt.includes("-") ? "#059669" : "#17112a" }}>{row.amt}</strong>
        </div>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: "0.9rem", fontWeight: 900, color: "#17112a" }}>
        <span>Total</span><span>PKR 9,450</span>
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: "#dcfce7", borderRadius: 10, fontSize: "0.72rem", fontWeight: 900, color: "#166534" }}>
        <Receipt size={13} /> WhatsApp receipt sent automatically
      </div>
    </div>
  );
}

function AppointmentHandoffPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>FK</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.92rem" }}>Fatima Khan</strong>
          <span>Appointment #108 · Bridal</span>
        </div>
      </div>
      {[
        { label: "Status", value: "Completed", green: true },
        { label: "Stylist", value: "Ayesha M." },
        { label: "Duration", value: "3 hrs" },
        { label: "Action", value: "Open POS ↗", purple: true },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div>
            <span>{row.label}</span>
            <strong style={{ color: row.green ? "#059669" : row.purple ? "#7c3aed" : "#17112a" }}>
              {row.value}
            </strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function StockPanel() {
  const items = [
    { name: "Loreal Hair Color", before: 12, after: 10, warn: false },
    { name: "Wella Developer", before: 8, after: 7, warn: false },
    { name: "Skin Serum SPF50", before: 3, after: 2, warn: true },
  ];
  return (
    <div className={styles.staffPanel}>
      <div className={styles.blockHeader} style={{ marginBottom: 10 }}>
        <Package size={16} />
        <span style={{ fontWeight: 900, fontSize: "0.82rem", color: "#17112a" }}>Stock after sale</span>
      </div>
      {items.map((it) => (
        <div key={it.name} className={styles.staffRow}>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.85rem", color: "#17112a" }}>{it.name}</strong>
            <span style={{ fontSize: "0.7rem" }}>{it.before} → {it.after} units</span>
          </div>
          <em style={{ color: it.warn ? "#dc2626" : "#059669", fontStyle: "normal", fontWeight: 900, fontSize: "0.72rem" }}>
            {it.warn ? "⚠ Low" : "OK"}
          </em>
        </div>
      ))}
    </div>
  );
}

/* ─── feature rows data ─────────────────────────────────── */
const rows = [
  {
    eyebrow: "Smart catalog",
    title: "Browse services and products in one unified catalog",
    body: "Whether you're searching for POS software Pakistan trusts or point of sale Pakistan relies on, Salon Central is a salon point of sale built for every kind of salon: a true POS system for salons and hair salon POS combined. Switch between All, Services, and Products tabs to see real-time stock levels on every product, category color badges, and out-of-stock indicators, all from the POS screen without leaving checkout.",
    visual: <CatalogPanel />,
  },
  {
    eyebrow: "Instant checkout",
    title: "Build a cart, apply discounts, and collect payment in seconds",
    body: "As POS Pakistan salons expect, Salon Central's salon point of sale software lets you add any mix of services and products to the cart. Apply a flat PKR or percentage discount on the fly. The total recalculates instantly, ready to charge the moment the client is done.",
    visual: <CartPanel />,
  },
  {
    eyebrow: "6 payment methods",
    title: "Accept cash, JazzCash, EasyPaisa, Raast, card, and bank transfer",
    body: "This salon POS system doubles as a spa point of sale system, with Pakistan-first payment options built in: cash, JazzCash, EasyPaisa, Raast, card, and bank transfer. Select the method the client prefers and the sale is recorded with full payment context, no manual note-taking or separate payment tracking needed.",
    visual: <PaymentPanel />,
  },
  {
    eyebrow: "Client history",
    title: "Every sale builds a richer client profile automatically",
    body: "Every sale through this beauty salon POS, beauty salon point of sale software from check-in to checkout, updates visit count, lifetime spend, last visit date, and loyalty points automatically. Your team sees the client's full context every time they walk in, no manual updates required.",
    visual: <ClientPanel />,
  },
  {
    eyebrow: "Invoice and receipt",
    title: "Auto-numbered invoices and WhatsApp receipts sent instantly",
    body: "Built as salon point of sale system, hair salon POS software, and beauty salon POS software in one, Salon Central generates a branded invoice (SI-YEAR-XXXX format) with itemised services, products, discount, stylist name, and payment method for every sale. The receipt is sent to the client via WhatsApp automatically.",
    visual: <InvoicePanel />,
  },
  {
    eyebrow: "Inventory sync",
    title: "Product stock deducts automatically when sold at POS",
    body: "As POS software for beauty salon teams and a POS system for beauty salon inventory alike, Salon Central subtracts one unit from stock immediately when a product sells at checkout. Low-stock alerts trigger when items fall below the minimum threshold, no spreadsheet needed.",
    visual: <StockPanel />,
  },
  {
    eyebrow: "Appointment handoff",
    title: "Move a completed appointment straight to POS checkout",
    body: "Salon Central is point of sale software for hair salon and hair salon point of sale needs alike: when an appointment is marked completed, a single tap opens POS with the client, stylist, and services pre-filled. No re-entry, no delay. The front desk keeps moving.",
    visual: <AppointmentHandoffPanel />,
  },
];

/* ─── page ──────────────────────────────────────────────── */
export default function POSFeaturePage() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <>
      <Navbar />
      <main className={styles.page}>

        {/* ── hero ── */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.kicker}>
                <ShoppingCart size={16} />
                Point of Sale
              </div>
              <h1>Checkout in seconds, not minutes</h1>
              <p>
                Salon Central&apos;s salon POS software handles services, products, discounts, six payment methods,
                auto-numbered invoices, WhatsApp receipts, stock deduction, and client history update, all from
                one screen. As the best POS software in Pakistan, it&apos;s a complete point of sale system built
                for beauty salons, hair salons, and spas.
              </p>
              <div className={styles.heroActions}>
                <button type="button" onClick={() => setDemoOpen(true)} className={styles.primaryCta}>
                  Get started <ArrowRight size={17} />
                </button>
                <Link href="/#features" className={styles.secondaryCta}>
                  Explore features
                </Link>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.imageChip}>
                <Image src="/salon-central-logo.png" alt="" width={96} height={96} />
                <span>Salon Central POS</span>
              </div>
              <HeroPOS />
            </div>
          </div>
          <div className={styles.wave} aria-hidden="true" />
        </section>

        {/* ── feature rows ── */}
        <section className={styles.featureStack}>
          {rows.map((row, index) => (
            <article
              key={row.title}
              className={`${styles.featureRow} ${index % 2 ? styles.flip : ""}`}
            >
              <div className={styles.rowCopy}>
                <span>{row.eyebrow}</span>
                <h2>{row.title}</h2>
                <p>{row.body}</p>
              </div>
              <div className={styles.rowVisual}>{row.visual}</div>
            </article>
          ))}
        </section>

        {/* ── cta band ── */}
        <section className={styles.ctaBand}>
          <div>
            <span>Ready to upgrade your checkout?</span>
            <h2>See how fast Salon Central POS really is</h2>
            <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.78)", fontSize: "0.95rem" }}>
              Transparent POS software price in Pakistan, no hidden fees.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <button type="button" onClick={() => setDemoOpen(true)} className={styles.primaryCta}>
              Get started <ArrowRight size={17} />
            </button>
            <Link href="/#pricing" className={styles.secondaryDark}>
              View pricing
            </Link>
          </div>
        </section>

        {/* ── mini stats ── */}
        <section className={styles.miniStats} aria-label="POS advantages">
          <div>
            <Banknote size={19} />
            <strong>6 payment methods</strong>
            <span>Cash, JazzCash, EasyPaisa, Raast, card, and bank transfer, all built in.</span>
          </div>
          <div>
            <Receipt size={19} />
            <strong>Auto invoices</strong>
            <span>Branded, auto-numbered invoices with WhatsApp delivery after every sale.</span>
          </div>
          <div>
            <Package size={19} />
            <strong>Live stock sync</strong>
            <span>Product inventory deducts automatically the moment a sale completes.</span>
          </div>
          <div>
            <Tag size={19} />
            <strong>Flexible discounts</strong>
            <span>Apply flat PKR or percentage discounts at checkout with instant recalculation.</span>
          </div>
        </section>

      </main>
      <Footer />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
