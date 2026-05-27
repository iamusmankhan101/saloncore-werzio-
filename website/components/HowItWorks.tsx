import styles from "./HowItWorks.module.css";

const steps = [
  {
    n: "01",
    title: "Simple And Fast Setup",
    desc: "Create your salon profile, add your services and staff — fully live in under 3 minutes.",
    preview: true,
  },
  {
    n: "02",
    title: "Connect WhatsApp & Go Live",
    desc: "Link your WhatsApp Business number and your booking bot activates instantly — no code needed.",
    preview: false,
  },
  {
    n: "03",
    title: "Grow Your Salon on Autopilot",
    desc: "Automated reminders cut no-shows by 45%. Re-engagement messages bring back lapsed clients.",
    preview: false,
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section} id="how">
      <div className={styles.header}>
        <h2 className={styles.title}>Get Started In Just 3 Easy Steps</h2>
        <p className={styles.sub}>
          Get started with a guided onboarding experience designed for speed and simplicity.
        </p>
      </div>

      <div className={styles.body}>
        {/* Left: dashboard mockup */}
        <div className={styles.mockupWrap}>
          <div className={styles.mockupPanel}>
            <div className={styles.browser}>
              <div className={styles.browserBar}>
                <span className={styles.dot1} />
                <span className={styles.dot2} />
                <span className={styles.dot3} />
              </div>
              <div className={styles.browserContent}>
                <div className={styles.sidebar}>
                  <div className={styles.sidebarLogo}>
                    <div className={styles.logoIcon} />
                    <span>Werzio</span>
                  </div>
                  {["Dashboard", "Bookings", "Clients", "Analytics", "Staff", "Settings"].map((item) => (
                    <div key={item} className={styles.sidebarItem}>{item}</div>
                  ))}
                </div>
                <div className={styles.mainArea}>
                  <div className={styles.mainTitle}>Appointments</div>
                  <div className={styles.cardRow}>
                    <div className={styles.miniCard}>
                      <div className={styles.miniCardLabel}>Today</div>
                      <div className={styles.miniCardVal}>12</div>
                    </div>
                    <div className={styles.miniCard}>
                      <div className={styles.miniCardLabel}>Revenue</div>
                      <div className={styles.miniCardVal}>PKR 18k</div>
                    </div>
                  </div>
                  <div className={styles.listItem} />
                  <div className={styles.listItem} />
                  <div className={styles.listItem} style={{ width: "70%" }} />
                  <div className={styles.listItem} style={{ width: "85%" }} />
                  <div className={styles.badge}>Confirmed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: steps */}
        <div className={styles.steps}>
          {steps.map((s) => (
            <div key={s.n} className={`${styles.stepCard} ${s.preview ? styles.stepCardActive : ""}`}>
              <div className={styles.stepLeft}>
                <div className={styles.numCircle}>{s.n}</div>
              </div>
              <div className={styles.stepRight}>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
                {s.preview && (
                  <div className={styles.formPreview}>
                    <div className={styles.formRow}>
                      <div className={styles.formBox}>
                        <div className={styles.formLabel}>Salon Name</div>
                        <div className={styles.formInput} />
                      </div>
                      <div className={styles.formBox}>
                        <div className={styles.formLabel}>WhatsApp No.</div>
                        <div className={styles.formInput} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
