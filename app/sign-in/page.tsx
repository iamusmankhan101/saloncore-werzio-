"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from "lucide-react";
import { getCurrentUser, signIn } from "@/lib/auth";
import styles from "../auth.module.css";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@werzio.pk");
  const [password, setPassword] = useState("Werzio123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getCurrentUser()) router.replace("/dashboard");
  }, [router]);

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      signIn(email, password);
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to sign in.";
      if (msg === "EMAIL_NOT_VERIFIED") {
        setError("Please verify your email before signing in. Check your inbox for the verification link.");
      } else {
        setError(msg);
      }
    }
  }

  return (
    <main className={styles.authPage}>
      <div className={styles.authShell}>
        <section className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <div className={styles.brandMark}>
              <Sparkles size={17} />
            </div>
            WERZIO
          </div>

          <div className={styles.brandContent}>
            <div className={styles.eyebrow}>Salon OS</div>
            <h1 className={styles.headline}>Bookings, clients, staff, and revenue in one calm workspace.</h1>
            <p className={styles.supportingText}>Manage the day from your front desk or phone with a dashboard designed for busy beauty teams.</p>
            <div className={styles.brandStats}>
              <span className={styles.statPill}>WhatsApp booking</span>
              <span className={styles.statPill}>Client history</span>
              <span className={styles.statPill}>PKR reports</span>
            </div>
          </div>

          <div className={styles.brandBottom}>
            <div>
              Demo account: owner@werzio.pk / Werzio123
            </div>
            <div className={styles.miniCard}>
              <div className={styles.miniCardTitle}>Today at a glance</div>
              <div className={styles.miniCardText}>Appointments, stylists, and payments stay in sync.</div>
            </div>
          </div>
        </section>

        <section className={styles.formPanel}>
          <form onSubmit={handleSubmit} className={styles.formCard}>
            <div className={styles.formHeader}>
              <div className={styles.formIcon}>
                <Sparkles size={16} />
              </div>
              <h2 className={styles.formTitle} style={{ marginTop: 14 }}>Welcome back</h2>
              <p className={styles.formSubtitle}>Sign in to continue managing your salon workspace.</p>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <div className={styles.inputWrap}>
                <Mail size={16} className={styles.inputIcon} />
                <input className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Password</span>
              <div className={styles.inputWrap}>
                <LockKeyhole size={16} className={styles.inputIcon} />
                <input className={`${styles.input} ${styles.passwordInput}`} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className={styles.iconButton}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" className={styles.primaryButton}>
              Sign in <ArrowRight size={14} />
            </button>

            <p className={styles.footerText}>
              New to Werzio? <Link href="/sign-up" className={styles.footerLink}>Create an account</Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
