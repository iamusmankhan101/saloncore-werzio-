"use client";
import { Mars, UserRound, Wand2, MessageCircle, ShoppingCart, Globe } from "lucide-react";
import VerticalPage, { type VerticalFeatureRow, type VerticalFaq, type VerticalStat } from "./VerticalPage";
import styles from "./SchedulingFeaturePage.module.css";

function ScheduleVisual() {
  const staff = [
    { name: "Bilal R.", color: "#7c3aed", appts: ["10:00 · Haircut", "12:30 · Beard Trim"] },
    { name: "Hamza A.", color: "#0891b2", appts: ["11:00 · Shave", "2:30 · Facial"] },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#17112a", marginBottom: 10 }}>Today&apos;s Barber Schedule</div>
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

function GroomingProfileVisual() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>AR</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.92rem" }}>Ali Raza</strong>
          <span>Regular client · 9 visits</span>
        </div>
      </div>
      {[
        { label: "Preferred Style", value: "Fade + Taper" },
        { label: "Beard Style", value: "Short Boxed" },
        { label: "Skin Type", value: "Sensitive" },
        { label: "Last Visit", value: "3 weeks ago" },
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
        {["Fade Cut", "Beard Sculpt", "Pompadour", "Crew Cut"].map((look) => (
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
        { text: "Hi Ali, your Haircut + Beard Trim appointment tomorrow at 5:00pm is confirmed 💈", tag: "Confirmation" },
        { text: "Thanks for visiting! How was your visit? Leave a quick rating ⭐", tag: "Follow-up" },
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
    { name: "Haircut", cat: "Service", dot: "#7c3aed" },
    { name: "Beard Trim", cat: "Service", dot: "#0891b2" },
    { name: "Pomade", cat: "Product · 8 left", dot: "#d97706" },
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
          { label: "New booking", value: "Ali R. · Haircut · 5:00pm" },
          { label: "New booking", value: "Hamza A. · Beard Trim · 6:30pm" },
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
          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#17112a" }}>SI-2026-0142</div>
        </div>
        <span style={{ background: "#dcfce7", color: "#166534", padding: "3px 9px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 900 }}>PAID</span>
      </div>
      {[
        { item: "Haircut", amt: "PKR 1,500" },
        { item: "Beard Trim", amt: "PKR 800" },
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
    title: "Book and manage every barber appointment in one calendar",
    body: "Salon Central is men's salon software with a real appointment calendar built in: barber schedules, automatic WhatsApp confirmations, and reminders before every haircut, beard trim, or shave — built for how a salon for men actually runs, not adapted from a general POS.",
    visual: <ScheduleVisual />,
  },
  {
    eyebrow: "Grooming profiles",
    title: "Track every client's preferred style, beard length, and skin type",
    body: "This men's salon POS software stores each client's preferred haircut style, beard length, and skin type alongside allergy alerts, so any barber can pick up exactly where the last one left off.",
    visual: <GroomingProfileVisual />,
  },
  {
    eyebrow: "Virtual try-on",
    title: "Let clients preview a new haircut or beard style before you touch the clippers",
    body: "Salon Central's AI virtual try-on generates a realistic preview of haircut and beard style changes on the client's own photo, a feature most men's salon software doesn't offer, helping close walk-ins and consultations faster.",
    visual: <TryOnVisual />,
  },
  {
    eyebrow: "WhatsApp automation",
    title: "Confirmations, reminders, and feedback requests sent automatically",
    body: "As men's salon booking software, Salon Central automates WhatsApp booking confirmations, appointment reminders, and a post-visit follow-up message with a link where clients rate their visit, no manual texting required.",
    visual: <WhatsAppVisual />,
  },
  {
    eyebrow: "Checkout & retail",
    title: "Sell pomades, beard oils, and grooming products at the same POS",
    body: "Point of sale software for a mens hair salon is built in: ring up services and retail grooming products together, accept six payment methods, and watch stock deduct automatically the moment a product sells.",
    visual: <CatalogVisual />,
  },
  {
    eyebrow: "Online booking",
    title: "Give clients a men's salon booking page of their own",
    body: "Salon Central includes men's salon booking software: a branded page clients can book from directly via Instagram, WhatsApp, or Google Maps, so anyone searching \"men's salon near me\" lands straight in your calendar, no phone calls needed.",
    visual: <OnlineBookingVisual />,
  },
  {
    eyebrow: "Invoicing",
    title: "Auto-numbered invoices double as men's salon accounting software",
    body: "Every sale in Salon Central generates a branded, auto-numbered invoice you can export as PDF, giving men's salons simple invoicing and accounting software for tracking revenue without a separate bookkeeping tool.",
    visual: <InvoiceVisual />,
  },
];

const stats: VerticalStat[] = [
  { icon: <UserRound size={19} />, label: "Grooming profile tracking", body: "Preferred style, beard length, and skin type saved per client, every visit." },
  { icon: <Wand2 size={19} />, label: "AI virtual try-on", body: "Preview haircuts and beard styles before the client sits in the chair." },
  { icon: <MessageCircle size={19} />, label: "WhatsApp automation", body: "Confirmations, reminders, and feedback requests sent without lifting a finger." },
  { icon: <ShoppingCart size={19} />, label: "6 payment methods", body: "Cash, JazzCash, EasyPaisa, Raast, card, and bank transfer, all built in." },
];

const faqs: VerticalFaq[] = [
  {
    q: "What is men's salon software?",
    a: "Men's salon software is point of sale and booking software built specifically for how a men's salon or barbershop runs: appointment scheduling, POS checkout, client grooming profiles, and WhatsApp reminders. Salon Central is men's salon software that combines all of this in one platform.",
  },
  {
    q: "Is there men's salon software for booking appointments online?",
    a: "Yes. Salon Central gives every men's salon an online booking page so clients searching \"men's salon near me\" can find your salon and book a haircut, beard trim, or facial directly, with new appointments landing straight in your calendar.",
  },
  {
    q: "Do you support salons for men, not just women's salons?",
    a: "Yes. Salon Central works for any salon for men — barbershops, grooming lounges, or a mens hair salon — with barber schedules, POS checkout, and client profiles built around men's grooming services rather than adapted from a women's salon system. Whether your business shows up in search as a men's salon, salon for men, or salon men, Salon Central fits how you actually run appointments and checkout.",
  },
  {
    q: "Is Salon Central used by men's salons in Lahore?",
    a: "Yes. Salon Central is used by men's salons in Lahore, including a men's salon in DHA, to manage bookings, POS checkout, staff schedules, and WhatsApp reminders in one platform.",
  },
  {
    q: "How can my business become the best men's salon in Lahore?",
    a: "Consistent booking, fast checkout, and reliable WhatsApp reminders go a long way toward being known as the best men's salon in Lahore. Salon Central handles the scheduling, client records, and communication side, so your barbers can focus on the haircut, beard trim, or shave itself.",
  },
  {
    q: "Is Salon Central good software for a mens hair salon?",
    a: "Yes. Salon Central is built for a mens hair salon's actual workflow: barber schedules, grooming profile tracking (preferred style, beard length, skin type), retail checkout for grooming products, and automated WhatsApp reminders.",
  },
  {
    q: "What makes Salon Central the best mens salon software?",
    a: "Salon Central is considered among the best mens salon software because it combines appointment scheduling, an online booking page, POS checkout, client grooming profiles, staff payroll, and WhatsApp automation in one platform, instead of requiring separate tools for scheduling, checkout, and reminders.",
  },
  {
    q: "Does Salon Central work for a men's salon in DHA?",
    a: "Yes. Men's salons across DHA and greater Lahore use Salon Central to manage appointments, POS checkout, staff schedules, and client records without juggling separate booking and billing tools.",
  },
  {
    q: "Can clients find my men's salon near me on Google or Instagram?",
    a: "Yes. Salon Central's online booking page can be linked directly from Instagram, WhatsApp, and Google Maps, so clients searching \"men's salon near me\" can see your availability and book instantly.",
  },
  {
    q: "Does men's salon software from Salon Central send appointment reminders?",
    a: "Yes. Salon Central automatically sends WhatsApp booking confirmations, reminders before the appointment, and a follow-up message afterward with a link for the client to rate their visit.",
  },
  {
    q: "Is Salon Central men's salon management software, or just a POS?",
    a: "Salon Central is complete men's salon management software: appointment scheduling, online booking, POS checkout, staff payroll, loyalty points, and WhatsApp automation, not just a checkout screen.",
  },
];

export default function MensSalonPage() {
  return (
    <VerticalPage
      kickerIcon={<Mars size={16} />}
      heroImage="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=70"
      kickerLabel="Men's Salons"
      h1="Men's Salon POS & Booking Software"
      heroParagraph="Salon Central is men's salon software built for how a modern salon for men actually runs: barber schedules, grooming profile tracking, an online booking page so clients searching &quot;men's salon near me&quot; can book you directly, WhatsApp reminders, and POS checkout, all in one platform trusted by men's salons in Lahore and DHA."
      rows={rows}
      ctaEyebrow="Ready to upgrade your men's salon?"
      ctaTitle="See how Salon Central runs a men's salon end to end"
      ctaSubtitle="Appointments, grooming profiles, POS, and WhatsApp automation in one platform."
      stats={stats}
      faqAriaLabel="Men's salon software FAQs"
      faqTitle="Men's Salon Software: Frequently Asked Questions"
      faqs={faqs}
    />
  );
}
