"use client";

import { Bell, X, AlertTriangle, FileText, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { getStoredInventory, getStoredAppointments } from "@/lib/storage";
import { getSalonInvoices } from "@/lib/salon-invoices";
import type { InventoryItem } from "@/lib/types";

type Notif = {
  id: string;
  text: string;
  sub: string;
  color: string;
  icon: "stock" | "invoice" | "appointment";
};

function buildNotifications(): Notif[] {
  const notifs: Notif[] = [];

  // 1. New appointments from online booking (source=web, not yet confirmed)
  try {
    const appts = getStoredAppointments();
    const pending = appts.filter((a) => a.source === "web" && a.status === "booked");
    pending.forEach((a) => {
      notifs.push({
        id: `appt_${a.id}`,
        icon: "appointment",
        color: "#7C3AED",
        text: `New online booking — ${a.clientName}`,
        sub: `${a.serviceNames.join(", ") || "Service"} · ${a.date} at ${a.startTime}`,
      });
    });
  } catch { /* ignore */ }

  // 2. Low stock / out of stock inventory
  try {
    const items: InventoryItem[] = getStoredInventory();
    const low = items.filter((i) => i.currentStock <= i.minStock);
    low.forEach((i) => {
      notifs.push({
        id: `stock_${i.id}`,
        icon: "stock",
        color: i.currentStock === 0 ? "#dc2626" : "#d97706",
        text: `${i.name} is ${i.currentStock === 0 ? "out of stock" : "running low"}`,
        sub: `${i.currentStock} ${i.unit} remaining (min: ${i.minStock})`,
      });
    });
  } catch { /* ignore */ }

  // 3. Unpaid customer invoices — repeat reminder the older they are
  try {
    const salonInvs = getSalonInvoices();
    const unpaid = salonInvs.filter((inv) => inv.status === "unpaid");
    unpaid.forEach((inv) => {
      const daysSince = Math.floor(
        (Date.now() - new Date(inv.createdAt).getTime()) / 86_400_000,
      );
      const isLate = daysSince >= 7;
      const reminder = daysSince >= 14 ? ` · 2nd reminder` : daysSince >= 7 ? ` · reminder` : "";
      notifs.push({
        id: `sinv_${inv.id}`,
        icon: "invoice",
        color: isLate ? "#dc2626" : "#f97316",
        text: `Invoice ${inv.number} unpaid${reminder}`,
        sub: `${inv.clientName} · PKR ${inv.total.toLocaleString()}${daysSince > 0 ? ` · ${daysSince}d ago` : ""}`,
      });
    });
  } catch { /* ignore */ }

  return notifs;
}

export default function DashboardHeader({ title = "Dashboard Performances", subtitle = "Salon Overview" }: { title?: string; subtitle?: string }) {
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    setNotifs(buildNotifications());
  }, []);

  // Refresh when panel opens
  function openPanel() {
    setNotifs(buildNotifications());
    setShowNotif((v) => !v);
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, position: "relative", padding: "24px 0" }}>
      <div style={{ paddingLeft: 30 }}>
        <div style={{ fontWeight: 700, fontSize: 20, color: "#1a1a2e" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 3 }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {/* Notification bell */}
        <div style={{ position: "relative" }}>
          <button
            onClick={openPanel}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 20, border: "1.5px solid #e0d6f7", background: showNotif ? "var(--accent)" : "#f5f0ff", color: showNotif ? "#fff" : "var(--accent)", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
          >
            <Bell size={13} /> Notifications
            {notifs.length > 0 && (
              <span style={{ background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 5px", marginLeft: 2 }}>
                {notifs.length}
              </span>
            )}
          </button>

          {showNotif && (
            <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 330, background: "#fff", borderRadius: 14, border: "1px solid #ebebf0", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>
                  Notifications {notifs.length > 0 && <span style={{ color: "#ef4444" }}>({notifs.length})</span>}
                </div>
                <button onClick={() => setShowNotif(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <X size={14} color="#a0a0b8" />
                </button>
              </div>

              {notifs.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#9898b0", fontSize: 12 }}>
                  <Bell size={28} color="#d1d1e0" style={{ display: "block", margin: "0 auto 8px" }} />
                  All clear — no alerts right now
                </div>
              ) : (
                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                  {notifs.map((n) => (
                    <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f8f8fc", display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: n.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        {n.icon === "appointment"
                          ? <Calendar size={13} color={n.color} />
                          : n.icon === "stock"
                          ? <AlertTriangle size={13} color={n.color} />
                          : <FileText size={13} color={n.color} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: "#1a1a2e", fontWeight: 600 }}>{n.text}</div>
                        <div style={{ fontSize: 11, color: "#b0b0c8", marginTop: 2 }}>{n.sub}</div>
                      </div>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: n.color, flexShrink: 0, marginTop: 5 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}