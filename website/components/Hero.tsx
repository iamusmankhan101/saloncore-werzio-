"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./Hero.module.css";
import CalendarMockup from "./CalendarMockup";
import DemoModal from "./DemoModal";

export default function Hero() {
  const frameRef            = useRef<HTMLDivElement>(null);
  const [demoOpen, setDemo] = useState(false);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    // If already in viewport on load, reveal after short delay
    const rect = el.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight;

    if (alreadyVisible) {
      const t = setTimeout(() => el.classList.add(styles.frameVisible), 300);
      return () => clearTimeout(t);
    }

    // Otherwise reveal on scroll
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add(styles.frameVisible);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
    <section className={styles.hero} id="home">

      {/* ── headline + subtitle + buttons ── */}
      <div className={styles.content}>
        <h1 className={styles.title} data-animate data-delay="0.1">
          Simplify Salon Operations<br />Boost Your Revenue
        </h1>
        <p className={styles.sub} data-animate data-delay="0.25">
          Easily manage bookings, clients, staff and revenue from start to finish.
        </p>
        <div className={styles.btns}>
          <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className={styles.btnPrimary}>Get Started Free</a>
          <button type="button" onClick={() => setDemo(true)} className={styles.btnOutline}>Book a Demo</button>
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

        <div ref={frameRef} className={styles.frame}>
          <CalendarMockup />
        </div>
      </div>

    </section>

    <DemoModal open={demoOpen} onClose={() => setDemo(false)} />
    </>
  );
}
