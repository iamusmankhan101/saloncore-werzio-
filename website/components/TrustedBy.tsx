import styles from "./TrustedBy.module.css";

const brands = ["Glow Studio", "BeauteQ", "SilkHair DHA", "Luxe Beauty", "Noor Salon"];

export default function TrustedBy() {
  return (
    <div className={styles.wrapper}>
      <p className={styles.label} data-animate data-delay="0">Trusted by Pakistan&apos;s leading salon brands</p>
      <div className={styles.logos}>
        {brands.map((b, i) => (
          <div key={b} className={styles.pill} data-animate data-delay={`${0.05 + i * 0.07}`}>{b}</div>
        ))}
      </div>
    </div>
  );
}
