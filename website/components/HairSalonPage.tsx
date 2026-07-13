"use client";
import { Scissors, Palette, Wand2, MessageCircle, ShoppingCart, Globe, Receipt } from "lucide-react";
import VerticalPage, { type VerticalFeatureRow, type VerticalFaq, type VerticalStat } from "./VerticalPage";
import styles from "./SchedulingFeaturePage.module.css";

function ScheduleVisual() {
  const staff = [
    { name: "Zara K.", color: "#7c3aed", appts: ["10:00 · Hair Color", "12:30 · Keratin"] },
    { name: "Ayesha M.", color: "#db2777", appts: ["11:00 · Balayage", "2:30 · Blow Dry"] },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#17112a", marginBottom: 10 }}>Today&apos;s Stylist Schedule</div>
      {staff.map((s) => (
        <div key={s.name} className={styles.staffRow}>
          <div className={styles.avatarSmall} style={{ background: s.color + "22", color: s.color }}>{s.name.charAt(0)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{s.name}</strong>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3 }}>
              {s.appts.map((a) => <span key={a} style={{ fontSize: "0.65rem", color: "#9898b0" }}>{a}</span>)}
            </div>
          </div>
          <em style={{ fontSize: "0.7rem", color: s.color, fontStyle: "normal", fontWeight: 700 }}>{s.appts.length} appts</em>
        </div>
      ))}
    </div>
  );
}

function HairFormulaVisual() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>SN</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.92rem" }}>Sana Nawaz</strong>
          <span>Hair color client · 6 visits</span>
        </div>
      </div>
      {[
        { label: "Brand", value: "Wella Koleston" },
        { label: "Shade", value: "7.1 Ash Blonde" },
        { label: "Developer / Ratio", value: "20 vol · 1:1.5" },
        { label: "Processing time", value: "35 min" },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div><span>{row.label}</span><strong style={{ color: "#17112a" }}>{row.value}</strong></div>
        </div>
      ))}
    </div>
  );
}

function TryOnVisual() {
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader}>
        <Wand2 size={17} />
        <span>AI Virtual Try-On</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        {["Balayage", "Copper Red", "Platinum Blonde", "Chocolate Brown"].map((look) => (
          <div key={look} style={{ padding: "12px 10px", borderRadius: 14, background: "#f5f3ff", color: "#5b21b6", fontWeight: 800, fontSize: "0.8rem", textAlign: "center" }}>
            {look}
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatsAppVisual() {
  return (
    <div className={styles.messagesPanel}>
      {[
        { text: "Hi Sana, your Hair Color appointment tomorrow at 3:00pm is confirmed 💜", tag: "Confirmation" },
        { text: "Thank you for visiting! How was your visit? Leave a quick rating ⭐", tag: "Follow-up" },
      ].map((m) => (
        <div key={m.tag} style={{ background: "#f5f3ff", borderRadius: 14, padding: "10px 14px", marginBottom: 10 }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#7c3aed", marginBottom: 4, textTransform: "uppercase" }}>{m.tag}</div>
          <div style={{ fontSize: "0.8rem", color: "#312a3d" }}>{m.text}</div>
        </div>
      ))}
    </div>
  );
}

function CatalogVisual() {
  const items = [
    { name: "Hair Color", cat: "Service", dot: "#7c3aed" },
    { name: "Keratin Treatment", cat: "Service", dot: "#059669" },
    { name: "Loreal Shampoo", cat: "Product · 12 left", dot: "#d97706" },
  ];
  return (
    <div className={styles.staffPanel}>
      {items.map((it) => (
        <div key={it.name} className={styles.staffRow}>
          <div className={styles.avatarSmall} style={{ background: it.dot + "22", color: it.dot }}>{it.name.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.85rem" }}>{it.name}</strong>
            <span style={{ fontSize: "0.7rem" }}>{it.cat}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function OnlineBookingVisual() {
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader}>
        <Globe size={17} />
        <span>Online Booking Page</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {[
          { label: "New booking", value: "Sana N. · Hair Color · 3:00pm" },
          { label: "New booking", value: "Maria K. · Balayage · 5:30pm" },
        ].map((b, i) => (
          <div key={i} style={{ padding: "10px 12px", borderRadius: 12, background: "#f5f3ff", fontSize: "0.78rem" }}>
            <div style={{ fontWeight: 800, color: "#7c3aed", fontSize: "0.68rem", textTransform: "uppercase", marginBottom: 2 }}>{b.label}</div>
            <div style={{ color: "#17112a", fontWeight: 700 }}>{b.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvoiceVisual() {
  return (
    <div className={styles.checkoutPanel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.65rem", fontWeight: 900, color: "#746b83" }}>INVOICE</div>
          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#17112a" }}>SI-2026-0091</div>
        </div>
        <span style={{ background: "#dcfce7", color: "#166534", padding: "3px 9px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 900 }}>PAID</span>
      </div>
      {[
        { item: "Hair Color", amt: "PKR 4,500" },
        { item: "Keratin Treatment", amt: "PKR 6,000" },
      ].map((row) => (
        <div key={row.item} className={styles.checkoutBody}>
          <div><span>{row.item}</span><strong style={{ color: "#17112a" }}>{row.amt}</strong></div>
        </div>
      ))}
    </div>
  );
}

const rows: VerticalFeatureRow[] = [
  {
    eyebrow: "Appointments",
    title: "Book and manage every hair appointment in one calendar",
    body: "Salon Central is a hair salon point of sale system with a real appointment calendar built in: staff schedules by stylist, automatic WhatsApp confirmations, and reminders before every hair color, cut, or keratin appointment.",
    visual: <ScheduleVisual />,
  },
  {
    eyebrow: "Hair formulas",
    title: "Track every client's exact hair color formula and history",
    body: "This hair salon POS software stores the brand, shade, developer, ratio, and processing time for every client's color formula alongside allergy alerts and skin type, so any stylist can pick up exactly where the last one left off.",
    visual: <HairFormulaVisual />,
  },
  {
    eyebrow: "Virtual try-on",
    title: "Let clients preview a new hair color before you touch a single strand",
    body: "Salon Central's AI virtual try-on generates a realistic preview of hair color and hairstyle changes on the client's own photo, a feature most hair salon POS systems don't offer, helping close consultations faster.",
    visual: <TryOnVisual />,
  },
  {
    eyebrow: "WhatsApp automation",
    title: "Confirmations, reminders, and feedback requests sent automatically",
    body: "As hair salon point of sale software, Salon Central automates WhatsApp booking confirmations, appointment reminders, and a post-visit follow-up message with a link where clients rate their visit, no manual texting required.",
    visual: <WhatsAppVisual />,
  },
  {
    eyebrow: "Checkout & retail",
    title: "Sell shampoos, color kits, and treatments at the same POS",
    body: "Point of sale software for hair salon retail is built in: ring up services and retail products together, accept six payment methods, and watch stock deduct automatically the moment a product sells.",
    visual: <CatalogVisual />,
  },
  {
    eyebrow: "Online booking",
    title: "Give clients hair salon booking software of their own",
    body: "Salon Central includes hair salon online booking software: a branded page clients can book from directly via Instagram, WhatsApp, or Google Maps, with new appointments landing straight in your calendar, no phone calls needed.",
    visual: <OnlineBookingVisual />,
  },
  {
    eyebrow: "Invoicing",
    title: "Auto-numbered invoices double as hair salon accounting software",
    body: "Every sale in Salon Central generates a branded, auto-numbered invoice you can export as PDF, giving hair salons simple hair salon invoicing software and accounting software for tracking revenue without a separate bookkeeping tool.",
    visual: <InvoiceVisual />,
  },
];

const stats: VerticalStat[] = [
  { icon: <Palette size={19} />, label: "Hair formula tracking", body: "Brand, shade, developer, and processing time saved per client, every visit." },
  { icon: <Wand2 size={19} />, label: "AI virtual try-on", body: "Preview hair color and hairstyle changes before the client sits in the chair." },
  { icon: <MessageCircle size={19} />, label: "WhatsApp automation", body: "Confirmations, reminders, and feedback requests sent without lifting a finger." },
  { icon: <ShoppingCart size={19} />, label: "6 payment methods", body: "Cash, JazzCash, EasyPaisa, Raast, card, and bank transfer, all built in." },
];

const faqs: VerticalFaq[] = [
  {
    q: "What is hair salon POS software?",
    a: "Hair salon POS software is point of sale software built specifically for how hair salons run: booking appointments, checking out services and retail products, and keeping a record of every client's hair color formulas. Salon Central is hair salon POS software that combines all of this in one platform.",
  },
  {
    q: "Does Salon Central track hair color formulas?",
    a: "Yes. Salon Central stores each client's hair color formula, including brand, shade, developer, ratio, and processing time, alongside allergy alerts and skin type, so any stylist can recreate a color exactly.",
  },
  {
    q: "Is there a hair salon point of sale system with appointment scheduling built in?",
    a: "Yes. Salon Central is a hair salon point of sale system with a full appointment calendar, staff schedules by stylist, and automated WhatsApp confirmations and reminders, not just a checkout screen.",
  },
  {
    q: "Can hair salons use Salon Central for multiple stylists?",
    a: "Yes. Every appointment and POS sale is linked to the stylist who performed it, so you can track schedules, commissions, and performance per stylist across hair salon POS systems with any number of staff.",
  },
  {
    q: "Does Salon Central let clients preview hair colors before booking?",
    a: "Yes. Salon Central's AI virtual try-on generates a preview of a new hair color or hairstyle on the client's own photo, helping clients decide before they book or sit in the chair.",
  },
  {
    q: "Is Salon Central good point of sale software for hair salon retail products?",
    a: "Yes. Salon Central lets you sell shampoos, color kits, and other retail products alongside services in the same checkout, with stock levels updating automatically after every sale.",
  },
  {
    q: "Does hair salon POS software from Salon Central send appointment reminders?",
    a: "Yes. Salon Central automatically sends WhatsApp booking confirmations, reminders before the appointment, and a follow-up message afterward that includes a link for the client to rate their visit.",
  },
  {
    q: "Why choose Salon Central as hair salon POS software?",
    a: "Salon Central combines hair salon POS software, appointment scheduling, hair formula tracking, AI virtual try-on, staff commission payroll, loyalty points, and WhatsApp automation in one platform built specifically for hair salons, not adapted from a general retail POS system.",
  },
  {
    q: "Is Salon Central hair salon management software, or just a POS?",
    a: "Salon Central is complete hair salon management software: appointment scheduling, hair salon booking software for online bookings, POS checkout, hair salon invoicing software, staff payroll, and WhatsApp automation, not just a checkout screen.",
  },
  {
    q: "Does Salon Central offer hair salon invoicing and accounting software?",
    a: "Yes. Every sale generates a branded, auto-numbered invoice you can export as PDF, giving hair salons simple hair salon accounting software and invoicing software for tracking revenue without a separate bookkeeping tool.",
  },
  {
    q: "Why is Salon Central considered the best hair salon software?",
    a: "Salon Central is one of the best hair salon software options because it combines hair salon software, hair salon booking software, hair salon POS software, and hair salon accounting software in one platform, instead of requiring separate tools for scheduling, checkout, and invoicing.",
  },
];

export default function HairSalonPage() {
  return (
    <VerticalPage
      kickerIcon={<Scissors size={16} />}
      kickerLabel="Hair Salons"
      h1="Hair Salon POS & Booking Software"
      heroParagraph="Salon Central is hair salon POS software built for how hair salons actually run: appointment scheduling, hair formula tracking, AI virtual hair color try-on, WhatsApp automation, and point of sale checkout, all in one hair salon point of sale system."
      heroImageLabel="Salon Central for Hair Salons"
      heroVisual={<ScheduleVisual />}
      heroFloatingIcon={<Palette size={15} />}
      heroFloatingText="Hair formula saved automatically"
      heroFloatingColor="#166534"
      rows={rows}
      ctaEyebrow="Ready to upgrade your hair salon?"
      ctaTitle="See how Salon Central runs a hair salon end to end"
      ctaSubtitle="Appointments, hair formulas, POS, and WhatsApp automation in one platform."
      stats={stats}
      faqAriaLabel="Hair salon POS software FAQs"
      faqTitle="Hair Salon POS Software: Frequently Asked Questions"
      faqs={faqs}
    />
  );
}
