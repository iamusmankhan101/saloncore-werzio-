"use client";
import { Hand, Gem, MessageCircle, ShoppingCart, Globe } from "lucide-react";
import VerticalPage, { type VerticalFeatureRow, type VerticalFaq, type VerticalStat } from "./VerticalPage";
import styles from "./SchedulingFeaturePage.module.css";

function ScheduleVisual() {
  const staff = [
    { name: "Sara A.", color: "#db2777", appts: ["10:00 · Gel Manicure", "12:30 · Pedicure"] },
    { name: "Nida M.", color: "#059669", appts: ["11:00 · Nail Art", "2:30 · Acrylic Fill"] },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#17112a", marginBottom: 10 }}>Today&apos;s Nail Tech Schedule</div>
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

function NailPrefsVisual() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>MK</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.92rem" }}>Maria Khan</strong>
          <span>Nail client · 9 visits</span>
        </div>
      </div>
      {[
        { label: "Nail shape", value: "Almond" },
        { label: "Go-to polish", value: "Gel · Rose Nude" },
        { label: "Allergies", value: "None on file" },
        { label: "Last visit", value: "12 Jul 2026" },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div><span>{row.label}</span><strong style={{ color: "#17112a" }}>{row.value}</strong></div>
        </div>
      ))}
    </div>
  );
}

function WhatsAppVisual() {
  return (
    <div className={styles.messagesPanel}>
      {[
        { text: "Hi Maria, your Gel Manicure appointment tomorrow at 10:00am is confirmed 💜", tag: "Confirmation" },
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
    { name: "Gel Manicure", cat: "Service", dot: "#db2777" },
    { name: "Acrylic Fill", cat: "Service", dot: "#7c3aed" },
    { name: "Gel Polish", cat: "Product · 18 left", dot: "#d97706" },
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
          { label: "New booking", value: "Sara N. · Nail Art · 4:00pm" },
          { label: "New booking", value: "Maria K. · Pedicure · 5:30pm" },
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

const rows: VerticalFeatureRow[] = [
  {
    eyebrow: "Appointments",
    title: "Nail salon scheduling software built around your calendar",
    body: "Salon Central is nail salon appointment software with a full calendar built in: staff schedules by nail tech, automatic WhatsApp confirmations, and reminders before every manicure, pedicure, or nail art appointment.",
    visual: <ScheduleVisual />,
  },
  {
    eyebrow: "Nail preferences",
    title: "Keep every client's nail shape, polish, and go-to look on file",
    body: "This nail salon management system stores each client's preferred nail shape, go-to polish color, and allergy notes, so any nail tech can pick up exactly where the last one left off.",
    visual: <NailPrefsVisual />,
  },
  {
    eyebrow: "WhatsApp automation",
    title: "Confirmations, reminders, and feedback requests sent automatically",
    body: "As nail salon POS software, Salon Central automates WhatsApp booking confirmations, appointment reminders, and a post-visit follow-up message with a link where clients rate their visit, no manual texting required.",
    visual: <WhatsAppVisual />,
  },
  {
    eyebrow: "Checkout & retail",
    title: "Sell gel polish, nail art add-ons, and treatments at the same POS",
    body: "Nail salon POS is built in: ring up services and retail products together, accept six payment methods, and watch stock deduct automatically the moment a product sells, making Salon Central the best POS system for nail salon retail.",
    visual: <CatalogVisual />,
  },
  {
    eyebrow: "Online booking",
    title: "Give clients nail salon booking software of their own",
    body: "Salon Central includes a branded online booking page clients can book from directly via Instagram, WhatsApp, or Google Maps, with new appointments landing straight in your calendar, no phone calls needed.",
    visual: <OnlineBookingVisual />,
  },
];

const stats: VerticalStat[] = [
  { icon: <Gem size={19} />, label: "Nail preference tracking", body: "Nail shape, go-to polish, and allergy notes saved per client." },
  { icon: <MessageCircle size={19} />, label: "WhatsApp automation", body: "Confirmations, reminders, and feedback requests sent without lifting a finger." },
  { icon: <Globe size={19} />, label: "Online booking page", body: "A branded booking link clients can use from Instagram, WhatsApp, or Google Maps." },
  { icon: <ShoppingCart size={19} />, label: "6 payment methods", body: "Cash, JazzCash, EasyPaisa, Raast, card, and bank transfer, all built in." },
];

const faqs: VerticalFaq[] = [
  {
    q: "What is nail salon software?",
    a: "Nail salon software is software built for how nail salons run: booking appointments, checking out services and retail products, and keeping a record of every client's nail preferences. Salon Central is nail salon software that combines all of this in one platform.",
  },
  {
    q: "Is Salon Central a nail salon management system, or just a POS?",
    a: "Salon Central is a complete nail salon management system: nail salon scheduling software, client preference tracking, POS checkout, staff payroll, and WhatsApp automation, not just a checkout screen.",
  },
  {
    q: "Does Salon Central track client nail preferences?",
    a: "Yes. Salon Central stores each client's preferred nail shape, go-to polish color, and allergy notes, so any nail tech can recreate a client's favorite look.",
  },
  {
    q: "Is there nail salon appointment software with a real calendar?",
    a: "Yes. Salon Central is nail salon appointment software with a full calendar, staff schedules by nail tech, and automated WhatsApp confirmations and reminders, not just a booking form.",
  },
  {
    q: "What is the best POS system for nail salon retail products?",
    a: "Salon Central is a strong choice as the best POS system for nail salon retail: it lets you sell gel polish, nail art add-ons, and other retail products alongside services in the same checkout, with stock levels updating automatically after every sale.",
  },
  {
    q: "Does nail salon POS software from Salon Central send appointment reminders?",
    a: "Yes. Salon Central's nail salon POS system automatically sends WhatsApp booking confirmations, reminders before the appointment, and a follow-up message afterward that includes a link for the client to rate their visit.",
  },
  {
    q: "Does Salon Central offer nail salon booking software for online bookings?",
    a: "Yes. Salon Central includes nail salon booking software: a branded online booking page clients can book from directly via Instagram, WhatsApp, or Google Maps, with appointments landing straight in your calendar.",
  },
  {
    q: "Can nail salons with multiple nail techs use Salon Central?",
    a: "Yes. Every appointment and POS sale is linked to the nail tech who performed it, so you can track schedules, commissions, and performance per staff member across any number of nail techs.",
  },
  {
    q: "Why choose Salon Central as nail salon POS?",
    a: "Salon Central combines nail salon POS, appointment scheduling, nail preference tracking, staff commission payroll, loyalty points, and WhatsApp automation in one platform built for nail salons, not adapted from a general retail POS system.",
  },
];

export default function NailSalonPage() {
  return (
    <VerticalPage
      kickerIcon={<Hand size={16} />}
      heroImage="https://images.unsplash.com/photo-1690749072212-373daf1d58ca?auto=format&fit=crop&w=900&q=70"
      kickerLabel="Nail Salons"
      h1="Nail Salon POS & Booking Software"
      heroParagraph="Salon Central is nail salon software built for how nail salons actually run: nail salon scheduling software, client nail preference tracking, WhatsApp automation, and point of sale checkout, all in one nail salon POS system."
      rows={rows}
      ctaEyebrow="Ready to upgrade your nail salon?"
      ctaTitle="See how Salon Central runs a nail salon end to end"
      ctaSubtitle="Appointments, nail preferences, POS, and WhatsApp automation in one platform."
      stats={stats}
      faqAriaLabel="Nail salon software FAQs"
      faqTitle="Nail Salon Software: Frequently Asked Questions"
      faqs={faqs}
    />
  );
}
