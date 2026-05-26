"use client";

import { useRouter } from "next/navigation";
import { MessageSquare, Bell, X, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { downloadPDF } from "@/components/report-pdf";
import { SETTINGS_CHANGED_EVENT, settingsStore } from "@/lib/settings-store";

const NOTIFICATIONS = [
  { id: 1, text: "Zainab Ali's appointment completed", time: "9 min ago", color: "#16a34a" },
  { id: 2, text: "Sana Mirza is in progress with Zara", time: "22 min ago", color: "#d97706" },
  { id: 3, text: "Fatima Butt confirmed her booking", time: "1 hr ago", color: "#6366f1" },
  { id: 4, text: "New walk-in: Maryam Iqbal arrived", time: "1 hr ago", color: "#9333EA" },
  { id: 5, text: "Bridal Makeup booked for 14:00", time: "2 hrs ago", color: "#ec4899" },
];

export default function DashboardHeader() {
  const router = useRouter();
  const [showNotif, setShowNotif] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [whatsappConnected, setWhatsappConnected] = useState(true);

  useEffect(() => {
    function syncSettings() {
      const prefs = settingsStore.notifications;
      setNotificationsEnabled(Boolean(prefs.apptReminder || prefs.apptConfirm || prefs.noShow || prefs.dailySummary || prefs.weeklySummary || prefs.lowStock));
      setWhatsappConnected(Boolean(settingsStore.whatsapp.connected));
    }

    syncSettings();
    window.addEventListener(SETTINGS_CHANGED_EVENT, syncSettings);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, syncSettings);
  }, []);

  const visibleNotifications = notificationsEnabled ? NOTIFICATIONS : [];

  function handleDownload() {
    downloadPDF();
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, position: "relative" }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 20, color: "#1a1a2e" }}>Dashboard Performances</div>
        <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 3 }}>Salon Overview</div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {/* Download */}
        <button
          onClick={handleDownload}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 20, border: "1.5px solid #e0d6f7", background: "#f5f0ff", color: "var(--accent)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
        >
          <Download size={13} /> Download
        </button>

        {/* Message */}
        <button
          onClick={() => whatsappConnected ? router.push("/dashboard/messages") : router.push("/dashboard/account")}
          title={whatsappConnected ? "Open WhatsApp messages" : "Connect WhatsApp in Account settings"}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 20, border: "1.5px solid #e0d6f7", background: whatsappConnected ? "#f5f0ff" : "#f8f8fc", color: whatsappConnected ? "var(--accent)" : "#aaaabc", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
        >
          <MessageSquare size={13} /> {whatsappConnected ? "Message" : "Connect WhatsApp"}
        </button>

        {/* Notification */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowNotif((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 20, border: "1.5px solid #e0d6f7", background: showNotif ? "var(--accent)" : "#f5f0ff", color: showNotif ? "#fff" : "var(--accent)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
          >
            <Bell size={13} /> Notification
            <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 5px", marginLeft: 2 }}>
              {visibleNotifications.length}
            </span>
          </button>

          {showNotif && (
            <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 320, background: "#fff", borderRadius: 14, border: "1px solid #ebebf0", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>Notifications</div>
                <button onClick={() => setShowNotif(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <X size={14} color="#a0a0b8" />
                </button>
              </div>
              {visibleNotifications.length === 0 && (
                <div style={{ padding: "18px 16px", color: "#9898b0", fontSize: 12 }}>
                  Notifications are turned off in Account settings.
                </div>
              )}
              {visibleNotifications.map((n) => (
                <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f8f8fc", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.color, marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#1a1a2e", fontWeight: 500 }}>{n.text}</div>
                    <div style={{ fontSize: 11, color: "#b0b0c8", marginTop: 3 }}>{n.time}</div>
                  </div>
                </div>
              ))}
              <div style={{ padding: "10px 16px", textAlign: "center" }}>
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, cursor: "pointer" }}>Mark all as read</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
