import Image from "next/image";
import Link from "next/link";
import styles from "./LegalHeader.module.css";

export default function LegalHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/werzio-logo.png"
            alt="Werzio"
            width={2000}
            height={2000}
            style={{ height: "80px", width: "auto", filter: "brightness(0)" }}
            priority
          />
        </Link>
        <Link href="/" className={styles.back}>← Back to Home</Link>
      </div>
    </header>
  );
}
