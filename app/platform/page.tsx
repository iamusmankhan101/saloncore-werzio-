"use client";

import Link from "next/link";
import { Layers, ArrowLeft } from "lucide-react";

export default function PlatformPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafafa" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e8e8f0", padding: "20px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/Untitled design (5).png" alt="Werzio" style={{ height: 32, width: "auto" }} />
          </Link>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b7280", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px", display: "grid", gridTemplateColumns: "240px 1fr", gap: 48 }}>
        <aside style={{ position: "sticky", top: 48, height: "fit-content" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 20 }}>Legal Terms</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Link href="/privacy" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#6b7280", textDecoration: "none" }}>Privacy Policy</Link>
            <Link href="/terms" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#6b7280", textDecoration: "none" }}>Website Terms of Use</Link>
            <Link href="/data-processing" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#6b7280", textDecoration: "none" }}>Data Processing</Link>
            <Link href="/payments" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#6b7280", textDecoration: "none" }}>Payments Terms</Link>
            <Link href="/platform" style={{ padding: "10px 16px", borderRadius: 8, fontSize: 14, color: "#7C3AED", background: "#f5f3ff", fontWeight: 600, textDecoration: "none" }}>Platform Terms</Link>
          </nav>
        </aside>

        <main style={{ background: "#fff", borderRadius: 16, padding: "48px 56px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e8e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #ea580c, #f97316)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Layers size={20} color="#fff" />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e", margin: 0 }}>Platform Terms</h1>
          </div>
          <div style={{ fontSize: 13, color: "#9999b0", marginBottom: 40 }}>Last Updated: May 30, 2026</div>
          
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563" }}>
            This document outlines the specific terms and conditions for using the Werzio platform, including acceptable use policies, service level agreements, and platform-specific guidelines.
          </p>
          
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #e8e8f0", fontSize: 13, color: "#9999b0", textAlign: "center" }}>
            © 2026 Werzio. All rights reserved.
          </div>
        </main>
      </div>
    </div>
  );
}
