"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle, CreditCard, FileText, LayoutDashboard, User, ClipboardList, CheckCircle, XCircle, X, CalendarCheck, WifiOff } from "lucide-react";
import type { WaLogEntry } from "@/lib/whatsapp-scheduler";
import Sidebar from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { applyAppearanceSettings, SETTINGS_CHANGED_EVENT, reloadSettings, settingsStore } from "@/lib/settings-store";
import { runWhatsAppScheduler } from "@/lib/whatsapp-scheduler";
import { syncFromDB } from "@/lib/turso-sync";
import { checkInvoiceNotifications } from "@/lib/invoice-notifier";
import { getStoredInventory } from "@/lib/storage";
import { syncInvoices } from "@/lib/invoices";
import { PLAN_CONFIGS, getCurrentPlanId, type PlanId } from "@/lib/plan-limits";

// ─── Notification chime ───────────────────────────────────────────────────────

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    [[523.25, 0], [659.25, 0.18], [783.99, 0.36]].forEach(([freq, delay]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.35, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.9);
      osc.start(now + delay);
      osc.stop(now + delay + 0.9);
    });
  } catch { /* not supported */ }
}

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
  const [bookingAlerts, setBookingAlerts] = useState<Array<{
    alertId: number;
    clientName: string;
    serviceNames: string[];
    date: string;
    startTime: string;
    totalAmount: number;
  }>>([]);
  const [lowStockCount,     setLowStockCount]     = useState(0);
  const [outStockCount,     setOutStockCount]     = useState(0);
  const [unpaidInvoice, setUnpaidInvoice] = useState<{ number: string; amount: number; status: string; dueDate: string } | null>(null);
  const [invoiceBadgeDismissed, setInvoiceBadgeDismissed] = useState(false);
  const [waStatus,      setWaStatus]       = useState<"unknown" | "connected" | "disconnected">("unknown");
  const [waBannerDismissed, setWaBannerDismissed] = useState(false);

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

    syncFromDB().then(() => {
      reloadSettings();
      runWhatsAppScheduler();

      // After DB sync, read plan from localStorage and check for unpaid invoices
      const planId = getCurrentPlanId() as PlanId;
      const plan = PLAN_CONFIGS[planId];
      if (plan && plan.price > 0) {
        const invoices = syncInvoices(
          { id: user.id, ownerName: user.ownerName, salonName: user.salonName, email: user.email, phone: user.phone },
          { id: plan.id, name: plan.label, price: plan.price },
          user.createdAt,
        );
        const unpaid = invoices.filter((inv) => inv.userId === user.id && inv.status !== "paid");
        if (unpaid.length > 0) {
          const oldest = unpaid[unpaid.length - 1]; // oldest = last in desc-sorted list
          setUnpaidInvoice({ number: oldest.number, amount: oldest.total, status: oldest.status, dueDate: oldest.dueDate });
          setInvoiceBadgeDismissed(false);
        }
      }
    });
    checkInvoiceNotifications();

    // Check suspension status
    fetch(`/api/billing/status?userId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; suspended?: boolean; reason?: string | null }) => {
        if (data.ok && data.suspended) {
          setSuspended(true);
          setSuspReason(data.reason ?? null);
        }
      })
      .catch(() => { /* fail open */ });
  }, [isReady]);

  // WhatsApp scheduler — first run is triggered by syncFromDB.then() above
  // so existing clients are already in localStorage when it first fires
  useEffect(() => {
    if (!isReady) return;
    const interval = window.setInterval(() => runWhatsAppScheduler(), 60_000);
    return () => window.clearInterval(interval);
  }, [isReady]);

  // WhatsApp connection status check
  useEffect(() => {
    if (!isReady) return;
    const apiKey = (settingsStore.wasender as { apiKey: string }).apiKey;
    if (!apiKey) return; // not configured — don't check

    async function checkWa() {
      try {
        const res  = await fetch(`/api/whatsapp/status?apiKey=${encodeURIComponent(apiKey)}`);
        if (!res.ok) return; // server error — keep current status, don't flip to disconnected
        const data = await res.json() as { connected?: boolean };
        setWaStatus(data.connected ? "connected" : "disconnected");
        if (data.connected) setWaBannerDismissed(false); // reset so banner can reappear on next disconnect
      } catch {
        // Network error — don't change state; avoid false-positive "disconnected" banner
      }
    }

    checkWa();
    // 30 min interval — WaSender free plan allows only 1 req/min total.
    // The server also caches for 15 min, so two browser polls in quick succession
    // will only hit WaSender once.
    const interval = window.setInterval(checkWa, 30 * 60_000);
    // Don't re-check on every focus — that burns rate limit needlessly.
    return () => { window.clearInterval(interval); };
  }, [isReady]);

  // Persistent low-stock badge
  useEffect(() => {
    if (!isReady) return;
    function checkStock() {
      const inv = getStoredInventory();
      setOutStockCount(inv.filter((i) => i.currentStock === 0).length);
      setLowStockCount(inv.filter((i) => i.currentStock > 0 && i.currentStock <= i.minStock).length);
    }
    checkStock();
    const interval = window.setInterval(checkStock, 60_000);
    window.addEventListener("focus", checkStock);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", checkStock); };
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

  // New booking popup + chime
  useEffect(() => {
    function showBookingAlert(detail: { clientName: string; serviceNames: string[]; date: string; startTime: string; totalAmount: number }) {
      playChime();
      const alertId = Date.now();
      setBookingAlerts((prev) => [...prev, { ...detail, alertId }]);
    }

    // Same-tab: custom event (edge case where booking and dashboard share a window)
    function onNewBooking(e: Event) {
      showBookingAlert((e as CustomEvent).detail);
    }

    // Cross-tab: localStorage storage event fires on every OTHER tab when the key changes
    function onStorage(e: StorageEvent) {
      if (e.key !== "werzio_new_booking_notify" || !e.newValue) return;
      try { showBookingAlert(JSON.parse(e.newValue)); } catch { /* ignore */ }
    }

    window.addEventListener("werzio_new_booking_alert", onNewBooking);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("werzio_new_booking_alert", onNewBooking);
      window.removeEventListener("storage", onStorage);
    };
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
        {/* WhatsApp disconnection banner */}
        {waStatus === "disconnected" && !waBannerDismissed && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "11px 20px",
            background: "linear-gradient(90deg,#78350f,#92400e)",
            borderRadius: "20px 0 0 0",
          }}>
            <WifiOff size={16} color="#fcd34d" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 13, color: "#fef3c7", fontWeight: 600 }}>
              WhatsApp disconnected — your phone may have lost internet. Automated messages are paused until reconnected.
            </div>
            <a
              href="/dashboard/settings"
              style={{ fontSize: 12, fontWeight: 700, color: "#fcd34d", textDecoration: "none",
                       background: "rgba(255,255,255,0.12)", padding: "5px 12px", borderRadius: 8, whiteSpace: "nowrap" }}
            >
              Open Settings
            </a>
            <button
              type="button"
              onClick={() => setWaBannerDismissed(true)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#fcd34d", padding: 4, flexShrink: 0 }}
            >
              <X size={15} />
            </button>
          </div>
        )}
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

      {/* Bottom-right persistent alert badges (stacked) */}
      <div style={{ position: "fixed", bottom: 90, right: 16, zIndex: 9998, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>

        {/* Werzio subscription invoice reminder */}
        {unpaidInvoice && !invoiceBadgeDismissed && (
          <div style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(217,119,6,0.15)",
            overflow: "hidden",
            width: 248,
            animation: "stockPulse 3s ease-in-out infinite",
          }}>
            {/* Coloured top bar */}
            <div style={{
              background: unpaidInvoice.status === "overdue"
                ? "linear-gradient(135deg,#dc2626,#ef4444)"
                : "linear-gradient(135deg,#d97706,#f59e0b)",
              padding: "10px 12px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ position: "relative", width: 8, height: 8 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#fff", opacity: 0.6, animation: "stockPulse 1.5s ease-in-out infinite" }} />
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#fff" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.04em" }}>
                  {unpaidInvoice.status === "overdue" ? "Invoice Overdue" : "Invoice Due"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceBadgeDismissed(true)}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              >
                <X size={12} color="#fff" />
              </button>
            </div>

            {/* Invoice detail */}
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginBottom: 2 }}>
                Werzio Subscription
              </div>
              <div style={{ fontSize: 11, color: "#9898b0", marginBottom: 10 }}>
                {unpaidInvoice.number} · Due {unpaidInvoice.dueDate}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: unpaidInvoice.status === "overdue" ? "#dc2626" : "#d97706" }}>
                  PKR {unpaidInvoice.amount.toLocaleString()}
                </span>
                <Link
                  href="/dashboard/billing"
                  style={{
                    fontSize: 11, fontWeight: 700,
                    color: "#fff",
                    background: unpaidInvoice.status === "overdue" ? "#dc2626" : "#d97706",
                    padding: "5px 12px", borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  Pay Now →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Low-stock / out-of-stock badge */}
        {(outStockCount > 0 || lowStockCount > 0) && (
          <Link
            href="/dashboard/inventory"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 24,
              background: outStockCount > 0 ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#d97706,#f59e0b)",
              boxShadow: outStockCount > 0
                ? "0 4px 20px rgba(220,38,38,0.4), 0 0 0 3px rgba(220,38,38,0.15)"
                : "0 4px 20px rgba(217,119,6,0.4),  0 0 0 3px rgba(217,119,6,0.15)",
              textDecoration: "none",
              animation: "stockPulse 2.5s ease-in-out infinite",
            }}
          >
            <AlertTriangle size={14} color="#fff" style={{ flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>
                {outStockCount > 0 && `${outStockCount} Out of Stock`}
                {outStockCount > 0 && lowStockCount > 0 && "  ·  "}
                {lowStockCount > 0 && `${lowStockCount} Low Stock`}
              </span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Tap to restock</span>
            </div>
          </Link>
        )}

      </div>

      {/* New Booking Popup Alerts */}
      {bookingAlerts.length > 0 && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 10000, display: "flex", flexDirection: "column", gap: 12, maxWidth: 340 }}>
          {bookingAlerts.map((alert) => (
            <div key={alert.alertId} style={{
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 0 0 2px #7C3AED22",
              overflow: "hidden",
              animation: "slideInRight 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}>
              {/* Header */}
              <div style={{ background: "linear-gradient(135deg,#5B21B6,#7C3AED)", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CalendarCheck size={18} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Online Booking</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>New Booking!</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingAlerts((prev) => prev.filter((a) => a.alertId !== alert.alertId))}
                  style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                >
                  <X size={14} color="#fff" />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 8 }}>{alert.clientName}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {alert.serviceNames.length > 0 && (
                    <div style={{ fontSize: 12, color: "#555" }}>
                      <span style={{ fontWeight: 600, color: "#333" }}>Service: </span>{alert.serviceNames.join(", ")}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#555" }}>
                    <span style={{ fontWeight: 600, color: "#333" }}>Date: </span>
                    {new Date(alert.date + "T00:00:00").toLocaleDateString("en-PK", { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    {(() => {
                      const [h, m] = alert.startTime.split(":").map(Number);
                      const suffix = h >= 12 ? "PM" : "AM";
                      return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
                    })()}
                  </div>
                  {alert.totalAmount > 0 && (
                    <div style={{ fontSize: 12, color: "#555" }}>
                      <span style={{ fontWeight: 600, color: "#333" }}>Amount: </span>PKR {alert.totalAmount.toLocaleString("en-PK")}
                    </div>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

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