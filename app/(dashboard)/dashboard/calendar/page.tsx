"use client";

import { useState, useEffect } from "react";
import { getStoredAppointments, getStoredStaff, getStoredServices } from "@/lib/storage";
import type { AppointmentStatus, Appointment, Staff, Service } from "@/lib/types";
import { ChevronLeft, ChevronRight, X, Clock, User, Scissors, Phone, Tag } from "lucide-react";
import { fmtCurrency as fmt } from "@/lib/format";

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0–23
const SLOT_H = 56;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  booked:        { label: "Booked",      color: "#6366f1", bg: "#EEF2FF" },
  confirmed:     { label: "Confirmed",   color: "#059669", bg: "#ecfdf5" },
  arrived:       { label: "Arrived",     color: "#9333EA", bg: "#F5F3FF" },
  "in-progress": { label: "In Progress", color: "#d97706", bg: "#fffbeb" },
  completed:     { label: "Completed",   color: "#16a34a", bg: "#f0fdf4" },
  "no-show":     { label: "No Show",     color: "#dc2626", bg: "#fef2f2" },
  cancelled:     { label: "Cancelled",   color: "#6b7280", bg: "#f9fafb" },
};

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekOf(anchor: Date): Date[] {
  const dow = (anchor.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - dow + i);
    return d;
  });
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")}${ampm}`;
}

function Block({ appt, onClick, staffList }: { appt: Appointment; onClick: () => void; staffList: Staff[] }) {
  const top = (toMin(appt.startTime) / 60) * SLOT_H;
  const height = Math.max(((toMin(appt.endTime) - toMin(appt.startTime)) / 60) * SLOT_H - 2, 22);
  const cfg = STATUS[appt.status];
  const staffColor = staffList.find((s) => s.id === appt.staffId)?.color ?? cfg.color;

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute", top, left: 4, right: 4, height,
        background: cfg.bg, borderRadius: 8, overflow: "hidden",
        cursor: "pointer", zIndex: 1,
        borderLeft: `3px solid ${staffColor}`,
        outline: `1px solid ${cfg.color}33`,
        padding: "3px 7px",
        transition: "filter 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(0.95)")}
      onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {appt.clientName}
      </div>
      {height > 36 && (
        <div style={{ fontSize: 10, color: "#6b6b8a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {appt.serviceNames[0]}
        </div>
      )}
      {height > 52 && (
        <div style={{ fontSize: 9, color: "#9898b0", marginTop: 1 }}>
          {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}
        </div>
      )}
    </div>
  );
}

function DetailModal({ appt, onClose, staffList, allServices }: { appt: Appointment; onClose: () => void; staffList: Staff[]; allServices: Service[] }) {
  const cfg = STATUS[appt.status];
  const staff = staffList.find((s) => s.id === appt.staffId);
  const services = allServices.filter((s) => appt.serviceIds.includes(s.id));
  const durationMin = toMin(appt.endTime) - toMin(appt.startTime);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}
      >
        {/* Modal header */}
        <div style={{ background: cfg.bg, padding: "20px 24px 16px", borderBottom: `3px solid ${cfg.color}33`, position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
            <X size={18} color="#6b6b8a" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: staff ? staff.color + "22" : "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: staff?.color ?? "#7C3AED" }}>
              {appt.clientName.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>{appt.clientName}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: `${cfg.color}18`, padding: "2px 10px", borderRadius: 20 }}>
                {cfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* Modal body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

          <Row icon={<Clock size={14} color="#9898b0" />} label="Time">
            {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}
            <span style={{ marginLeft: 8, fontSize: 11, color: "#9898b0" }}>({durationMin} min)</span>
          </Row>

          <Row icon={<User size={14} color="#9898b0" />} label="Stylist">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: staff?.color ?? "#ccc", display: "inline-block" }} />
              {appt.staffName}
            </span>
          </Row>

          <Row icon={<Scissors size={14} color="#9898b0" />} label="Services">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {services.map((sv) => (
                <div key={sv.id} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{sv.name}</span>
                  <span style={{ color: "#7C3AED", fontWeight: 600 }}>{fmt(sv.price)}</span>
                </div>
              ))}
            </div>
          </Row>

          <Row icon={<Tag size={14} color="#9898b0" />} label="Source">
            <span style={{ textTransform: "capitalize" }}>{appt.source}</span>
          </Row>

          {appt.notes && (
            <Row icon={<Phone size={14} color="#9898b0" />} label="Notes">
              {appt.notes}
            </Row>
          )}

          <div style={{ borderTop: "1px solid #f0f0f8", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#6b6b8a", fontWeight: 500 }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#7C3AED" }}>{fmt(appt.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 13, color: "#1a1a2e" }}>{children}</div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [anchor, setAnchor] = useState<Date>(() => parseDate("2026-05-20"));
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [today, setToday] = useState("2026-05-20");

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    setToday(todayStr);
    setAnchor(parseDate(todayStr));
    setAppointments(getStoredAppointments());
    setStaffList(getStoredStaff());
    setServices(getStoredServices());
  }, []);

  const week = weekOf(anchor);

  const prev = () => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); };
  const next = () => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); };
  const monthLabel = week[0].toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="dash-page" style={{ background: "#f4f5f7", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 16 }}>

      {selected && <DetailModal appt={selected} onClose={() => setSelected(null)} staffList={staffList} allServices={services} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#1a1a2e" }}>Calendar</div>
          <div style={{ fontSize: 13, color: "#9898b0", marginTop: 2 }}>{monthLabel}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setAnchor(parseDate(today))} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #e0e0ec", background: "#fff", fontSize: 12, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>
            Today
          </button>
          <button onClick={prev} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e0e0ec", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronLeft size={16} color="#6b6b8a" />
          </button>
          <button onClick={next} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e0e0ec", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronRight size={16} color="#6b6b8a" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="cal-scroll-wrap">
        <div className="cal-scroll-inner">
        <div className="cal-grid-inner">

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)", borderBottom: "1px solid #f0f0f8" }}>
          <div style={{ borderRight: "1px solid #f0f0f8" }} />
          {week.map((d, i) => {
            const ds = toStr(d);
            const isToday = ds === today;
            return (
              <div key={ds} style={{ padding: "12px 8px", textAlign: "center", borderRight: i < 6 ? "1px solid #f0f0f8" : "none", background: isToday ? "#F5F3FF" : "transparent" }}>
                <div style={{ fontSize: 11, color: isToday ? "#7C3AED" : "#9898b0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{DAYS[i]}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: isToday ? "#7C3AED" : "#1a1a2e", width: 36, height: 36, borderRadius: "50%", background: isToday ? "#EDE9FE" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "4px auto 0" }}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable time grid */}
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 280px)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "52px repeat(7, 1fr)" }}>

            {/* Time labels */}
            <div>
              {HOURS.map((h) => (
                <div key={h} style={{ height: SLOT_H, borderBottom: "1px solid #f4f4f8", borderRight: "1px solid #f0f0f8", display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 6, paddingTop: 4 }}>
                  <span style={{ fontSize: 10, color: "#b0b0c8" }}>
                    {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {week.map((d, di) => {
              const ds = toStr(d);
              const isToday = ds === today;
              const appts = appointments.filter((a) => a.date === ds);
              return (
                <div key={ds} style={{ position: "relative", borderRight: di < 6 ? "1px solid #f0f0f8" : "none", background: isToday ? "#fdfbff" : "transparent" }}>
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: SLOT_H, borderBottom: "1px solid #f4f4f8" }} />
                  ))}
                  <div style={{ position: "absolute", inset: 0 }}>
                    {appts.map((a) => (
                      <Block key={a.id} appt={a} onClick={() => setSelected(a)} staffList={staffList} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>{/* /cal-grid-inner */}
        </div>{/* /cal-scroll-inner */}
      </div>{/* /cal-scroll-wrap */}

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {Object.entries(STATUS).map(([k, cfg]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: cfg.bg, border: `1.5px solid ${cfg.color}` }} />
            <span style={{ fontSize: 11, color: "#9898b0" }}>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

