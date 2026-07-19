"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import styles from "./Hero.module.css";
import DemoVideoModal from "./DemoVideoModal";

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

      <div className={styles.screenshotWrapper}>
        <div ref={frameRef} className={styles.frame}>
          <Image
            src="/calendar-hero.png"
            alt="Salon Central calendar dashboard"
            width={2846}
            height={1616}
            className={styles.frameImage}
            priority
          />
        </div>
      </div>

    </section>

    <DemoVideoModal open={demoOpen} onClose={() => setDemo(false)} />
    </>
  );
}
