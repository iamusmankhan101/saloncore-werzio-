import Image from "next/image";
import styles from "./Footer.module.css";

const links = {
  Product:   ["Features", "Pricing", "How It Works", "Roadmap"],
  Resources: ["Documentation", "Blog", "Support", "Updates"],
  Company:   ["About", "Careers", "Contact", "Privacy Policy"],
};

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>

        {/* ── Brand col ── */}
        <div className={styles.brand}>
          <div className={styles.logoWrap}>
            <Image
              src="/werzio-logo.png"
              alt="Werzio"
              width={2000}
              height={2000}
              style={{ height: "90px", width: "auto" }}
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
        <span style={{ color: "#fff" }}>© 2026 Werzio. All rights reserved.</span>
        <div className={styles.legal}>
          <a href="#">Terms of Service</a>
          <a href="#">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}
