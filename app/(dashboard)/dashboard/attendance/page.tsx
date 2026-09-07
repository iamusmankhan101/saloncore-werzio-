"use client";

import { useState, useEffect, useMemo } from "react";
import { getStoredStaff } from "@/lib/storage";
import type { Staff } from "@/lib/types";
import { getActiveSection, inSection } from "@/lib/sections";
import {
  getAttendance, setAttendanceStatus, setAttendanceTimes, getAttendanceSummary,
  hoursWorked, nowTimeString, standardHoursFor,
  type AttendanceRecord, type AttendanceStatus,
} from "@/lib/attendance";
import PageTitle from "@/components/page-title";
import MobilePageHeader from "@/components/mobile-page-header";
import { ClipboardCheck, ChevronLeft, ChevronRight, CheckCheck, LogIn, LogOut, Clock } from "lucide-react";

const STATUS_META: Record<AttendanceStatus, { label: string; color: string; bg: string }> = {
  present:    { label: "Present",  color: "#059669", bg: "#ecfdf5" },
  late:       { label: "Late",     color: "#d97706", bg: "#fffbeb" },
  "half-day": { label: "Half-day", color: "#0284c7", bg: "#e0f2fe" },
  absent:     { label: "Absent",   color: "#dc2626", bg: "#fef2f2" },
  leave:      { label: "Leave",    color: "#7C3AED", bg: "#F5F3FF" },
};
const STATUS_ORDER: AttendanceStatus[] = ["present", "late", "half-day", "absent", "leave"];

function todayStr(): string { return new Date().toLocaleDateString("en-CA"); }

function monthRange(dateStr: string): { start: string; end: string; label: string } {
  const [y, m] = dateStr.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const label = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { start, end, label };
}

function fmtDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = todayStr();
  if (dateStr === today) return "Today";
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === yesterday.toLocaleDateString("en-CA")) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** 7.5 → "7h 30m", 8 → "8h". Minutes are dropped when they'd read as "0m". */
function fmtHours(hours: number): string {
  const whole = Math.floor(hours);
  const mins = Math.round((hours - whole) * 60);
  if (mins === 0) return `${whole}h`;
  if (mins === 60) return `${whole + 1}h`;
  return `${whole}h ${mins}m`;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

export default function AttendancePage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => todayStr());
  const activeSection = getActiveSection();

  useEffect(() => {
    // Strict-locked to the active dashboard section, same rule as Staff.
    setStaffList(getStoredStaff().filter((s) => s.isActive && inSection(s, activeSection)));
    setRecords(getAttendance());
  }, []);

  function refresh() { setRecords(getAttendance()); }

  function mark(staffId: string, status: AttendanceStatus) {
    setAttendanceStatus(staffId, selectedDate, status);
    refresh();
  }

  function markAllPresent() {
    staffList.forEach((s) => setAttendanceStatus(s.id, selectedDate, "present"));
    refresh();
  }

  function setTime(staffId: string, field: "checkIn" | "checkOut", value: string) {
    setAttendanceTimes(staffId, selectedDate, { [field]: value });
    refresh();
  }

  // Stamps the current clock time. Only offered for today — stamping "now" onto
  // a past date would record a time that never happened; those days are edited
  // with the time inputs instead.
  function stampNow(staffId: string, field: "checkIn" | "checkOut") {
    setAttendanceTimes(staffId, selectedDate, { [field]: nowTimeString() });
    refresh();
  }

  const dayRecordByStaff = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    records.forEach((r) => { if (r.date === selectedDate) map[r.staffId] = r; });
    return map;
  }, [records, selectedDate]);

  const dayStatusByStaff = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    records.forEach((r) => { if (r.date === selectedDate) map[r.staffId] = r.status; });
    return map;
  }, [records, selectedDate]);

  const isToday = selectedDate === todayStr();

  const month = useMemo(() => monthRange(selectedDate), [selectedDate]);
  const monthlySummaries = useMemo(
    () => staffList.map((s) => ({
      staff: s,
      summary: getAttendanceSummary(s.id, month.start, month.end, records, s.paidLeavesPerMonth ?? 0, standardHoursFor(s)),
      standardHours: standardHoursFor(s),
    })),
    [staffList, month, records],
  );

  return (
    <div className="dash-page dashboard-polish" style={{ background: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 20 }}>
      <MobilePageHeader
        title="Attendance"
        subtitle={activeSection === "all" ? `${staffList.length} active staff` : `Restricted to ${activeSection} only`}
      />

      <div className="dashboard-topbar page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <PageTitle
          icon={<ClipboardCheck size={24} />}
          title="Attendance"
          subtitle={activeSection === "all" ? `${staffList.length} active staff` : `Restricted to ${activeSection} only`}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={() => setSelectedDate((d) => shiftDate(d, -1))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e3e0eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={15} />
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 130 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>{fmtDateLabel(selectedDate)}</div>
            <input type="date" value={selectedDate} max={todayStr()} onChange={(e) => e.target.value && setSelectedDate(e.target.value)} style={{ border: "none", background: "none", fontSize: 11, color: "#9898b0", cursor: "pointer" }} />
          </div>
          <button type="button" onClick={() => setSelectedDate((d) => shiftDate(d, 1))} disabled={selectedDate >= todayStr()} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e3e0eb", background: "#fff", cursor: selectedDate >= todayStr() ? "not-allowed" : "pointer", opacity: selectedDate >= todayStr() ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={15} />
          </button>
          <button type="button" onClick={markAllPresent} disabled={staffList.length === 0} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: "none", background: "var(--accent-gradient)", color: "#fff", fontSize: 12, fontWeight: 750, cursor: staffList.length === 0 ? "not-allowed" : "pointer", opacity: staffList.length === 0 ? 0.5 : 1 }}>
            <CheckCheck size={14} /> Mark All Present
          </button>
        </div>
      </div>

      {/* Daily register */}
      {staffList.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "#b0b0c8" }}>
          <ClipboardCheck size={32} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>No active staff to mark</div>
        </div>
      ) : (
        <div className="cards-grid-auto">
          {staffList.map((s) => {
            const status = dayStatusByStaff[s.id];
            const record = dayRecordByStaff[s.id];
            const standard = standardHoursFor(s);
            const worked = record ? hoursWorked(record) : null;
            const overtime = worked != null && worked > standard;
            const short = worked != null && worked < standard;
            return (
              <div key={s.id} style={{ background: "#fff", padding: 18, display: "flex", flexDirection: "column", gap: 12, border: "1px solid #ebebf0", borderRadius: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: s.color, flexShrink: 0 }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#9898b0", textTransform: "capitalize" }}>{s.role.replace(/-/g, " ")}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {STATUS_ORDER.map((st) => {
                    const meta = STATUS_META[st];
                    const active = status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => mark(s.id, st)}
                        style={{
                          padding: "6px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 750, cursor: "pointer",
                          border: `1.5px solid ${active ? meta.color : "#e8e8f0"}`,
                          background: active ? meta.bg : "#fff",
                          color: active ? meta.color : "#9898b0",
                          transition: "all 0.12s",
                        }}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>

                {/* Clocked time — hidden for absent/leave, where hours are meaningless */}
                {status !== "absent" && status !== "leave" && (
                  <div style={{ borderTop: "1px dashed #eeeef4", paddingTop: 11, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, color: "#8e89a3" }}>
                        IN
                        <input
                          type="time"
                          value={record?.checkIn ?? ""}
                          onChange={(e) => setTime(s.id, "checkIn", e.target.value)}
                          style={{ border: "1px solid #e8e8f0", borderRadius: 7, padding: "4px 6px", fontSize: 11.5, fontWeight: 700, color: "#1a1a2e", background: "#fff" }}
                        />
                      </label>
                      {isToday && !record?.checkIn && (
                        <button type="button" onClick={() => stampNow(s.id, "checkIn")} title="Clock in now"
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 9px", borderRadius: 7, border: "1px solid #d1fae5", background: "#ecfdf5", color: "#059669", fontSize: 10.5, fontWeight: 750, cursor: "pointer" }}>
                          <LogIn size={11} /> Now
                        </button>
                      )}
                      <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, color: "#8e89a3" }}>
                        OUT
                        <input
                          type="time"
                          value={record?.checkOut ?? ""}
                          onChange={(e) => setTime(s.id, "checkOut", e.target.value)}
                          style={{ border: "1px solid #e8e8f0", borderRadius: 7, padding: "4px 6px", fontSize: 11.5, fontWeight: 700, color: "#1a1a2e", background: "#fff" }}
                        />
                      </label>
                      {isToday && record?.checkIn && !record?.checkOut && (
                        <button type="button" onClick={() => stampNow(s.id, "checkOut")} title="Clock out now"
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 9px", borderRadius: 7, border: "1px solid #fee2e2", background: "#fef2f2", color: "#dc2626", fontSize: 10.5, fontWeight: 750, cursor: "pointer" }}>
                          <LogOut size={11} /> Now
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9898b0" }}>
                      <Clock size={11} />
                      {worked == null ? (
                        <span>Standard day {fmtHours(standard)} — add both times to count hours</span>
                      ) : (
                        <>
                          <span style={{ fontWeight: 800, color: "#1a1a2e" }}>{fmtHours(worked)}</span>
                          <span>of {fmtHours(standard)}</span>
                          {short && (
                            <span style={{ padding: "1px 7px", borderRadius: 20, background: "#fffbeb", color: "#d97706", fontWeight: 750, fontSize: 10 }}>
                              {fmtHours(standard - worked)} short
                            </span>
                          )}
                          {overtime && (
                            <span style={{ padding: "1px 7px", borderRadius: 20, background: "#ecfdf5", color: "#059669", fontWeight: 750, fontSize: 10 }}>
                              +{fmtHours(worked - standard)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly summary */}
      {staffList.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e", marginBottom: 12 }}>{month.label} Summary</div>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", overflow: "hidden", overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr repeat(5, 0.7fr) 0.8fr 1.1fr 0.9fr", padding: "10px 20px", background: "#faf9fd", borderBottom: "1px solid #f0f0f5", minWidth: 780 }}>
              {["STAFF", "PRESENT", "LATE", "HALF-DAY", "ABSENT", "LEAVE", "MARKED", "HOURS", "PAY CREDIT"].map((h) => (
                <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#8e89a3", letterSpacing: "0.06em" }}>{h}</div>
              ))}
            </div>
            {monthlySummaries.map(({ staff, summary, standardHours }) => (
              <div key={staff.id} style={{ display: "grid", gridTemplateColumns: "1.6fr repeat(5, 0.7fr) 0.8fr 1.1fr 0.9fr", padding: "12px 20px", borderBottom: "1px solid #f8f8fc", alignItems: "center", minWidth: 780 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
                  {staff.name}
                  <span style={{ fontSize: 10, color: "#b0b0c8", fontWeight: 600, marginLeft: 6 }}>{fmtHours(standardHours)}/day</span>
                </div>
                <div style={{ fontSize: 12, color: STATUS_META.present.color, fontWeight: 700 }}>{summary.present}</div>
                <div style={{ fontSize: 12, color: STATUS_META.late.color, fontWeight: 700 }}>{summary.late}</div>
                <div style={{ fontSize: 12, color: STATUS_META["half-day"].color, fontWeight: 700 }}>{summary.halfDay}</div>
                <div style={{ fontSize: 12, color: STATUS_META.absent.color, fontWeight: 700 }}>{summary.absent}</div>
                <div style={{ fontSize: 12, color: STATUS_META.leave.color, fontWeight: 700 }}>{summary.leave}</div>
                <div style={{ fontSize: 12, color: "#6b6b8a" }}>{summary.markedDays}</div>
                <div style={{ fontSize: 12, color: "#6b6b8a" }}>
                  {summary.daysWithTimes === 0 ? (
                    <span style={{ color: "#c8c8d8" }}>—</span>
                  ) : (
                    <>
                      <span style={{ fontWeight: 750, color: "#1a1a2e" }}>{fmtHours(summary.hoursWorked)}</span>
                      <span style={{ color: "#b0b0c8" }}> / {fmtHours(summary.expectedHours)}</span>
                      {summary.shortfallHours > 0 && (
                        <div style={{ fontSize: 10, color: "#d97706", fontWeight: 700 }}>{fmtHours(summary.shortfallHours)} short</div>
                      )}
                    </>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 750, color: summary.creditFactor < 1 ? "#d97706" : "#059669" }}>
                  {Math.round(summary.creditFactor * 100)}%
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#b0b0c8", marginTop: 8, lineHeight: 1.6 }}>
            Pay credit feeds salary pro-ration in Payouts for any staff member paid a fixed or partial salary.
            A day with both times clocked counts as the fraction of a standard day actually worked (hours over
            the standard don&rsquo;t add extra pay); days without times fall back to their status alone.
            Change the standard day in Settings, or per person on their Staff record.
          </div>
        </div>
      )}
    </div>
  );
}
