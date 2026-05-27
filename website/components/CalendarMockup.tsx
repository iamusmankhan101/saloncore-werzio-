import Image from "next/image";
import styles from "./CalendarMockup.module.css";
import {
  LayoutDashboard, Calendar, Users, Scissors,
  MessageCircle, UserCog, BarChart2, Package,
  Globe, Sparkles, Search,
} from "lucide-react";

const nav = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Calendar,        label: "Calendar",        active: true },
  { icon: Users,           label: "Appointments" },
  { icon: Users,           label: "Clients" },
  { icon: Scissors,        label: "Services" },
  { icon: MessageCircle,   label: "WhatsApp" },
  { icon: UserCog,         label: "Staff" },
  { icon: BarChart2,       label: "Revenue" },
  { icon: Package,         label: "Inventory" },
  { icon: Globe,           label: "Online Booking" },
  { icon: Sparkles,        label: "Virtual Try-On" },
];

const days = [
  { short: "MON", num: "25", today: false },
  { short: "TUE", num: "26", today: true },
  { short: "WED", num: "27", today: false },
  { short: "THU", num: "28", today: false },
  { short: "FRI", num: "29", today: false },
  { short: "SAT", num: "30", today: false },
];

const times = ["3pm","4pm","5pm","6pm","7pm","8pm","9pm","10pm","11pm"];

// dayIndex 0=Mon … 5=Sat,  startSlot=index into times[], heightSlots
const appts = [
  { day: 2, start: 1, height: 1,   name: "usman khan", service: "Haircut",    time: "4:47pm – 5:47pm", color: "#dbeafe", border: "#93c5fd" },
  { day: 3, start: 1, height: 1,   name: "Zainab",     service: "Haircut",    time: "4:46pm – 5:46pm", color: "#dbeafe", border: "#93c5fd" },
  { day: 4, start: 1, height: 1,   name: "Aena",       service: "Haircut",    time: "4:46pm – 5:46pm", color: "#dbeafe", border: "#93c5fd" },
  { day: 2, start: 3, height: 1.5, name: "Hafsa",      service: "Hair Color", time: "6:45pm – 7:45pm", color: "#e0e7ff", border: "#a5b4fc" },
  { day: 1, start: 4, height: 1,   name: "usman khan", service: "Hair Color", time: "7:44pm – 8:44pm", color: "#ede9fe", border: "#c4b5fd" },
];

const SLOT_H = 52; // px per hour slot

export default function CalendarMockup() {
  return (
    <div className={styles.app}>
      {/* ── SIDEBAR ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.avatar}>A</div>
          <div>
            <div className={styles.sidebarName}>Werzio</div>
            <div className={styles.sidebarRole}>Admin</div>
          </div>
          <Sparkles size={16} className={styles.sparkle} />
        </div>

        <div className={styles.searchBar}>
          <Search size={13} />
          <span>Search</span>
        </div>

        <div className={styles.navSection}>APPLICATION</div>

        {nav.map(({ icon: Icon, label, active }) => (
          <div key={label} className={`${styles.navItem} ${active ? styles.navActive : ""}`}>
            <Icon size={15} />
            <span>{label}</span>
          </div>
        ))}

        <div className={styles.upgrade}>
          <div className={styles.upgradeIcon}><Sparkles size={14} /></div>
          <div>
            <div className={styles.upgradeTitle}>Upgrade to Premium</div>
            <div className={styles.upgradeSub}>Unlock all features and grow your salon</div>
          </div>
          <button className={styles.upgradeBtn}>Upgrade Now</button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className={styles.main}>
        <div className={styles.mainHeader}>
          <div>
            <h2 className={styles.pageTitle}>Calendar</h2>
            <p className={styles.pageMonth}>May 2026</p>
          </div>
        </div>

        {/* Day headers */}
        <div className={styles.calGrid}>
          <div className={styles.timeGutter} />
          {days.map((d) => (
            <div key={d.short} className={`${styles.dayHeader} ${d.today ? styles.todayHeader : ""}`}>
              <span className={styles.dayShort}>{d.short}</span>
              <span className={`${styles.dayNum} ${d.today ? styles.todayNum : ""}`}>{d.num}</span>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className={styles.gridBody}>
          <div className={styles.scrollContent}>
            {/* time labels column */}
            <div className={styles.timesCol}>
              {times.map((t) => (
                <div key={t} className={styles.timeLabel} style={{ height: SLOT_H }}>{t}</div>
              ))}
            </div>

            {/* day columns */}
            {days.map((d, di) => (
              <div key={d.short} className={`${styles.dayCol} ${d.today ? styles.todayCol : ""}`}
                style={{ height: times.length * SLOT_H }}>
                {times.map((_, ti) => (
                  <div key={ti} className={styles.gridLine} style={{ top: ti * SLOT_H }} />
                ))}
                {appts
                  .filter((a) => a.day === di)
                  .map((a, ai) => (
                    <div
                      key={ai}
                      className={styles.appt}
                      style={{
                        top: a.start * SLOT_H + 4,
                        height: a.height * SLOT_H - 8,
                        background: a.color,
                        borderLeft: `3px solid ${a.border}`,
                      }}
                    >
                      <div className={styles.apptName}>{a.name}</div>
                      <div className={styles.apptSvc}>{a.service}</div>
                      <div className={styles.apptTime}>{a.time}</div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
