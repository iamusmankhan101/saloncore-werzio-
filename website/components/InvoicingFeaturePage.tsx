"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  FileText,
  CheckCircle2,
  Receipt,
  Banknote,
  Tag,
  Search,
  Printer,
  BarChart2,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import DemoModal from "./DemoModal";
import styles from "./SchedulingFeaturePage.module.css";

/* ── helpers ─────────────────────────────────────────────── */
const pill = (label: string, color: string, bg: string) => (
  <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 900, background: bg, color }}>{label}</span>
);

/* ── hero invoice card ───────────────────────────────────── */
function HeroInvoice() {
  return (
    <div className={styles.heroCard} aria-label="Salon Central invoice preview">
      <div className={styles.heroCardTop}>
        <div>
          <span>Invoice</span>
          <strong>SI-2026-0042</strong>
        </div>
        {pill("PAID", "#166534", "#dcfce7")}
      </div>

      {/* client + staff row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Bill To", value: "Sana Nawaz · 0300 1234567" },
          { label: "Stylist", value: "Zara K." },
        ].map((r) => (
          <div key={r.label} style={{ padding: "9px 12px", borderRadius: 10, background: "#f8f7ff", border: "1px solid #ede9fe" }}>
            <div style={{ fontSize: "0.66rem", fontWeight: 900, color: "#746b83", marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#17112a" }}>{r.value}</div>
          </div>
        ))}
      </div>

      {/* line items */}
      <div style={{ border: "1px solid #ede9fe", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", padding: "6px 10px", background: "#f5f3ff", fontSize: "0.65rem", fontWeight: 900, color: "#746b83", gap: 8 }}>
          <span>Description</span><span>Qty</span><span>Total</span>
        </div>
        {[
          { name: "Hair Color", type: "Service", qty: 1, total: "PKR 4,500", typeColor: "#7c3aed", typeBg: "#ede9fe" },
          { name: "Keratin Treatment", type: "Service", qty: 1, total: "PKR 6,000", typeColor: "#7c3aed", typeBg: "#ede9fe" },
          { name: "Loreal Argan Serum", type: "Product", qty: 2, total: "PKR 3,200", typeColor: "#d97706", typeBg: "#fef3c7" },
        ].map((item) => (
          <div key={item.name} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", padding: "8px 10px", borderTop: "1px solid #f5f3ff", gap: 8, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#17112a" }}>{item.name}</div>
              <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: "0.62rem", fontWeight: 900, background: item.typeBg, color: item.typeColor }}>{item.type}</span>
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#746b83" }}>×{item.qty}</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 900, color: "#17112a" }}>{item.total}</span>
          </div>
        ))}
      </div>

      {/* totals */}
      <div style={{ display: "grid", gap: 4 }}>
        {[
          { label: "Subtotal", value: "PKR 13,700", muted: true },
          { label: "Discount", value: "-PKR 1,370", green: true },
          { label: "Total", value: "PKR 12,330", bold: true },
        ].map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: r.bold ? "0.92rem" : "0.78rem", fontWeight: r.bold ? 900 : 700, color: r.green ? "#059669" : r.muted ? "#746b83" : "#17112a" }}>
            <span>{r.label}</span><span>{r.value}</span>
          </div>
        ))}
      </div>

      <div className={styles.floatingNote} style={{ right: -20, top: 210 }}>
        <Printer size={15} />
        <span>Print / Save PDF</span>
      </div>
    </div>
  );
}

/* ── feature row visuals ─────────────────────────────────── */
function InvoiceBuilderPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#17112a", marginBottom: 12 }}>New invoice</div>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>SN</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.9rem" }}>Sana Nawaz</strong>
          <span>Auto-filled from client list</span>
        </div>
      </div>
      {[
        { label: "Hair Color", tag: "Service", price: "PKR 4,500", tagC: "#7c3aed", tagBg: "#ede9fe" },
        { label: "Loreal Serum ×2", tag: "Product", price: "PKR 3,200", tagC: "#d97706", tagBg: "#fef3c7" },
      ].map((item) => (
        <div key={item.label} className={styles.checkoutBody}>
          <div style={{ alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {item.label}
              <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: "0.62rem", fontWeight: 900, background: item.tagBg, color: item.tagC }}>{item.tag}</span>
            </span>
            <strong>{item.price}</strong>
          </div>
        </div>
      ))}
      <div className={styles.checkoutBody}>
        <div>
          <span>Discount (10%)</span>
          <strong style={{ color: "#059669" }}>-PKR 770</strong>
        </div>
      </div>
      <button type="button">Save Invoice</button>
    </div>
  );
}

function NumberingPanel() {
  const invoices = [
    { num: "SI-2026-0042", client: "Sana Nawaz", date: "28 May", status: "Paid" },
    { num: "SI-2026-0041", client: "Fatima Ali", date: "27 May", status: "Paid" },
    { num: "SI-2026-0040", client: "Maria Khan", date: "26 May", status: "Unpaid" },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#17112a", marginBottom: 12 }}>Auto-numbered invoices</div>
      {invoices.map((inv) => (
        <div key={inv.num} className={styles.staffRow}>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.85rem", color: "#7c3aed", fontFamily: "monospace" }}>{inv.num}</strong>
            <span style={{ fontSize: "0.7rem" }}>{inv.client} · {inv.date}</span>
          </div>
          <span style={{
            padding: "3px 9px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 900,
            background: inv.status === "Paid" ? "#dcfce7" : "#fef3c7",
            color: inv.status === "Paid" ? "#166534" : "#d97706",
          }}>
            {inv.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function PaymentMethodPanel() {
  const methods = [
    { label: "Cash",          color: "#059669", bg: "#dcfce7" },
    { label: "JazzCash",      color: "#d97706", bg: "#fef3c7" },
    { label: "EasyPaisa",     color: "#059669", bg: "#d1fae5" },
    { label: "Raast",         color: "#0284c7", bg: "#dbeafe" },
    { label: "Card",          color: "#7c3aed", bg: "#ede9fe" },
    { label: "Bank Transfer", color: "#374151", bg: "#f3f4f6" },
  ];
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader}>
        <Banknote size={17} />
        <span style={{ fontWeight: 900, color: "#17112a" }}>Payment method on invoice</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        {methods.map((m) => (
          <div key={m.label} style={{ padding: "11px 10px", borderRadius: 12, background: m.bg, color: m.color, fontWeight: 900, fontSize: "0.82rem", textAlign: "center" }}>
            {m.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintPanel() {
  return (
    <div className={styles.messagesPanel} style={{ background: "#fff", border: "1px solid #ede9fe", borderRadius: 16, padding: 16 }}>
      {/* invoice header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, paddingBottom: 12, borderBottom: "2px solid #7c3aed" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#db2777)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 900, color: "#fff" }}>GS</div>
            <span style={{ fontWeight: 900, color: "#17112a", fontSize: "0.85rem" }}>Glow Studio</span>
          </div>
          <div style={{ fontSize: "0.66rem", color: "#746b83" }}>DHA Phase 5, Lahore</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.68rem", color: "#746b83" }}>INVOICE</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 900, color: "#7c3aed" }}>SI-2026-0042</div>
          {pill("PAID", "#166534", "#dcfce7")}
        </div>
      </div>
      <div style={{ fontSize: "0.72rem", color: "#312a3d", lineHeight: 1.6 }}>
        <div><strong>Sana Nawaz</strong> · 0300 1234567</div>
        <div style={{ color: "#746b83" }}>Hair Color, Keratin Treatment by Zara K.</div>
        <div style={{ color: "#746b83" }}>28 May 2026 · Cash</div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "0.95rem", fontWeight: 900, color: "#17112a", marginTop: 12 }}>
        Total: PKR 12,330
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <div style={{ flex: 1, padding: "8px 12px", borderRadius: 10, background: "#7c3aed", color: "#fff", fontSize: "0.72rem", fontWeight: 900, textAlign: "center" }}>
          Print / Save PDF
        </div>
        <div style={{ padding: "8px 12px", borderRadius: 10, background: "#dcfce7", color: "#166534", fontSize: "0.72rem", fontWeight: 900 }}>
          Mark Paid
        </div>
      </div>
    </div>
  );
}

function StatsPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#17112a", marginBottom: 12 }}>Invoice overview</div>
      {[
        { label: "Total invoices",    value: "142",           color: "#17112a" },
        { label: "Revenue collected", value: "PKR 8,46,000",  color: "#059669" },
        { label: "Outstanding",       value: "PKR 32,500",    color: "#d97706" },
        { label: "Paid this month",   value: "38 invoices",   color: "#7c3aed" },
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

function SearchFilterPanel() {
  const rows = [
    { num: "SI-2026-0042", client: "Sana Nawaz",  amount: "12,330", paid: true  },
    { num: "SI-2026-0039", client: "Fatima Ali",  amount: "8,200",  paid: true  },
    { num: "SI-2026-0037", client: "Maria Khan",  amount: "22,000", paid: false },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 8, background: "#f5f3ff", border: "1px solid #ede9fe", fontSize: "0.75rem", color: "#746b83" }}>
          <Search size={12} /> Search invoices…
        </div>
        {["All", "Paid", "Unpaid"].map((f, i) => (
          <span key={f} style={{ padding: "4px 10px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 900, background: i === 0 ? "#7c3aed" : "#f5f3ff", color: i === 0 ? "#fff" : "#5b21b6" }}>{f}</span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.num} className={styles.staffRow}>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.82rem", color: "#7c3aed", fontFamily: "monospace" }}>{row.num}</strong>
            <span style={{ fontSize: "0.7rem" }}>{row.client}</span>
          </div>
          <span style={{ fontSize: "0.82rem", fontWeight: 900, color: "#17112a", marginRight: 8 }}>₨{row.amount}</span>
          <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 900, background: row.paid ? "#dcfce7" : "#fef3c7", color: row.paid ? "#166534" : "#d97706" }}>
            {row.paid ? "Paid" : "Unpaid"}
          </span>
        </div>
      ))}
    </div>
  );
}

function AppointmentLinkPanel() {
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
        { label: "Linked appointment", value: "#108: Bridal Trial", purple: true },
        { label: "Stylist",            value: "Ayesha M." },
        { label: "Services",           value: "Bridal Makeup, Hairstyle" },
        { label: "Invoice status",     value: "Paid", green: true },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div>
            <span>{row.label}</span>
            <strong style={{ color: row.purple ? "#7c3aed" : row.green ? "#059669" : "#17112a" }}>
              {row.value}
            </strong>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── feature rows ────────────────────────────────────────── */
const rows = [
  {
    eyebrow: "Invoice builder",
    title: "Mix services and products in one invoice",
    body: "Add services from your catalogue and products from inventory to the same invoice. Each item shows its type badge (Service or Product), quantity, unit price, and line total. Pick a client from the dropdown and their name and phone fill in automatically.",
    visual: <InvoiceBuilderPanel />,
  },
  {
    eyebrow: "Auto-numbered",
    title: "Every invoice gets a unique SI-YYYY-NNNN number automatically",
    body: "Salon Central assigns a sequential invoice number (SI-2026-0001, SI-2026-0042...) to every invoice the moment it is created. The counter increments automatically: no manual numbering, no duplicates, no gaps.",
    visual: <NumberingPanel />,
  },
  {
    eyebrow: "6 payment methods",
    title: "Record how the client paid: Cash, JazzCash, EasyPaisa and more",
    body: "Select the payment method on each invoice: Cash, JazzCash, EasyPaisa, Raast, Card, or Bank Transfer. The method is printed on the invoice and stored with the record for accurate revenue reporting.",
    visual: <PaymentMethodPanel />,
  },
  {
    eyebrow: "Branded PDF",
    title: "Print a professional A4 invoice or save it as PDF",
    body: "Every invoice renders as a branded A4 document: salon name, logo initials, client details, itemised table, discount, total, payment method, and a PAID/UNPAID status badge. One click sends it to the print dialog to save as PDF.",
    visual: <PrintPanel />,
  },
  {
    eyebrow: "Revenue overview",
    title: "Track total invoiced, collected, and outstanding in one view",
    body: "The invoices dashboard shows total invoice count, total revenue collected, outstanding balance, and invoices paid this month: always up to date as you create and mark invoices paid.",
    visual: <StatsPanel />,
  },
  {
    eyebrow: "Search and filter",
    title: "Find any invoice by client name, number, or staff",
    body: "Search across all invoices by client name, invoice number, or stylist name. Filter the list to show All, Paid, or Unpaid in one click. Edit, mark paid, print, or delete any invoice directly from the list view.",
    visual: <SearchFilterPanel />,
  },
  {
    eyebrow: "Appointment link",
    title: "Link invoices to appointments for complete sale context",
    body: "When opening POS from a completed appointment, the invoice is automatically linked to that appointment record. Staff can trace any invoice back to the booking, stylist, and services performed.",
    visual: <AppointmentLinkPanel />,
  },
];

/* ── page ────────────────────────────────────────────────── */
export default function InvoicingFeaturePage() {
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
                <FileText size={16} />
                Invoicing
              </div>
              <h1>Professional invoices, created in seconds</h1>
              <p>
                Salon Central generates auto-numbered invoices for every sale: mix services and products, apply discounts, record payment method, and print or save as PDF without leaving the dashboard.
              </p>
              <div className={styles.heroActions}>
                <button type="button" onClick={() => setDemoOpen(true)} className={styles.primaryCta}>
                  Get started <ArrowRight size={17} />
                </button>
                <Link href="/#pricing" className={styles.secondaryCta}>
                  View pricing
                </Link>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.imageChip}>
                <Image src="/salon-central-logo.png" alt="" width={96} height={96} />
                <span>Salon Central Invoicing</span>
              </div>
              <HeroInvoice />
            </div>
          </div>
          <div className={styles.wave} aria-hidden="true" />
        </section>

        {/* ── feature rows ── */}
        <section className={styles.featureStack}>
          {rows.map((row, index) => (
            <article key={row.title} className={`${styles.featureRow} ${index % 2 ? styles.flip : ""}`}>
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
            <span>Included in all plans including Free</span>
            <h2>Start invoicing your clients professionally today</h2>
          </div>
          <div className={styles.ctaActions}>
            <button type="button" onClick={() => setDemoOpen(true)} className={styles.primaryCta}>
              Get started <ArrowRight size={17} />
            </button>
            <Link href="/#pricing" className={styles.secondaryDark}>View pricing</Link>
          </div>
        </section>

        {/* ── mini stats ── */}
        <section className={styles.miniStats} aria-label="Invoicing advantages">
          <div>
            <Receipt size={19} />
            <strong>Auto-numbered</strong>
            <span>SI-YYYY-NNNN format, sequential counter, no gaps or duplicates.</span>
          </div>
          <div>
            <Tag size={19} />
            <strong>Discounts</strong>
            <span>Apply a flat PKR discount per invoice. Total recalculates instantly.</span>
          </div>
          <div>
            <Printer size={19} />
            <strong>PDF ready</strong>
            <span>Branded A4 invoice: print or save as PDF with one click.</span>
          </div>
          <div>
            <BarChart2 size={19} />
            <strong>Revenue tracking</strong>
            <span>Collected revenue and outstanding balance always up to date.</span>
          </div>
        </section>

      </main>
      <Footer />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
