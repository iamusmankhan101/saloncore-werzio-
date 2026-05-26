"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar";
import { getCurrentUser } from "@/lib/auth";
import { applyAppearanceSettings, SETTINGS_CHANGED_EVENT } from "@/lib/settings-store";
import { runWhatsAppScheduler } from "@/lib/whatsapp-scheduler";
import { syncFromDB } from "@/lib/turso-sync";
import { checkInvoiceNotifications } from "@/lib/invoice-notifier";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

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

  useEffect(() => {
    applyAppearanceSettings();
    window.addEventListener(SETTINGS_CHANGED_EVENT, applyAppearanceSettings);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, applyAppearanceSettings);
  }, []);

  // Pull latest data from Turso into localStorage on login
  useEffect(() => {
    if (!isReady) return;
    syncFromDB();
    checkInvoiceNotifications();
  }, [isReady]);

  // WhatsApp scheduler — runs every 60 seconds while dashboard is open
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

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
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
    </div>
  );
}