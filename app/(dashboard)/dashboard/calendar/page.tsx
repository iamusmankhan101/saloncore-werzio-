"use client";

import { useState, useEffect, useRef } from "react";
import { getStoredAppointments, getStoredStaff, getStoredServices } from "@/lib/storage";
import type { AppointmentStatus, Appointment, Staff, Service } from "@/lib/types";
import { ChevronLeft, ChevronRight, X, Clock, User, Scissors, Tag, CalendarDays } from "lucide-react";
import { fmtCurrency as fmt } from "@/lib/format";
import PageTitle from "@/components/page-title";

const HOURS  = Array.from({ length: 24 }, (_, i) => i);
const SLOT_H = 64;
const DAYS   = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS: Record<AppointmentStatus, { label: string; color: string; bg: string; dot: string }> = {
  booked:        { label: "Booked",      color: "#6366f1", bg: "#eef2ff", dot: "#6366f1" },
  confirmed:     { label: "Confirmed",   color: "#059669", bg: "#ecfdf5", dot: "#059669" },
  arrived:       { label: "Arrived",     color: "#9333EA", bg: "#f5f3ff", dot: "#9333EA" },
  "in-progress": { label: "In Progress", color: "#d97706", bg: "#fffbeb", dot: "#d97706" },
  completed:     { label: "Completed",   color: "#16a34a", bg: "#f0fdf4", dot: "#16a34a" },
  "no-show":     { label: "No Show",     color: "#dc2626", bg: "#fef2f2", dot: "#dc2626" },
  cancelled:     { label: "Cancelled",   color: "#6b7280", bg: "#f9fafb", dot: "#9ca3af" },
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
    const d = new Date(anchor); d.setDate(anchor.getDate() - dow + i); return d;
  });
}
function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")}${ampm}`;
}

/* ── Appointment block ──────────────────────────────────────────────────────── */
function Block({ appt, onClick, staffList }: { appt: Appointment; onClick: () => void; staffList: Staff[] }) {
  const top    = (toMin(appt.startTime) / 60) * SLOT_H;
  const height = Math.max(((toMin(appt.endTime) - toMin(appt.startTime)) / 60) * SLOT_H - 3, 24);
  const cfg    = STATUS[appt.status];
  const staff  = staffList.find((s) => s.id === appt.staffId);
  const accent = staff?.color ?? cfg.color;

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute", top, left: 4, right: 4, height,
        background: cfg.bg,
        borderRadius: 8,
        overflow: "hidden",
        cursor: "pointer",
        zIndex: 1,
        borderLeft: `4px solid ${accent}`,
        border: "1px solid rgba(226,223,235,0.4)",
        boxShadow: `0 2px 6px ${accent}15`,
        padding: "5px 8px",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.02) translateY(-1px)";
        e.currentTarget.style.boxShadow = `0 6px 16px ${accent}33`;
        e.currentTarget.style.zIndex = "10";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1) translateY(0)";
        e.currentTarget.style.boxShadow = `0 2px 6px ${accent}15`;
        e.currentTarget.style.zIndex = "1";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: accent, flexShrink: 0 }} />
        <div style={{ fontSize: 11, fontWeight: 800, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>
          {appt.clientName}
        </div>
      </div>
      {height > 38 && (
        <div style={{ fontSize: 10, color: "#5a5a75", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
          {appt.serviceNames[0]}
        </div>
      )}
      {height > 54 && (
        <div style={{ fontSize: 9, color: "#8c8ca5", marginTop: 4, display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
          <Clock size={8} /> {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}
        </div>
      )}
    </div>
  );
}

/* ── Detail modal ───────────────────────────────────────────────────────────── */
function DetailModal({ appt, onClose, staffList, allServices }: {
  appt: Appointment; onClose: () => void; staffList: Staff[]; allServices: Service[];
}) {
  const cfg         = STATUS[appt.status];
  const staff       = staffList.find((s) => s.id === appt.staffId);
  const services    = allServices.filter((s) => appt.serviceIds.includes(s.id));
  const teamStaffIds = Array.from(new Set(services.filter((s) => s.multiStylist && s.assignedStaffIds.length >= 2).flatMap((s) => s.assignedStaffIds)));
  const teamStaff    = teamStaffIds.map((sid) => staffList.find((s) => s.id === sid)).filter((s): s is Staff => Boolean(s));
  const durationMin = toMin(appt.endTime) - toMin(appt.startTime);
  const accent      = staff?.color ?? cfg.color;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,15,30,0.4)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 20, width: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", overflow: "hidden", border: "1px solid rgba(226,223,235,0.6)" }}
      >
        {/* Coloured header */}
        <div style={{ background: `linear-gradient(135deg, ${accent}14 0%, ${accent}04 100%)`, padding: "24px 24px 20px", borderBottom: `1px solid ${accent}15`, position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "#fff", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }} className="hover-bg-light">
            <X size={14} color="#6b6b8a" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: `${accent}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 850, color: accent, border: `1px solid ${accent}15` }}>
              {appt.clientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e", letterSpacing: "-0.01em" }}>{appt.clientName}</div>
              <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, background: `${cfg.color}15`, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: cfg.color }} />
                {cfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <InfoRow icon={<Clock size={14} />} label="Time">
            <strong style={{ color: "#1a1a2e", fontWeight: 750 }}>{fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}</strong>
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "rgba(124, 58, 237, 0.06)", padding: "2px 8px", borderRadius: 20 }}>{durationMin} min</span>
          </InfoRow>

          <InfoRow icon={<User size={14} />} label={teamStaff.length >= 2 ? "Stylist Team" : "Stylist"}>
            {teamStaff.length >= 2 ? (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                {teamStaff.map((s) => (
                  <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#1a1a2e" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, display: "inline-block", border: "1.5px solid rgba(255,255,255,0.8)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                    {s.name}
                  </span>
                ))}
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: "#7C3AED", background: "#F5F3FF", padding: "2px 7px", borderRadius: 20, letterSpacing: "0.04em" }}>Team</span>
              </div>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, color: "#1a1a2e" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: staff?.color ?? "#ccc", display: "inline-block", border: "1.5px solid rgba(255,255,255,0.8)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                {appt.staffName || "—"}
              </span>
            )}
          </InfoRow>

          <InfoRow icon={<Scissors size={14} />} label="Services">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {services.length > 0 ? services.map((sv) => (
                <div key={sv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#1a1a2e", fontWeight: 550 }}>{sv.name}</span>
                  <span style={{ fontSize: 13, color: "var(--accent)", fontWeight: 800 }}>{fmt(sv.price)}</span>
                </div>
              )) : (
                <span style={{ color: "#9898b0", fontSize: 13 }}>{appt.serviceNames.join(", ") || "—"}</span>
              )}
            </div>
          </InfoRow>

          <InfoRow icon={<Tag size={14} />} label="Source">
            <span style={{ textTransform: "capitalize", background: "#f4f4f8", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 750, color: "#5a5a75" }}>{appt.source}</span>
          </InfoRow>

          {appt.notes && (
            <InfoRow icon={<CalendarDays size={14} />} label="Notes">
              <span style={{ color: "#5a5a7a", lineHeight: 1.5 }}>{appt.notes}</span>
            </InfoRow>
          )}

          <div style={{ background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(147, 51, 234, 0.03) 100%)", borderRadius: 14, padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(124, 58, 237, 0.08)", marginTop: 4 }}>
            <span style={{ fontSize: 13, color: "#6b6b8a", fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "var(--accent)" }}>{fmt(appt.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ marginTop: 2, color: "#9898b0" }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 13, color: "#1a1a2e" }}>{children}</div>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function CalendarPage() {
  const [anchor, setAnchor]           = useState<Date>(() => new Date());
  const [selected, setSelected]       = useState<Appointment | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staffList, setStaffList]     = useState<Staff[]>([]);
  const [services, setServices]       = useState<Service[]>([]);
  const [today, setToday]             = useState("");
  const [nowMin, setNowMin]           = useState(0);
  const scrollRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    setToday(todayStr);
    setAnchor(parseDate(todayStr));
    setAppointments(getStoredAppointments());
    setStaffList(getStoredStaff());
    setServices(getStoredServices());

    const tick = () => {
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to current time on load
  useEffect(() => {
    if (scrollRef.current && nowMin > 0) {
      const px = (nowMin / 60) * SLOT_H - 120;
      scrollRef.current.scrollTop = Math.max(0, px);
    }
  }, [nowMin]);

  const week      = weekOf(anchor);
  const prev      = () => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); };
  const next      = () => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); };

  const weekStart = week[0].toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekEnd   = week[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const isThisWeek = week.some((d) => toStr(d) === today);

  const nowTop = (nowMin / 60) * SLOT_H;

  return (
    <div className="dash-page dashboard-polish" style={{ background: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 20 }}>

      {selected && <DetailModal appt={selected} onClose={() => setSelected(null)} staffList={staffList} allServices={services} />}

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <PageTitle icon={<CalendarDays size={24} />} title="Calendar" subtitle={`${weekStart} – ${weekEnd}`} />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setAnchor(parseDate(today))}
            style={{
              padding: "8px 18px", borderRadius: 10,
              border: isThisWeek ? "none" : "1.5px solid #e3e0eb",
              background: isThisWeek ? "var(--accent-gradient)" : "#fff",
              fontSize: 13, fontWeight: 750,
              color: isThisWeek ? "#fff" : "#6b6b8a",
              boxShadow: isThisWeek ? "0 4px 12px var(--accent-glow)" : "none",
              cursor: "pointer", transition: "all 0.18s ease",
            }}
            className={!isThisWeek ? "hover-bg-light" : ""}
          >
            Today
          </button>
          <div style={{ display: "flex", border: "1.5px solid #e3e0eb", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            <button onClick={prev} style={{ width: 36, height: 36, border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b6b8a" }} className="hover-bg-light">
              <ChevronLeft size={16} />
            </button>
            <div style={{ width: 1, background: "#e3e0eb" }} />
            <button onClick={next} style={{ width: 36, height: 36, border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#6b6b8a" }} className="hover-bg-light">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Calendar card ── */}
      <div style={{ background: "#fff", borderRadius: 20, border: "1px solid rgba(226,223,235,.95)", overflow: "hidden", flex: 1, display: "flex", flexDirection: "column", boxShadow: "0 8px 28px rgba(38,25,75,.04)" }} className="cal-scroll-wrap">

        {/* Day header row */}
        <div style={{ display: "grid", gridTemplateColumns: "64px repeat(7, 1fr)", borderBottom: "1.5px solid #f0f0f8", background: "#fff" }}>
          <div style={{ borderRight: "1px solid #f0f0f8" }} />
          {week.map((d, i) => {
            const ds      = toStr(d);
            const isToday = ds === today;
            const isWknd  = i >= 5;
            return (
              <div key={ds} style={{
                padding: "16px 8px 14px",
                textAlign: "center",
                borderRight: i < 6 ? "1px solid #f0f0f8" : "none",
                background: isToday ? "rgba(124, 58, 237, 0.02)" : isWknd ? "#fafafa" : "transparent",
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: isToday ? "var(--accent)" : isWknd ? "#a0a0b8" : "#9898b0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {DAYS[i]}
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 850,
                  color: isToday ? "#fff" : isWknd ? "#9898b0" : "#1a1a2e",
                  width: 36, height: 36, borderRadius: "50%",
                  background: isToday ? "var(--accent-gradient)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "8px auto 0",
                  boxShadow: isToday ? "0 6px 16px var(--accent-glow)" : "none",
                }}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable time grid */}
        <div ref={scrollRef} style={{ overflowY: "auto", flex: 1, maxHeight: "calc(100vh - 270px)" }} className="cal-scroll-inner">
          <div style={{ display: "grid", gridTemplateColumns: "64px repeat(7, 1fr)" }} className="cal-grid-inner">

            {/* Hour labels */}
            <div style={{ borderRight: "1px solid #f0f0f8", background: "#faf9fd" }}>
              {HOURS.map((h) => (
                <div key={h} style={{ height: SLOT_H, display: "flex", alignItems: "flex-start", justifyContent: "flex-end", paddingRight: 12, paddingTop: 6 }}>
                  <span style={{ fontSize: 9, color: "#b0b0c8", fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.02em", lineHeight: 1 }}>
                    {h === 0 ? "12 am" : h < 12 ? `${h} am` : h === 12 ? "12 pm" : `${h - 12} pm`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {week.map((d, di) => {
              const ds      = toStr(d);
              const isToday = ds === today;
              const isWknd  = di >= 5;
              const appts   = appointments.filter((a) => a.date === ds);

              return (
                <div key={ds} style={{
                  position: "relative",
                  borderRight: di < 6 ? "1px solid #f0f0f8" : "none",
                  background: isToday ? "linear-gradient(to bottom, rgba(124, 58, 237, 0.03) 0%, transparent 100%)" : isWknd ? "#fbfbfb" : "transparent",
                }}>
                  {/* Hour grid lines */}
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: SLOT_H, borderBottom: h % 2 === 0 ? "1px solid #f0f0f8" : "1px dashed #f5f3f9" }} />
                  ))}

                  {/* Current time indicator */}
                  {isToday && (
                    <div style={{ position: "absolute", top: nowTop, left: 0, right: 0, zIndex: 5, pointerEvents: "none" }}>
                      <div style={{ position: "relative", height: 2, background: "#ef4444" }}>
                        <div style={{ position: "absolute", left: -4, top: "50%", transform: "translateY(-50%)", width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px rgba(239,68,68,0.5)" }} />
                      </div>
                    </div>
                  )}

                  {/* Appointment blocks */}
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
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
        {Object.entries(STATUS).map(([k, cfg]) => (
          <div key={k} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 20,
            background: cfg.bg, border: `1px solid ${cfg.color}15`,
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)"
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
