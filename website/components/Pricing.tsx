import styles from "./Pricing.module.css";
import { Check } from "lucide-react";

const CONTACT_SALES_URL = "https://wa.me/923058562523?text=Hi%2C%20I%27m%20interested%20in%20a%20Salon%20Central%20plan.";

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
    badge: "Most Popular",
    badgeStyle: {},
    name: "salon central pro",
    desc: "The complete toolkit for growing salons.",
    price: "Contact Sales",
    period: "",
    features: [
      "Point of Sale (POS)",
      "Unlimited appointment booking",
      "Branded online web booking page",
      "Unlimited staff & client management",
      "Inventory management",
      "Invoicing",
      "Revenue management",
      "Services management",
      "whatsapp reminders",
    ],
    cta: "Contact Sales",
    ctaHref: CONTACT_SALES_URL,
    ctaClass: "btn btn-primary",
    featured: true,
  },
  {
    badge: "Premium",
    badgeStyle: { background: "#fef3c7", color: "#d97706" },
    name: "salon central premium",
    desc: "Everything in Pro plus virtual try-on and multi-location branch management.",
    price: "Contact Sales",
    period: "",
    features: [
      "Point of Sale (POS)",
      "Unlimited appointment booking",
      "Branded online web booking page",
      "Unlimited staff & client management",
      "Inventory management",
      "Invoicing",
      "Revenue management",
      "Services management",
      "whatsapp reminders",
      "virtual try on",
      "multi-location branch management",
    ],
    cta: "Contact Sales",
    ctaHref: CONTACT_SALES_URL,
    ctaClass: "btn btn-outline",
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section className={styles.section} id="pricing">
      <div className="text-center">
        <div className="section-label" data-animate data-delay="0">✦ Pricing</div>
        <h2 className="section-title" data-animate data-delay="0.1">Plans Built Around<br />Your Salon.</h2>
        <p className="section-sub" data-animate data-delay="0.2">Talk to our sales team and choose the setup that fits your salon.</p>
      </div>
      <div className={styles.grid}>
        {plans.map((p, i) => (
          <div key={p.name} data-animate data-delay={`${0.25 + i * 0.12}`} className={`${styles.card} ${p.featured ? styles.featured : ""}`}>
            <div className={styles.badge} style={p.badgeStyle}>{p.badge}</div>
            <div className={styles.planName}>{p.name}</div>
            <p className={styles.planDesc}>{p.desc}</p>
            <div className={styles.price}>
              {p.price === "Contact Sales" ? (
                <span className={`${styles.amount} ${styles.contactPrice}`}>Contact Sales</span>
              ) : p.price === "0" ? (
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
