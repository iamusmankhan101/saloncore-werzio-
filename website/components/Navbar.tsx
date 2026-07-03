"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, ChevronDown, ShoppingCart, CalendarDays, MessageCircle, Globe, FileText, TrendingUp, UserCog, Users, Package, Gift, Coins } from "lucide-react";
import styles from "./Navbar.module.css";
import DemoModal from "./DemoModal";

const featureLinks = [
  { label: "Appointment Scheduling", desc: "Calendar, bookings & reminders", href: "/features/appointment-scheduling", Icon: CalendarDays },
  { label: "Point of Sale (POS)",    desc: "Checkout, payments & invoices",   href: "/features/pos",                     Icon: ShoppingCart },
  { label: "WhatsApp Reminders",     desc: "Confirmations, alerts & follow-ups", href: "/features/whatsapp-reminders",  Icon: MessageCircle },
  { label: "Online Booking Page",    desc: "Shareable page for Instagram & Maps", href: "/features/online-booking",      Icon: Globe },
  { label: "Invoicing",              desc: "Auto-numbered invoices & PDF export", href: "/features/invoicing",            Icon: FileText },
  { label: "Revenue Management",    desc: "Charts, breakdowns & PDF reports",    href: "/features/revenue-management",   Icon: TrendingUp },
  { label: "Staff Management",      desc: "Roles, services & performance stats",  href: "/features/staff-management",     Icon: UserCog },
  { label: "Client Management",     desc: "Profiles, formulas & visit history",   href: "/features/client-management",    Icon: Users },
  { label: "Inventory Management",  desc: "Stock levels, alerts & retail pricing", href: "/features/inventory-management",  Icon: Package },
  { label: "Loyalty Points",        desc: "Points, rewards & membership tiers",   href: "/features/loyalty-points",       Icon: Gift },
  { label: "Payroll Management",    desc: "Commission, salary & payout tracking", href: "/features/payroll-management",   Icon: Coins },
];

const links = [
  { label: "How It Works", href: "/#how" },
  { label: "Why Salon Central",   href: "/#why" },
  { label: "Testimonials", href: "/#testimonials" },
  { label: "Pricing",      href: "/#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled]       = useState(false);
  const [open, setOpen]               = useState(false);
  const [dropOpen, setDropOpen]       = useState(false);
  const [mobileFeatures, setMobileFeatures] = useState(false);
  const [demoOpen, setDemoOpen]       = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const openDrop  = () => { clearTimeout(closeTimer.current); setDropOpen(true); };
  const closeDrop = () => { closeTimer.current = setTimeout(() => setDropOpen(false), 180); };

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
          <Image src="/salon-central-logo.png" alt="Salon Central" width={1080} height={1080} style={{ height: "58px", width: "58px", objectFit: "contain" }} priority />
        </Link>

        <ul className={styles.links}>
          {/* Features dropdown */}
          <li
            className={styles.dropParent}
            onMouseEnter={openDrop}
            onMouseLeave={closeDrop}
          >
            <Link href="/#features" className={`${styles.link} ${styles.dropTrigger}`}>
              Features <ChevronDown size={13} className={`${styles.chevron} ${dropOpen ? styles.chevronOpen : ""}`} />
            </Link>
            <div className={`${styles.dropdown} ${dropOpen ? styles.dropdownOpen : ""}`} onMouseEnter={openDrop} onMouseLeave={closeDrop}>
              <div className={styles.megaInner}>
                <div className={styles.megaLeft}>
                  <div className={styles.megaHeader}>Explore features</div>
                  <div className={styles.megaGrid}>
                    {featureLinks.map(({ label, desc, href, Icon }) => (
                      <Link key={href} href={href} className={styles.dropItem} onClick={() => setDropOpen(false)}>
                        <div className={styles.dropIcon}><Icon size={15} /></div>
                        <div>
                          <div className={styles.dropLabel}>{label}</div>
                          <div className={styles.dropDesc}>{desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
                <div className={styles.megaRight}>
                  <div className={styles.featuredCard}>
                    <span className={styles.featuredBadge}>Salon Central Pro</span>
                    <strong className={styles.featuredTitle}>Everything your salon needs, in one place</strong>
                    <p className={styles.featuredBody}>Appointments, POS, inventory, staff, clients &amp; reports — no integrations needed.</p>
                    <div className={styles.featuredStats}>
                      <div><strong>11</strong><span>Features</span></div>
                      
                    </div>
                    <a href="https://app.werzio.com/sign-up" target="_blank" rel="noopener noreferrer" className={styles.featuredCta}>
                      Get started →
                    </a>
                  </div>
                </div>
              </div>
              <div className={styles.megaFooter}>
                <Link href="/#features" className={styles.dropAll} onClick={() => setDropOpen(false)}>
                  See all features →
                </Link>
              </div>
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
          <button type="button" onClick={() => setDemoOpen(true)} className="btn btn-primary">Book a Demo</button>
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
          <button type="button" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => { setOpen(false); setDemoOpen(true); }}>Book a Demo</button>
        </div>
      </div>

      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
