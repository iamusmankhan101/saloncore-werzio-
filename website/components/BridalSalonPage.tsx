"use client";
import { Crown, Heart, Wand2, MessageCircle, ShoppingCart } from "lucide-react";
import VerticalPage, { type VerticalFeatureRow, type VerticalFaq, type VerticalStat } from "./VerticalPage";
import styles from "./SchedulingFeaturePage.module.css";

function ScheduleVisual() {
  const staff = [
    { name: "Ayesha M.", color: "#7c3aed", appts: ["10:00 · Bridal Trial", "1:00 · Hair Trial"] },
    { name: "Sara A.", color: "#db2777", appts: ["Sat · Bridal Day", "11:00 · Makeup Trial"] },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#17112a", marginBottom: 10 }}>Today&apos;s Bridal Schedule</div>
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

function TryOnVisual() {
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader}>
        <Wand2 size={17} />
        <span>AI Bridal Look Try-On</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        {["Bridal Updo", "Soft Curls", "Classic Bridal Makeup", "Dewy Bridal Look"].map((look) => (
          <div key={look} style={{ padding: "12px 10px", borderRadius: 14, background: "#f5f3ff", color: "#5b21b6", fontWeight: 800, fontSize: "0.8rem", textAlign: "center" }}>
            {look}
          </div>
        ))}
      </div>
    </div>
  );
}

function BridalProfileVisual() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>MK</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.92rem" }}>Maria Khan</strong>
          <span>Bridal package · Wedding 12 Oct</span>
        </div>
      </div>
      {[
        { label: "Package", value: "Full Bridal (Hair + Makeup)" },
        { label: "Hair formula", value: "Wella 7.1 Ash Blonde" },
        { label: "Allergies", value: "None on file" },
        { label: "Trial date", value: "28 Sep 2026" },
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
        { text: "Hi Maria, your bridal trial tomorrow at 10:00am is confirmed 💜", tag: "Confirmation" },
        { text: "Reminder: your wedding day appointment is this Saturday at 6:00am 💍", tag: "Reminder" },
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
          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#17112a" }}>SI-2026-0142</div>
        </div>
        <span style={{ background: "#dcfce7", color: "#166534", padding: "3px 9px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 900 }}>PAID</span>
      </div>
      {[
        { item: "Full Bridal Package", amt: "PKR 45,000" },
        { item: "Hair Extensions", amt: "PKR 8,000" },
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
    title: "Manage every bridal trial and wedding day booking in one calendar",
    body: "Salon Central is bridal salon booking software with a full calendar built in: staff schedules by stylist, automatic WhatsApp confirmations, and reminders before every bridal trial and the big day itself.",
    visual: <ScheduleVisual />,
  },
  {
    eyebrow: "Virtual try-on",
    title: "Let brides preview their bridal hair and makeup before the trial",
    body: "Salon Central's AI virtual try-on generates a realistic preview of bridal hairstyles and makeup looks on the bride's own photo, helping her decide on the look before committing to a trial appointment.",
    visual: <TryOnVisual />,
  },
  {
    eyebrow: "Bridal profiles",
    title: "Keep every bride's package, hair formula, and trial date on file",
    body: "This bridal salon management software stores the bride's package details, hair color formula, allergy notes, and trial date, so your team is fully prepared well before the wedding day.",
    visual: <BridalProfileVisual />,
  },
  {
    eyebrow: "WhatsApp automation",
    title: "Automatic confirmations and reminders for trials and the big day",
    body: "As bridal salon software, Salon Central automatically sends WhatsApp confirmations after booking and reminders before both the bridal trial and the wedding day appointment, so nothing is missed.",
    visual: <WhatsAppVisual />,
  },
  {
    eyebrow: "Invoicing",
    title: "Professional invoices for high-value bridal packages",
    body: "Every bridal package sale generates a branded, auto-numbered invoice you can export as PDF, ring up alongside add-ons like hair extensions, and accept six payment methods at checkout.",
    visual: <InvoiceVisual />,
  },
];

const stats: VerticalStat[] = [
  { icon: <Wand2 size={19} />, label: "AI bridal look try-on", body: "Preview bridal hairstyles and makeup looks before the trial appointment." },
  { icon: <Heart size={19} />, label: "Bridal profile tracking", body: "Package, hair formula, allergy notes, and trial date saved per bride." },
  { icon: <MessageCircle size={19} />, label: "WhatsApp automation", body: "Confirmations and reminders for both the trial and the wedding day." },
  { icon: <ShoppingCart size={19} />, label: "6 payment methods", body: "Cash, JazzCash, EasyPaisa, Raast, card, and bank transfer, all built in." },
];

const faqs: VerticalFaq[] = [
  {
    q: "What is bridal salon software?",
    a: "Bridal salon software is software built for how bridal salons run: booking trials and wedding day appointments, tracking each bride's package and hair formula, and checking out high-value bridal packages. Salon Central is bridal salon software that combines all of this in one platform.",
  },
  {
    q: "Does Salon Central handle both bridal trials and wedding day scheduling?",
    a: "Yes. Salon Central is bridal salon booking software with a full calendar, staff schedules by stylist, and automated WhatsApp confirmations and reminders for both the trial and the wedding day appointment.",
  },
  {
    q: "Can brides preview their hair and makeup look before the trial?",
    a: "Yes. Salon Central's AI virtual try-on generates a preview of bridal hairstyles and makeup on the bride's own photo, helping her decide on a look before booking or attending the trial.",
  },
  {
    q: "Does Salon Central track bridal package details and hair formulas?",
    a: "Yes. Salon Central stores each bride's package, hair color formula, allergy notes, and trial date, so your team is fully prepared ahead of the wedding day.",
  },
  {
    q: "How can my salon become the best bridal salon in Lahore?",
    a: "Consistent, on-time trials, a smooth wedding-day schedule, and no missed WhatsApp reminders go a long way toward being known as the best bridal salon in Lahore. Salon Central handles the scheduling, client records, and communication side, so your team can focus on the bridal look itself.",
  },
  {
    q: "Are bridal salons in Lahore using Salon Central?",
    a: "Yes. Salon Central is used by salons across Pakistan, including bridal salons in Lahore, to manage bridal packages, trial and wedding day scheduling, and client records in one platform.",
  },
  {
    q: "What makes a salon stand out as Lahore's best bridal salon?",
    a: "Reliability on the wedding day matters most: accurate scheduling, prepared hair formulas, and clear communication with the bride. Salon Central's bridal profiles, calendar, and automated WhatsApp reminders are built to support exactly that.",
  },
  {
    q: "Why choose Salon Central as bridal salon software?",
    a: "Salon Central combines bridal salon booking software, AI virtual try-on, bridal profile tracking, staff commission payroll, and WhatsApp automation in one platform built for how bridal salons actually work, from the first trial to the wedding day itself.",
  },
];

export default function BridalSalonPage() {
  return (
    <VerticalPage
      kickerIcon={<Crown size={16} />}
      heroImage="https://images.unsplash.com/photo-1742891602017-40b3a924f476?auto=format&fit=crop&w=900&q=70"
      kickerLabel="Bridal Salons"
      h1="Bridal Salon POS & Booking Software"
      heroParagraph="Salon Central is bridal salon software built for how bridal salons actually run: trial and wedding day scheduling, AI bridal look try-on, bridal profile tracking, WhatsApp automation, and point of sale checkout, all in one platform trusted by bridal salons in Lahore and beyond."
      heroImageLabel="Salon Central for Bridal Salons"
      heroVisual={<ScheduleVisual />}
      heroFloatingIcon={<Heart size={15} />}
      heroFloatingText="Bridal profile saved automatically"
      heroFloatingColor="#166534"
      rows={rows}
      ctaEyebrow="Ready to upgrade your bridal salon?"
      ctaTitle="See how Salon Central runs a bridal salon end to end"
      ctaSubtitle="Trials, wedding day scheduling, bridal profiles, POS, and WhatsApp automation in one platform."
      stats={stats}
      faqAriaLabel="Bridal salon software FAQs"
      faqTitle="Bridal Salon Software: Frequently Asked Questions"
      faqs={faqs}
    />
  );
}
