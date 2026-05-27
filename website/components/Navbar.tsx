"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./Navbar.module.css";

const links = [
  { label: "Features",     href: "#features" },
  { label: "How It Works", href: "#how" },
  { label: "Why Werzio",   href: "#why" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing",      href: "#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive]     = useState("#features");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
      <a href="#home" className={styles.logo}>
        <Image src="/werzio-logo.png" alt="Werzio" width={120} height={36} priority />
      </a>

      <ul className={styles.links}>
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className={`${styles.link} ${active === l.href ? styles.active : ""}`}
              onClick={() => setActive(l.href)}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>

      <div className={styles.cta}>
        <a href="#" className="btn btn-outline">Log In</a>
        <a href="#pricing" className="btn btn-primary">Start Free Trial</a>
      </div>
    </nav>
  );
}
