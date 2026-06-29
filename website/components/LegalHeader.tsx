import Image from "next/image";
import Link from "next/link";
import styles from "./LegalHeader.module.css";

export default function LegalHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/salon-central-logo.png"
            alt="Salon Central"
            width={1080}
            height={1080}
            style={{ height: "58px", width: "58px", objectFit: "contain" }}
            priority
          />
        </Link>
        <Link href="/" className={styles.back}>← Back to Home</Link>
      </div>
    </header>
  );
}
