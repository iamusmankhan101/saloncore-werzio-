"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle, CreditCard, LayoutDashboard, CalendarDays, Users, ClipboardList } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { applyAppearanceSettings, SETTINGS_CHANGED_EVENT, reloadSettings } from "@/lib/settings-store";
import { runWhatsAppScheduler } from "@/lib/whatsapp-scheduler";
import { syncFromDB } from "@/lib/turso-sync";
import { checkInvoiceNotifications } from "@/lib/invoice-notifier";

// ─── Suspension gate overlay ──────────────────────────────────────────────────

function SuspensionGate({ reason }: { reason: string | null }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(10,10,20,0.82)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(6px)",
      padding: 24,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, maxWidth: 460, width: "100%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)", overflow: "hidden",
      }}>
        {/* Red header */}
        <div style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)", padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <AlertTriangle size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>Account Status</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginTop: 2 }}>Account Suspended</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "28px 32px" }}>
          <p style={{ fontSize: 14, color: "#4a4a6a", lineHeight: 1.75, margin: "0 0 20px" }}>
            Your Werzio plan has been <strong style={{ color: "#dc2626" }}>suspended</strong> due to a missed invoice payment.
            Your data is safe — access will be restored within minutes of payment confirmation.
          </p>

          {reason && (
            <div style={{ padding: "12px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, fontSize: 12, color: "#991b1b", marginBottom: 20, lineHeight: 1.6 }}>
              {reason}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link
              href="/dashboard/billing"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "13px 0", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg,#5B21B6,#9333EA)",
                fontSize: 14, fontWeight: 700, color: "#fff", textDecoration: "none",
              }}
            >
              <CreditCard size={16} /> Go to Billing &amp; Pay
            </Link>
            <div style={{ fontSize: 11, color: "#b0b0c8", textAlign: "center", lineHeight: 1.6 }}>
              Submit your payment screenshot in Billing. Admin reviews within minutes.<br />
              Questions? Contact <strong>support@werzio.com</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [isReady,    setIsReady]    = useState(false);
  const [suspended,  setSuspended]  = useState(false);
  const [suspReason, setSuspReason] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!getCurrentUser()) {
        router.replace("/sign-in");
        return;
      }
      setIsReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  // Sync settings when authenticated
  useEffect(() => {
    if (!isReady) return;
    reloadSettings();
  }, [isReady]);

  // Appearance
  useEffect(() => {
    applyAppearanceSettings();
    window.addEventListener(SETTINGS_CHANGED_EVENT, applyAppearanceSettings);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, applyAppearanceSettings);
  }, []);

  // Data sync + invoice notifications + suspension check
  useEffect(() => {
    if (!isReady) return;
    const user = getCurrentUser();
    if (!user) return;

    syncFromDB();
    checkInvoiceNotifications();

    // Check suspension status from Turso (server-side source of truth)
    fetch(`/api/billing/status?userId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; suspended?: boolean; reason?: string | null }) => {
        if (data.ok && data.suspended) {
          setSuspended(true);
          setSuspReason(data.reason ?? null);
        }
      })
      .catch(() => { /* fail open — don't block on network error */ });
  }, [isReady]);

  // WhatsApp scheduler
  useEffect(() => {
    if (!isReady) return;
    runWhatsAppScheduler();
    const interval = window.setInterval(() => runWhatsAppScheduler(), 60_000);
    return () => window.clearInterval(interval);
  }, [isReady]);

  if (!isReady) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f7fb", color: "#7C3AED", fontSize: 13, fontWeight: 700 }}>
        Loading workspace...
      </div>
    );
  }

  // Billing page is always accessible even when suspended
  const isBillingPage = pathname === "/dashboard/billing";

  const bottomTabs = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/calendar", icon: CalendarDays, label: "Calendar" },
    { href: "/dashboard/appointments", icon: ClipboardList, label: "Appointments" },
    { href: "/dashboard/clients", icon: Users, label: "Clients" },
  ];

  const leftTabs  = bottomTabs.slice(0, 2);
  const rightTabs = bottomTabs.slice(2);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Slide-out Backdrop Overlay */}
      <div
        className={`mobile-overlay ${sidebarOpen ? "active" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{
        marginLeft: "var(--sidebar-width)",
        flex: 1,
        minHeight: "100vh",
        background: "#ffffff",
        overflow: "auto",
        borderRadius: "20px 0 0 20px",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
      }}>
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="bottom-nav">
        {/* Left tabs */}
        {leftTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`bottom-nav-item ${isActive ? "active" : ""}`}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
              {isActive && <div className="bottom-nav-active-dot" />}
            </Link>
          );
        })}

        {/* Center logo badge — opens sidebar */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="bottom-nav-logo-badge"
          aria-label="Open menu"
        >
          <img src="/Untitled design (5).png" alt="Werzio" />
        </button>

        {/* Right tabs */}
        {rightTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`bottom-nav-item ${isActive ? "active" : ""}`}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
              {isActive && <div className="bottom-nav-active-dot" />}
            </Link>
          );
        })}
      </nav>

      {/* Suspension gate — shown over everything except the billing page */}
      {suspended && !isBillingPage && <SuspensionGate reason={suspReason} />}
    </div>
  );
}