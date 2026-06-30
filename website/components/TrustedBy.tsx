import Image from "next/image";
import styles from "./TrustedBy.module.css";

export default function TrustedBy() {
  return (
    <div className={styles.wrapper}>
      <p className={styles.label} data-animate data-delay="0">Trusted by salons across Pakistan</p>
      <div className={styles.logos}>
        <div className={styles.logoCard} data-animate data-delay="0.08">
          <Image
            src="/lounge-8-salon-logo.png"
            alt="Lounge 8 Salon"
            width={500}
            height={500}
            className={styles.logoImage}
          />
        </div>
      </div>
    </div>
  );
}
