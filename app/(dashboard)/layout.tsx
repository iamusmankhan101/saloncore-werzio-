"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AlertTriangle, CreditCard, LayoutDashboard, User, ClipboardList, CheckCircle, XCircle, X, CalendarCheck, WifiOff, MapPin, Plus } from "lucide-react";
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
import { setActivePlan } from "@/lib/payment-requests";
import { addSalonLocation, getActiveLocationFilter, getSalonLocations, setActiveLocationFilter, type SalonLocation } from "@/lib/locations";

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
            Your Salon Central plan has been <strong style={{ color: "#dc2626" }}>suspended</strong> due to a missed invoice payment.
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

function DashboardLocationSwitcher({ onLocationChange }: { onLocationChange: (locationId: string) => Promise<void> }) {
  const [locations, setLocations] = useState<SalonLocation[]>(() => getSalonLocations());
  const [activeLocation, setActiveLocation] = useState(() => getActiveLocationFilter());
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({ name: "", address: "", city: "" });
  const [locationError, setLocationError] = useState("");
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    function refresh() {
      setLocations(getSalonLocations());
      setActiveLocation(getActiveLocationFilter());
    }
    window.addEventListener(SETTINGS_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  async function changeLocation(locationId: string) {
    if (locationId === activeLocation || switching) return;
    setSwitching(true);
    const nextId = setActiveLocationFilter(locationId);
    setActiveLocation(nextId);
    setLocations(getSalonLocations());
    try {
      await onLocationChange(nextId);
    } finally {
      setSwitching(false);
    }
  }

  function handleAddLocation() {
    setLocationError("");
    try {
      const location = addSalonLocation(locationForm);
      setShowAddLocation(false);
      setLocationForm({ name: "", address: "", city: "" });
      void changeLocation(location.id);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "Unable to add this location.");
    }
  }

  return (
    <>
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      margin: "16px 20px 0",
      padding: "12px 14px",
      border: "1px solid rgba(124,58,237,0.13)",
      borderRadius: 16,
      background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(255,255,255,0.95))",
      boxShadow: "0 10px 28px rgba(35,20,70,0.045)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: "var(--accent-gradient)",
          boxShadow: "0 5px 16px var(--accent-glow)",
          flexShrink: 0,
        }}>
          <MapPin size={17} color="#fff" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 850, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.09em" }}>
            Active Location
          </div>
          <div style={{ fontSize: 12, color: "#777792", fontWeight: 650, marginTop: 2 }}>
            All appointments, sales, stock, staff and reports belong to this branch.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <select
          value={activeLocation}
          onChange={(e) => void changeLocation(e.target.value)}
          disabled={switching}
          style={{
            minWidth: 180,
            padding: "9px 34px 9px 12px",
            borderRadius: 12,
            border: "1px solid #ddd6fe",
            background: "#fff",
            color: "#1a1a2e",
            fontSize: 13,
            fontWeight: 800,
            outline: "none",
            cursor: switching ? "wait" : "pointer",
            opacity: switching ? 0.65 : 1,
            boxShadow: "0 3px 10px rgba(38,25,75,0.04)",
          }}
          aria-label="Select active dashboard location"
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>{location.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { setLocationError(""); setShowAddLocation(true); }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 13px",
            borderRadius: 12,
            border: "1px solid #ddd6fe",
            background: "#fff",
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 850,
            cursor: "pointer",
            boxShadow: "0 3px 10px rgba(38,25,75,0.04)",
          }}
        >
          <Plus size={13} /> Add Location
        </button>
      </div>
    </div>
    {showAddLocation && (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20,15,35,0.45)", backdropFilter: "blur(4px)", display: "grid", placeItems: "center", padding: 20 }}>
        <div style={{ width: "min(520px, 100%)", background: "#fff", borderRadius: 20, boxShadow: "0 24px 80px rgba(25,15,50,0.25)", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 22px", borderBottom: "1px solid #eeeaf6" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1a2e" }}>Add New Location</div>
              <div style={{ fontSize: 12, color: "#8a8aa3", marginTop: 3 }}>Create a separate branch workspace.</div>
            </div>
            <button type="button" onClick={() => setShowAddLocation(false)} style={{ border: 0, background: "#f5f3ff", width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", cursor: "pointer", color: "#766f8c" }} aria-label="Close add location form">
              <X size={17} />
            </button>
          </div>
          <div style={{ padding: 22, display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 800, color: "#55536b" }}>
              Branch Name
              <input
                autoFocus
                value={locationForm.name}
                onChange={(event) => { setLocationForm((form) => ({ ...form, name: event.target.value })); setLocationError(""); }}
                placeholder="e.g. DHA Branch"
                style={{ padding: "12px 14px", border: "1px solid #ddd8e9", borderRadius: 12, outline: "none", fontSize: 14 }}
              />
            </label>
            <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 800, color: "#55536b" }}>
              Address
              <input
                value={locationForm.address}
                onChange={(event) => { setLocationForm((form) => ({ ...form, address: event.target.value })); setLocationError(""); }}
                placeholder="Street, block, building"
                style={{ padding: "12px 14px", border: "1px solid #ddd8e9", borderRadius: 12, outline: "none", fontSize: 14 }}
              />
            </label>
            <label style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 800, color: "#55536b" }}>
              City
              <input
                value={locationForm.city}
                onChange={(event) => setLocationForm((form) => ({ ...form, city: event.target.value }))}
                placeholder="e.g. Karachi"
                style={{ padding: "12px 14px", border: "1px solid #ddd8e9", borderRadius: 12, outline: "none", fontSize: 14 }}
              />
            </label>
            {locationError && <div role="alert" style={{ padding: "10px 12px", borderRadius: 10, background: "#fef2f2", color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>{locationError}</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid #eeeaf6", background: "#fcfbfe" }}>
            <button type="button" onClick={() => setShowAddLocation(false)} style={{ padding: "10px 17px", borderRadius: 11, border: "1px solid #ddd8e9", background: "#fff", color: "#68647b", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Cancel</button>
            <button type="button" onClick={handleAddLocation} style={{ padding: "10px 18px", borderRadius: 11, border: 0, background: "var(--accent-gradient)", color: "#fff", fontSize: 13, fontWeight: 850, cursor: "pointer", boxShadow: "0 5px 14px var(--accent-glow)" }}>
              Add Location
            </button>
          </div>
        </div>
      </div>
    )}
    </>
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
    bookingId?: string;
    clientName: string;
    serviceNames: string[];
    date: string;
    startTime: string;
    totalAmount: number;
  }>>([]);
  const seenBookingAlertIds = useRef(new Set<string>());
  const [lowStockCount,     setLowStockCount]     = useState(0);
  const [outStockCount,     setOutStockCount]     = useState(0);
  const [unpaidInvoice, setUnpaidInvoice] = useState<{ number: string; amount: number; status: string; dueDate: string } | null>(null);
  const [invoiceBadgeDismissed, setInvoiceBadgeDismissed] = useState(false);
  const [waStatus,      setWaStatus]       = useState<"unknown" | "connected" | "disconnected">("unknown");
  const [waBannerDismissed, setWaBannerDismissed] = useState(false);
  const [locationRenderKey, setLocationRenderKey] = useState(() => getActiveLocationFilter());

  async function handleLocationChange(locationId: string) {
    await syncFromDB();
    setLocationRenderKey(locationId);
  }

  // Auth guard
  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const user = getCurrentUser();
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      if (user.role === "staff") {
        if (user.locationId) setActiveLocationFilter(user.locationId);
        const key = pathname === "/dashboard"
          ? "dashboard"
          : pathname.replace("/dashboard/", "").split("/")[0];
        if (!(user.permissions || []).includes(key)) {
          router.replace("/dashboard");
          return;
        }
      }

      // Staff and managers inherit the salon owner's subscription. Fetch the
      // authoritative plan before rendering so limits never fall back to Free
      // on a different browser/device with an empty local cache.
      const dataOwnerId = user.salonOwnerId || user.id;
      let resolvedPlanId: PlanId = getCurrentPlanId();
      try {
        const response = await fetch(`/api/billing/user?userId=${encodeURIComponent(dataOwnerId)}`);
        const data = await response.json() as { ok?: boolean; planId?: string };
        if (data.ok && data.planId) {
          setActivePlan(data.planId);
          resolvedPlanId = data.planId as PlanId;
        }
      } catch {
        // Keep the last cached plan when offline.
      }
      if (resolvedPlanId !== "premium") {
        const mainLocationId = getSalonLocations()[0]?.id ?? "main";
        if (getActiveLocationFilter() !== mainLocationId) setActiveLocationFilter(mainLocationId);
      }
      setIsReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router, pathname]);

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
    const dataOwnerId = user.salonOwnerId || user.id;

    syncFromDB().then(() => {
      reloadSettings();
      window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));
      runWhatsAppScheduler();

      // After DB sync, read plan from localStorage and check for unpaid invoices
      const planId = getCurrentPlanId() as PlanId;
      const plan = PLAN_CONFIGS[planId];
      if (plan && plan.price > 0) {
        const invoices = syncInvoices(
          { id: dataOwnerId, ownerName: user.ownerName, salonName: user.salonName, email: user.email, phone: user.phone },
          { id: plan.id, name: plan.label, price: plan.price },
          user.createdAt,
        );
        const unpaid = invoices.filter((inv) => inv.userId === dataOwnerId && inv.status !== "paid");
        if (unpaid.length > 0) {
          const oldest = unpaid[unpaid.length - 1]; // oldest = last in desc-sorted list
          setUnpaidInvoice({ number: oldest.number, amount: oldest.total, status: oldest.status, dueDate: oldest.dueDate });
          setInvoiceBadgeDismissed(false);
        }
      }
    });
    checkInvoiceNotifications();

    // Check suspension status
    if (user.role !== "staff") fetch(`/api/billing/status?userId=${encodeURIComponent(dataOwnerId)}`)
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
    const config = settingsStore.wasender as { provider?: "wasender" | "botsailor"; apiKey: string; botSailorApiToken?: string; botSailorPhoneNumberId?: string };
    const credential = config.provider === "botsailor" ? config.botSailorApiToken : config.apiKey;
    if (!credential) return;

    async function checkWa() {
      try {
        const params = new URLSearchParams({
          provider: config.provider || "wasender",
          apiKey: config.apiKey,
          botSailorApiToken: config.botSailorApiToken || "",
          botSailorPhoneNumberId: config.botSailorPhoneNumberId || "",
        });
        const res  = await fetch(`/api/whatsapp/status?${params}`);
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
    if (!isReady) return;

    type BookingAlert = {
      bookingId?: string;
      clientName: string;
      serviceNames: string[];
      date: string;
      startTime: string;
      totalAmount: number;
      ts?: number;
    };

    function showBookingAlert(detail: BookingAlert) {
      const dedupeId = detail.bookingId
        || `${detail.clientName}|${detail.date}|${detail.startTime}|${detail.ts ?? ""}`;
      if (seenBookingAlertIds.current.has(dedupeId)) return;
      seenBookingAlertIds.current.add(dedupeId);
      playChime();
      const alertId = Date.now();
      // A new booking replaces an older visible popup. Each popup now represents
      // exactly the booking event that triggered it.
      setBookingAlerts([{ ...detail, alertId }]);
    }

    // BroadcastChannel — propagates to ALL open tabs in the same browser instantly
    const channel = new BroadcastChannel("werzio_booking_alerts");
    channel.onmessage = (e: MessageEvent) => {
      try { showBookingAlert(e.data); } catch { /* ignore */ }
    };

    function broadcast(detail: BookingAlert) {
      showBookingAlert(detail);
      channel.postMessage(detail); // notify every other open tab
    }

    // Same-tab: custom event (when booking page and dashboard share a window)
    function onNewBooking(e: Event) {
      broadcast((e as CustomEvent).detail);
    }

    // Cross-tab fallback: localStorage storage event (same browser, different tab)
    function onStorage(e: StorageEvent) {
      if (e.key !== "werzio_new_booking_notify" || !e.newValue) return;
      // Every dashboard tab receives this event independently. Do not rebroadcast
      // it or each tab will multiply the same popup through BroadcastChannel.
      try { showBookingAlert(JSON.parse(e.newValue)); } catch { /* ignore */ }
    }

    window.addEventListener("werzio_new_booking_alert", onNewBooking);
    window.addEventListener("storage", onStorage);

    // Poll for new online bookings every 30 s — catches bookings from external devices
    const user = getCurrentUser();
    let lastSeenId: string | null = null;

    async function pollNewBookings() {
      if (!user) return;
      try {
        const res = await fetch(`/api/public/salon?salonId=${encodeURIComponent(user.id)}`);
        if (!res.ok) return;
        const data = await res.json() as { ok: boolean; appointments?: Array<{ id: string; clientName: string; serviceNames: string[]; date: string; startTime: string; totalAmount: number; source?: string }> };
        if (!data.ok || !Array.isArray(data.appointments) || data.appointments.length === 0) return;

        const latest = data.appointments[0]; // newest is first (prepended on save)
        if (lastSeenId === null) {
          // First poll — just record the baseline, don't fire popup
          lastSeenId = latest.id;
          return;
        }
        if (latest.id !== lastSeenId) {
          const lastSeenIndex = data.appointments.findIndex((a) => a.id === lastSeenId);
          
          // If the last seen ID is not in the list anymore (e.g. deleted), just update the baseline
          if (lastSeenIndex === -1) {
            lastSeenId = latest.id;
            return;
          }

          lastSeenId = latest.id;
          // Only surface the booking that just arrived. Older unseen records
          // must not be replayed as a stack of popups.
          showBookingAlert({
            bookingId:   latest.id,
            clientName:  latest.clientName,
            serviceNames: latest.serviceNames ?? [],
            date:        latest.date,
            startTime:   latest.startTime,
            totalAmount: latest.totalAmount ?? 0,
          });
        }
      } catch { /* network error — try again next tick */ }
    }

    pollNewBookings(); // run immediately to set baseline
    const pollInterval = window.setInterval(pollNewBookings, 30_000);

    return () => {
      window.removeEventListener("werzio_new_booking_alert", onNewBooking);
      window.removeEventListener("storage", onStorage);
      channel.close();
      window.clearInterval(pollInterval);
    };
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
        {getCurrentUser()?.role !== "staff" && getCurrentPlanId() === "premium" && (
          <DashboardLocationSwitcher onLocationChange={handleLocationChange} />
        )}
        <div key={locationRenderKey}>{children}</div>
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
          <img src="/salon-central-logo.png" alt="Salon Central" />
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

        {/* Salon Central subscription invoice reminder */}
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
                Salon Central Subscription
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
                  aria-label={`Dismiss booking notification for ${alert.clientName}`}
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
