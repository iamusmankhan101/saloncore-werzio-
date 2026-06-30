"use client";
import { useEffect, useRef } from "react";
import styles from "./Features.module.css";
import {
  CalendarDays, Package, Users, Check, Wallet, Megaphone, Gift, Banknote,
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
        <div className={styles.waTag}>Birthday Offer</div>
        <div className={`${styles.waMsg} ${styles.waMsgOut}`}>
          🎂 Happy Birthday Sana! Enjoy <strong>20% off</strong> your next visit this week.
        </div>
        <div className={styles.waTag}>Loyalty Reward</div>
        <div className={`${styles.waMsg} ${styles.waMsgOut}`}>
          🏆 You&apos;ve earned a free blow dry! Book your next appointment to redeem.
        </div>
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
          {label:"Notes",        val:"Sensitive scalp · prefers Zara", c:"#6b7280"},
        ].map(r=>(
          <div key={r.label} className={styles.clientRow}>
            <span className={styles.clientLabel}>{r.label}</span>
            <span className={styles.clientVal} style={{color:(r as {c?:string}).c, fontStyle: r.label==="Notes"?"italic":undefined}}>{r.val}</span>
          </div>
        ))}
        <div className={styles.beforeAfterStrip}>
          <div className={styles.beforeAfterHalf}>
            <div className={styles.beforeAfterBefore} />
            <span>Before</span>
          </div>
          <div className={styles.beforeAfterHalf}>
            <div className={styles.beforeAfterAfter} />
            <span>After</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BillingPreview() {
  return (
    <div className={styles.prev}>
      <div className={styles.invoiceCard}>
        <div className={styles.invoiceHeader}>
          <span className={styles.invoiceNum}>Invoice #INV-042</span>
          <span className={styles.invoicePaid}>Paid</span>
        </div>
        {[
          { svc: "Hair Color", amt: "₨4,500" },
          { svc: "Blow Dry",   amt: "₨800" },
        ].map(r => (
          <div key={r.svc} className={styles.invoiceLine}>
            <span>{r.svc}</span><span>{r.amt}</span>
          </div>
        ))}
        <div className={styles.invoiceTotal}>
          <span>Total</span><span>₨5,300</span>
        </div>
      </div>
      <div className={styles.billingStats}>
        {[
          { label: "Today's Sales", value: "₨42,500", c: "#7c3aed" },
          { label: "Pending",       value: "₨8,200",  c: "#d97706" },
        ].map(s => (
          <div key={s.label} className={styles.billingStat}>
            <div className={styles.billingStatVal} style={{ color: s.c }}>{s.value}</div>
            <div className={styles.billingStatLabel}>{s.label}</div>
          </div>
        ))}
      </div>
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

function LoyaltyPreview() {
  return (
    <div className={styles.prev}>
      <div className={styles.loyaltyCard}>
        <div className={styles.loyaltyTop}>
          <span>LOYALTY CARD</span>
          <span className={styles.loyaltyTier}>🥇 Gold</span>
        </div>
        <div className={styles.loyaltyLabel}>POINTS BALANCE</div>
        <div className={styles.loyaltyPoints}>2,480</div>
        <div className={styles.loyaltyValue}>≈ ₨2,480 redeemable</div>
        <div className={styles.loyaltyProgress}>
          <div className={styles.loyaltyProgressFill} />
        </div>
        <div className={styles.loyaltyNext}>520 points to Platinum</div>
      </div>
      <div className={styles.loyaltyStats}>
        <span>Auto-earn at POS</span>
        <span>Google Wallet</span>
      </div>
    </div>
  );
}

function CashFlowPreview() {
  const bars = [
    { income: 56, expense: 25 },
    { income: 76, expense: 42 },
    { income: 62, expense: 31 },
    { income: 91, expense: 48 },
    { income: 72, expense: 36 },
  ];

  return (
    <div className={styles.prev}>
      <div className={styles.cashStats}>
        <div><span>Income</span><strong className={styles.cashIncome}>₨285K</strong></div>
        <div><span>Expenses</span><strong className={styles.cashExpense}>₨96K</strong></div>
        <div><span>Net Flow</span><strong className={styles.cashNet}>+₨189K</strong></div>
      </div>
      <div className={styles.cashChart}>
        {bars.map((bar, index) => (
          <div className={styles.cashBarGroup} key={index}>
            <div className={styles.cashBarIncome} style={{ height: `${bar.income}%` }} />
            <div className={styles.cashBarExpense} style={{ height: `${bar.expense}%` }} />
          </div>
        ))}
      </div>
      <div className={styles.cashLegend}>
        <span><i className={styles.cashIncomeDot} />Income</span>
        <span><i className={styles.cashExpenseDot} />Expenses</span>
      </div>
    </div>
  );
}

/* ── feature card data ─────────────────────────────────────── */
const features = [
  {
    icon: Users,
    color: "#7c3aed",
    title: "Client Management",
    desc: "Every client profile in one place — from first visit to VIP loyalty.",
    bullets: ["Customer database", "Visit history", "Notes and preferences", "Before/after photos"],
    preview: <ClientPreview />,
    gc: "1/2", gr: "1",
  },
  {
    icon: CalendarDays,
    color: "#0891b2",
    title: "Appointment Booking",
    desc: "Seamless booking for clients and staff, with zero double-bookings.",
    bullets: ["Online booking", "Staff scheduling", "Automatic reminders", "Cancellation management"],
    preview: <AppointmentPreview />,
    gc: "2/3", gr: "1",
  },
  {
    icon: Wallet,
    color: "#059669",
    title: "Billing & Payments",
    desc: "Invoicing, payment tracking, and daily sales reports — all automated.",
    bullets: ["Invoices", "Payment tracking", "Daily sales reports"],
    preview: <BillingPreview />,
    gc: "1/2", gr: "2",
  },
  {
    icon: Megaphone,
    color: "#db2777",
    title: "Marketing",
    desc: "Keep clients coming back with targeted messages and loyalty programmes.",
    bullets: ["SMS reminders", "WhatsApp promotions", "Birthday offers", "Loyalty rewards"],
    preview: <WhatsAppPreview />,
    gc: "2/3", gr: "2",
  },
  {
    icon: Package,
    color: "#d97706",
    title: "Inventory",
    desc: "Track stock, get low-stock alerts, and manage suppliers without spreadsheets.",
    bullets: ["Product stock", "Low-stock alerts", "Supplier management"],
    preview: <InventoryPreview />,
    gc: "1/3", gr: "3",
  },
  {
    icon: Gift,
    color: "#9333ea",
    title: "Loyalty Points",
    desc: "Turn every visit into a reason to return with automatic points, rewards, and membership tiers.",
    bullets: ["Automatic points at POS", "Redeemable discounts", "Bronze-to-Platinum tiers", "Digital & Google Wallet cards"],
    preview: <LoyaltyPreview />,
    gc: "1/2", gr: "4",
  },
  {
    icon: Banknote,
    color: "#0f766e",
    title: "Cash Flow",
    desc: "See money coming in and going out, with a live view of your salon's real financial position.",
    bullets: ["Appointment & POS income", "Categorized expenses", "Net cash-flow charts", "PDF, Excel & data import"],
    preview: <CashFlowPreview />,
    gc: "2/3", gr: "4",
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
        <h2 className="section-title" data-animate data-delay="0.1">Powerful Features Built<br />for Pakistan&apos;s Salons</h2>
        <p className="section-sub" data-animate data-delay="0.2">
          Seven modules. One dashboard. Everything from booking to cash flow — all connected.
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
                <ul className={styles.cardBullets}>
                  {f.bullets.map(b => (
                    <li key={b}>
                      <Check size={11} color={f.color} strokeWidth={2.5} />
                      {b}
                    </li>
                  ))}
                </ul>
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
