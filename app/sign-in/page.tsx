"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import styles from "../auth.module.css";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rateLocked, setRateLocked] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState(false);

  useEffect(() => {
    if (getCurrentUser()) router.replace("/dashboard");

    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") setVerifiedMessage(true);

    const oauthErr = params.get("error");
    if (oauthErr === "google_cancelled") setError("Google sign-in was cancelled.");
    else if (oauthErr) setError("Google sign-in failed. Please try again.");
  }, [router]);

  function handleSubmit() {
    if (rateLocked) return;
    setError("");

    fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
      .then(async res => {
        const data = await res.json() as { ok: boolean; error?: string; retryAfter?: number; user?: { id: string } & Record<string, unknown> };
        if (!data.ok) {
          if (res.status === 429) {
            setRateLocked(true);
            setError(data.error || "Too many attempts. Please wait before trying again.");
            // Auto-unlock the button after retryAfter seconds
            if (data.retryAfter) {
              setTimeout(() => { setRateLocked(false); setError(""); }, data.retryAfter * 1000);
            }
          } else if (data.error === "EMAIL_NOT_VERIFIED") {
            setError("Please verify your email before signing in. Check your inbox for the verification link.");
          } else {
            setError(data.error || "Unable to sign in.");
          }
          return;
        }
        localStorage.setItem("werzio_auth_session", data.user!.id);
        localStorage.setItem(`werzio_user_cache_${data.user!.id}`, JSON.stringify(data.user));
        router.replace("/dashboard");
      })
      .catch(err => {
        console.error("[sign-in] Error:", err);
        setError("Unable to sign in. Please try again.");
      });
  }

  return (
    <main className={styles.authPage}>
      <div className={styles.authShell}>
        <section className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <img src="/Untitled design (5).png" alt="Werzio" style={{ height: 85, width: "auto" }} />
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
            <div className={styles.miniCard}>
              <div className={styles.miniCardTitle}>Today at a glance</div>
              <div className={styles.miniCardText}>Appointments, stylists, and payments stay in sync.</div>
            </div>
          </div>
        </section>

        <section className={styles.formPanel}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Welcome back</h2>
              <p className={styles.formSubtitle}>Sign in to continue managing your salon workspace.</p>
            </div>

            {verifiedMessage && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: "#fff" }}>✓</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#065f46", fontWeight: 600 }}>
                    Email verified successfully! You can now sign in.
                  </div>
                </div>
              </div>
            )}

            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <div className={styles.inputWrap}>
                <Mail size={16} className={styles.inputIcon} />
                <input className={styles.input} type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Password</span>
              <div className={styles.inputWrap}>
                <LockKeyhole size={16} className={styles.inputIcon} />
                <input className={`${styles.input} ${styles.passwordInput}`} type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className={styles.iconButton}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && <div className={styles.error}>{error}</div>}

            <button type="button" onClick={handleSubmit} disabled={rateLocked} className={styles.primaryButton}
              style={rateLocked ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
              {rateLocked ? "Too many attempts — wait and retry" : <><span>Sign in</span> <ArrowRight size={14} /></>}
            </button>

            <div className={styles.divider}><span>or</span></div>

            <button
              type="button"
              onClick={() => { window.location.href = "/api/auth/google"; }}
              className={styles.googleButton}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p className={styles.footerText}>
              New to Werzio? <Link href="/sign-up" className={styles.footerLink}>Create an account</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
