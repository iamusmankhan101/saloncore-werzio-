"use client";

/**
 * /client/[salonId] — the page a customer lands on after scanning a salon QR code.
 *
 * Deliberately public and session-less: a walk-in scans the code at the chair
 * and gets the service menu, an install button, and the offers opt-in without
 * signing in. The salon is identified by the path segment, matching the
 * existing /loyalty-card/[salonId] convention.
 *
 * The QR code may also carry ?station= (which chair), ?staff= or ?c= (a known
 * customer id) — those are passed through to the subscription so a broadcast
 * can later be narrowed to one person.
 */

import { Suspense, use, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BellRing, BellOff, CalendarPlus, Check, Clock, CreditCard,
  Loader2, MapPin, Phone, Scissors, Sparkles,
} from "lucide-react";
import type { Service } from "@/lib/types";
import InstallPrompt from "@/components/install-prompt";
import {
  checkPushSupport, getExistingSubscription, subscribeToPush, unsubscribeFromPush,
} from "@/lib/push-client";

interface SalonSettings {
  salon?: { name?: string; phone?: string; address?: string; logo?: string; currency?: string };
}

interface SalonResponse {
  ok: boolean;
  error?: string;
  services?: Service[];
  settings?: SalonSettings;
}

const ACCENT = "#7C3AED";

function money(amount: number, currency = "PKR") {
  return `${currency} ${Math.round(amount).toLocaleString("en-PK")}`;
}

export default function ClientAppPage({ params }: { params: Promise<{ salonId: string }> }) {
  const { salonId } = use(params);
  return (
    // useSearchParams needs a Suspense boundary for this route to stay statically shell-rendered.
    <Suspense fallback={<CenteredSpinner />}>
      <ClientAppInner salonId={salonId} />
    </Suspense>
  );
}

function CenteredSpinner() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#faf9fc" }}>
      <Loader2 size={28} color={ACCENT} style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function ClientAppInner({ salonId }: { salonId: string }) {
  const searchParams = useSearchParams();
  const station  = searchParams.get("station");
  const clientId = searchParams.get("c");

  const [data, setData]       = useState<SalonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy]             = useState(false);
  const [pushMsg, setPushMsg]       = useState("");
  const [pushBlocked, setPushBlocked] = useState(false);

  // ─── Load the public salon data ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/salon?salonId=${encodeURIComponent(salonId)}`)
      .then((r) => r.json())
      .then((d: SalonResponse) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ ok: false, error: "Couldn't load this salon." }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [salonId]);

  // ─── Reflect the device's existing push state ──────────────────────────────
  useEffect(() => {
    const support = checkPushSupport();
    if (!support.supported) {
      setPushMsg(support.reason);
      setPushBlocked(true);
      return;
    }
    if (Notification.permission === "denied") {
      setPushBlocked(true);
      setPushMsg("Notifications are blocked for this site in your browser settings.");
      return;
    }
    getExistingSubscription().then((sub) => setSubscribed(Boolean(sub)));
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setPushMsg("");
    const result = await subscribeToPush({ salonId, clientId });
    if (result.ok) {
      setSubscribed(true);
      setPushMsg("You're in — we'll let you know about offers and openings.");
    } else {
      setPushMsg(result.error);
      if (result.permissionDenied) setPushBlocked(true);
    }
    setBusy(false);
  }, [salonId, clientId]);

  const disable = useCallback(async () => {
    setBusy(true);
    await unsubscribeFromPush();
    setSubscribed(false);
    setPushMsg("Notifications turned off.");
    setBusy(false);
  }, []);

  const salon    = data?.settings?.salon ?? {};
  const currency = salon.currency || "PKR";

  // Only live, bookable services — a package's component rows and retired
  // services shouldn't appear on a customer-facing menu.
  const services = useMemo(
    () => (data?.services ?? []).filter((s) => s.isActive !== false),
    [data],
  );

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const s of services) seen.set(s.category, (seen.get(s.category) ?? 0) + 1);
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [services]);

  const visible = category === "all" ? services : services.filter((s) => s.category === category);

  if (loading) return <CenteredSpinner />;

  if (!data?.ok) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#faf9fc" }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <Scissors size={36} color="#c4c2d4" />
          <h1 style={{ fontSize: 18, color: "#1a1a2e", margin: "14px 0 6px" }}>Salon not found</h1>
          <p style={{ fontSize: 14, color: "#777790", lineHeight: 1.6 }}>
            {data?.error ?? "This link may have expired. Please ask reception for a fresh QR code."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#faf9fc", paddingBottom: "calc(32px + env(safe-area-inset-bottom))" }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{
        background: `linear-gradient(135deg, ${ACCENT} 0%, #9333ea 100%)`,
        color: "#fff", padding: "calc(28px + env(safe-area-inset-top)) 20px 30px",
        borderRadius: "0 0 26px 26px",
      }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          {salon.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={salon.logo} alt="" width={54} height={54}
              style={{ borderRadius: 14, objectFit: "cover", marginBottom: 12, background: "rgba(255,255,255,.2)" }} />
          )}
          <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.2, fontWeight: 800 }}>
            {salon.name || "Our Salon"}
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.5, opacity: 0.9, lineHeight: 1.5 }}>
            {station ? `Welcome — you're at station ${station}.` : "Welcome! Here's what we offer today."}
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, fontSize: 12.5, opacity: 0.92 }}>
            {salon.phone && (
              <a href={`tel:${salon.phone}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff", textDecoration: "none" }}>
                <Phone size={13} /> {salon.phone}
              </a>
            )}
            {salon.address && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={13} /> {salon.address}
              </span>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 520, margin: "0 auto", padding: "18px 16px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ── Offers & notifications opt-in ────────────────────────────────── */}
        <section style={cardStyle}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center",
              background: subscribed ? "#ecfdf5" : "rgba(124,58,237,.08)",
            }}>
              {subscribed ? <Check size={19} color="#059669" /> : <Sparkles size={19} color={ACCENT} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: 15.5, color: "#1a1a2e" }}>
                {subscribed ? "Offers are on" : "Enable Offers & Notifications"}
              </h2>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#777790" }}>
                {subscribed
                  ? "You'll hear from us about discounts, last-minute openings and your appointment reminders."
                  : "Get discounts, last-minute slots and appointment reminders straight to your phone. No spam."}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {!subscribed ? (
              <button
                onClick={enable}
                disabled={busy || pushBlocked}
                style={{
                  ...primaryButton,
                  opacity: busy || pushBlocked ? 0.55 : 1,
                  cursor: busy || pushBlocked ? "not-allowed" : "pointer",
                }}
              >
                {busy
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Turning on…</>
                  : <><BellRing size={16} /> Enable Offers & Notifications</>}
              </button>
            ) : (
              <button onClick={disable} disabled={busy} style={secondaryButton}>
                <BellOff size={15} /> Turn off notifications
              </button>
            )}

            <InstallPrompt accent={ACCENT} />
          </div>

          {pushMsg && (
            <p style={{
              margin: "12px 0 0", fontSize: 12.5, lineHeight: 1.6,
              color: pushBlocked ? "#b45309" : "#059669",
            }}>
              {pushMsg}
            </p>
          )}
        </section>

        {/* ── Quick actions ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <a href={`/online-booking?salon=${encodeURIComponent(salonId)}`} style={quickAction}>
            <CalendarPlus size={18} color={ACCENT} />
            <span>Book an appointment</span>
          </a>
          <a href={`/loyalty-card/${encodeURIComponent(salonId)}`} style={quickAction}>
            <CreditCard size={18} color={ACCENT} />
            <span>My loyalty card</span>
          </a>
        </div>

        {/* ── Service menu ──────────────────────────────────────────────────── */}
        <section style={{ ...cardStyle, padding: "18px 0 6px" }}>
          <h2 style={{ margin: "0 18px 12px", fontSize: 15.5, color: "#1a1a2e" }}>
            Our services {services.length > 0 && <span style={{ color: "#9898b0", fontWeight: 500 }}>({services.length})</span>}
          </h2>

          {categories.length > 1 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 18px 14px", WebkitOverflowScrolling: "touch" }}>
              <CategoryChip label="All" active={category === "all"} onClick={() => setCategory("all")} />
              {categories.map(([cat, count]) => (
                <CategoryChip
                  key={cat}
                  label={`${cat} (${count})`}
                  active={category === cat}
                  onClick={() => setCategory(cat)}
                />
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <p style={{ margin: 0, padding: "10px 18px 22px", fontSize: 13.5, color: "#9898b0" }}>
              No services listed yet — please ask at reception.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {visible.map((s) => (
                <li key={s.id} style={{
                  display: "flex", justifyContent: "space-between", gap: 14,
                  padding: "13px 18px", borderTop: "1px solid #f0eef6",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 650, color: "#1a1a2e" }}>{s.name}</div>
                    {s.description && (
                      <div style={{ fontSize: 12.5, color: "#9898b0", marginTop: 3, lineHeight: 1.5 }}>{s.description}</div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9898b0", marginTop: 5 }}>
                      <Clock size={12} /> {s.durationMin} min
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, fontSize: 14, fontWeight: 800, color: ACCENT, whiteSpace: "nowrap" }}>
                    {s.variablePrice && s.priceRangeMin != null && s.priceRangeMax != null
                      ? `${money(s.priceRangeMin, currency)}–${money(s.priceRangeMax, currency).replace(`${currency} `, "")}`
                      : money(s.price, currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p style={{ textAlign: "center", fontSize: 11.5, color: "#b4b2c6", margin: "4px 0 0" }}>
          Powered by Salon Central
        </p>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, padding: "7px 14px", borderRadius: 999, cursor: "pointer",
        border: active ? "none" : "1px solid #e3e0eb",
        background: active ? ACCENT : "#fff",
        color: active ? "#fff" : "#6b6b8a",
        fontSize: 12.5, fontWeight: 700, textTransform: "capitalize",
      }}
    >
      {label}
    </button>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ece9f4",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 6px 22px rgba(38,25,75,.045)",
};

const primaryButton: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  width: "100%", padding: "13px 18px", borderRadius: 14, border: "none",
  background: ACCENT, color: "#fff", fontSize: 14, fontWeight: 800,
  boxShadow: `0 6px 18px ${ACCENT}33`,
};

const secondaryButton: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  width: "100%", padding: "12px 18px", borderRadius: 14,
  border: "1px solid #e3e0eb", background: "#fff",
  color: "#6b6b8a", fontSize: 13.5, fontWeight: 750, cursor: "pointer",
};

const quickAction: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: 8, padding: "15px 14px",
  background: "#fff", border: "1px solid #ece9f4", borderRadius: 16,
  textDecoration: "none", color: "#1a1a2e", fontSize: 13, fontWeight: 700,
  boxShadow: "0 6px 22px rgba(38,25,75,.045)",
};
