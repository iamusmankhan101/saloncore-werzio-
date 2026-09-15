"use client";

/**
 * /client — entry point for an installed app with no salon in its URL.
 *
 * The first release shipped a static manifest whose start_url was "/client",
 * a path that had no page: tapping the home-screen icon opened a 404. Installs
 * now use a per-salon manifest (/api/manifest/[salonId]) that starts at
 * /client/<salonId>, but icons already on customers' phones keep the old
 * start_url until the browser re-reads the manifest — which may not happen for
 * days, or at all if the app is never opened in a browser tab.
 *
 * So this page has to work: it sends the device back to the last salon it
 * visited, and otherwise explains what to do rather than dead-ending.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, QrCode } from "lucide-react";

const ACCENT = "#7C3AED";

export default function ClientEntryPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let salonId: string | null = null;
    try {
      salonId = window.localStorage.getItem("salon-central:last-salon");
    } catch {
      /* storage blocked — fall through to the instructions below */
    }

    if (salonId) {
      router.replace(`/client/${encodeURIComponent(salonId)}`);
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#faf9fc" }}>
        <Loader2 size={28} color={ACCENT} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#faf9fc", display: "grid", placeItems: "center",
      padding: "calc(24px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom))",
    }}>
      <div style={{
        maxWidth: 380, textAlign: "center", background: "#fff", border: "1px solid #ece9f4",
        borderRadius: 20, padding: "32px 24px", boxShadow: "0 8px 28px rgba(38,25,75,.05)",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
          background: "rgba(124,58,237,.08)", display: "grid", placeItems: "center",
        }}>
          <QrCode size={26} color={ACCENT} />
        </div>
        <h1 style={{ margin: "0 0 8px", fontSize: 19, color: "#1a1a2e" }}>Scan your salon&apos;s code</h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "#777790" }}>
          Point your phone camera at the QR code at reception or on your styling chair to open
          your salon&apos;s services, offers and loyalty card.
        </p>
      </div>
    </div>
  );
}
