"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Building2, ChevronDown, LockKeyhole, Mail, Phone, Shield, Sparkles, User } from "lucide-react";
import { signUp } from "@/lib/auth";
import styles from "../auth.module.css";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    ownerName: "",
    salonName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [adminCode, setAdminCode] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  function setField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleCodeChange(value: string) {
    setAdminCode(value);
    setCodeValid(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      signUp({ ...form, adminCode: showAdmin && adminCode ? adminCode : undefined });
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to create account.";
      if (msg.toLowerCase().includes("admin")) setCodeValid(false);
      setError(msg);
    }
  }

  const fields = [
    { id: "ownerName", label: "Owner name", icon: User, type: "text", placeholder: "Amna Khan" },
    { id: "salonName", label: "Salon name", icon: Building2, type: "text", placeholder: "Amna's Salon" },
    { id: "email", label: "Email", icon: Mail, type: "email", placeholder: "owner@example.com" },
    { id: "phone", label: "Phone", icon: Phone, type: "tel", placeholder: "+92 300 1234567" },
    { id: "password", label: "Password", icon: LockKeyhole, type: "password", placeholder: "Minimum 8 characters" },
  ] as const;

  return (
    <main className={styles.authPage}>
      <div className={styles.authShell}>
        <section className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <div className={styles.brandMark}>
              <Sparkles size={17} />
            </div>
            GLOWBOOK
          </div>

          <div className={styles.brandContent}>
            <div className={styles.eyebrow}>Start organized</div>
            <h1 className={styles.headline}>Give your salon a workspace clients can trust.</h1>
            <p className={styles.supportingText}>Create your account, add your team and services, then start accepting bookings with a polished salon flow.</p>
            <div className={styles.brandStats}>
              <span className={styles.statPill}>Online booking</span>
              <span className={styles.statPill}>Staff schedules</span>
              <span className={styles.statPill}>Client records</span>
            </div>
          </div>

          <div className={styles.brandBottom}>
            <div>Built for salon owners, managers, and front desk teams.</div>
            <div className={styles.miniCard}>
              <div className={styles.miniCardTitle}>Quick setup</div>
              <div className={styles.miniCardText}>Your first workspace is ready as soon as you sign up.</div>
            </div>
          </div>
        </section>

        <section className={styles.formPanel}>
          <form onSubmit={handleSubmit} className={`${styles.formCard} ${styles.formCardWide}`}>
            <div className={styles.formHeader}>
              <div className={styles.formIcon}>
                <Sparkles size={16} />
              </div>
              <h1 className={styles.formTitle} style={{ marginTop: 14 }}>Create an account</h1>
              <p className={styles.formSubtitle}>Access your appointments, clients, staff, and revenue anytime.</p>
            </div>

            <div className={styles.fieldGrid}>
              {fields.map(({ id, label, icon: Icon, type, placeholder }) => (
                <label key={id} className={id === "password" ? styles.fullField : undefined}>
                  <span className={styles.label}>{label}</span>
                  <div className={styles.inputWrap}>
                    <Icon size={16} className={styles.inputIcon} />
                    <input
                      className={styles.input}
                      type={type}
                      placeholder={placeholder}
                      value={form[id]}
                      onChange={(e) => setField(id, e.target.value)}
                      required
                    />
                  </div>
                </label>
              ))}
            </div>

            {/* Admin registration toggle */}
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => { setShowAdmin((p) => !p); setAdminCode(""); setCodeValid(null); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 14px", borderRadius: 10,
                  border: showAdmin ? "1.5px solid #7C3AED" : "1.5px solid #e8e8f0",
                  background: showAdmin ? "#faf8ff" : "#fafafa",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: showAdmin ? "linear-gradient(135deg,#5B21B6,#9333EA)" : "#f0f0f8",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s",
                  }}>
                    <Shield size={13} color={showAdmin ? "#fff" : "#9898b0"} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: showAdmin ? "#7C3AED" : "#6b6b8a" }}>
                    Register as Admin
                  </span>
                </div>
                <ChevronDown
                  size={15}
                  color={showAdmin ? "#7C3AED" : "#b0b0c8"}
                  style={{ transform: showAdmin ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                />
              </button>

              {showAdmin && (
                <div style={{
                  marginTop: 8, padding: "16px", borderRadius: 10,
                  border: "1.5px solid #EDE9FE", background: "#faf8ff",
                  display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <div style={{ fontSize: 12, color: "#7c6baa", lineHeight: 1.6 }}>
                    Enter the admin access code provided by GlowBook to register as an admin account.
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                      Admin Access Code
                    </label>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 0,
                      border: `1.5px solid ${codeValid === false ? "#fca5a5" : codeValid === true ? "#6ee7b7" : "#d1d5db"}`,
                      borderRadius: 9, overflow: "hidden", background: "#fff",
                    }}>
                      <div style={{ padding: "0 12px", display: "flex", alignItems: "center", borderRight: "1px solid #e8e8f0" }}>
                        <Shield size={14} color={codeValid === false ? "#dc2626" : codeValid === true ? "#059669" : "#9898b0"} />
                      </div>
                      <input
                        type="password"
                        value={adminCode}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        placeholder="Enter access code"
                        style={{
                          flex: 1, padding: "10px 12px", border: "none", outline: "none",
                          fontSize: 13, color: "#1a1a2e", background: "transparent",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                    {codeValid === false && (
                      <div style={{ fontSize: 11, color: "#dc2626", marginTop: 5, fontWeight: 600 }}>
                        Invalid access code. Contact GlowBook support.
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                    borderRadius: 8, background: "#f0e8ff", border: "1px solid #ddd6fe",
                  }}>
                    <Shield size={13} color="#7C3AED" />
                    <span style={{ fontSize: 11, color: "#5B21B6", fontWeight: 600 }}>
                      Admin accounts have access to payment approvals and plan management.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {error && <div className={`${styles.error} ${styles.signupError}`}>{error}</div>}

            <button type="submit" className={styles.primaryButton} style={{ marginTop: 18 }}>
              {showAdmin && adminCode ? "Create admin account" : "Create account"} <ArrowRight size={14} />
            </button>

            <p className={styles.footerText}>
              Already have an account? <Link href="/sign-in" className={styles.footerLink}>Sign in</Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
