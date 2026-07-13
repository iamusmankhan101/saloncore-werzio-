"use client";
import { Fragment, useState } from "react";
import { ArrowRight, Check, X, ChevronDown, Minus } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import DemoModal from "./DemoModal";
import compareStyles from "./ComparisonPage.module.css";

export interface ComparisonRow {
  feature: string;
  salonCentral: boolean | string;
  competitor: boolean | string;
  note?: string;
}

export interface ComparisonCategory {
  title: string;
  rows: ComparisonRow[];
}

export interface ComparisonFaq {
  q: string;
  a: string;
}

export interface ComparisonPageProps {
  competitorName: string;
  competitorUrl: string;
  competitorLogo: string;
  competitorSummary: string;
  categories: ComparisonCategory[];
  verdict: string;
  faqs: ComparisonFaq[];
  dataAsOf: string;
}

function Cell({ value, highlighted }: { value: boolean | string; highlighted?: boolean }) {
  if (value === true) {
    return <Check size={17} color={highlighted ? "#fff" : "#059669"} aria-label="Yes" strokeWidth={3} />;
  }
  if (value === false) {
    return <X size={17} color={highlighted ? "rgba(255,255,255,0.85)" : "#dc2626"} aria-label="No" strokeWidth={3} />;
  }
  if (value === "partial") {
    return <Minus size={17} color={highlighted ? "#fff" : "#d97706"} aria-label="Partial" strokeWidth={3} />;
  }
  return (
    <span className={compareStyles.cellText} style={highlighted ? { color: "#fff", fontWeight: 800 } : undefined}>
      {value}
    </span>
  );
}

export default function ComparisonPage({
  competitorName,
  competitorUrl,
  competitorLogo,
  competitorSummary,
  categories,
  verdict,
  faqs,
  dataAsOf,
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
      <Navbar forceSolid />
      <main className={compareStyles.page}>
        {/* ── centered hero ── */}
        <section className={compareStyles.hero}>
          <div className={compareStyles.heroInner}>
            <h1>Salon Central vs. {competitorName}</h1>
            <p className={compareStyles.heroTagline}>Salon software built to run your whole business, not just checkout.</p>
            <p className={compareStyles.heroDesc}>
              Salon Central is a salon POS system covering appointment scheduling, client beauty profiles, staff
              commission payroll, loyalty programs, and WhatsApp automation in one platform. {competitorSummary}
            </p>
            <button type="button" onClick={() => setDemoOpen(true)} className={compareStyles.heroCta}>
              Book a Demo <ArrowRight size={17} />
            </button>
          </div>
        </section>

        {/* ── comparison table ── */}
        <section className={compareStyles.tableSection} aria-label={`Salon Central vs ${competitorName} feature comparison`}>
          <h2 className={compareStyles.tableTitle}>
            How does Salon Central compare to {competitorName}?
          </h2>
          <p className={compareStyles.tableSubtitle}>Both can run a checkout. Here&apos;s where they actually differ.</p>

          <div className={compareStyles.tableWrap}>
            <table className={compareStyles.table}>
              <thead>
                <tr>
                  <th className={compareStyles.featureHead}></th>
                  <th className={compareStyles.highlightHead}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/salon-central-logo.png" alt="Salon Central" className={compareStyles.scLogo} />
                  </th>
                  <th>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={competitorLogo} alt={`${competitorName} logo`} className={compareStyles.competitorLogo} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <Fragment key={cat.title}>
                    <tr className={compareStyles.categoryRow}>
                      <td colSpan={3}>{cat.title}</td>
                    </tr>
                    {cat.rows.map((row) => (
                      <tr key={row.feature}>
                        <td className={compareStyles.featureCell}>
                          {row.feature}
                          {row.note && <div className={compareStyles.rowNote}>{row.note}</div>}
                        </td>
                        <td className={compareStyles.highlightCell}><Cell value={row.salonCentral} highlighted /></td>
                        <td><Cell value={row.competitor} /></td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── verdict ── */}
        <section className={compareStyles.verdictSection}>
          <p>{verdict}</p>
        </section>

        {/* ── FAQ ── */}
        <section className={compareStyles.faqSection} aria-label={`Salon Central vs ${competitorName} FAQs`}>
          <div className={compareStyles.faqHead}>
            <span className={compareStyles.eyebrow}>FAQs</span>
            <h2>Salon Central vs {competitorName}: Frequently Asked Questions</h2>
          </div>
          <div className={compareStyles.faqList}>
            {faqs.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={item.q} className={compareStyles.faqItem}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className={compareStyles.faqQuestion}
                  >
                    {item.q}
                    <ChevronDown
                      size={18}
                      color="#7c3aed"
                      style={{ flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}
                    />
                  </button>
                  {isOpen && <div className={compareStyles.faqAnswer}>{item.a}</div>}
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
