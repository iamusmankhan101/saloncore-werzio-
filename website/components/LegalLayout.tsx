"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./LegalLayout.module.css";
import LegalHeader from "./LegalHeader";

const nav = [
  { label: "Privacy Policy",   href: "/privacy" },
  { label: "Terms of Service", href: "/terms"   },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <>
    <LegalHeader />
    <div className={styles.page}>
      {/* ── sidebar ── */}
      <aside className={styles.sidebar}>
        <p className={styles.sidebarHead}>Legal Terms</p>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`${styles.navLink} ${path === n.href ? styles.navActive : ""}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* ── content ── */}
      <main className={styles.content}>
        {children}
      </main>
    </div>
    </>
  );
}
