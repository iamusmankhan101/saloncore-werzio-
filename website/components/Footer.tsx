import Image from "next/image";
import styles from "./Footer.module.css";

const links = {
  Product:   ["Features", "Pricing", "How It Works", "Changelog", "Roadmap"],
  Solutions: ["Solo Stylists", "Salon Owners", "Multi-Branch Chains", "Bridal Studios", "Nail Bars"],
  Company:   ["About", "Blog", "Careers", "Contact", "Privacy Policy"],
};

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div className={styles.brand}>
          <div className={styles.logo}>
            <Image src="/werzio-logo.png" alt="Werzio" width={2000} height={2000} style={{ height: '100px', width: 'auto' }} />
          </div>
          <p>The all-in-one WhatsApp-native operating system for Pakistan&apos;s beauty industry. Built to help salons grow, retain clients, and earn more.</p>
          <div className={styles.waBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.99 0C5.365 0 0 5.365 0 11.99c0 2.1.547 4.07 1.503 5.78L0 24l6.384-1.676A11.94 11.94 0 0011.99 24C18.615 24 24 18.635 24 11.99 24 5.365 18.615 0 11.99 0zm0 21.818c-1.856 0-3.591-.5-5.083-1.371l-.364-.217-3.768.989 1.006-3.674-.237-.377A9.801 9.801 0 012.19 11.99c0-5.417 4.407-9.824 9.8-9.824 5.394 0 9.8 4.407 9.8 9.824 0 5.393-4.406 9.828-9.8 9.828z"/>
            </svg>
            WhatsApp-Native Platform
          </div>
        </div>

        {Object.entries(links).map(([heading, items]) => (
          <div key={heading} className={styles.col}>
            <h4>{heading}</h4>
            <ul>
              {items.map((item) => (
                <li key={item}><a href="#">{item}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className={styles.bottom}>
        <span>© 2026 Werzio. All rights reserved. Built for Pakistan&apos;s beauty industry.</span>
        <span>Lahore · Karachi · Islamabad</span>
      </div>
    </footer>
  );
}
