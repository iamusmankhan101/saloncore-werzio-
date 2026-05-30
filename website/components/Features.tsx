"use client";
import { useEffect, useRef } from "react";
import styles from "./Features.module.css";
import {
  CalendarDays, Globe, Bell, Sparkles,
  Users, UserCog, Package, BookOpen,
} from "lucide-react";

/* ── mini UI previews ─────────────────────────────────────── */

function AppointmentPreview() {
  const slots = ["9:00 AM","10:30 AM","12:00 PM","2:00 PM","3:30 PM"];
  return (
    <div className={styles.prev}>
      <div className={styles.prevDateRow}>
        {["M","T","W","T","F","S","S"].map((d,i) => (
          <div key={i} className={`${styles.prevDay} ${i===2?styles.prevDayActive:""}`}>{d}</div>
        ))}
      </div>
      <div className={styles.prevSlots}>
        {slots.map((s,i) => (
          <div key={s} className={`${styles.prevSlot} ${i===1?styles.prevSlotPick:""}`}>
            {s}{i===1 && <span className={styles.prevSlotBadge}>Selected</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function OnlineBookingPreview() {
  return (
    <div className={styles.prev}>
      <div className={styles.obCard}>
        <div className={styles.obLogo}><BookOpen size={12}/>  Werzio Booking</div>
        <div className={styles.obField}>Hair Color</div>
        <div className={styles.obField}>Zara Khan · Stylist</div>
        <div className={styles.obField} style={{color:"#7c3aed",fontWeight:700}}>Wed, 28 May · 2:00 PM</div>
        <div className={styles.obBtn}>Confirm Booking</div>
      </div>
    </div>
  );
}

function CalendarPreview() {
  const appts = [
    {name:"Sana N.",  svc:"Hair Color", col:"#ede9fe", border:"#a78bfa", top:0},
    {name:"Fatima A.",svc:"Facial",     col:"#dcfce7", border:"#6ee7b7", top:58},
    {name:"Maria K.", svc:"Bridal",     col:"#fef3c7", border:"#fcd34d", top:116},
  ];
  return (
    <div className={styles.prev}>
      <div className={styles.calHeader}>
        {["MON","TUE","WED","THU","FRI"].map((d,i)=>(
          <div key={d} className={`${styles.calCol} ${i===1?styles.calToday:""}`}>
            <span className={styles.calDay}>{d}</span>
            <span className={`${styles.calNum} ${i===1?styles.calNumToday:""}`}>{24+i}</span>
          </div>
        ))}
      </div>
      <div className={styles.calBody}>
        {appts.map(a=>(
          <div key={a.name} className={styles.calAppt}
            style={{background:a.col, borderLeft:`3px solid ${a.border}`, top:a.top}}>
            <div className={styles.calApptName}>{a.name}</div>
            <div className={styles.calApptSvc}>{a.svc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatsAppPreview() {
  return (
    <div className={styles.prev}>
      <div className={styles.waHeader}>
        <div className={styles.waAvatar}>W</div>
        <div>
          <div className={styles.waName}>Glow Studio</div>
          <div className={styles.waStatus}>● Automated</div>
        </div>
      </div>
      <div className={styles.waMsgs}>

        {/* confirmation */}
        <div className={styles.waTag}>Booking Confirmation</div>
        <div className={`${styles.waMsg} ${styles.waMsgOut}`}>
          ✅ <strong>Booking Confirmed!</strong><br />
          Sana, your Hair Color is booked for<br />
          <strong>Wed 28 May · 2:00 PM</strong> with Zara.<br />
          📍 DHA Salon, Lahore
        </div>

        {/* 24hr reminder */}
        <div className={styles.waTag}>24hr Reminder</div>
        <div className={`${styles.waMsg} ${styles.waMsgOut}`}>
          🔔 Hi Sana! Your appointment is <strong>tomorrow at 2 PM</strong>.<br />
          Reply <em>C</em> to confirm or <em>R</em> to reschedule.
        </div>

        {/* follow-up */}
        <div className={styles.waTag}>Follow-up</div>
        <div className={`${styles.waMsg} ${styles.waMsgOut}`}>
          💜 Thanks for visiting! How was your experience?<br />
          <span className={styles.waStars}>⭐⭐⭐⭐⭐</span>
        </div>

      </div>
    </div>
  );
}

function VirtualTryOnPreview() {
  return (
    <div className={styles.prev}>
      <div className={styles.vtFrame}>
        <div className={styles.vtFace}>
          <div className={styles.vtHair} />
          <div className={styles.vtFaceCircle} />
          <div className={styles.vtScanLine} />
        </div>
        <div className={styles.vtLabel}>AI Analysing…</div>
        <div className={styles.vtColors}>
          {["#2d1b4e","#8B4513","#D2691E","#FFD700","#FF69B4"].map(c=>(
            <div key={c} className={styles.vtColor} style={{background:c}} />
          ))}
        </div>
        <div className={styles.vtResult}>✨ 3 styles recommended</div>
      </div>
    </div>
  );
}

function ClientPreview() {
  return (
    <div className={styles.prev}>
      <div className={styles.clientCard}>
        <div className={styles.clientTop}>
          <div className={styles.clientAvatar}>SN</div>
          <div>
            <div className={styles.clientName}>Sana Nawaz</div>
            <div className={styles.clientSub}>24 visits · VIP</div>
          </div>
          <div className={styles.clientBadge}>VIP</div>
        </div>
        {[
          {label:"Hair Formula", val:"Loreal 7.3 + 20vol", c:"#7c3aed"},
          {label:"Skin Type",    val:"Oily Combination"},
          {label:"Allergy",      val:"⚠ PPD Dye", c:"#ef4444"},
          {label:"Lifetime Value",val:"₨ 186,000"},
        ].map(r=>(
          <div key={r.label} className={styles.clientRow}>
            <span className={styles.clientLabel}>{r.label}</span>
            <span className={styles.clientVal} style={{color:r.c}}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffPreview() {
  const staff = [
    {name:"Zara K.",  role:"Senior Stylist", rev:"₨18K", pct:88, color:"#7c3aed"},
    {name:"Nida M.",  role:"Nail Artist",    rev:"₨12K", pct:65, color:"#10b981"},
    {name:"Sara A.",  role:"Skin Therapist", rev:"₨9K",  pct:50, color:"#f59e0b"},
  ];
  return (
    <div className={styles.prev}>
      {staff.map(s=>(
        <div key={s.name} className={styles.staffRow}>
          <div className={styles.staffAvatar} style={{background:s.color+"22",color:s.color}}>
            {s.name[0]}
          </div>
          <div className={styles.staffInfo}>
            <div className={styles.staffName}>{s.name}</div>
            <div className={styles.staffRole}>{s.role}</div>
            <div className={styles.staffBar}>
              <div className={styles.staffFill} style={{width:`${s.pct}%`,background:s.color}} />
            </div>
          </div>
          <div className={styles.staffRev}>{s.rev}</div>
        </div>
      ))}
    </div>
  );
}

function InventoryPreview() {
  const items = [
    {name:"Loreal Hair Color",  stock:3,  max:20, warn:true},
    {name:"Wella Developer",    stock:12, max:20},
    {name:"OPI Nail Polish",    stock:48, max:60},
    {name:"Skin Serum SPF50",   stock:5,  max:30, warn:true},
  ];
  return (
    <div className={styles.prev}>
      {items.map(it=>(
        <div key={it.name} className={styles.invRow}>
          <div className={styles.invName}>{it.name}</div>
          <div className={styles.invRight}>
            <div className={styles.invBar}>
              <div className={styles.invFill}
                style={{
                  width:`${(it.stock/it.max)*100}%`,
                  background: it.warn ? "#ef4444" : "#7c3aed",
                }} />
            </div>
            <span className={styles.invCount} style={{color:it.warn?"#ef4444":undefined}}>
              {it.warn ? `⚠ ${it.stock}` : it.stock}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── feature card data ─────────────────────────────────────── */
// gridColumn / gridRow follow CSS grid placement syntax
const features = [
  // ── ROW 1 ──────────────────────────────────────────────────
  {
    icon: Bell,
    color: "#059669",
    title: "WhatsApp Reminders",
    desc:  "Salon sends booking confirmations, 24hr & 2hr reminders, and post-visit follow-ups automatically — zero manual effort.",
    preview: <WhatsAppPreview />,
    gc: "1 / 3", gr: "1",        // 2 cols wide
  },
  {
    icon: CalendarDays,
    color: "#7c3aed",
    title: "Appointment Booking",
    desc:  "Let clients self-book in seconds. Time slots, stylist selection, and instant confirmation — all automated.",
    preview: <AppointmentPreview />,
    gc: "3 / 4", gr: "1",
  },
  {
    icon: Sparkles,
    color: "#db2777",
    title: "Virtual Try-On",
    desc:  "AI-powered hair color and style previewer. Clients see how they'll look before they even book.",
    preview: <VirtualTryOnPreview />,
    gc: "4 / 5", gr: "1",
  },

  // ── ROW 2 ──────────────────────────────────────────────────
  {
    icon: Users,
    color: "#7c3aed",
    title: "Client Management",
    desc:  "Full client profiles — hair formulas, skin type, allergy alerts, visit history, and lifetime value.",
    preview: <ClientPreview />,
    gc: "1 / 2", gr: "2 / 4",   // 2 rows tall
  },
  {
    icon: CalendarDays,
    color: "#0891b2",
    title: "Calendar & Scheduling",
    desc:  "Visual day/week view with per-stylist columns, drag-and-drop rescheduling, and real-time conflict detection.",
    preview: <CalendarPreview />,
    gc: "2 / 4", gr: "2",        // 2 cols wide
  },
  {
    icon: Globe,
    color: "#4f46e5",
    title: "Online Booking",
    desc:  "A branded booking page at werzio.pk/your-salon. Shareable from Instagram, Google Maps, and your website.",
    preview: <OnlineBookingPreview />,
    gc: "4 / 5", gr: "2",
  },

  // ── ROW 3 ──────────────────────────────────────────────────
  {
    icon: UserCog,
    color: "#d97706",
    title: "Staff Management",
    desc:  "Schedules, commission tracking, attendance, and performance dashboards for every team member.",
    preview: <StaffPreview />,
    gc: "2 / 3", gr: "3",
  },
  {
    icon: Package,
    color: "#0891b2",
    title: "Inventory Management",
    desc:  "Track stock levels, expiry dates, and auto-deduct products per service. Low-stock WhatsApp alerts included.",
    preview: <InventoryPreview />,
    gc: "3 / 5", gr: "3",        // 2 cols wide
  },
];

export default function Features() {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
    );

    cardRefs.current.forEach((card) => { if (card) observer.observe(card); });
    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.section} id="features">
      <div className={`${styles.header} text-center`}>
        <div className="section-label" data-animate data-delay="0">✦ Everything You Need</div>
        <h2 className="section-title" data-animate data-delay="0.1">Powerful Features Built<br />for Pakistan's Salons</h2>
        <p className="section-sub" data-animate data-delay="0.2">
          Eight modules. One dashboard. Everything from booking to inventory — all connected.
        </p>
      </div>

      <div className={styles.grid}>
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              ref={(el) => { cardRefs.current[i] = el; }}
              className={styles.card}
              style={{
                gridColumn: f.gc,
                gridRow: f.gr,
                opacity: 0,
                transform: "translateY(36px)",
                transition: `opacity 0.55s ease ${i * 0.07}s, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${i * 0.07}s`,
              }}
            >
              <div className={styles.cardTop}>
                <div className={styles.iconBox} style={{ background: f.color + "18", color: f.color }}>
                  <Icon size={20} />
                </div>
                <h3 className={styles.cardTitle}>{f.title}</h3>
                <p className={styles.cardDesc}>{f.desc}</p>
              </div>
              <div className={styles.cardPreview}>
                {f.preview}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
