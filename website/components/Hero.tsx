"use client";
import Link from "next/link";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import styles from "./Hero.module.css";
import DemoVideoModal from "./DemoVideoModal";

/* ── decorative salon-tool line icons ─────────────────────── */
const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ScissorsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <line x1="8.5" y1="7.5" x2="20" y2="19" />
      <line x1="8.5" y1="16.5" x2="20" y2="5" />
    </svg>
  );
}

function CombIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 5h16v3H4z" />
      <line x1="6" y1="8" x2="6" y2="19" />
      <line x1="9.5" y1="8" x2="9.5" y2="19" />
      <line x1="13" y1="8" x2="13" y2="19" />
      <line x1="16.5" y1="8" x2="16.5" y2="19" />
      <line x1="20" y1="8" x2="20" y2="19" />
    </svg>
  );
}

function HairdryerIcon() {
  return (
    <svg {...iconProps}>
      <ellipse cx="10" cy="9" rx="6" ry="4" />
      <rect x="8" y="12.5" width="4" height="7" rx="2" />
      <line x1="20.5" y1="7" x2="22.5" y2="6" />
      <line x1="20.5" y1="9" x2="23" y2="9" />
      <line x1="20.5" y1="11" x2="22.5" y2="12" />
    </svg>
  );
}

function MirrorIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="9" r="6" />
      <line x1="12" y1="15" x2="12" y2="21" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </svg>
  );
}

function SprayBottleIcon() {
  return (
    <svg {...iconProps}>
      <rect x="7" y="9" width="8" height="12" rx="1.5" />
      <path d="M9 9V6a2 2 0 0 1 2-2h1" />
      <path d="M12 4h4l2 2h-3" />
      <line x1="18" y1="4" x2="20" y2="2" />
      <line x1="19" y1="6" x2="21" y2="5" />
    </svg>
  );
}

export default function Hero() {
  const [demoOpen, setDemo] = useState(false);

  return (
    <>
    <section className={styles.hero} id="home">

      {/* ── floating salon-tool icon chips ── */}
      <div className={`${styles.iconChip} ${styles.iconUL}`} aria-hidden="true"><ScissorsIcon /></div>
      <div className={`${styles.iconChip} ${styles.iconUR}`} aria-hidden="true"><HairdryerIcon /></div>
      <div className={`${styles.iconChip} ${styles.iconML}`} aria-hidden="true"><CombIcon /></div>
      <div className={`${styles.iconChip} ${styles.iconMR}`} aria-hidden="true"><MirrorIcon /></div>
      <div className={`${styles.iconChip} ${styles.iconLL}`} aria-hidden="true"><SprayBottleIcon /></div>

      {/* ── headline + subtitle + buttons ── */}
      <div className={styles.content}>
        <div className={styles.kicker} data-animate data-delay="0">
          <span className={styles.kickerIconWrap}><ShieldCheck size={12} /></span>
          Trusted by salons across Pakistan
        </div>
        <h1 className={styles.title} data-animate data-delay="0.1">
          Simplify Salon Operations<br />10x Your Revenue
        </h1>
        <p className={styles.sub} data-animate data-delay="0.25">
          All-in-one salon management software with a built-in salon POS system and CRM.
          Manage bookings, clients, staff and revenue from start to finish.
        </p>
        <div className={styles.btns}>
          <Link href="/#pricing" className={styles.btnPrimary}>View Pricing</Link>
          <button type="button" onClick={() => setDemo(true)} className={styles.btnOutline}>View Demo</button>
        </div>
      </div>

    </section>

    <DemoVideoModal open={demoOpen} onClose={() => setDemo(false)} />
    </>
  );
}
