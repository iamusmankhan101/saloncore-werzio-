"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, ChevronDown, ShoppingCart, CalendarDays, MessageCircle, Globe } from "lucide-react";
import styles from "./Navbar.module.css";

const featureLinks = [
  { label: "Appointment Scheduling", desc: "Calendar, bookings & reminders", href: "/features/appointment-scheduling", Icon: CalendarDays },
  { label: "Point of Sale (POS)",    desc: "Checkout, payments & invoices",   href: "/features/pos",                     Icon: ShoppingCart },
  { label: "WhatsApp Reminders",     desc: "Confirmations, alerts & follow-ups", href: "/features/whatsapp-reminders",  Icon: MessageCircle },
  { label: "Online Booking Page",    desc: "Shareable page for Instagram & Maps", href: "/features/online-booking",      Icon: Globe },
];

const links = [
  { label: "How It Works", href: "/#how" },
  { label: "Why Werzio",   href: "/#why" },
  { label: "Testimonials", href: "/#testimonials" },
  { label: "Pricing",      href: "/#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled]       = useState(false);
  const [open, setOpen]               = useState(false);
  const [dropOpen, setDropOpen]       = useState(false);
  const [mobileFeatures, setMobileFeatures] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
        <Link href="/" className={styles.logo}>
          <Image src="/werzio-logo.png" alt="Werzio" width={2000} height={2000} style={{ height: "100px", width: "auto" }} priority />
        </Link>

        <ul className={styles.links}>
          {/* Features dropdown */}
          <li
            className={styles.dropParent}
            onMouseEnter={() => setDropOpen(true)}
            onMouseLeave={() => setDropOpen(false)}
          >
            <Link href="/#features" className={`${styles.link} ${styles.dropTrigger}`}>
              Features <ChevronDown size={13} className={`${styles.chevron} ${dropOpen ? styles.chevronOpen : ""}`} />
            </Link>
            <div className={`${styles.dropdown} ${dropOpen ? styles.dropdownOpen : ""}`}>
              {featureLinks.map(({ label, desc, href, Icon }) => (
                <Link key={href} href={href} className={styles.dropItem} onClick={() => setDropOpen(false)}>
                  <div className={styles.dropIcon}><Icon size={16} /></div>
                  <div>
                    <div className={styles.dropLabel}>{label}</div>
                    <div className={styles.dropDesc}>{desc}</div>
                  </div>
                </Link>
              ))}
              <div className={styles.dropDivider} />
              <Link href="/#features" className={styles.dropAll} onClick={() => setDropOpen(false)}>
                See all features →
              </Link>
            </div>
          </li>

          {/* Regular links */}
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={styles.link}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className={styles.cta}>
          <a href="https://app.werzio.com/" target="_blank" rel="noopener noreferrer" className={`btn btn-outline ${styles.loginBtn}`}>Log In</a>
          <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className="btn btn-primary">Start Free Trial</a>
        </div>

        <button className={styles.burger} onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      <div className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}>
        <ul className={styles.drawerLinks}>
          {/* Features accordion */}
          <li>
            <button
              type="button"
              className={styles.drawerLink}
              style={{ width: "100%", background: "none", border: "none", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
              onClick={() => setMobileFeatures(!mobileFeatures)}
            >
              Features
              <ChevronDown size={15} style={{ transform: mobileFeatures ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {mobileFeatures && (
              <ul style={{ listStyle: "none", paddingLeft: 16, marginBottom: 8 }}>
                {featureLinks.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={styles.drawerLink}
                      style={{ fontSize: "0.9rem", color: "var(--purple)", borderBottom: "none", paddingTop: 8, paddingBottom: 8 }}
                      onClick={() => setOpen(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={styles.drawerLink} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.drawerCta}>
          <a href="https://app.werzio.com/" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }}>Log In</a>
          <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setOpen(false)}>Start Free Trial</a>
        </div>
      </div>

      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}
    </>
  );
}
