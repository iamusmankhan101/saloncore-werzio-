import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Scissors,
  Sparkles,
  UserRound,
  Users,
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

const rows = [
  {
    eyebrow: "Visual calendar",
    title: "See every booking and status on a weekly calendar",
    body:
      "Werzio gives your team a clean week calendar with timed appointment blocks, status colors, staff color accents, today controls, and quick appointment detail previews.",
    visual: <CalendarPanel />,
  },
  {
    eyebrow: "Fast front desk",
    title: "Create appointments, move clients through the visit, and check out",
    body:
      "Create appointments for existing or new clients, choose a stylist, filter services by that stylist, progress bookings from booked to completed, and send arrived or in-progress clients straight to POS checkout.",
    visual: <CheckoutPanel />,
  },
  {
    eyebrow: "WhatsApp automation",
    title: "Send confirmations, reminders, and follow-ups automatically",
    body:
      "Werzio handles booking confirmations, 24-hour and 2-hour WhatsApp reminders, and post-visit follow-ups so your staff is not chasing every client manually.",
    visual: <MessagesPanel />,
  },
  {
    eyebrow: "Online booking",
    title: "Let clients book from your branded web booking page",
    body:
      "Share a branded Werzio booking page where clients enter their details, pick services, see salon business hours, avoid closed days, and create a web booking that appears in the dashboard.",
    visual: <PhoneBookingPanel />,
  },
  {
    eyebrow: "Service assignment",
    title: "Keep services connected to the right team members",
    body:
      "Werzio connects services to assigned staff, shows active team members in appointment creation, and keeps client, service, stylist, duration, and revenue context together.",
    visual: <StaffPanel />,
  },
  {
    eyebrow: "Business controls",
    title: "Respect salon hours and plan limits while bookings grow",
    body:
      "Online bookings follow configured business hours, Sundays can be closed, free-plan appointment usage is tracked, and paid plans unlock unlimited appointment booking.",
    visual: <BlockPanel />,
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

function CalendarPanel() {
  return (
    <div className={styles.calendarPanel}>
      <div className={styles.panelToolbar}>
        <span>Today</span>
        <strong>Week view</strong>
      </div>
      <div className={styles.calendarGrid}>
        {["Mon 25", "Tue 26", "Wed 27"].map((name, index) => (
          <div key={name} className={styles.calendarColumn}>
            <strong>{name}</strong>
            <div className={styles.slotTall}>{index === 0 ? "Booked" : "Confirmed"}<br /><span>Hair Color - Zara</span></div>
            <div className={styles.slotShort}>{index === 2 ? "In progress" : "Arrived"}<br /><span>Facial - Nida</span></div>
            <div className={styles.slotMuted}>No show</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckoutPanel() {
  return (
    <div className={styles.checkoutPanel}>
      <div className={styles.clientStrip}>
        <div className={styles.avatar}>SN</div>
        <div>
          <strong>Sana Nawaz</strong>
          <span>24 visits - VIP client</span>
        </div>
      </div>
      <div className={styles.checkoutBody}>
        <div>
          <span>Status</span>
          <strong>Arrived</strong>
        </div>
        <div>
          <span>Next step</span>
          <strong>In Progress</strong>
        </div>
        <div>
          <span>Checkout</span>
          <strong>Open POS</strong>
        </div>
      </div>
      <button type="button">Send to checkout</button>
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

function StaffPanel() {
  const staff = [
    ["Zara K.", "Senior Stylist", "Hair Color"],
    ["Nida M.", "Skin Therapist", "Facial"],
    ["Sara A.", "Nail Artist", "Nails"],
  ];

  return (
    <div className={styles.staffPanel}>
      {staff.map(([name, role, load]) => (
        <div key={name} className={styles.staffRow}>
          <div className={styles.avatarSmall}>{name.charAt(0)}</div>
          <div>
            <strong>{name}</strong>
            <span>{role}</span>
          </div>
          <em>{load}</em>
        </div>
      ))}
    </div>
  );
}

function BlockPanel() {
  return (
    <div className={styles.blockPanel}>
      <div className={styles.blockHeader}>
        <Clock3 size={17} />
        <span>Booking controls</span>
      </div>
      <div className={styles.blockArea}>
        <div className={styles.blockedSlot}>Sunday closed<br /><span>Online booking disabled</span></div>
        <div className={styles.openSlot}>24 / 30 monthly bookings<br /><span>Upgrade for unlimited</span></div>
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
                  Start free trial <ArrowRight size={17} />
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
              Start free trial <ArrowRight size={17} />
            </a>
            <Link href="/#pricing" className={styles.secondaryDark}>View pricing</Link>
          </div>
        </section>

        <section className={styles.miniStats} aria-label="Scheduling advantages">
          <div>
            <Bell size={19} />
            <strong>Automated reminders</strong>
            <span>WhatsApp confirmations, reminders, and follow-ups.</span>
          </div>
          <div>
            <Users size={19} />
            <strong>Team assignments</strong>
            <span>Active staff, service assignments, stylist colors, and appointment filters.</span>
          </div>
          <div>
            <Scissors size={19} />
            <strong>Salon context</strong>
            <span>Client profiles, service history, formulas, and allergies.</span>
          </div>
          <div>
            <UserRound size={19} />
            <strong>Client booking</strong>
            <span>Online booking page with instant confirmation.</span>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
