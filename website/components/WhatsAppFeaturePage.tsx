import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  MessageCircle,
  CheckCircle2,
  Bell,
  Clock,
  Star,
  Package,
  FileText,
  Send,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import styles from "./SchedulingFeaturePage.module.css";

/* ─── hero WhatsApp card ─────────────────────────────────── */
function HeroWhatsApp() {
  return (
    <div className={styles.heroCard} aria-label="Salon Central WhatsApp automation preview">
      {/* header */}
      <div className={styles.heroCardTop}>
        <div>
          <span>WhatsApp Automation</span>
          <strong>Glow Studio</strong>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            borderRadius: 999,
            background: "#dcfce7",
            color: "#166534",
            fontSize: "0.72rem",
            fontWeight: 900,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
          Live
        </div>
      </div>

      {/* messages */}
      <div style={{ display: "grid", gap: 10 }}>
        {[
          {
            tag: "Booking confirmation",
            tagColor: "#166534",
            tagBg: "#dcfce7",
            msg: "Hi Sana, your Hair Color appointment at Glow Studio is confirmed for Wed 28 May at 2:00 PM. See you soon! 💜",
            time: "Just now",
          },
          {
            tag: "24hr reminder",
            tagColor: "#1e40af",
            tagBg: "#dbeafe",
            msg: "Hi Fatima, reminder: your Hydra Facial is tomorrow at 11:30 AM at Glow Studio. Reply C to confirm or R to reschedule.",
            time: "Scheduled",
          },
          {
            tag: "Follow-up",
            tagColor: "#6b21a8",
            tagBg: "#ede9fe",
            msg: "Hi Maria, thank you for visiting Glow Studio! We hope you loved your Bridal Trial. We would love to see you again 💜",
            time: "After visit",
          },
        ].map((m) => (
          <div
            key={m.tag}
            style={{
              padding: "12px 14px",
              borderRadius: 16,
              background: "#f8f7ff",
              border: "1px solid #ede9fe",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span
                style={{
                  padding: "2px 9px",
                  borderRadius: 999,
                  fontSize: "0.66rem",
                  fontWeight: 900,
                  background: m.tagBg,
                  color: m.tagColor,
                }}
              >
                {m.tag}
              </span>
              <span style={{ fontSize: "0.65rem", color: "#9ca3af", fontWeight: 700 }}>{m.time}</span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#312a3d", lineHeight: 1.5, margin: 0 }}>{m.msg}</p>
          </div>
        ))}
      </div>

      <div className={styles.floatingNote} style={{ right: -20, top: 200 }}>
        <CheckCircle2 size={15} />
        <span>3 automations active</span>
      </div>
    </div>
  );
}

/* ─── feature row visuals ───────────────────────────────── */
function ConfirmationPanel() {
  return (
    <div className={styles.messagesPanel}>
      <div className={styles.messageHeader}>
        <MessageCircle size={18} />
        <span>Glow Studio · Booking confirmation</span>
      </div>
      <div className={styles.chatBubble}>
        Hi Sana, your <strong>Hair Color</strong> appointment at Glow Studio is confirmed
        for <strong>Wed 28 May at 2:00 PM</strong>. We look forward to seeing you! 💜
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          borderRadius: 10,
          background: "#f0fdf4",
          fontSize: "0.72rem",
          fontWeight: 900,
          color: "#166534",
        }}
      >
        <CheckCircle2 size={13} />
        Sent automatically when appointment is booked
      </div>
    </div>
  );
}

function ReminderPanel() {
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader}>
        <Clock size={17} />
        <span style={{ fontWeight: 900, color: "#17112a" }}>Reminder timing</span>
      </div>
      <div className={styles.blockArea}>
        <div className={styles.openSlot}>
          <div style={{ fontWeight: 900, fontSize: "0.88rem" }}>24 hours before</div>
          <span>Default reminder window — configurable in settings</span>
        </div>
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            background: "#ede9fe",
            color: "#4c1d95",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: "0.88rem", marginBottom: 4 }}>Message preview</div>
          <span style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>
            Hi {"{name}"}, reminder: your {"{service}"} is tomorrow at {"{time}"} at {"{salon_name}"}.
            Reply C to confirm or R to reschedule.
          </span>
        </div>
      </div>
    </div>
  );
}

function FollowUpPanel() {
  return (
    <div className={styles.messagesPanel}>
      <div className={styles.messageHeader}>
        <Star size={18} />
        <span>Glow Studio · Post-visit follow-up</span>
      </div>
      <div className={styles.chatBubble}>
        Hi Maria, thank you for visiting <strong>Glow Studio</strong>! We hope you loved your{" "}
        <strong>Bridal Trial</strong>. We would love to see you again soon 💜
      </div>
      <div className={styles.chatBubbleMuted}>
        ⭐⭐⭐⭐⭐ How was your experience?
      </div>
      <div
        style={{
          fontSize: "0.72rem",
          fontWeight: 900,
          color: "#6b21a8",
          background: "#f5f3ff",
          padding: "8px 12px",
          borderRadius: 10,
        }}
      >
        Sent automatically when appointment is marked completed
      </div>
    </div>
  );
}

function TemplatePanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          background: "#f5f3ff",
          border: "1px solid #ede9fe",
          marginBottom: 4,
        }}
      >
        <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#7c3aed", marginBottom: 8 }}>
          REMINDER TEMPLATE
        </div>
        <div style={{ fontSize: "0.8rem", color: "#312a3d", lineHeight: 1.6 }}>
          Hi{" "}
          <span style={{ background: "#ddd6fe", borderRadius: 6, padding: "1px 6px", fontWeight: 900 }}>
            {"{{name}}"}
          </span>
          , reminder: your{" "}
          <span style={{ background: "#ddd6fe", borderRadius: 6, padding: "1px 6px", fontWeight: 900 }}>
            {"{{service}}"}
          </span>{" "}
          is on{" "}
          <span style={{ background: "#ddd6fe", borderRadius: 6, padding: "1px 6px", fontWeight: 900 }}>
            {"{{date}}"}
          </span>{" "}
          at{" "}
          <span style={{ background: "#ddd6fe", borderRadius: 6, padding: "1px 6px", fontWeight: 900 }}>
            {"{{time}}"}
          </span>
          .
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["{{name}}", "{{service}}", "{{date}}", "{{time}}", "{{salon_name}}"].map((v) => (
          <span
            key={v}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "#ddd6fe",
              color: "#5b21b6",
              fontSize: "0.7rem",
              fontWeight: 900,
            }}
          >
            {v}
          </span>
        ))}
      </div>
      <div className={styles.checkoutBody}>
        <div>
          <span>Templates available</span>
          <strong>Confirmation, Reminder, Follow-up, Low Stock</strong>
        </div>
      </div>
    </div>
  );
}

function LowStockPanel() {
  return (
    <div className={styles.messagesPanel}>
      <div className={styles.messageHeader}>
        <Package size={18} />
        <span>Glow Studio · Low stock alert</span>
      </div>
      <div className={styles.chatBubble}>
        ⚠️ <strong>Low Stock Alert</strong> from Glow Studio: 2 item(s) running low —
        Loreal Hair Color (2 left), Skin Serum SPF50 (1 left). Please restock soon.
      </div>
      <div
        style={{
          display: "grid",
          gap: 6,
          padding: "10px 12px",
          borderRadius: 10,
          background: "#fff7ed",
          fontSize: "0.74rem",
          fontWeight: 800,
          color: "#92400e",
        }}
      >
        <div>Sent to salon owner phone once per day</div>
        <div style={{ color: "#9ca3af" }}>Triggered when stock falls below minimum level</div>
      </div>
    </div>
  );
}

function MessageLogPanel() {
  const logs = [
    { type: "Confirmation", client: "Sana Nawaz", time: "Today 2:14 PM", ok: true },
    { type: "Reminder", client: "Fatima Ali", time: "Today 10:00 AM", ok: true },
    { type: "Follow-up", client: "Maria Khan", time: "Yesterday 6:30 PM", ok: true },
    { type: "Reminder", client: "Aena Malik", time: "Yesterday 9:00 AM", ok: false },
  ];
  return (
    <div className={styles.staffPanel}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 12,
          fontSize: "0.78rem",
          fontWeight: 900,
          color: "#17112a",
        }}
      >
        <span>Message history</span>
        <span style={{ color: "#7c3aed" }}>96% success rate</span>
      </div>
      {logs.map((l, i) => (
        <div key={i} className={styles.staffRow}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: l.ok ? "#16a34a" : "#dc2626",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.85rem", color: "#17112a" }}>{l.client}</strong>
            <span style={{ fontSize: "0.7rem" }}>{l.time}</span>
          </div>
          <em
            style={{
              fontStyle: "normal",
              fontSize: "0.7rem",
              fontWeight: 900,
              padding: "3px 8px",
              borderRadius: 999,
              background: l.type === "Confirmation" ? "#dcfce7" : l.type === "Reminder" ? "#dbeafe" : "#ede9fe",
              color: l.type === "Confirmation" ? "#166534" : l.type === "Reminder" ? "#1e40af" : "#6b21a8",
            }}
          >
            {l.type}
          </em>
        </div>
      ))}
    </div>
  );
}

function ManualSendPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>FK</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.92rem" }}>Fatima Khan</strong>
          <span>+92 300 1234567</span>
        </div>
      </div>
      {[
        { label: "Message type", value: "Reminder" },
        { label: "Service", value: "Hydra Facial" },
        { label: "Date", value: "Sat 31 May" },
        { label: "Time", value: "3:00 PM" },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        </div>
      ))}
      <button type="button">Send via WhatsApp</button>
    </div>
  );
}

/* ─── feature rows ──────────────────────────────────────── */
const rows = [
  {
    eyebrow: "Booking confirmation",
    title: "Confirm every appointment the moment it is booked",
    body: "As soon as a booking is created — by staff or via online booking — Salon Central queues a WhatsApp confirmation with the client name, service, date, time, and salon name. No manual step needed.",
    visual: <ConfirmationPanel />,
  },
  {
    eyebrow: "Appointment reminders",
    title: "Send reminders 24 hours before, automatically",
    body: "Salon Central's scheduler runs every 60 seconds and sends each client a WhatsApp reminder within your configured window (default 24 hours). Only appointments with booked or confirmed status receive reminders — cancelled and completed ones are skipped.",
    visual: <ReminderPanel />,
  },
  {
    eyebrow: "Post-visit follow-up",
    title: "Follow up after every completed appointment",
    body: "Mark an appointment as completed and Salon Central queues a personalised follow-up message. It thanks the client by name, mentions the service, and keeps your salon top-of-mind for the next visit — all without lifting a finger.",
    visual: <FollowUpPanel />,
  },
  {
    eyebrow: "Custom templates",
    title: "Edit every message template with live variable chips",
    body: "Open the template editor and write messages exactly how you want them. Click {{name}}, {{service}}, {{date}}, {{time}}, or {{salon_name}} chips to insert variables. Preview with real client data before saving.",
    visual: <TemplatePanel />,
  },
  {
    eyebrow: "Low stock alerts",
    title: "Get a WhatsApp alert when products run low",
    body: "When any product drops to or below its minimum stock level, Salon Central sends a single daily low-stock alert directly to the salon owner's WhatsApp — listing every item and quantity left. No checking required.",
    visual: <LowStockPanel />,
  },
  {
    eyebrow: "Message history",
    title: "Track every message sent with full delivery history",
    body: "Every confirmation, reminder, follow-up, and alert is logged with client name, phone, message type, timestamp, and send status. Filter by type, check success rate, and spot failed messages at a glance from the dashboard.",
    visual: <MessageLogPanel />,
  },
  {
    eyebrow: "Manual sends",
    title: "Send on-demand messages to any client from the dashboard",
    body: "Select a client, choose a message type, fill in the service and time, and send directly via the WhatsApp Business API — or open WhatsApp Web for personal account sending. Useful for follow-ups, custom promotions, and rescheduling.",
    visual: <ManualSendPanel />,
  },
];

/* ─── page ──────────────────────────────────────────────── */
export default function WhatsAppFeaturePage() {
  return (
    <>
      <Navbar />
      <main className={styles.page}>

        {/* ── hero ── */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.kicker}>
                <MessageCircle size={16} />
                WhatsApp reminders and automation
              </div>
              <h1>Your salon stays in touch, automatically</h1>
              <p>
                Salon Central sends booking confirmations, 24-hour reminders, post-visit follow-ups, and low-stock alerts via
                WhatsApp — all triggered automatically so your team handles zero manual messages.
              </p>
              <div className={styles.heroActions}>
                <a
                  href="https://app.werzio.com/sign-up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.primaryCta}
                >
                  Get started <ArrowRight size={17} />
                </a>
                <Link href="/#pricing" className={styles.secondaryCta}>
                  View pricing
                </Link>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.imageChip}>
                <Image src="/salon-central-logo.png" alt="" width={96} height={96} />
                <span>Salon Central OS</span>
              </div>
              <HeroWhatsApp />
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
            <span>Available on Salon Central Pro and Premium</span>
            <h2>Let WhatsApp work for your salon 24/7</h2>
          </div>
          <div className={styles.ctaActions}>
            <a
              href="https://app.werzio.com/sign-up"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.primaryCta}
            >
              Get started <ArrowRight size={17} />
            </a>
            <Link href="/#pricing" className={styles.secondaryDark}>
              View pricing
            </Link>
          </div>
        </section>

        {/* ── mini stats ── */}
        <section className={styles.miniStats} aria-label="WhatsApp automation advantages">
          <div>
            <CheckCircle2 size={19} />
            <strong>Booking confirmations</strong>
            <span>Sent the moment a booking is created — no manual step from your team.</span>
          </div>
          <div>
            <Bell size={19} />
            <strong>24-hour reminders</strong>
            <span>Configurable reminder window keeps no-show rates low without any effort.</span>
          </div>
          <div>
            <Send size={19} />
            <strong>Follow-up on complete</strong>
            <span>Thank clients and invite them back automatically after every visit.</span>
          </div>
          <div>
            <FileText size={19} />
            <strong>Full message log</strong>
            <span>Every message tracked with client, type, timestamp, and delivery status.</span>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
