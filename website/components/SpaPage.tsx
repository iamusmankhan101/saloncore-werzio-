"use client";
import { Flower2, MapPin, Gift, MessageCircle, ShoppingCart } from "lucide-react";
import VerticalPage, { type VerticalFeatureRow, type VerticalFaq, type VerticalStat } from "./VerticalPage";
import styles from "./SchedulingFeaturePage.module.css";

function ScheduleVisual() {
  const staff = [
    { name: "Ayesha M.", color: "#7c3aed", appts: ["10:00 · Swedish Massage", "1:00 · Aromatherapy"] },
    { name: "Sara A.", color: "#db2777", appts: ["11:30 · Body Scrub", "3:00 · Hot Stone"] },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#17112a", marginBottom: 10 }}>Today&apos;s Spa Schedule</div>
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

function LoyaltyVisual() {
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader}>
        <Gift size={17} />
        <span>Loyalty & packages</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {[
          { tier: "Bronze", pts: "0-500 pts", color: "#b45309", bg: "#fff7ed" },
          { tier: "Silver", pts: "500-1500 pts", color: "#475569", bg: "#f8fafc" },
          { tier: "Gold", pts: "1500+ pts", color: "#a16207", bg: "#fefce8" },
        ].map((t) => (
          <div key={t.tier} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", borderRadius: 10, background: t.bg, color: t.color, fontWeight: 800, fontSize: "0.8rem" }}>
            <span>{t.tier}</span><span>{t.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiBranchVisual() {
  return (
    <div className={styles.checkoutPanel}>
      {[
        { name: "DHA Branch", staff: "8 staff", color: "#7c3aed" },
        { name: "Gulberg Branch", staff: "5 staff", color: "#059669" },
      ].map((b) => (
        <div key={b.name} className={styles.checkoutBody}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={14} color={b.color} />
            <span>{b.name}</span>
          </div>
          <strong style={{ color: "#17112a" }}>{b.staff}</strong>
        </div>
      ))}
    </div>
  );
}

function WhatsAppVisual() {
  return (
    <div className={styles.messagesPanel}>
      {[
        { text: "Hi Maria, your Swedish Massage appointment tomorrow at 10:00am is confirmed 💜", tag: "Confirmation" },
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
    { name: "Swedish Massage", cat: "Service", dot: "#7c3aed" },
    { name: "Aromatherapy", cat: "Service", dot: "#059669" },
    { name: "Massage Oil", cat: "Product · 9 left", dot: "#d97706" },
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

const rows: VerticalFeatureRow[] = [
  {
    eyebrow: "Appointments",
    title: "Book and manage every spa treatment in one calendar",
    body: "Salon Central is a spa point of sale system with a full appointment calendar built in: staff schedules by therapist, automatic WhatsApp confirmations, and reminders before every massage, facial, or body treatment.",
    visual: <ScheduleVisual />,
  },
  {
    eyebrow: "Loyalty & packages",
    title: "Reward repeat clients with points and membership tiers",
    body: "Salon Central doubles as spa membership software, with a loyalty points program and Bronze, Silver, and Gold membership tiers, so packages and repeat visits keep clients coming back.",
    visual: <LoyaltyVisual />,
  },
  {
    eyebrow: "Multi-branch support",
    title: "Run more than one spa location from a single account",
    body: "This POS system for salon and spa businesses supports multiple branches from one account, with staff, appointments, and inventory tracked separately per location but visible in one dashboard.",
    visual: <MultiBranchVisual />,
  },
  {
    eyebrow: "WhatsApp automation",
    title: "Confirmations, reminders, and feedback requests sent automatically",
    body: "As a salon spa POS system, Salon Central automates WhatsApp booking confirmations, appointment reminders, and a post-visit follow-up message with a link where clients rate their treatment.",
    visual: <WhatsAppVisual />,
  },
  {
    eyebrow: "Checkout & retail",
    title: "Sell oils, wellness products, and treatments at the same POS",
    body: "POS software for spa retail is built in: ring up treatments and retail products together, accept six payment methods, and watch stock deduct automatically the moment a product sells.",
    visual: <CatalogVisual />,
  },
];

const stats: VerticalStat[] = [
  { icon: <MapPin size={19} />, label: "Multi-branch support", body: "Run multiple spa locations from a single Salon Central account." },
  { icon: <Gift size={19} />, label: "Loyalty & packages", body: "Bronze, Silver, and Gold tiers to keep clients coming back." },
  { icon: <MessageCircle size={19} />, label: "WhatsApp automation", body: "Confirmations, reminders, and feedback requests sent without lifting a finger." },
  { icon: <ShoppingCart size={19} />, label: "6 payment methods", body: "Cash, JazzCash, EasyPaisa, Raast, card, and bank transfer, all built in." },
];

const faqs: VerticalFaq[] = [
  {
    q: "What is spa POS software?",
    a: "Spa POS software is point of sale software built for how spas run: booking treatments, checking out services and retail products, and managing staff schedules across one or more locations. Salon Central is spa POS software that combines all of this in one platform.",
  },
  {
    q: "Is there a spa point of sale system with appointment scheduling built in?",
    a: "Yes. Salon Central is a spa point of sale system with a full appointment calendar, staff schedules by therapist, and automated WhatsApp confirmations and reminders, not just a checkout screen.",
  },
  {
    q: "Is Salon Central a POS system for salon and spa businesses?",
    a: "Yes. Salon Central works as a salon spa POS system, supporting salons, spas, and combined salon-and-spa businesses with the same appointment scheduling, POS, and client profile tools.",
  },
  {
    q: "Does Salon Central support spas with multiple branches?",
    a: "Yes. Salon Central supports multiple branches from a single account, with staff, appointments, and inventory tracked separately per location but visible together in one dashboard.",
  },
  {
    q: "Does Salon Central offer a loyalty program for spas?",
    a: "Yes. Salon Central includes a loyalty points program with Bronze, Silver, and Gold membership tiers, so spas can reward repeat clients and encourage rebooking for packages and treatments.",
  },
  {
    q: "Is Salon Central good POS software for spa retail products?",
    a: "Yes. Salon Central lets you sell oils, wellness products, and other retail items alongside treatments in the same checkout, with stock levels updating automatically after every sale.",
  },
  {
    q: "Does spa point of sale software from Salon Central send appointment reminders?",
    a: "Yes. Salon Central automatically sends WhatsApp booking confirmations, reminders before the appointment, and a follow-up message afterward that includes a link for the client to rate their visit.",
  },
  {
    q: "Why choose Salon Central as spa POS software?",
    a: "Salon Central combines spa POS software, appointment scheduling, multi-branch support, loyalty points, staff commission payroll, and WhatsApp automation in one platform, built for spas rather than adapted from a general retail POS system.",
  },
  {
    q: "Is Salon Central salon and spa software, or just for one or the other?",
    a: "Salon Central is salon and spa software built to work for both: the same appointment scheduling, POS, client profiles, and WhatsApp automation apply whether you run a hair salon, a beauty salon, a spa, or a combined salon spa software setup.",
  },
  {
    q: "Can medical spas use Salon Central?",
    a: "Yes. Salon Central works as medical spa management software for the operational side of the business, appointment scheduling, staff calendars, client records, POS checkout, and WhatsApp automation, the same tools it offers day spas and wellness spas.",
  },
  {
    q: "Does Salon Central offer spa membership software?",
    a: "Yes. Salon Central includes a loyalty points program with Bronze, Silver, and Gold membership tiers, working as spa membership software to reward repeat clients and encourage rebooking for packages and treatments.",
  },
];

export default function SpaPage() {
  return (
    <VerticalPage
      kickerIcon={<Flower2 size={16} />}
      heroImage="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=70"
      kickerLabel="Spas"
      h1="Spa POS & Booking Software"
      heroParagraph="Salon Central is spa POS software built for how spas actually run: appointment scheduling, multi-branch support, loyalty membership tiers, WhatsApp automation, and point of sale checkout, all in one spa point of sale system."
      rows={rows}
      ctaEyebrow="Ready to upgrade your spa?"
      ctaTitle="See how Salon Central runs a spa end to end"
      ctaSubtitle="Appointments, packages, multi-branch support, POS, and WhatsApp automation in one platform."
      stats={stats}
      faqAriaLabel="Spa POS software FAQs"
      faqTitle="Spa POS Software: Frequently Asked Questions"
      faqs={faqs}
    />
  );
}
