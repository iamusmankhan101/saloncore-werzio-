"use client";
import styles from "./Hero.module.css";
import CalendarMockup from "./CalendarMockup";

export default function Hero() {
  return (
    <section className={styles.hero} id="home">

      {/* ── headline + subtitle + buttons ── */}
      <div className={styles.content}>
        <h1 className={styles.title}>
          Simplify Salon Operations<br />Boost Your Revenue
        </h1>
        <p className={styles.sub}>
          Easily manage bookings, clients, staff and revenue from start to finish.
        </p>
        <div className={styles.btns}>
          <a href="#pricing" className={styles.btnPrimary}>Get Started Free</a>
          <a href="#how"     className={styles.btnOutline}>Book a Demo</a>
        </div>
      </div>

      {/* ── screenshot wrapper with 4 floating pills ── */}
      <div className={styles.screenshotWrapper}>
        <div className={`${styles.pill} ${styles.pillUL}`}>
          <span className={styles.dot} style={{ background: "#7c3aed" }} />
          Salon Owner
        </div>
        <div className={`${styles.pill} ${styles.pillUR}`}>
          <span className={styles.dot} style={{ background: "#7c3aed" }} />
          Walk-in Client
        </div>
        <div className={`${styles.pill} ${styles.pillLL}`}>
          <span className={styles.dot} style={{ background: "#f59e0b" }} />
          Head Stylist
        </div>
        <div className={`${styles.pill} ${styles.pillLR}`}>
          <span className={styles.dot} style={{ background: "#10b981" }} />
          Branch Manager
        </div>

        <div className={styles.frame}>
          <CalendarMockup />
        </div>
      </div>

    </section>
  );
}
