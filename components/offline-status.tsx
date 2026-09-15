"use client";

/**
 * The offline / unsynced indicator for the dashboard.
 *
 * Staff need to know two different things, and conflating them is how people
 * end up not trusting the app:
 *
 *   • "you are offline"       — keep working, nothing is lost
 *   • "you are back, but N
 *      changes haven't landed" — don't close the laptop yet
 *
 * Silent when there is nothing to say, which is almost always. Data already
 * lives in localStorage first (see lib/turso-sync.ts), so being offline costs
 * the salon nothing as long as this makes the state visible.
 */

import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw, WifiOff } from "lucide-react";
import { PENDING_CHANGED_EVENT, pendingCount } from "@/lib/offline-queue";
import { flushPendingWrites } from "@/lib/turso-sync";

export default function OfflineStatus() {
  // Assume online until the browser says otherwise: rendering an offline
  // warning during hydration on a perfectly good connection is worse than
  // being a moment late to show it.
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refresh = useCallback(() => setPending(pendingCount()), []);

  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();

    const goOnline = () => { setOnline(true); refresh(); };
    const goOffline = () => { setOnline(false); refresh(); };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener(PENDING_CHANGED_EVENT, refresh);
    // The queue is written by other tabs too — a POS tab and a calendar tab
    // on the same PC should agree about what is still unsynced.
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener(PENDING_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const retry = useCallback(async () => {
    setFlushing(true);
    try {
      await flushPendingWrites();
    } finally {
      setFlushing(false);
      refresh();
    }
  }, [refresh]);

  // Online and everything has landed — the normal case, so say nothing.
  if (online && pending === 0) return null;

  const offline = !online;
  const label = offline
    ? pending > 0
      ? `Offline — ${pending} change${pending === 1 ? "" : "s"} saved on this device`
      : "Offline — your work is saved on this device"
    : `${pending} change${pending === 1 ? "" : "s"} waiting to sync`;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: "calc(10px + env(safe-area-inset-top))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 900,
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: "calc(100vw - 24px)",
        padding: "9px 14px",
        borderRadius: 999,
        background: offline ? "#1f2937" : "#78350f",
        color: "#fff",
        fontSize: 12.5,
        fontWeight: 650,
        boxShadow: "0 6px 20px rgba(10,10,30,.22)",
      }}
    >
      {offline ? <WifiOff size={15} style={{ flexShrink: 0 }} /> : <CloudOff size={15} style={{ flexShrink: 0 }} />}
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {/* Retrying by hand only makes sense once the connection is back —
          offline it would just fail fast and look broken. */}
      {!offline && (
        <button
          type="button"
          onClick={retry}
          disabled={flushing}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            border: "none", borderRadius: 999, cursor: flushing ? "default" : "pointer",
            background: "rgba(255,255,255,.16)", color: "#fff",
            padding: "5px 11px", fontSize: 11.5, fontWeight: 700, flexShrink: 0,
          }}
        >
          <RefreshCw size={12} style={flushing ? { animation: "oq-spin 1s linear infinite" } : undefined} />
          {flushing ? "Syncing…" : "Sync now"}
        </button>
      )}
      <style>{`@keyframes oq-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
