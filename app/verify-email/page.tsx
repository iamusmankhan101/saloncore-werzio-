"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Sparkles } from "lucide-react";
import { markEmailVerified } from "@/lib/auth";

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState("error");
      setErrorMsg("No verification token found in this link.");
      return;
    }

    fetch(`/api/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; email?: string; error?: string }) => {
        if (!data.ok || !data.email) {
          setState("error");
          setErrorMsg(data.error || "Verification failed.");
          return;
        }
        markEmailVerified(data.email);
        setState("success");
        setTimeout(() => router.replace("/dashboard"), 2500);
      })
      .catch(() => {
        setState("error");
        setErrorMsg("Network error. Please try again.");
      });
  }, [params, router]);

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f7fb", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "40px 36px", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid #ebebf0" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 28, fontWeight: 900, fontSize: 16, color: "#1a1a2e" }}>
          <Sparkles size={16} color="#7C3AED" /> SALONCORE
        </div>

        {state === "loading" && (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <Loader2 size={48} color="#7C3AED" style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 8 }}>Verifying your email…</div>
            <p style={{ fontSize: 13, color: "#9898b0" }}>Just a moment while we confirm your account.</p>
          </>
        )}

        {state === "success" && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <CheckCircle size={36} color="#059669" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e", marginBottom: 8 }}>Email verified!</div>
            <p style={{ fontSize: 13, color: "#6b6b8a", marginBottom: 20 }}>Your account is now active. Taking you to your dashboard…</p>
            <div style={{ height: 4, borderRadius: 4, background: "#ebebf0", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg,#5B21B6,#9333EA)", width: "100%", animation: "shrink 2.5s linear forwards" }} />
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <XCircle size={36} color="#dc2626" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e", marginBottom: 8 }}>Verification failed</div>
            <p style={{ fontSize: 13, color: "#6b6b8a", marginBottom: 24 }}>{errorMsg}</p>
            <a href="/sign-in" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 10, background: "linear-gradient(135deg,#5B21B6,#9333EA)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              Go to sign in
            </a>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } transform-origin: left; }
      `}</style>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}