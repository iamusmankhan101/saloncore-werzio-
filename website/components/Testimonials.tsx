import styles from "./Testimonials.module.css";

const testimonials = [
  {
    stars: 5,
    text: "Before Werzio I was losing PKR 80K bridal bookings because I didn't see Instagram DMs on time. Now every booking comes through WhatsApp and confirms automatically. My no-show rate dropped from 25% to 4%.",
    initials: "AN",
    name: "Amna Nawaz",
    role: "Owner, Glow Studio DHA Lahore",
  },
  {
    stars: 5,
    text: "Managing 3 branches used to mean driving across Lahore every day. Werzio's consolidated dashboard shows all my revenue, staff, and inventory in one place. It's like having an operations manager in my pocket.",
    initials: "UK",
    name: "Usman Khan",
    role: "Owner, BeauteQ · 3 Locations",
  },
  {
    stars: 5,
    text: "My clients love that Werzio remembers their hair color formula. No more explaining the same formula every visit. The re-engagement messages also brought back 40 lapsed clients in the first month.",
    initials: "SR",
    name: "Sara Riaz",
    role: "Owner, SilkHair Gulberg",
  },
];

export default function Testimonials() {
  return (
    <section className={styles.section} id="testimonials">
      <div className="text-center">
        <div className="section-label">Testimonials</div>
        <h2 className="section-title">Salon Owners Love Werzio</h2>
        <p className="section-sub">Real results from real salon owners across Pakistan.</p>
      </div>
      <div className={styles.grid}>
        {testimonials.map((t) => (
          <div key={t.name} className={styles.card}>
            <div className={styles.stars}>{"★".repeat(t.stars)}</div>
            <p className={styles.text}>{t.text}</p>
            <div className={styles.author}>
              <div className={styles.avatar}>{t.initials}</div>
              <div>
                <div className={styles.name}>{t.name}</div>
                <div className={styles.role}>{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
