import styles from "./Pricing.module.css";
import { Check } from "lucide-react";

const plans: Array<{
  badge: string;
  badgeStyle: Record<string, string>;
  name: string;
  desc: string;
  price: string;
  period: string;
  features: (string | { label: string; soon: boolean })[];
  cta: string;
  ctaHref: string;
  ctaClass: string;
  featured: boolean;
}> = [
  {
    badge: "Free Forever",
    badgeStyle: { background: "#f3f4f6", color: "#6b7280" },
    name: "Werzio Free",
    desc: "Get started with the essentials — no credit card required.",
    price: "0",
    period: "/month",
    features: [
      "Point of Sale (POS)",
      "Appointment booking (up to 30/month)",
      "Branded web booking page",
      "Invoicing",
      "Up to 5 staff members",
      "Up to 5 client management",
      "Up to 5 products (POS)",
    ],
    cta: "Get Started Free",
    ctaHref: "https://app.werzio.com/signup?plan=free",
    ctaClass: "btn btn-outline",
    featured: false,
  },
  {
    badge: "Most Popular",
    badgeStyle: {},
    name: "Werzio Pro",
    desc: "The complete toolkit for growing salons — everything you need to manage and scale.",
    price: "6,000",
    period: "/month",
    features: [
      "Point of Sale (POS)",
      "Unlimited appointment booking",
      "Branded online web booking page",
      "Unlimited staff & client management",
      "Inventory management",
      "Invoicing",
      "Revenue management",
      "Services management",
      "WhatsApp reminders",
    ],
    cta: "Start Free Trial",
    ctaHref: "https://app.werzio.com/signup?plan=pro",
    ctaClass: "btn btn-primary",
    featured: true,
  },
  {
    badge: "All Features",
    badgeStyle: { background: "#fef3c7", color: "#d97706" },
    name: "Werzio Premium",
    desc: "Everything in Pro plus AI-powered virtual try-on for the ultimate salon experience.",
    price: "10,000",
    period: "/month",
    features: [
      "Point of Sale (POS)",
      "Unlimited appointment booking",
      "Branded online web booking page",
      "Unlimited staff & client management",
      "Inventory management",
      "Invoicing",
      "Revenue management",
      "Services management",
      "WhatsApp reminders",
      { label: "Virtual Try-On (AI hair & style preview)", soon: true },
    ],
    cta: "Get Werzio Premium",
    ctaHref: "https://app.werzio.com/signup?plan=premium",
    ctaClass: "btn btn-outline",
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section className={styles.section} id="pricing">
      <div className="text-center">
        <div className="section-label" data-animate data-delay="0">✦ Pricing</div>
        <h2 className="section-title" data-animate data-delay="0.1">Simple, PKR Pricing.<br />No Hidden Fees.</h2>
        <p className="section-sub" data-animate data-delay="0.2">Start free. Upgrade when you&apos;re ready. Cancel anytime.</p>
      </div>
      <div className={styles.grid}>
        {plans.map((p, i) => (
          <div key={p.name} data-animate data-delay={`${0.25 + i * 0.12}`} className={`${styles.card} ${p.featured ? styles.featured : ""}`}>
            <div className={styles.badge} style={p.badgeStyle}>{p.badge}</div>
            <div className={styles.planName}>{p.name}</div>
            <p className={styles.planDesc}>{p.desc}</p>
            <div className={styles.price}>
              {p.price === "0" ? (
                <span className={styles.amount} style={{ fontSize: "2.4rem" }}>Free</span>
              ) : (
                <>
                  <span className={styles.currency}>₨</span>
                  <span className={styles.amount}>{p.price}</span>
                  <span className={styles.period}>{p.period}</span>
                </>
              )}
            </div>
            <ul className={styles.features}>
              {p.features.map((f) => {
                const label = typeof f === "string" ? f : f.label;
                const soon  = typeof f === "object" && f.soon;
                return (
                  <li key={label}>
                    <span className={styles.checkIcon}><Check size={10} strokeWidth={3} /></span>
                    <span>{label}</span>
                    {soon && <span className={styles.soonBadge}>Coming Soon</span>}
                  </li>
                );
              })}
            </ul>
            <a href={p.ctaHref} target="_blank" rel="noopener noreferrer" className={`${p.ctaClass} ${styles.planBtn}`}>{p.cta}</a>
          </div>
        ))}
      </div>
    </section>
  );
}
