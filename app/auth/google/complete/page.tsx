"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Bridge page after Google OAuth callback.
 * The session cookie is already set by the server callback handler.
 * This page calls /api/auth/user (which reads the cookie) to populate the
 * client-side localStorage cache that the rest of the app expects, then
 * navigates to the dashboard.
 */
export default function GoogleCompletePage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/user")
      .then((r) => r.json())
      .then((data: { ok: boolean; user?: { id: string } & Record<string, unknown> }) => {
        if (data.ok && data.user) {
          localStorage.setItem("werzio_auth_session", data.user.id);
          localStorage.setItem(`werzio_user_cache_${data.user.id}`, JSON.stringify(data.user));
        }
      })
      .catch(() => {})
      .finally(() => {
        router.replace("/dashboard");
      });
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#fbfbfe" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: "#7c3aed",
          borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 16px",
        }} />
        <p style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>Signing you in…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
