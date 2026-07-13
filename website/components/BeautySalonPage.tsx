"use client";
import { Sparkles, Gift, MessageCircle, ShoppingCart, ShieldCheck } from "lucide-react";
import VerticalPage, { type VerticalFeatureRow, type VerticalFaq, type VerticalStat } from "./VerticalPage";
import styles from "./SchedulingFeaturePage.module.css";

function ScheduleVisual() {
  const staff = [
    { name: "Nida M.", color: "#059669", appts: ["11:00 · Hydra Facial", "2:30 · Cleanup"] },
    { name: "Fatima K.", color: "#0284c7", appts: ["10:00 · Microdermabrasion", "1:00 · Waxing"] },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#17112a", marginBottom: 10 }}>Today&apos;s Beauty Schedule</div>
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

function BeautyProfileVisual() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>FA</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.92rem" }}>Fatima Ali</strong>
          <span>Beauty client · Sensitive skin</span>
        </div>
      </div>
      {[
        { label: "Skin type", value: "Sensitive" },
        { label: "Allergies", value: "Fragrance, Retinol" },
        { label: "Preferred facial", value: "Hydra Facial" },
        { label: "Last visit", value: "12 Jul 2026" },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div><span>{row.label}</span><strong style={{ color: "#17112a" }}>{row.value}</strong></div>
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
        <span>Loyalty & membership tiers</span>
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

function WhatsAppVisual() {
  return (
    <div className={styles.messagesPanel}>
      {[
        { text: "Hi Fatima, your Hydra Facial appointment tomorrow at 11:00am is confirmed 💜", tag: "Confirmation" },
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
    { name: "Hydra Facial", cat: "Service", dot: "#0284c7" },
    { name: "Microdermabrasion", cat: "Service", dot: "#059669" },
    { name: "Skin Serum SPF50", cat: "Product · 3 left", dot: "#dc2626" },
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
    title: "Book and manage every beauty treatment in one calendar",
    body: "Salon Central is beauty salon POS software with a full appointment calendar built in: staff schedules by esthetician, automatic WhatsApp confirmations, and reminders before every facial, waxing, or skin treatment.",
    visual: <ScheduleVisual />,
  },
  {
    eyebrow: "Beauty profiles",
    title: "Keep skin type, allergy alerts, and treatment history on every client",
    body: "This beauty salon point of sale system stores skin type, allergy alerts, and treatment preferences for every client, so your team always knows what to use, and what to avoid, before starting a service.",
    visual: <BeautyProfileVisual />,
  },
  {
    eyebrow: "Loyalty & packages",
    title: "Reward repeat clients with points and membership tiers",
    body: "Beauty salon POS software from Salon Central includes a loyalty points program with Bronze, Silver, and Gold membership tiers, encouraging clients to keep coming back for their next facial or treatment.",
    visual: <LoyaltyVisual />,
  },
  {
    eyebrow: "WhatsApp automation",
    title: "Confirmations, reminders, and feedback requests sent automatically",
    body: "As beauty salon point of sale software, Salon Central automates WhatsApp booking confirmations, appointment reminders, and a post-visit follow-up message with a link where clients rate their visit.",
    visual: <WhatsAppVisual />,
  },
  {
    eyebrow: "Checkout & retail",
    title: "Sell skincare, serums, and treatments at the same POS",
    body: "POS software for beauty salon retail is built in: ring up services and skincare products together, accept six payment methods, and watch stock deduct automatically the moment a product sells.",
    visual: <CatalogVisual />,
  },
];

const stats: VerticalStat[] = [
  { icon: <ShieldCheck size={19} />, label: "Beauty client profiles", body: "Skin type and allergy alerts saved per client, checked before every treatment." },
  { icon: <Gift size={19} />, label: "Loyalty & membership tiers", body: "Bronze, Silver, and Gold tiers to keep clients coming back." },
  { icon: <MessageCircle size={19} />, label: "WhatsApp automation", body: "Confirmations, reminders, and feedback requests sent without lifting a finger." },
  { icon: <ShoppingCart size={19} />, label: "6 payment methods", body: "Cash, JazzCash, EasyPaisa, Raast, card, and bank transfer, all built in." },
];

const faqs: VerticalFaq[] = [
  {
    q: "What is beauty salon POS software?",
    a: "Beauty salon POS software is point of sale software built for how beauty salons run: booking treatments, checking out services and skincare products, and keeping a record of every client's skin type and allergy alerts. Salon Central is beauty salon POS software that combines all of this in one platform.",
  },
  {
    q: "Does Salon Central track client skin type and allergies?",
    a: "Yes. Salon Central stores skin type, allergy alerts, and treatment preferences for every client, so your team always knows what to use, and what to avoid, before starting a service.",
  },
  {
    q: "Is there beauty salon point of sale software with appointment scheduling built in?",
    a: "Yes. Salon Central is beauty salon point of sale software with a full appointment calendar, staff schedules by esthetician, and automated WhatsApp confirmations and reminders, not just a checkout screen.",
  },
  {
    q: "Does Salon Central offer a loyalty program for beauty salons?",
    a: "Yes. Salon Central includes a loyalty points program with Bronze, Silver, and Gold membership tiers, so beauty salons can reward repeat clients and encourage them to rebook.",
  },
  {
    q: "Is Salon Central good POS software for beauty salon retail products?",
    a: "Yes. Salon Central lets you sell skincare, serums, and other retail products alongside services in the same checkout, with stock levels updating automatically after every sale.",
  },
  {
    q: "Does beauty salon POS software from Salon Central send appointment reminders?",
    a: "Yes. Salon Central automatically sends WhatsApp booking confirmations, reminders before the appointment, and a follow-up message afterward that includes a link for the client to rate their visit.",
  },
  {
    q: "Can beauty salons with multiple estheticians use Salon Central?",
    a: "Yes. Every appointment and POS sale is linked to the staff member who performed it, so you can track schedules, commissions, and performance per esthetician.",
  },
  {
    q: "Why choose Salon Central as beauty salon POS software?",
    a: "Salon Central combines beauty salon POS software, appointment scheduling, detailed beauty client profiles, loyalty points, staff commission payroll, and WhatsApp automation in one platform built specifically for beauty salons, not adapted from a general retail POS system.",
  },
];

export default function BeautySalonPage() {
  return (
    <VerticalPage
      kickerIcon={<Sparkles size={16} />}
      kickerLabel="Beauty Salons"
      h1="Beauty Salon POS & Management Software"
      heroParagraph="Salon Central is beauty salon POS software built for how beauty salons actually run: appointment scheduling, detailed beauty client profiles, loyalty membership tiers, WhatsApp automation, and point of sale checkout, all in one beauty salon point of sale system."
      heroImageLabel="Salon Central for Beauty Salons"
      heroVisual={<ScheduleVisual />}
      rows={rows}
      ctaEyebrow="Ready to upgrade your beauty salon?"
      ctaTitle="See how Salon Central runs a beauty salon end to end"
      ctaSubtitle="Appointments, beauty profiles, loyalty, POS, and WhatsApp automation in one platform."
      stats={stats}
      faqAriaLabel="Beauty salon POS software FAQs"
      faqTitle="Beauty Salon POS Software: Frequently Asked Questions"
      faqs={faqs}
    />
  );
}
