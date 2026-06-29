import Image from "next/image";
import styles from "./DashboardMockup.module.css";
import {
  LayoutDashboard, Calendar, Users, DollarSign,
  Tag, Radio, Lock,
} from "lucide-react";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Calendar,        label: "Calendar" },
  { icon: Users,           label: "Clients" },
  { icon: DollarSign,      label: "Revenue" },
  { icon: Tag,             label: "Inventory" },
  { icon: Radio,           label: "WhatsApp" },
];

const bookings = [
  { initials: "SN", color: "#ede9fe", text: "#7c3aed", name: "Sana Nawaz",   service: "Hair Color + Blowdry · 10:00 AM", status: "In Progress", statusCls: styles.inprog },
  { initials: "FA", color: "#fef3c7", text: "#d97706", name: "Fatima Asad",  service: "Facial + Waxing · 11:30 AM",    status: "Confirmed",   statusCls: styles.confirmed },
  { initials: "MK", color: "#dcfce7", text: "#16a34a", name: "Maria Khan",   service: "Bridal Trial · 1:00 PM",         status: "Pending",     statusCls: styles.pending },
];

const bars = [40, 65, 55, 85, 70, 95, 60];
const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function DashboardMockup() {
  return (
    <div className={styles.mockup}>
      {/* top bar */}
      <div className={styles.topbar}>
        <span className={`${styles.dot} ${styles.red}`}   />
        <span className={`${styles.dot} ${styles.yellow}`}/>
        <span className={`${styles.dot} ${styles.green}`} />
        <div className={styles.urlBar}>
          <Lock size={10} color="#bbb" />
          app.saloncentral.pk — Dashboard
        </div>
      </div>

      {/* body */}
      <div className={styles.body}>
        {/* sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarLogo}>
            <Image src="/salon-central-logo.png" alt="Salon Central" width={48} height={48} />
          </div>
          {sidebarItems.map(({ icon: Icon, label, active }) => (
            <div key={label} className={`${styles.sidebarItem} ${active ? styles.sidebarActive : ""}`}>
              <Icon size={14} />
              <span>{label}</span>
            </div>
          ))}
        </aside>

        {/* main */}
        <main className={styles.main}>
          <div className={styles.mainHeader}>
            <span className={styles.pageTitle}>Good morning, Amna ✨</span>
            <span className={styles.pageDate}>Mon, 26 May 2026</span>
          </div>

          {/* stat cards */}
          <div className={styles.statCards}>
            {[
              { label: "Today's Bookings", value: "18",    change: "↑ 3 vs yesterday" },
              { label: "Revenue (Today)",  value: "₨42K",  change: "↑ 12% this week" },
              { label: "Active Clients",   value: "1,284", change: "↑ 28 this month" },
              { label: "No-show Rate",     value: "4.2%",  change: "↓ 18% vs before" },
            ].map((s) => (
              <div key={s.label} className={styles.statCard}>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statChange}>{s.change}</div>
              </div>
            ))}
          </div>

          {/* two panels */}
          <div className={styles.panels}>
            {/* bookings list */}
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Today&apos;s Appointments</div>
              {bookings.map((b) => (
                <div key={b.name} className={styles.bookingRow}>
                  <div className={styles.avatar} style={{ background: b.color, color: b.text }}>
                    {b.initials}
                  </div>
                  <div className={styles.bookingInfo}>
                    <div className={styles.bookingName}>{b.name}</div>
                    <div className={styles.bookingService}>{b.service}</div>
                  </div>
                  <span className={`${styles.statusBadge} ${b.statusCls}`}>{b.status}</span>
                </div>
              ))}
            </div>

            {/* mini chart */}
            <div className={styles.panel}>
              <div className={styles.panelTitle}>Weekly Revenue</div>
              <div className={styles.chart}>
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className={styles.bar}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className={styles.chartLabels}>
                {days.map((d) => <span key={d}>{d}</span>)}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
