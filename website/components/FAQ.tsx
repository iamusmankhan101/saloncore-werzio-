"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./FAQ.module.css";

const faqs = [
  {
    q: "What is Salon Central?",
    a: "Salon Central is an all-in-one salon management software built for Pakistan's beauty industry. It includes POS, appointment booking, CRM, invoicing, inventory management, payroll, loyalty points, and WhatsApp automation — all in one dashboard.",
  },
  {
    q: "Does Salon Central work for multi-branch salons?",
    a: "Yes. Salon Central's Premium plan includes multi-location branch management, allowing you to manage revenue, staff, and inventory across all branches from a single consolidated dashboard.",
  },
  {
    q: "How does WhatsApp automation work in Salon Central?",
    a: "Salon Central connects to your WhatsApp Business number to send automated appointment confirmations, reminders, birthday offers, loyalty rewards, and re-engagement messages to clients — with no manual effort required.",
  },
  {
    q: "What payment methods does the Salon Central POS support?",
    a: "The Salon Central POS supports cash, JazzCash, EasyPaisa, Raast, credit/debit card, and bank transfers — covering every major payment method used in Pakistan.",
  },
  {
    q: "How long does it take to set up Salon Central?",
    a: "Setup takes under 3 minutes. You create your salon profile, add your services and staff, and connect your WhatsApp Business number. The booking bot activates instantly with no coding required.",
  },
  {
    q: "Which types of salons can use Salon Central?",
    a: "Salon Central is built for men's salons, hair salons, beauty salons, spas, nail salons, bridal salons, and aesthetic clinics across Pakistan.",
  },
  {
    q: "Does Salon Central have a loyalty points programme?",
    a: "Yes. Salon Central includes a built-in loyalty programme with automatic point earning at POS, redeemable discounts, and Bronze-to-Platinum membership tiers. Clients receive digital loyalty cards compatible with Google Wallet.",
  },
  {
    q: "How does Salon Central handle staff payroll?",
    a: "Salon Central automatically calculates payroll based on commission percentage or fixed salary per staff member. It maintains a full payout history and allows one-click mark-as-paid for each staff member.",
  },
];

// Generated from the same `faqs` array rendered below, so the structured
// data can never drift from what's actually visible on the page.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className={styles.section} id="faq" aria-label="Frequently asked questions">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className={`text-center ${styles.header}`}>
        <div className="section-label" data-animate data-delay="0">✦ FAQ</div>
        <h2 className="section-title" data-animate data-delay="0.1">Questions Salon Owners Ask</h2>
        <p className="section-sub" data-animate data-delay="0.2">Everything you need to know before you switch.</p>
      </div>

      <div className={styles.list}>
        {faqs.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={item.q}
              className={styles.item}
              data-animate
              data-delay={String(Math.min(0.1 * i, 0.4))}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className={styles.question}
              >
                {item.q}
                <span className={`${styles.icon} ${isOpen ? styles.open : ""}`}>
                  <ChevronDown size={18} />
                </span>
              </button>
              {isOpen && <div className={styles.answer}>{item.a}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
