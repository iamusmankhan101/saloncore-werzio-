import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Globe,
  CheckCircle2,
  Clock,
  Scissors,
  CalendarDays,
  Users,
  BarChart2,
  Smartphone,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import styles from "./SchedulingFeaturePage.module.css";

/* ─── hero booking phone ─────────────────────────────────── */
function HeroBooking() {
  return (
    <div className={styles.heroCard} aria-label="Werzio online booking preview">
      <div className={styles.heroCardTop}>
        <div>
          <span>Online Booking</span>
          <strong>Glow Studio</strong>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontSize: "0.72rem", fontWeight: 900 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
          Live
        </div>
      </div>

      {/* form preview */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <label style={{ fontSize: "0.7rem", fontWeight: 900, color: "#746b83" }}>Your Name</label>
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "#f8f7ff", border: "1px solid #ede9fe", fontSize: "0.85rem", color: "#17112a", fontWeight: 600 }}>Sana Nawaz</div>
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <label style={{ fontSize: "0.7rem", fontWeight: 900, color: "#746b83" }}>Phone Number</label>
          <div style={{ padding: "10px 12px", borderRadius: 10, background: "#f8f7ff", border: "1px solid #ede9fe", fontSize: "0.85rem", color: "#17112a", fontWeight: 600 }}>0300 1234567</div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: "0.7rem", fontWeight: 900, color: "#746b83" }}>Select Services</label>
          {[
            { name: "Hair Color", dur: "90 min", price: "PKR 4,500", checked: true },
            { name: "Keratin Treatment", dur: "120 min", price: "PKR 6,000", checked: false },
            { name: "Hydra Facial", dur: "60 min", price: "PKR 3,200", checked: false },
          ].map((s) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: s.checked ? "#ede9fe" : "#f8f7ff", border: `1px solid ${s.checked ? "#c4b5fd" : "#ede9fe"}` }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, background: s.checked ? "#7c3aed" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {s.checked && <CheckCircle2 size={11} color="#fff" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#17112a" }}>{s.name}</div>
                <div style={{ fontSize: "0.68rem", color: "#746b83" }}>{s.dur}</div>
              </div>
              <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#7c3aed" }}>{s.price}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "9px 12px", borderRadius: 10, background: "#dcfce7", border: "1px solid #bbf7d0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#166534" }}>
            <div>Open 09:00 – 20:00</div>
            <div style={{ opacity: 0.7 }}>Wed 28 May 2026</div>
          </div>
          <div style={{ fontSize: "0.82rem", fontWeight: 900, color: "#166534" }}>PKR 4,500</div>
        </div>
      </div>

      <div className={styles.floatingNote} style={{ right: -20, top: 220 }}>
        <CheckCircle2 size={15} />
        <span>Booking confirmed!</span>
      </div>
    </div>
  );
}

/* ─── feature row visuals ───────────────────────────────── */
function SharePanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div style={{ fontSize: "0.7rem", fontWeight: 900, color: "#746b83", marginBottom: 10 }}>YOUR BOOKING LINK</div>
      <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f5f3ff", border: "1px solid #ede9fe", fontSize: "0.82rem", fontWeight: 800, color: "#7c3aed", marginBottom: 14, wordBreak: "break-all" }}>
        app.werzio.com/online-booking
      </div>
      {[
        { platform: "Instagram Bio", icon: "📸", action: "Link in bio" },
        { platform: "WhatsApp Status", icon: "💬", action: "Share link" },
        { platform: "Google Maps", icon: "📍", action: "Website field" },
        { platform: "Facebook Page", icon: "📘", action: "Book Now button" },
      ].map((p) => (
        <div key={p.platform} className={styles.checkoutBody}>
          <div>
            <span>{p.icon} {p.platform}</span>
            <strong style={{ color: "#7c3aed" }}>{p.action}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function ServicesPanel() {
  const services = [
    { name: "Hair Color", dur: "90 min", price: "PKR 4,500", cat: "Hair", color: "#7c3aed" },
    { name: "Hydra Facial", dur: "60 min", price: "PKR 3,200", cat: "Skin", color: "#0284c7" },
    { name: "Nail Extension", dur: "75 min", price: "PKR 2,800", cat: "Nails", color: "#ec4899" },
    { name: "Bridal Makeup", dur: "180 min", price: "PKR 18,000", cat: "Bridal", color: "#d97706" },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#17112a", marginBottom: 12 }}>
        All services · Select multiple
      </div>
      {services.map((s) => (
        <div key={s.name} className={styles.staffRow}>
          <div className={styles.avatarSmall} style={{ background: s.color + "22", color: s.color, fontSize: "0.6rem", fontWeight: 900 }}>
            {s.cat[0]}
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.88rem", color: "#17112a" }}>{s.name}</strong>
            <span style={{ fontSize: "0.7rem" }}>{s.dur}</span>
          </div>
          <em style={{ color: s.color }}>{s.price}</em>
        </div>
      ))}
    </div>
  );
}

function BusinessHoursPanel() {
  const days = [
    { day: "Monday",    open: true,  hours: "09:00 – 20:00" },
    { day: "Tuesday",   open: true,  hours: "09:00 – 20:00" },
    { day: "Wednesday", open: true,  hours: "09:00 – 20:00" },
    { day: "Saturday",  open: true,  hours: "10:00 – 18:00" },
    { day: "Sunday",    open: false, hours: "Closed" },
  ];
  return (
    <div className={styles.staffPanel}>
      <div className={styles.blockHeader} style={{ marginBottom: 12 }}>
        <Clock size={16} />
        <span style={{ fontWeight: 900, fontSize: "0.82rem", color: "#17112a" }}>Business hours enforcement</span>
      </div>
      {days.map((d) => (
        <div key={d.day} className={styles.staffRow}>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.85rem", color: "#17112a" }}>{d.day}</strong>
          </div>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              fontSize: "0.72rem",
              fontWeight: 900,
              background: d.open ? "#dcfce7" : "#fee2e2",
              color: d.open ? "#166534" : "#dc2626",
            }}
          >
            {d.hours}
          </span>
        </div>
      ))}
    </div>
  );
}

function ClientAutoPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#17112a", marginBottom: 10 }}>
        Client auto-created from booking
      </div>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>SN</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.92rem" }}>Sana Nawaz</strong>
          <span>New · Source: Web · 0300 1234567</span>
        </div>
      </div>
      {[
        { label: "Tagged as",    value: "New",     purple: false, green: false, tag: true },
        { label: "Source",       value: "Web booking", purple: true },
        { label: "Total visits", value: "1" },
        { label: "Total spend",  value: "PKR 4,500" },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div>
            <span>{row.label}</span>
            <strong style={{ color: row.purple ? "#7c3aed" : "#17112a" }}>{row.value}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardPanel() {
  const appts = [
    { client: "Sana Nawaz",  service: "Hair Color",   status: "Booked",    src: "web",   color: "#6366f1" },
    { client: "Fatima Ali",  service: "Hydra Facial", status: "Confirmed", src: "web",   color: "#0891b2" },
    { client: "Walk-in",     service: "Nails",         status: "Arrived",  src: "staff", color: "#059669" },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: "0.78rem", fontWeight: 900, color: "#17112a" }}>
        <span>Today's appointments</span>
        <span style={{ color: "#7c3aed" }}>3 total</span>
      </div>
      {appts.map((a) => (
        <div key={a.client} className={styles.staffRow}>
          <div className={styles.avatarSmall} style={{ background: a.color + "22", color: a.color, fontSize: "0.6rem", fontWeight: 900 }}>
            {a.client[0]}
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.85rem", color: "#17112a" }}>{a.client}</strong>
            <span style={{ fontSize: "0.7rem" }}>{a.service} · {a.src === "web" ? "🌐 Web" : "Staff"}</span>
          </div>
          <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 900, background: a.color + "18", color: a.color }}>
            {a.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function SummaryPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#17112a", marginBottom: 12 }}>Booking summary</div>
      {[
        { label: "Services selected", value: "Hair Color" },
        { label: "Total duration",    value: "90 min" },
        { label: "Total price",       value: "PKR 4,500", purple: true },
        { label: "Date",              value: "Wed 28 May 2026" },
        { label: "Salon hours",       value: "Open 09:00 – 20:00", green: true },
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
      <button type="button">Book Appointment</button>
    </div>
  );
}

/* ─── feature rows ──────────────────────────────────────── */
const rows = [
  {
    eyebrow: "Shareable booking link",
    title: "One link. Share it anywhere clients find you",
    body: "Every Werzio salon gets a public booking page. Add the link to your Instagram bio, WhatsApp status, Google Maps website field, or Facebook Book Now button — clients book directly without calling or DMing.",
    visual: <SharePanel />,
  },
  {
    eyebrow: "Service catalogue",
    title: "Clients browse and select exactly what they want",
    body: "Your full service menu is displayed with names, durations, and prices. Clients tick multiple services in a single booking — the total duration and price calculate automatically so there are no surprises.",
    visual: <ServicesPanel />,
  },
  {
    eyebrow: "Business hours",
    title: "Closed days block bookings automatically",
    body: "The booking page reads your configured business hours. If a client picks a Sunday (or any closed day), a red warning appears and the submit button stays disabled. Open days show hours in green so clients know exactly when to come.",
    visual: <BusinessHoursPanel />,
  },
  {
    eyebrow: "Booking summary",
    title: "Duration and price totals calculated before confirming",
    body: "As the client selects services and a date, a live summary card shows total duration, total price, and salon hours for that day. No guessing — clients see exactly what they are booking before they submit.",
    visual: <SummaryPanel />,
  },
  {
    eyebrow: "Client auto-creation",
    title: "New clients are added to your system on their first booking",
    body: "When a client books online, Werzio checks their phone number. If they are new, a client profile is created automatically — tagged as New, source set to Web, with visit count and spend tracked from day one.",
    visual: <ClientAutoPanel />,
  },
  {
    eyebrow: "Dashboard integration",
    title: "Web bookings appear in your calendar and appointments instantly",
    body: "Every online booking lands immediately in your dashboard — visible in the appointments list, the calendar, and the client's profile. Staff see the source as Web so they know it came through the booking page.",
    visual: <DashboardPanel />,
  },
];

/* ─── page ──────────────────────────────────────────────── */
export default function OnlineBookingFeaturePage() {
  return (
    <>
      <Navbar />
      <main className={styles.page}>

        {/* ── hero ── */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.kicker}>
                <Globe size={16} />
                Online booking page
              </div>
              <h1>Let clients book while you focus on the salon</h1>
              <p>
                Werzio gives your salon a public booking page where clients browse services, pick a date, and confirm their appointment — without a single DM or phone call from your team.
              </p>
              <div className={styles.heroActions}>
                <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className={styles.primaryCta}>
                  Get started <ArrowRight size={17} />
                </a>
                <Link href="/#pricing" className={styles.secondaryCta}>
                  View pricing
                </Link>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.imageChip}>
                <Image src="/werzio-logo.png" alt="" width={96} height={96} />
                <span>Werzio OS</span>
              </div>
              <HeroBooking />
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
            <h2>Your booking page is ready the moment you sign up</h2>
          </div>
          <div className={styles.ctaActions}>
            <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className={styles.primaryCta}>
              Get started <ArrowRight size={17} />
            </a>
            <Link href="/#pricing" className={styles.secondaryDark}>View pricing</Link>
          </div>
        </section>

        {/* ── mini stats ── */}
        <section className={styles.miniStats} aria-label="Online booking advantages">
          <div>
            <Smartphone size={19} />
            <strong>Share anywhere</strong>
            <span>Instagram, WhatsApp, Google Maps, Facebook — one link works everywhere.</span>
          </div>
          <div>
            <Scissors size={19} />
            <strong>Multi-service booking</strong>
            <span>Clients pick multiple services in one booking with live duration and price totals.</span>
          </div>
          <div>
            <CalendarDays size={19} />
            <strong>Hours enforced</strong>
            <span>Closed days block bookings automatically — no accidental out-of-hours requests.</span>
          </div>
          <div>
            <Users size={19} />
            <strong>Auto client profiles</strong>
            <span>New clients are added to your system the moment their first booking is submitted.</span>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
