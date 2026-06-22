"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle, CreditCard, LayoutDashboard, User, ClipboardList, CheckCircle, XCircle, X } from "lucide-react";
import type { WaLogEntry } from "@/lib/whatsapp-scheduler";
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
  const [toasts, setToasts] = useState<Array<WaLogEntry & { toastId: number }>>([]);

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

  // Appearance
  useEffect(() => {
    applyAppearanceSettings();
    window.addEventListener(SETTINGS_CHANGED_EVENT, applyAppearanceSettings);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, applyAppearanceSettings);
  }, []);

  // Data sync + invoice notifications + suspension check
  // Settings reload happens AFTER syncFromDB so Turso data is in localStorage first
  useEffect(() => {
    if (!isReady) return;
    const user = getCurrentUser();
    if (!user) return;

    syncFromDB().then(() => reloadSettings());
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

  // WhatsApp message toast notifications
  useEffect(() => {
    function onWaMessage(e: Event) {
      const entry = (e as CustomEvent<WaLogEntry>).detail;
      const toastId = Date.now();
      setToasts((prev) => [...prev.slice(-4), { ...entry, toastId }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
      }, 5000);
    }
    window.addEventListener("werzio_wa_message_logged", onWaMessage);
    return () => window.removeEventListener("werzio_wa_message_logged", onWaMessage);
  }, []);

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
    { href: "/dashboard",             icon: LayoutDashboard, label: "Dashboard"    },
    { href: "/dashboard/appointments", icon: ClipboardList,   label: "Appointments" },
    { href: "/dashboard/billing",      icon: CreditCard,      label: "Billing"      },
    { href: "/dashboard/account",      icon: User,            label: "Account"      },
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

      {/* WhatsApp message toast notifications */}
      {toasts.length > 0 && (
        <div style={{ position: "fixed", bottom: 80, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, maxWidth: 320 }}>
          {toasts.map((t) => (
            <div key={t.toastId} style={{
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              border: `1.5px solid ${t.status === "sent" ? "#bbf7d0" : "#fecaca"}`,
              padding: "12px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              animation: "slideInRight 0.25s ease",
            }}>
              {t.status === "sent"
                ? <CheckCircle size={18} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
                : <XCircle    size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.status === "sent" ? "#059669" : "#dc2626" }}>
                  {t.status === "sent" ? "WhatsApp Sent" : "WhatsApp Failed"}
                </div>
                <div style={{ fontSize: 12, color: "#4a4a6a", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.clientName} · {t.type.replace("_", " ")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((x) => x.toastId !== t.toastId))}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "#9ca3af", flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}