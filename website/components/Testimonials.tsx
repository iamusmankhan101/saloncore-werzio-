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
  {
    stars: 5,
    text: "We used to miss 30% of walk-ins because the receptionist was on the phone. With Werzio's online booking page shared on our Instagram bio, clients book themselves. Revenue jumped 60% in 3 months.",
    initials: "FQ",
    name: "Fatima Qureshi",
    role: "Owner, Blush & Bloom Karachi",
  },
  {
    stars: 5,
    text: "The inventory alerts are a game changer. I used to run out of L'Oréal developer mid-week and lose appointments. Now I get a WhatsApp alert before I run low. Never had a stock-out since.",
    initials: "NM",
    name: "Nida Mirza",
    role: "Manager, The Style Room Islamabad",
  },
  {
    stars: 5,
    text: "Staff commission used to be a headache every month — I'd spend 3 hours on spreadsheets. Werzio calculates everything automatically. My stylists trust the numbers and morale has improved massively.",
    initials: "HB",
    name: "Hina Baig",
    role: "Owner, Velvet Touch Salon Lahore",
  },
];

// Duplicate for seamless infinite loop
const doubled = [...testimonials, ...testimonials];

function Card({ t }: { t: typeof testimonials[0] }) {
  return (
    <div className={styles.card}>
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
  );
}

export default function Testimonials() {
  return (
    <section className={styles.section} id="testimonials">
      <div className="text-center">
        <div className="section-label">✦ Testimonials</div>
        <h2 className="section-title">Salon Owners Love Werzio</h2>
        <p className="section-sub">Real results from real salon owners across Pakistan.</p>
      </div>

      <div className={styles.track}>
        <div className={styles.marquee}>
          {doubled.map((t, i) => (
            <Card key={i} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
