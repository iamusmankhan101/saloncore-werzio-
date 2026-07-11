import styles from "./WhySalonCentral.module.css";

const stats = [
  {
    value: "45%",
    desc: "Fewer No-Shows with Automated WhatsApp reminders before every appointment.",
    highlight: true,
  },
  {
    value: "3×",
    desc: "Faster Bookings — clients self-book in 60 seconds with no back-and-forth DMs.",
    highlight: false,
  },
  {
    value: "100%",
    desc: "Real-Time Insights across your salon. Track revenue, staff, and client trends live.",
    highlight: true,
  },
  {
    value: "10K+",
    desc: "Active Salons — home studios, startups, and growing multi-branch chains.",
    highlight: false,
  },
];

export default function WhySalonCentral() {
  return (
    <section className={styles.section} id="why">
      <div className={styles.header}>
        <h2 className={styles.title} data-animate data-delay="0">Why Salons Choose Salon Central</h2>
        <p className={styles.sub} data-animate data-delay="0.1">
          Trusted beauty salon software for thousands of hair salons, spas, and parlours.
          Designed to help your beauty business do its best work.
        </p>
      </div>
      <div className={styles.grid}>
        {stats.map((s, i) => (
          <div
            key={i}
            data-animate
            data-delay={`${0.15 + i * 0.1}`}
            className={[
              styles.card,
              s.highlight ? styles.cardHighlight : "",
              i % 2 === 1 ? styles.cardOffset : "",
            ].join(" ")}
          >
            <div className={styles.dot} />
            <div className={styles.value}>{s.value}</div>
            <p className={styles.desc}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
