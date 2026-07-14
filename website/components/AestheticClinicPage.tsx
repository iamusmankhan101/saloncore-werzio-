"use client";
import { Sparkle, Droplet, MessageCircle, ShoppingCart, Package } from "lucide-react";
import VerticalPage, { type VerticalFeatureRow, type VerticalFaq, type VerticalStat } from "./VerticalPage";
import styles from "./SchedulingFeaturePage.module.css";

function ScheduleVisual() {
  const staff = [
    { name: "Dr. Ayesha M.", color: "#7c3aed", appts: ["10:00 · Consultation", "12:30 · Facial"] },
    { name: "Sara A.", color: "#0284c7", appts: ["11:00 · Skin Treatment", "2:30 · Follow-up"] },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#17112a", marginBottom: 10 }}>Today&apos;s Clinic Schedule</div>
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

function SkinProfileVisual() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>FA</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.92rem" }}>Fatima Ali</strong>
          <span>Client · Sensitive skin</span>
        </div>
      </div>
      {[
        { label: "Skin type", value: "Sensitive" },
        { label: "Allergies", value: "Fragrance, Retinol" },
        { label: "Preferred treatment", value: "Hydra Facial" },
        { label: "Last visit", value: "10 Jul 2026" },
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

function InvoiceVisual() {
  return (
    <div className={styles.checkoutPanel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.65rem", fontWeight: 900, color: "#746b83" }}>INVOICE</div>
          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#17112a" }}>SI-2026-0155</div>
        </div>
        <span style={{ background: "#dcfce7", color: "#166534", padding: "3px 9px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 900 }}>PAID</span>
      </div>
      {[
        { item: "Hydra Facial", amt: "PKR 8,500" },
        { item: "Skin Serum", amt: "PKR 3,200" },
      ].map((row) => (
        <div key={row.item} className={styles.checkoutBody}>
          <div><span>{row.item}</span><strong style={{ color: "#17112a" }}>{row.amt}</strong></div>
        </div>
      ))}
    </div>
  );
}

function InventoryVisual() {
  const items = [
    { name: "Hydra Facial Serum", stock: "8 left", dot: "#059669" },
    { name: "Skin Peel Solution", stock: "3 left", dot: "#dc2626" },
    { name: "SPF 50 Sunscreen", stock: "15 left", dot: "#059669" },
  ];
  return (
    <div className={styles.staffPanel}>
      {items.map((it) => (
        <div key={it.name} className={styles.staffRow}>
          <div className={styles.avatarSmall} style={{ background: it.dot + "22", color: it.dot }}>{it.name.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.85rem" }}>{it.name}</strong>
            <span style={{ fontSize: "0.7rem" }}>{it.stock}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const rows: VerticalFeatureRow[] = [
  {
    eyebrow: "Appointments",
    title: "Manage every consultation and treatment appointment in one calendar",
    body: "Salon Central is aesthetic clinic software with a full appointment calendar built in: staff schedules by practitioner, automatic WhatsApp confirmations, and reminders before every consultation, facial, or skin treatment.",
    visual: <ScheduleVisual />,
  },
  {
    eyebrow: "Skin profiles",
    title: "Keep skin type, allergy alerts, and treatment history on every client",
    body: "This aesthetic skin clinic software stores skin type, allergy alerts, and treatment preferences for every client, so your team always knows what to use, and what to avoid, before starting a treatment.",
    visual: <SkinProfileVisual />,
  },
  {
    eyebrow: "WhatsApp automation",
    title: "Confirmations, reminders, and feedback requests sent automatically",
    body: "As aesthetic clinic software, Salon Central automates WhatsApp booking confirmations, appointment reminders, and a post-visit follow-up message with a link where clients rate their visit.",
    visual: <WhatsAppVisual />,
  },
  {
    eyebrow: "Invoicing",
    title: "Professional invoices for treatments and skincare products",
    body: "Every treatment and retail product sale generates a branded, auto-numbered invoice you can export as PDF, with six payment methods accepted at checkout.",
    visual: <InvoiceVisual />,
  },
  {
    eyebrow: "Inventory",
    title: "Track serums, peels, and skincare products with low-stock alerts",
    body: "Aesthetic clinic software from Salon Central tracks retail and treatment product stock, deducting automatically on sale and alerting your team before serums or peels run out.",
    visual: <InventoryVisual />,
  },
];

const stats: VerticalStat[] = [
  { icon: <Droplet size={19} />, label: "Skin profile tracking", body: "Skin type and allergy alerts saved per client, checked before every treatment." },
  { icon: <MessageCircle size={19} />, label: "WhatsApp automation", body: "Confirmations, reminders, and feedback requests sent without lifting a finger." },
  { icon: <ShoppingCart size={19} />, label: "6 payment methods", body: "Cash, JazzCash, EasyPaisa, Raast, card, and bank transfer, all built in." },
  { icon: <Package size={19} />, label: "Inventory alerts", body: "Low-stock alerts for serums, peels, and skincare products before they run out." },
];

const faqs: VerticalFaq[] = [
  {
    q: "What is aesthetic clinic software?",
    a: "Aesthetic clinic software is software built for how aesthetic and skin clinics run: booking consultations and treatments, tracking each client's skin type and allergy history, and checking out treatments and retail products. Salon Central is aesthetic clinic software that combines all of this in one platform.",
  },
  {
    q: "Does Salon Central track client skin type and allergies for an aesthetic skin clinic?",
    a: "Yes. Salon Central stores skin type, allergy alerts, and treatment preferences for every client, so your team always knows what to use, and what to avoid, before starting a treatment.",
  },
  {
    q: "Is there aesthetic clinic software with appointment scheduling built in?",
    a: "Yes. Salon Central is aesthetic clinic software with a full appointment calendar, staff schedules by practitioner, and automated WhatsApp confirmations and reminders, not just a checkout screen.",
  },
  {
    q: "Can an aesthetic clinic in Lahore use Salon Central?",
    a: "Yes. Salon Central is built for aesthetic clinics anywhere in Pakistan, including an aesthetic clinic in Lahore, with appointment scheduling, client skin profiles, POS, and WhatsApp automation available out of the box.",
  },
  {
    q: "Can an aesthetic clinic in Karachi use Salon Central?",
    a: "Yes. Whether you run an aesthetic clinic in Karachi or any other city, Salon Central handles consultation and treatment scheduling, client skin profiles, invoicing, and WhatsApp automation the same way.",
  },
  {
    q: "Does Salon Central manage skincare product inventory?",
    a: "Yes. Salon Central tracks retail and treatment product stock, deducts automatically when a product sells, and alerts your team when serums, peels, or other skincare products are running low.",
  },
  {
    q: "Does an aesthetic clinic need a separate booking tool with Salon Central?",
    a: "No. Salon Central includes a branded online booking page clients can use to book consultations and treatments directly, with appointments landing straight in your calendar.",
  },
  {
    q: "Why choose Salon Central as aesthetic clinic software?",
    a: "Salon Central combines aesthetic clinic software, appointment scheduling, client skin profiles, inventory management, staff payroll, and WhatsApp automation in one platform, whether you run an aesthetic clinic in Lahore, an aesthetic clinic in Karachi, or an aesthetic skin clinic anywhere else.",
  },
];

export default function AestheticClinicPage() {
  return (
    <VerticalPage
      kickerIcon={<Sparkle size={16} />}
      heroDecorIcon={Sparkle}
      kickerLabel="Aesthetic Clinics"
      h1="Aesthetic Clinic Software | Skin Clinic Management"
      heroParagraph="Salon Central is aesthetic clinic software built for how aesthetic and skin clinics actually run: consultation and treatment scheduling, client skin profiles, WhatsApp automation, and point of sale checkout, all in one platform for an aesthetic clinic in Lahore, an aesthetic clinic in Karachi, or any aesthetic skin clinic."
      heroImageLabel="Salon Central for Aesthetic Clinics"
      heroVisual={<ScheduleVisual />}
      heroFloatingIcon={<Droplet size={15} />}
      heroFloatingText="Skin profile saved automatically"
      heroFloatingColor="#166534"
      rows={rows}
      ctaEyebrow="Ready to upgrade your clinic?"
      ctaTitle="See how Salon Central runs an aesthetic clinic end to end"
      ctaSubtitle="Consultations, skin profiles, inventory, POS, and WhatsApp automation in one platform."
      stats={stats}
      faqAriaLabel="Aesthetic clinic software FAQs"
      faqTitle="Aesthetic Clinic Software: Frequently Asked Questions"
      faqs={faqs}
    />
  );
}
