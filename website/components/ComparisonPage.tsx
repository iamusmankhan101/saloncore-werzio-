"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, X, ChevronDown, Minus } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import DemoModal from "./DemoModal";
import styles from "./SchedulingFeaturePage.module.css";
import compareStyles from "./ComparisonPage.module.css";

export interface ComparisonRow {
  feature: string;
  salonCentral: boolean | string;
  competitor: boolean | string;
  note?: string;
}

export interface ComparisonFaq {
  q: string;
  a: string;
}

export interface ComparisonPageProps {
  competitorName: string;
  competitorUrl: string;
  competitorSummary: string;
  rows: ComparisonRow[];
  verdict: string;
  faqs: ComparisonFaq[];
}

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check size={18} color="#059669" aria-label="Yes" />;
  if (value === false) return <X size={18} color="#dc2626" aria-label="No" />;
  if (value === "partial") return <Minus size={18} color="#d97706" aria-label="Partial" />;
  return <span style={{ fontSize: "0.85rem", color: "#4b4459" }}>{value}</span>;
}

export default function ComparisonPage({
  competitorName,
  competitorUrl,
  competitorSummary,
  rows,
  verdict,
  faqs,
}: ComparisonPageProps) {
  const [demoOpen, setDemoOpen] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.kicker}>Comparison</div>
              <h1>Salon Central vs {competitorName}</h1>
              <p>
                Salon Central is built specifically for beauty salons, hair salons, and spas: appointment scheduling,
                staff calendars, client beauty profiles, staff commission payroll, loyalty programs, and WhatsApp
                automation, all in one platform. {competitorSummary}
              </p>
              <div className={styles.heroActions}>
                <button type="button" onClick={() => setDemoOpen(true)} className={styles.primaryCta}>
                  Get started <ArrowRight size={17} />
                </button>
                <Link href="/#pricing" className={styles.secondaryCta}>
                  View pricing
                </Link>
              </div>
            </div>
          </div>
          <div className={styles.wave} aria-hidden="true" />
        </section>

        <section className={compareStyles.tableSection} aria-label={`Salon Central vs ${competitorName} feature comparison`}>
          <h2 className={compareStyles.tableTitle}>Feature-by-feature comparison</h2>
          <div className={compareStyles.tableWrap}>
            <table className={compareStyles.table}>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>Salon Central</th>
                  <th>{competitorName}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.feature}>
                    <td>
                      {row.feature}
                      {row.note && <div className={compareStyles.rowNote}>{row.note}</div>}
                    </td>
                    <td><Cell value={row.salonCentral} /></td>
                    <td><Cell value={row.competitor} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={compareStyles.disclaimer}>
            Comparison based on publicly available information from {competitorName}&apos;s website
            (<a href={competitorUrl} target="_blank" rel="noopener noreferrer">{competitorUrl}</a>) as of the date this
            page was published. Features and pricing change over time; please verify current details directly with{" "}
            {competitorName} before deciding.
          </p>
        </section>

        <section className={compareStyles.verdictSection}>
          <p>{verdict}</p>
        </section>

        <section
          style={{ maxWidth: 860, margin: "0 auto", padding: "84px 5%" }}
          aria-label={`Salon Central vs ${competitorName} FAQs`}
        >
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              FAQs
            </span>
            <h2 style={{ marginTop: 8 }}>Salon Central vs {competitorName}: Frequently Asked Questions</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {faqs.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={item.q}
                  style={{ border: "1px solid #e8e8f0", borderRadius: 14, background: "#fff", overflow: "hidden" }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 16, padding: "18px 22px", background: "none", border: "none", cursor: "pointer",
                      textAlign: "left", fontSize: "1rem", fontWeight: 700, color: "#17112a",
                    }}
                  >
                    {item.q}
                    <ChevronDown
                      size={18}
                      color="#7c3aed"
                      style={{ flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}
                    />
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 22px 20px", fontSize: "0.92rem", lineHeight: 1.65, color: "#4b4459" }}>
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.ctaBand}>
          <div>
            <span>Ready to switch?</span>
            <h2>See why salons choose Salon Central over {competitorName}</h2>
          </div>
          <div className={styles.ctaActions}>
            <button type="button" onClick={() => setDemoOpen(true)} className={styles.primaryCta}>
              Get started <ArrowRight size={17} />
            </button>
            <Link href="/#pricing" className={styles.secondaryDark}>View pricing</Link>
          </div>
        </section>
      </main>
      <Footer />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
