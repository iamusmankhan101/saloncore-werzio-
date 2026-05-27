"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Building2, Check, Crown, LockKeyhole, Mail, MailCheck, Phone, Shield, User, Zap } from "lucide-react";
import { signUp, getUnverifiedUser } from "@/lib/auth";
import { setActivePlan } from "@/lib/payment-requests";
import styles from "../auth.module.css";

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "PKR 5,500",
    icon: Zap,
    color: "#0369a1",
    bg: "#e0f2fe",
    badge: null,
    features: ["Appointments & calendar", "Client management", "Staff & services", "Revenue analytics", "Inventory management", "Online booking page"],
  },
  {
    id: "premium",
    name: "Premium",
    price: "PKR 8,500",
    icon: Crown,
    color: "#7C3AED",
    bg: "#EDE9FE",
    badge: "Most Popular",
    features: ["Everything in Basic", "WhatsApp confirmations", "WhatsApp reminders", "Follow-up messages", "Low stock alerts", "Virtual Try-On (AI)"],
  },
] as const;

type PlanId = typeof PLANS[number]["id"];

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<"plan" | "details" | "verify">("plan");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("basic");
  const [form, setForm] = useState({ ownerName: "", salonName: "", email: "", phone: "", password: "" });
  const [adminCode, setAdminCode] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  function setField(field: keyof typeof form, value: string) {
    setForm((c) => ({ ...c, [field]: value }));
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    try {
      const newUser = signUp({ ...form, adminCode: showAdmin && adminCode ? adminCode : undefined });
      if (showAdmin) {
        // Admin auto-login (skips email verification and billing)
        router.replace("/dashboard");
        return;
      }
      setActivePlan(selectedPlan);
      setSending(true);

      // Register in billing DB (fire-and-forget — don't block sign-up on failure)
      fetch("/api/billing/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:     newUser.id,
          email:      form.email,
          ownerName:  form.ownerName,
          salonName:  form.salonName || form.ownerName,
          phone:      form.phone,
          planId:     selectedPlan,
          trialStart: newUser.createdAt,
        }),
      }).catch((e) => console.warn("[billing/register] failed:", e));

      const res = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, name: form.ownerName }),
      });
      const result = await res.json() as { ok: boolean; error?: string; devUrl?: string };
      setSending(false);
      if (!result.ok) {
        setError(result.error || "Failed to send verification email. Please try again.");
        return;
      }
      if (result.devUrl) {
        console.log("[dev] Verify URL:", result.devUrl);
      }
      setStep("verify");
    } catch (err) {
      setSending(false);
      const msg = err instanceof Error ? err.message : "Unable to create account.";

      // ── Email already exists but account is not verified ──────────────────
      // Instead of a hard error, just resend the verification email so the
      // user can complete sign-up without having to clear localStorage.
      if (msg.includes("already exists") && !showAdmin) {
        const unverified = getUnverifiedUser(form.email);
        if (unverified) {
          setSending(true);
          try {
            const res = await fetch("/api/send-verification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: form.email, name: form.ownerName }),
            });
            const result = await res.json() as { ok: boolean; devUrl?: string };
            if (result.devUrl) console.log("[dev] Verify URL:", result.devUrl);
          } catch { /* ignore — we'll still move to verify step */ }
          setSending(false);
          setStep("verify"); // Show verify screen with resend note
          return;
        }
        // Account exists AND is already verified → tell them to sign in
        setError("An account with this email already exists. Please sign in instead.");
        return;
      }

      if (msg.toLowerCase().includes("admin")) setCodeValid(false);
      setError(msg);
    }
  }

  const plan = PLANS.find((p) => p.id === selectedPlan)!;

  return (
    <main className={styles.authPage}>
      <div className={styles.authShell}>

        {/* Brand panel */}
        <section className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <img src="/werzio logo.png" alt="Werzio" style={{ height: 85, width: "auto", filter: "brightness(0) invert(1)" }} />
          </div>
          <div className={styles.brandContent}>
            <div className={styles.eyebrow}>Start organized</div>
            <h1 className={styles.headline}>Give your salon a workspace clients can trust.</h1>
            <p className={styles.supportingText}>14-day free trial on every plan. No credit card required to start.</p>
            <div className={styles.brandStats}>
              <span className={styles.statPill}>14-day free trial</span>
              <span className={styles.statPill}>WhatsApp alerts</span>
              <span className={styles.statPill}>Online booking</span>
            </div>
          </div>
          <div className={styles.brandBottom}>
            <div>Built for salon owners, managers, and front desk teams.</div>
            <div className={styles.miniCard}>
              <div className={styles.miniCardTitle}>Quick setup</div>
              <div className={styles.miniCardText}>Your workspace is ready as soon as you sign up.</div>
            </div>
          </div>
        </section>

        {/* Form panel */}
        <section className={styles.formPanel}>
          <form onSubmit={handleSubmit} className={`${styles.formCard} ${styles.formCardWide}`}>

            {/* Header */}
            <div className={styles.formHeader}>
              <img src="/werzio logo.png" alt="Werzio" style={{ height: 85, width: "auto", display: "block" }} />
              <h1 className={styles.formTitle} style={{ marginTop: 14 }}>
                {step === "verify" ? "Check your email" : step === "plan" ? "Choose your plan" : showAdmin ? "Admin registration" : `${plan.name} plan — details`}
              </h1>
              <p className={styles.formSubtitle}>
                {step === "verify" ? `We sent a verification link to ${form.email}` : step === "plan" ? "14-day free trial on both plans. Cancel anytime." : "Fill in your salon details to get started."}
              </p>
            </div>

            {/* ── STEP 1: Plan selection ── */}
            {step === "plan" && !showAdmin && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                  {PLANS.map((p) => {
                    const selected = selectedPlan === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlan(p.id)}
                        style={{
                          border: `2px solid ${selected ? p.color : "#e8e8f0"}`,
                          borderRadius: 14, padding: "16px 18px", background: selected ? p.bg : "#fff",
                          cursor: "pointer", textAlign: "left", transition: "all 0.15s", position: "relative",
                        }}
                      >
                        {p.badge && (
                          <span style={{ position: "absolute", top: -10, right: 14, background: p.color, color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "2px 10px" }}>
                            {p.badge}
                          </span>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: selected ? p.color : "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <p.icon size={18} color={selected ? "#fff" : "#9898b0"} />
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>{p.name}</div>
                              <div style={{ fontSize: 12, color: p.color, fontWeight: 700 }}>{p.price}<span style={{ color: "#9898b0", fontWeight: 400 }}>/mo after trial</span></div>
                            </div>
                          </div>
                          <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selected ? p.color : "#d1d5db"}`, background: selected ? p.color : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {selected && <Check size={11} color="#fff" strokeWidth={3} />}
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                          {p.features.map((f) => (
                            <div key={f} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#5a5a78" }}>
                              <Check size={10} color={p.color} strokeWidth={3} /> {f}
                            </div>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className={styles.primaryButton}
                >
                  Continue with {plan.name} <ArrowRight size={14} />
                </button>

                {/* Admin toggle */}
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => { setShowAdmin(true); setStep("details"); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", borderRadius: 10, border: "1.5px solid #e8e8f0", background: "#fafafa", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#7C3AED" }}
                  >
                    <Shield size={13} /> Register as Admin instead
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2 (admin): Admin registration details ── */}
            {step === "details" && showAdmin && (
              <>
                {/* Admin notice */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: "#f0e8ff", border: "1.5px solid #ddd6fe", marginBottom: 16 }}>
                  <Shield size={15} color="#7C3AED" />
                  <div style={{ fontSize: 12, color: "#5B21B6", fontWeight: 600 }}>
                    Admin accounts have access to payment approvals and plan management.
                  </div>
                </div>

                {/* Fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                  {[
                    { id: "ownerName", label: "Full name", icon: User, type: "text", placeholder: "Muhammad Usman" },
                    { id: "email", label: "Email", icon: Mail, type: "email", placeholder: "admin@example.com" },
                    { id: "phone", label: "Phone", icon: Phone, type: "tel", placeholder: "+92 300 0000000" },
                    { id: "password", label: "Password", icon: LockKeyhole, type: "password", placeholder: "Minimum 8 characters" },
                  ].map(({ id, label, icon: Icon, type, placeholder }) => (
                    <label key={id}>
                      <span className={styles.label}>{label}</span>
                      <div className={styles.inputWrap}>
                        <Icon size={16} className={styles.inputIcon} />
                        <input className={styles.input} type={type} placeholder={placeholder}
                          value={form[id as keyof typeof form]}
                          onChange={(e) => setField(id as keyof typeof form, e.target.value)} required />
                      </div>
                    </label>
                  ))}
                </div>

                {/* Admin code */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                    Admin Access Code
                  </label>
                  <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${codeValid === false ? "#fca5a5" : "#d1d5db"}`, borderRadius: 9, overflow: "hidden", background: "#fff" }}>
                    <div style={{ padding: "0 12px", display: "flex", alignItems: "center", borderRight: "1px solid #e8e8f0" }}>
                      <Shield size={14} color={codeValid === false ? "#dc2626" : "#9898b0"} />
                    </div>
                    <input type="password" value={adminCode} onChange={(e) => { setAdminCode(e.target.value); setCodeValid(null); }}
                      placeholder="Enter admin access code" required
                      style={{ flex: 1, padding: "10px 12px", border: "none", outline: "none", fontSize: 13, color: "#1a1a2e", background: "transparent", fontFamily: "inherit" }} />
                  </div>
                  {codeValid === false && <div style={{ fontSize: 11, color: "#dc2626", marginTop: 5, fontWeight: 600 }}>Invalid access code. Contact Werzio support.</div>}
                </div>

                {error && <div className={`${styles.error} ${styles.signupError}`}>{error}</div>}

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => { setShowAdmin(false); setStep("plan"); }}
                    style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 700, color: "#6b6b8a", cursor: "pointer" }}>
                    Back
                  </button>
                  <button type="submit" className={styles.primaryButton} style={{ flex: 2, marginTop: 0 }}>
                    Create admin account <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2 (regular): Salon details ── */}
            {step === "details" && !showAdmin && (
              <>
                {/* Selected plan chip */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: plan.bg, border: `1.5px solid ${plan.color}30`, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <plan.icon size={14} color={plan.color} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: plan.color }}>{plan.name} Plan — {plan.price}/mo</span>
                  </div>
                  <button type="button" onClick={() => setStep("plan")}
                    style={{ fontSize: 11, fontWeight: 700, color: plan.color, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                    Change
                  </button>
                </div>

                {/* Fields */}
                <div className={styles.fieldGrid}>
                  {[
                    { id: "ownerName", label: "Owner name", icon: User, type: "text", placeholder: "Amna Khan" },
                    { id: "salonName", label: "Salon name", icon: Building2, type: "text", placeholder: "Amna's Salon" },
                    { id: "email", label: "Email", icon: Mail, type: "email", placeholder: "owner@example.com" },
                    { id: "phone", label: "Phone", icon: Phone, type: "tel", placeholder: "+92 300 1234567" },
                    { id: "password", label: "Password", icon: LockKeyhole, type: "password", placeholder: "Minimum 8 characters" },
                  ].map(({ id, label, icon: Icon, type, placeholder }) => (
                    <label key={id} className={id === "password" ? styles.fullField : undefined}>
                      <span className={styles.label}>{label}</span>
                      <div className={styles.inputWrap}>
                        <Icon size={16} className={styles.inputIcon} />
                        <input className={styles.input} type={type} placeholder={placeholder}
                          value={form[id as keyof typeof form]}
                          onChange={(e) => setField(id as keyof typeof form, e.target.value)} required />
                      </div>
                    </label>
                  ))}
                </div>

                <div style={{ padding: "10px 14px", borderRadius: 9, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 12, color: "#166534", fontWeight: 600, marginTop: 4 }}>
                  🎉 14-day free trial — no payment needed to start
                </div>

                {error && <div className={`${styles.error} ${styles.signupError}`}>{error}</div>}

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button type="button" onClick={() => setStep("plan")}
                    style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1.5px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 700, color: "#6b6b8a", cursor: "pointer" }}>
                    Back
                  </button>
                  <button type="submit" className={styles.primaryButton} style={{ flex: 2, marginTop: 0 }} disabled={sending}>
                    {sending ? "Sending…" : <>Create account <ArrowRight size={14} /></>}
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: Email verification sent ── */}
            {step === "verify" && (
              <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <MailCheck size={32} color="#7C3AED" />
                </div>
                <p style={{ fontSize: 13, color: "#6b6b8a", lineHeight: 1.7, marginBottom: 20 }}>
                  Click the link in the email to activate your account. The link expires in 24 hours.
                </p>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f8f8fc", border: "1px solid #ebebf0", fontSize: 12, color: "#9898b0", marginBottom: 16 }}>
                  Didn't receive it? Check your spam folder or{" "}
                  <button type="button"
                    onClick={async () => {
                      setSending(true);
                      await fetch("/api/send-verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, name: form.ownerName }) });
                      setSending(false);
                    }}
                    style={{ background: "none", border: "none", color: "#7C3AED", fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0 }}
                    disabled={sending}
                  >
                    {sending ? "Sending…" : "resend the email"}
                  </button>
                </div>
              </div>
            )}

            <p className={styles.footerText} style={{ marginTop: step === "verify" ? 0 : 16 }}>
              Already have an account? <Link href="/sign-in" className={styles.footerLink}>Sign in</Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}