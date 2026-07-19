"use client";
import Link from "next/link";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import styles from "./Hero.module.css";
import DemoVideoModal from "./DemoVideoModal";

export default function Hero() {
  const [demoOpen, setDemo] = useState(false);

  return (
    <>
    <section className={styles.hero} id="home">

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
