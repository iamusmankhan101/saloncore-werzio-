import styles from "./Pricing.module.css";
import { Check } from "lucide-react";

const plans = [
  {
    badge: "Free",
    badgeStyle: { background: "#f3f4f6", color: "#6b7280" },
    name: "Starter",
    desc: "Perfect for home-based stylists and solo salons just getting started.",
    price: "0",
    period: "/month",
    features: [
      "Up to 30 bookings/month",
      "WhatsApp booking bot",
      "Client profiles",
      "Basic calendar",
      "1 staff member",
    ],
    cta: "Get Started Free",
    ctaClass: "btn btn-outline",
    featured: false,
  },
  {
    badge: "Most Popular",
    badgeStyle: {},
    name: "Salon Pro",
    desc: "The complete toolkit for active salons ready to grow revenue and cut no-shows.",
    price: "2,999",
    period: "/month",
    features: [
      "Unlimited bookings",
      "WhatsApp reminders & campaigns",
      "Full revenue reporting + FBR invoices",
      "Staff commissions & attendance",
      "Inventory management",
      "Up to 8 staff members",
      "Branded web booking page",
    ],
    cta: "Start 14-Day Free Trial",
    ctaClass: "btn btn-primary",
    featured: true,
  },
  {
    badge: "Enterprise",
    badgeStyle: { background: "#fef3c7", color: "#d97706" },
    name: "Salon Plus",
    desc: "For multi-branch chains and franchise networks that need centralized control.",
    price: "7,999",
    period: "/month",
    features: [
      "Everything in Salon Pro",
      "Multi-branch management",
      "Payroll & HR module",
      "Custom domain website",
      "Franchise management tools",
      "Unlimited staff",
      "Dedicated onboarding manager",
    ],
    cta: "Contact Sales",
    ctaClass: "btn btn-outline",
    featured: false,
  },
];

export default function Pricing() {
  return (
    <section className={styles.section} id="pricing">
      <div className="text-center">
        <div className="section-label">Pricing</div>
        <h2 className="section-title">Simple, PKR Pricing.<br />No Hidden Fees.</h2>
        <p className="section-sub">Start free. Upgrade when you&apos;re ready. Cancel anytime.</p>
      </div>
      <div className={styles.grid}>
        {plans.map((p) => (
          <div key={p.name} className={`${styles.card} ${p.featured ? styles.featured : ""}`}>
            <div className={styles.badge} style={p.badgeStyle}>{p.badge}</div>
            <div className={styles.planName}>{p.name}</div>
            <p className={styles.planDesc}>{p.desc}</p>
            <div className={styles.price}>
              <span className={styles.currency}>₨</span>
              <span className={styles.amount}>{p.price}</span>
              <span className={styles.period}>{p.period}</span>
            </div>
            <ul className={styles.features}>
              {p.features.map((f) => (
                <li key={f}>
                  <span className={styles.checkIcon}><Check size={10} strokeWidth={3} /></span>
                  {f}
                </li>
              ))}
            </ul>
            <a href="#" className={`${p.ctaClass} ${styles.planBtn}`}>{p.cta}</a>
          </div>
        ))}
      </div>
    </section>
  );
}
