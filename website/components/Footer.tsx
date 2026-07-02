import Image from "next/image";
import styles from "./Footer.module.css";

const links = {
  Product: ["Features", "Pricing", "How It Works", "Roadmap"],
  Company: ["About", "Careers", "Contact", "Privacy Policy"],
};

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>

        {/* ── Brand col ── */}
        <div className={styles.brand}>
          <div className={styles.logoWrap}>
            <Image
              src="/salon-central-logo.png"
              alt="Salon Central"
              width={1080}
              height={1080}
              style={{ height: "110px", width: "110px", objectFit: "contain" }}
            />
          </div>
          <p className={styles.tagline}>
            The all-in-one operating system for Pakistan&apos;s beauty industry.
            Manage bookings, staff, and revenue — all from one dashboard.
          </p>
        </div>

        {/* ── Link cols ── */}
        <div className={styles.cols}>
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading} className={styles.col}>
              <h4 className={styles.colHead}>{heading}</h4>
              <ul className={styles.colList}>
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className={styles.colLink}>{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

      </div>

      {/* ── Bottom bar ── */}
      <div className={styles.bottom}>
        <span style={{ color: "#fff" }}>© 2026 Salon Central. All rights reserved.</span>
        <div className={styles.legal}>
          <a href="/terms">Terms of Service</a>
          <a href="/privacy">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}
