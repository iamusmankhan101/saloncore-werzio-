"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
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
  const [open, setOpen]         = useState(false);
  const [active, setActive]     = useState("#features");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLink = (href: string) => {
    setActive(href);
    setOpen(false);
  };

  return (
    <>
      <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
        <a href="#home" className={styles.logo}>
          <Image src="/werzio-logo.png" alt="Werzio" width={2000} height={2000} style={{ height: '100px', width: 'auto' }} priority />
        </a>

        <ul className={styles.links}>
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={`${styles.link} ${active === l.href ? styles.active : ""}`}
                onClick={() => handleLink(l.href)}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.cta}>
          <a href="#" className={`btn btn-outline ${styles.loginBtn}`}>Log In</a>
          <a href="#pricing" className="btn btn-primary">Start Free Trial</a>
        </div>

        <button className={styles.burger} onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}>
        <ul className={styles.drawerLinks}>
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={styles.drawerLink} onClick={() => handleLink(l.href)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className={styles.drawerCta}>
          <a href="#" className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }}>Log In</a>
          <a href="#pricing" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setOpen(false)}>Start Free Trial</a>
        </div>
      </div>

      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}
    </>
  );
}
