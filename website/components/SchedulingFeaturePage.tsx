import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  Globe,
  UserCog,
  CalendarX2,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import styles from "./SchedulingFeaturePage.module.css";

const scheduleBlocks = [
  {
    time: "10:00",
    client: "Sana Nawaz",
    service: "Hair Color",
    stylist: "Zara",
    className: "lilac",
  },
  {
    time: "11:30",
    client: "Fatima Ali",
    service: "Hydra Facial",
    stylist: "Nida",
    className: "mint",
  },
  {
    time: "02:00",
    client: "Maria Khan",
    service: "Bridal Trial",
    stylist: "Ayesha",
    className: "peach",
  },
  {
    time: "04:30",
    client: "Aena Malik",
    service: "Nails",
    stylist: "Sara",
    className: "cyan",
  },
];

function StaffSchedulePanel() {
  const staff = [
    { name: "Zara K.",  color: "#7c3aed", appts: ["10:00 · Hair Color", "12:30 · Keratin"] },
    { name: "Nida M.",  color: "#059669", appts: ["11:00 · Hydra Facial", "2:30 · Cleanup"] },
    { name: "Sara A.",  color: "#db2777", appts: ["10:30 · Nails", "3:00 · Bridal Trial"] },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#17112a", marginBottom: 10 }}>Today — Staff Schedule</div>
      {staff.map((s) => (
        <div key={s.name} className={styles.staffRow}>
          <div className={styles.avatarSmall} style={{ background: s.color + "22", color: s.color }}>{s.name.charAt(0)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{s.name}</strong>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 3 }}>
              {s.appts.map((a) => (
                <span key={a} style={{ fontSize: "0.65rem", color: "#9898b0" }}>{a}</span>
              ))}
            </div>
          </div>
          <em style={{ fontSize: "0.7rem", color: s.color, fontStyle: "normal", fontWeight: 700 }}>{s.appts.length} appts</em>
        </div>
      ))}
    </div>
  );
}

function CancellationPanel() {
  const items = [
    { name: "Sana N.",   service: "Hair Color",   date: "28 May", status: "Cancelled", sc: "#dc2626", sbg: "#fef2f2" },
    { name: "Fatima A.", service: "Hydra Facial",  date: "29 May", status: "No Show",   sc: "#d97706", sbg: "#fffbeb" },
    { name: "Maria K.",  service: "Keratin",       date: "30 May", status: "Cancelled", sc: "#dc2626", sbg: "#fef2f2" },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#17112a", marginBottom: 10 }}>Cancellations &amp; No Shows</div>
      {items.map((it) => (
        <div key={it.name} className={styles.staffRow}>
          <div className={styles.avatarSmall}>{it.name.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <strong>{it.name}</strong>
            <span>{it.service} · {it.date}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: it.sc, background: it.sbg, padding: "2px 7px", borderRadius: 20 }}>{it.status}</span>
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#7c3aed", cursor: "pointer" }}>Reschedule →</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const rows = [
  {
    eyebrow: "Online booking",
    title: "Let clients book from your branded booking page, 24/7",
    body:
      "Share a branded Werzio booking page where clients pick their service, choose a stylist, and confirm a time — without calling the salon. Bookings land directly in your dashboard with source, services, and total already filled in. Business hours and closed days are respected automatically.",
    visual: <PhoneBookingPanel />,
  },
  {
    eyebrow: "Staff scheduling",
    title: "Schedule every stylist's day without conflicts or guesswork",
    body:
      "Assign appointments to specific staff members, see each stylist's workload side by side on the weekly calendar, and create new bookings with stylist and service pre-linked. No double-bookings — Werzio shows only the available slots for each team member.",
    visual: <StaffSchedulePanel />,
  },
  {
    eyebrow: "Automatic reminders",
    title: "Send confirmations, reminders, and follow-ups automatically",
    body:
      "Werzio sends a booking confirmation the moment an appointment is created, a 24-hour reminder the day before, a 2-hour reminder on the day, and a post-visit follow-up — all via WhatsApp, with zero manual effort from your team.",
    visual: <MessagesPanel />,
  },
  {
    eyebrow: "Cancellation management",
    title: "Handle cancellations and no-shows without losing track",
    body:
      "Mark appointments as cancelled or no-show in one tap. Cancelled slots free up immediately for new bookings. Both statuses are tracked in client history and daily reports so you can see your no-show rate and follow up with a reschedule message.",
    visual: <CancellationPanel />,
  },
];

function HeroCalendar() {
  return (
    <div className={styles.heroCard} aria-label="Werzio scheduling preview">
      <div className={styles.heroCardTop}>
        <div>
          <span>Calendar</span>
          <strong>May 2026</strong>
        </div>
        <button type="button">New booking</button>
      </div>
      <div className={styles.heroWeek}>
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => (
          <div key={day} className={index === 2 ? styles.activeDay : ""}>
            <span>{day}</span>
            <strong>{25 + index}</strong>
          </div>
        ))}
      </div>
      <div className={styles.heroSchedule}>
        {scheduleBlocks.map((block) => (
          <div key={`${block.time}-${block.client}`} className={`${styles.heroAppt} ${styles[block.className]}`}>
            <span>{block.time}</span>
            <strong>{block.client}</strong>
            <small>
              {block.service} with {block.stylist}
            </small>
          </div>
        ))}
      </div>
      <div className={styles.floatingNote}>
        <CheckCircle2 size={16} />
        <span>WhatsApp reminder queued</span>
      </div>
    </div>
  );
}


function MessagesPanel() {
  return (
    <div className={styles.messagesPanel}>
      <div className={styles.messageHeader}>
        <MessageCircle size={18} />
        <span>Glow Studio</span>
      </div>
      <div className={styles.chatBubble}>
        Booking confirmed: Hair Color with Zara, Wed 28 May at 2:00 PM.
      </div>
      <div className={styles.chatBubble}>
        Reminder: your appointment is tomorrow at 2:00 PM. See you soon.
      </div>
      <div className={styles.chatBubbleMuted}>Follow-up scheduled after visit</div>
    </div>
  );
}

function PhoneBookingPanel() {
  return (
      <div className={styles.phoneWrap}>
      <div className={styles.phone}>
        <div className={styles.phoneTop}>Werzio Booking</div>
        <div className={styles.phoneField}>Sana Nawaz - 0300 1234567</div>
        <div className={styles.phoneField}>Hair Color</div>
        <div className={styles.phoneFieldActive}>Open 09:00 - 20:00</div>
        <div className={styles.phoneButton}>Confirm Booking</div>
      </div>
      <div className={styles.shareCard}>
        <Sparkles size={16} />
        <span>Web bookings are saved with source, services, total duration, and price.</span>
      </div>
    </div>
  );
}


export default function SchedulingFeaturePage() {
  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.kicker}>
                <CalendarDays size={16} />
                Appointment scheduling and calendar
              </div>
              <h1>Take control of your salon schedule</h1>
              <p>
                Werzio keeps bookings, client details, stylist assignments, WhatsApp reminders, online booking, and checkout handoff in one dashboard built for Pakistan&apos;s beauty industry.
              </p>
              <div className={styles.heroActions}>
                <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className={styles.primaryCta}>
                  Get started <ArrowRight size={17} />
                </a>
                <Link href="/#features" className={styles.secondaryCta}>
                  Explore features
                </Link>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.imageChip}>
                <Image src="/werzio-logo.png" alt="" width={96} height={96} />
                <span>Werzio OS</span>
              </div>
              <HeroCalendar />
            </div>
          </div>
          <div className={styles.wave} aria-hidden="true" />
        </section>

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

        <section className={styles.ctaBand}>
          <div>
            <span>Ready to simplify operations?</span>
            <h2>Find out if Werzio is right for your salon</h2>
          </div>
          <div className={styles.ctaActions}>
            <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className={styles.primaryCta}>
              Get started <ArrowRight size={17} />
            </a>
            <Link href="/#pricing" className={styles.secondaryDark}>View pricing</Link>
          </div>
        </section>

        <section className={styles.miniStats} aria-label="Scheduling advantages">
          <div>
            <Globe size={19} />
            <strong>Online booking</strong>
            <span>Branded booking page shared via Instagram, Google Maps, or your website.</span>
          </div>
          <div>
            <UserCog size={19} />
            <strong>Staff scheduling</strong>
            <span>Per-stylist calendars with no double-bookings and conflict detection.</span>
          </div>
          <div>
            <Bell size={19} />
            <strong>Automatic reminders</strong>
            <span>WhatsApp confirmations, 24hr &amp; 2hr reminders, and post-visit follow-ups.</span>
          </div>
          <div>
            <CalendarX2 size={19} />
            <strong>Cancellation management</strong>
            <span>One-tap cancel or no-show, tracked in history with reschedule prompts.</span>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
