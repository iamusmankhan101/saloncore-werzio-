import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, UserCog, Users, Scissors,
  BarChart2, Star, Shield, CheckCircle2,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import styles from "./SchedulingFeaturePage.module.css";

/* ─── hero staff card ────────────────────────────────────── */
function HeroStaff() {
  const team = [
    { initials: "ZK", name: "Zara K.",  role: "Senior Stylist", rev: "PKR 1,86,000", appts: 54, color: "#7c3aed", roleBg: "#ede9fe", roleC: "#7c3aed" },
    { initials: "NM", name: "Nida M.",  role: "Nail Artist",    rev: "PKR 98,400",   appts: 36, color: "#db2777", roleBg: "#fdf2f8", roleC: "#db2777" },
    { initials: "SA", name: "Sara A.",  role: "Junior Stylist", rev: "PKR 64,200",   appts: 28, color: "#d97706", roleBg: "#fffbeb", roleC: "#d97706" },
  ];
  return (
    <div className={styles.heroCard} aria-label="Werzio staff management preview">
      <div className={styles.heroCardTop}>
        <div>
          <span>Staff</span>
          <strong>3 Active</strong>
        </div>
        <button type="button">Add Staff</button>
      </div>
      {team.map((s) => (
        <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, background: "#f8f7ff", border: "1px solid #ede9fe", marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: s.color + "22", color: s.color, fontWeight: 900, fontSize: "0.78rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {s.initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#17112a" }}>{s.name}</div>
            <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.64rem", fontWeight: 900, background: s.roleBg, color: s.roleC }}>{s.role}</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 900, color: s.color }}>{s.rev}</div>
            <div style={{ fontSize: "0.65rem", color: "#9ca3af" }}>{s.appts} appts</div>
          </div>
        </div>
      ))}
      <div className={styles.floatingNote} style={{ right: -20, top: 180 }}>
        <BarChart2 size={14} />
        <span>Live performance stats</span>
      </div>
    </div>
  );
}

/* ─── feature visuals ────────────────────────────────────── */
function RolesPanel() {
  const roles = [
    { role: "Owner",          c: "#7c3aed", bg: "#ede9fe" },
    { role: "Manager",        c: "#0369a1", bg: "#e0f2fe" },
    { role: "Senior Stylist", c: "#059669", bg: "#ecfdf5" },
    { role: "Junior Stylist", c: "#d97706", bg: "#fffbeb" },
    { role: "Receptionist",   c: "#db2777", bg: "#fdf2f8" },
    { role: "Trainee",        c: "#6b7280", bg: "#f9fafb" },
  ];
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader} style={{ marginBottom: 14 }}>
        <Shield size={16} />
        <span style={{ fontWeight: 900, color: "#17112a" }}>6 staff roles</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {roles.map((r) => (
          <div key={r.role} style={{ padding: "10px 12px", borderRadius: 10, background: r.bg, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.c, flexShrink: 0 }} />
            <span style={{ fontSize: "0.78rem", fontWeight: 900, color: r.c }}>{r.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceAssignPanel() {
  const services = [
    { name: "Hair Color",       price: "PKR 4,500", assigned: true  },
    { name: "Keratin Treatment",price: "PKR 6,000", assigned: true  },
    { name: "Bridal Makeup",    price: "PKR 18,000",assigned: true  },
    { name: "Nail Extension",   price: "PKR 2,800", assigned: false },
    { name: "Hydra Facial",     price: "PKR 3,200", assigned: false },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#7c3aed22", color: "#7c3aed", fontWeight: 900, fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>ZK</div>
        <div>
          <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#17112a" }}>Zara K.</div>
          <div style={{ fontSize: "0.68rem", color: "#9ca3af" }}>Assign services</div>
        </div>
      </div>
      {services.map((s) => (
        <div key={s.name} className={styles.staffRow}>
          <div style={{ width: 16, height: 16, borderRadius: 4, background: s.assigned ? "#7c3aed" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {s.assigned && <CheckCircle2 size={10} color="#fff" />}
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "0.84rem", color: "#17112a" }}>{s.name}</strong>
          </div>
          <em style={{ color: "#7c3aed", fontStyle: "normal", fontWeight: 900, fontSize: "0.75rem" }}>{s.price}</em>
        </div>
      ))}
    </div>
  );
}

function PerformancePanel() {
  const staff = [
    { name: "Zara K.",  rev: "PKR 1,86,000", appts: 54, pct: 100, color: "#7c3aed" },
    { name: "Nida M.",  rev: "PKR 98,400",   appts: 36, pct: 53,  color: "#db2777" },
    { name: "Sara A.",  rev: "PKR 64,200",   appts: 28, pct: 35,  color: "#d97706" },
  ];
  return (
    <div className={styles.staffPanel}>
      <div style={{ fontSize: "0.78rem", fontWeight: 900, color: "#17112a", marginBottom: 14 }}>Revenue by stylist — This month</div>
      {staff.map((s) => (
        <div key={s.name} className={styles.staffRow}>
          <div className={styles.avatarSmall} style={{ background: s.color + "22", color: s.color, fontSize: "0.6rem", fontWeight: 900 }}>
            {s.name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <strong style={{ fontSize: "0.84rem", color: "#17112a" }}>{s.name}</strong>
              <span style={{ fontSize: "0.8rem", fontWeight: 900, color: s.color }}>{s.rev}</span>
            </div>
            <div style={{ height: 5, background: "#f0f0f8", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${s.pct}%`, background: s.color, borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginTop: 2 }}>{s.appts} appointments</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StaffDetailPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar} style={{ background: "#7c3aed22", color: "#7c3aed", fontSize: "0.85rem" }}>ZK</div>
        <div>
          <strong style={{ color: "#17112a", fontSize: "0.95rem" }}>Zara Khan</strong>
          <span>Senior Stylist · Active</span>
        </div>
      </div>
      {[
        { label: "Total Appointments", value: "54" },
        { label: "Completed",          value: "48" },
        { label: "Revenue",            value: "PKR 1,86,000", purple: true },
        { label: "Phone",              value: "+92 300 1234567" },
      ].map((row) => (
        <div key={row.label} className={styles.checkoutBody}>
          <div>
            <span>{row.label}</span>
            <strong style={{ color: (row as { purple?: boolean }).purple ? "#7c3aed" : "#17112a" }}>{row.value}</strong>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
        {["Hair Color", "Keratin", "Bridal"].map((sp) => (
          <span key={sp} style={{ padding: "3px 10px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 900, background: "#ede9fe", color: "#7c3aed" }}>{sp}</span>
        ))}
      </div>
    </div>
  );
}

function PlanLimitPanel() {
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader} style={{ marginBottom: 14 }}>
        <Users size={16} />
        <span style={{ fontWeight: 900, color: "#17112a" }}>Team size by plan</span>
      </div>
      <div className={styles.blockArea}>
        <div style={{ padding: 14, borderRadius: 14, background: "#f5f3ff", border: "1px solid #ede9fe" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "#9ca3af", marginBottom: 2 }}>WERZIO FREE</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 900, color: "#17112a" }}>Up to 5 staff members</div>
        </div>
        <div style={{ padding: 14, borderRadius: 14, background: "#7c3aed", border: "none" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 900, color: "rgba(255,255,255,.65)", marginBottom: 2 }}>WERZIO PRO & PREMIUM</div>
          <div style={{ fontSize: "0.88rem", fontWeight: 900, color: "#fff" }}>Unlimited staff members</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: "0.74rem", fontWeight: 800, color: "#166534" }}>
          ✓ Each staff member links to their own appointments, services, and revenue stats
        </div>
      </div>
    </div>
  );
}

/* ─── feature rows ───────────────────────────────────────── */
const rows = [
  {
    eyebrow: "Staff profiles",
    title: "One profile per team member with role, specialties, and contact",
    body: "Create a profile for each team member with their name, phone, and role. Specialties are populated automatically from the services you assign them. Every profile gets a colour-coded role badge so the team is instantly recognisable across the dashboard.",
    visual: <StaffDetailPanel />,
  },
  {
    eyebrow: "6 staff roles",
    title: "Assign the right role to every team member",
    body: "Choose from Owner, Manager, Senior Stylist, Junior Stylist, Receptionist, and Trainee. Each role has a distinct colour badge that appears on appointment cards, calendars, and performance reports — so your front desk always knows who is doing what.",
    visual: <RolesPanel />,
  },
  {
    eyebrow: "Service assignment",
    title: "Control which services each staff member can perform",
    body: "Open any staff profile and tick the services they are trained for. Only those services appear when booking an appointment for that stylist. Price, duration, and service name all carry through automatically — no repeated data entry.",
    visual: <ServiceAssignPanel />,
  },
  {
    eyebrow: "Performance stats",
    title: "See appointments and revenue per stylist in one view",
    body: "Every staff card shows their total appointments and revenue earned in the current period. The performance panel ranks all active team members by revenue with a proportional bar, so you can spot top performers and who needs support at a glance.",
    visual: <PerformancePanel />,
  },
  {
    eyebrow: "Plan limits",
    title: "Start free, scale your team as you grow",
    body: "The Free plan supports up to 5 staff members. Upgrade to Werzio Pro or Premium for unlimited team size. Adding a staff member takes under 30 seconds — name, phone, role, and services — and they are live in the system immediately.",
    visual: <PlanLimitPanel />,
  },
];

/* ─── page ───────────────────────────────────────────────── */
export default function StaffFeaturePage() {
  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.kicker}>
                <UserCog size={16} />
                Staff management
              </div>
              <h1>Your whole team, managed from one screen</h1>
              <p>
                Werzio gives every team member a profile with their role, specialties, assigned services, and live performance stats — so your salon runs with clarity from the moment the doors open.
              </p>
              <div className={styles.heroActions}>
                <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className={styles.primaryCta}>
                  Get started <ArrowRight size={17} />
                </a>
                <Link href="/#pricing" className={styles.secondaryCta}>View pricing</Link>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.imageChip}>
                <Image src="/werzio-logo.png" alt="" width={96} height={96} />
                <span>Werzio Staff</span>
              </div>
              <HeroStaff />
            </div>
          </div>
          <div className={styles.wave} aria-hidden="true" />
        </section>

        <section className={styles.featureStack}>
          {rows.map((row, i) => (
            <article key={row.title} className={`${styles.featureRow} ${i % 2 ? styles.flip : ""}`}>
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
            <span>Free plan includes up to 5 staff</span>
            <h2>Build your team in Werzio today</h2>
          </div>
          <div className={styles.ctaActions}>
            <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className={styles.primaryCta}>
              Get started <ArrowRight size={17} />
            </a>
            <Link href="/#pricing" className={styles.secondaryDark}>View pricing</Link>
          </div>
        </section>

        <section className={styles.miniStats} aria-label="Staff management advantages">
          <div>
            <Shield size={19} />
            <strong>6 roles</strong>
            <span>Owner, Manager, Senior Stylist, Junior Stylist, Receptionist, Trainee.</span>
          </div>
          <div>
            <Scissors size={19} />
            <strong>Service assignment</strong>
            <span>Control exactly which services each team member can perform.</span>
          </div>
          <div>
            <BarChart2 size={19} />
            <strong>Performance stats</strong>
            <span>Live appointments count and revenue per stylist, updated in real time.</span>
          </div>
          <div>
            <Star size={19} />
            <strong>Unlimited on Pro</strong>
            <span>No team size cap on Werzio Pro and Premium plans.</span>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
