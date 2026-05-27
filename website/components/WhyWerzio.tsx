import styles from "./WhyWerzio.module.css";

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

export default function WhyWerzio() {
  return (
    <section className={styles.section} id="why">
      <div className={styles.header}>
        <h2 className={styles.title}>Why Salons Choose Werzio</h2>
        <p className={styles.sub}>
          Trusted by thousands of salons to manage bookings more efficiently.
          Designed to help your beauty business do its best work.
        </p>
      </div>
      <div className={styles.grid}>
        {stats.map((s, i) => (
          <div
            key={i}
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
