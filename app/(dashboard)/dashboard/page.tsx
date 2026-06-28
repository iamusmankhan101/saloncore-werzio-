"use client";

import { useState, useEffect, useMemo } from "react";
import { getStoredAppointments, getStoredClients, getStoredStaff } from "@/lib/storage";
import type { AppointmentStatus, Appointment, Client, Staff } from "@/lib/types";
import DashboardHeader from "@/components/dashboard-header";
import { MoreHorizontal } from "lucide-react";
import { fmtCurrency as fmt } from "@/lib/format";

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  booked:        { label: "Booked",      color: "#6366f1", bg: "#EEF2FF" },
  confirmed:     { label: "Confirmed",   color: "#059669", bg: "#ecfdf5" },
  arrived:       { label: "Arrived",     color: "#9333EA", bg: "#F5F3FF" },
  "in-progress": { label: "In Progress", color: "#d97706", bg: "#fffbeb" },
  completed:     { label: "Completed",   color: "#16a34a", bg: "#f0fdf4" },
  "no-show":     { label: "No Show",     color: "#dc2626", bg: "#fef2f2" },
  cancelled:     { label: "Cancelled",   color: "#6b7280", bg: "#f9fafb" },
};

function Avatar({ name, color = "#9333EA", bg = "#F5F3FF" }: { name: string; color?: string; bg?: string }) {
  return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>
      {name.charAt(0)}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 2 }}>{subtitle}</div>
        </div>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
          <MoreHorizontal size={18} color="#c0c0d0" />
        </button>
      </div>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [today] = useState(() => new Date().toLocaleDateString("en-CA"));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppointments(getStoredAppointments());
      setClients(getStoredClients());
      setStaffList(getStoredStaff());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const todayAppts = appointments.filter((a) => a.date === today);
  const revenueLast7Days = useMemo(() => {
    const totals = new Map<string, number>();
    appointments.forEach((appointment) => {
      if (appointment.status === "completed") {
        totals.set(appointment.date, (totals.get(appointment.date) ?? 0) + appointment.totalAmount);
      }
    });

    const endDate = new Date(`${today}T12:00:00`);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - (6 - index));
      const dateKey = date.toLocaleDateString("en-CA");
      return { date: dateKey, total: totals.get(dateKey) ?? 0 };
    });
  }, [appointments, today]);
  const maxRevenue = Math.max(...revenueLast7Days.map((day) => day.total), 0);
  const axisMax = maxRevenue > 0 ? Math.ceil((maxRevenue * 1.2) / 1000) * 1000 : 60000;
  const yAxisLabels = [axisMax, axisMax * 0.75, axisMax * 0.5, axisMax * 0.25, 0]
    .map((value) => value >= 1000 ? `${Number((value / 1000).toFixed(1))}K` : String(Math.round(value)));
  const topClients = [...clients].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 5);
  const todayTotal = todayAppts.reduce((s, a) => s + a.totalAmount, 0);

  return (
    <div className="dash-page" style={{ background: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <DashboardHeader />


      {/* Top 3 cards */}
      <div className="dash-grid-3">

        {/* Card 1: Today Appointments */}
        <Card title="Today's Appointments" subtitle={`${todayAppts.length} scheduled`}>
          {todayAppts.slice(0, 5).map((appt) => (
            <div key={appt.id} style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid #f4f4f8" }}>
              <Avatar name={appt.clientName} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>{appt.clientName}</div>
                <div style={{ fontSize: 11, color: "#a0a0b8", marginTop: 1 }}>{appt.serviceNames[0]}</div>
              </div>
              <MoreHorizontal size={14} color="#c8c8d8" />
            </div>
          ))}
        </Card>

        {/* Card 2: Staff Status */}
        <Card title="Staff Status" subtitle="Active stylists today">
          {staffList.map((s) => {
            const busy = todayAppts.some((a) => a.staffId === s.id && (a.status === "in-progress" || a.status === "arrived"));
            return (
              <div key={s.id} style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid #f4f4f8" }}>
                <Avatar name={s.name} color={s.color} bg={s.color + "22"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "#a0a0b8", marginTop: 1, textTransform: "capitalize" }}>{s.role.replace(/-/g, " ")}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: busy ? "#d97706" : "#059669", background: busy ? "#fffbeb" : "#ecfdf5", padding: "3px 10px", borderRadius: 20 }}>
                  {busy ? "Busy" : "Active"}
                </span>
              </div>
            );
          })}
        </Card>

        {/* Card 3: Top Clients */}
        <Card title="Top Clients" subtitle="By lifetime spend">
          {topClients.map((client) => (
            <div key={client.id} style={{ padding: "10px 20px", borderTop: "1px solid #f4f4f8" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={client.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1a1a2e" }}>{client.name}</div>
                  <div style={{ fontSize: 11, color: "#a0a0b8", marginTop: 1 }}>{client.tags[0]}</div>
                </div>
                <MoreHorizontal size={14} color="#c8c8d8" />
              </div>
              <div style={{ fontSize: 11, color: "#7C3AED", fontWeight: 600, marginTop: 6, paddingLeft: 48 }}>{fmt(client.totalSpend)}</div>
            </div>
          ))}
        </Card>
      </div>

      {/* Bottom 2 cards */}
      <div className="dash-grid-bottom">

        {/* Revenue Bar Chart */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", padding: "20px 24px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>Revenue Trend</div>
              <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 2 }}>Last 7 days</div>
            </div>
          </div>
          {/* Chart body */}
          <div style={{ display: "flex", gap: 12, flex: 1 }}>
            {/* Y-axis labels */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: 22 }}>
              {yAxisLabels.map((l) => (
                <div key={l} style={{ fontSize: 10, color: "#c0c0d0", textAlign: "right", lineHeight: 1 }}>{l}</div>
              ))}
            </div>
            {/* Bars + x-axis */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Grid + bars */}
              <div style={{ flex: 1, position: "relative", minHeight: 180 }}>
                {/* Horizontal grid lines */}
                {[0, 25, 50, 75, 100].map((pct) => (
                  <div key={pct} style={{ position: "absolute", bottom: `${pct}%`, left: 0, right: 0, height: 1, background: "#f0f0f8" }} />
                ))}
                {/* Bars */}
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "stretch", gap: 10, paddingTop: 22 }}>
                  {revenueLast7Days.map((day) => {
                    const pct = maxRevenue > 0 ? (day.total / axisMax) * 100 : 0;
                    const isToday = day.date === today;
                    return (
                      <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                        {day.total > 0 && (
                          <div style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: isToday ? "#7C3AED" : "#6D28D9",
                            whiteSpace: "nowrap",
                            marginBottom: 3,
                            lineHeight: 1,
                          }}>
                            {fmt(day.total)}
                          </div>
                        )}
                        <div
                          title={`${day.date}: ${fmt(day.total)}`}
                          style={{ width: "100%", height: `${pct}%`, background: isToday ? "#7C3AED" : "#DDD6FE", borderRadius: "6px 6px 0 0", transition: "height 0.3s", minHeight: day.total > 0 ? 3 : 0 }}
                        />
                      </div>
                    );
                  })}
                </div>
                {maxRevenue === 0 && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#a0a0b8", fontSize: 12, textAlign: "center", padding: 20 }}>
                    Complete an appointment to see revenue here.
                  </div>
                )}
              </div>
              {/* X-axis labels */}
              <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
                {revenueLast7Days.map((day) => {
                  const isToday = day.date === today;
                  const label = new Date(day.date).toLocaleDateString("en-PK", { weekday: "short" });
                  return (
                    <div key={day.date} style={{ flex: 1, textAlign: "center", fontSize: 11, color: isToday ? "#7C3AED" : "#c0c0d0", fontWeight: isToday ? 700 : 400 }}>{label}</div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>

        {/* Services Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{"Today's Services"}</div>
              <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 2 }}>Revenue breakdown</div>
            </div>
            <button style={{ background: "none", border: "none", cursor: "pointer" }}>
              <MoreHorizontal size={18} color="#c0c0d0" />
            </button>
          </div>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 56px 96px 90px", padding: "8px 20px", borderTop: "1px solid #f0f0f8", borderBottom: "1px solid #f0f0f8", background: "#fafafa" }}>
            {["SERVICE", "STAFF", "STATUS", "AMOUNT"].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#b0b0c8", letterSpacing: "0.08em" }}>{h}</div>
            ))}
          </div>
          {/* Rows */}
          <div style={{ flex: 1 }}>
            {todayAppts.map((appt, i) => {
              const cfg = STATUS_CONFIG[appt.status];
              const isLast = i === todayAppts.length - 1;
              return (
                <div key={appt.id} style={{ display: "grid", gridTemplateColumns: "1fr 56px 96px 90px", padding: "12px 20px", borderBottom: isLast ? "none" : "1px solid #f4f4f8", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{appt.serviceNames[0]}</div>
                    <div style={{ fontSize: 11, color: "#b0b0c8", marginTop: 2 }}>{appt.startTime}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 500 }}>{appt.staffName.split(" ")[0]}</div>
                  <div>
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{fmt(appt.totalAmount)}</div>
                </div>
              );
            })}
          </div>
          {/* Footer total */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f8", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#6b6b8a" }}>Total ({todayAppts.length} services)</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#7C3AED" }}>{fmt(todayTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


