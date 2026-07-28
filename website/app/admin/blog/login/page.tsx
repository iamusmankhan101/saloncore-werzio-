"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function BlogLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/blog/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error || "Incorrect password.");
        setLoading(false);
        return;
      }
      router.push("/admin/blog");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f5f7", fontFamily: "system-ui, sans-serif" }}>
      <form onSubmit={handleSubmit} style={{ width: 360, maxWidth: "90vw", background: "#fff", borderRadius: 16, padding: "32px 28px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Lock size={18} color="#7C3AED" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e" }}>Blog Admin</div>
            <div style={{ fontSize: 12, color: "#8a8aa3" }}>Salon Central CMS</div>
          </div>
        </div>

        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#6b6b8a", marginBottom: 6 }}>Password</label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter admin password"
          style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid #e3e0eb", fontSize: 14, outline: "none", boxSizing: "border-box" }}
        />

        {error && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          style={{
            width: "100%", marginTop: 18, padding: "12px 0", borderRadius: 10, border: "none",
            background: loading || !password ? "#e3e0eb" : "linear-gradient(135deg,#5B21B6,#9333EA)",
            color: loading || !password ? "#a0a0b8" : "#fff",
            fontSize: 14, fontWeight: 700, cursor: loading || !password ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
