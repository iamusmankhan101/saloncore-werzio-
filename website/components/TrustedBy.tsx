import styles from "./TrustedBy.module.css";

const brands = ["Glow Studio", "BeauteQ", "SilkHair DHA", "Luxe Beauty", "Noor Salon"];

export default function TrustedBy() {
  return (
    <div className={styles.wrapper}>
      <p className={styles.label}>Trusted by Pakistan&apos;s leading salon brands</p>
      <div className={styles.logos}>
        {brands.map((b) => (
          <div key={b} className={styles.pill}>{b}</div>
        ))}
      </div>
    </div>
  );
}
