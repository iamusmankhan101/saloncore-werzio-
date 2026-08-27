"use client";

import { useState, useEffect, useMemo } from "react";
import { getStoredStaff } from "@/lib/storage";
import type { Staff } from "@/lib/types";
import { getActiveSection, inSection } from "@/lib/sections";
import {
  getAttendance, setAttendanceStatus, getAttendanceSummary,
  type AttendanceRecord, type AttendanceStatus,
} from "@/lib/attendance";
import PageTitle from "@/components/page-title";
import MobilePageHeader from "@/components/mobile-page-header";
import { ClipboardCheck, ChevronLeft, ChevronRight, CheckCheck } from "lucide-react";

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

  const dayStatusByStaff = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    records.forEach((r) => { if (r.date === selectedDate) map[r.staffId] = r.status; });
    return map;
  }, [records, selectedDate]);

  const month = useMemo(() => monthRange(selectedDate), [selectedDate]);
  const monthlySummaries = useMemo(
    () => staffList.map((s) => ({ staff: s, summary: getAttendanceSummary(s.id, month.start, month.end, records) })),
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
              </div>
            );
          })}
        </div>
      )}

      {/* Monthly summary */}
      {staffList.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e", marginBottom: 12 }}>{month.label} Summary</div>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr repeat(5, 0.8fr) 1fr", padding: "10px 20px", background: "#faf9fd", borderBottom: "1px solid #f0f0f5" }}>
              {["STAFF", "PRESENT", "LATE", "HALF-DAY", "ABSENT", "LEAVE", "MARKED DAYS"].map((h) => (
                <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#8e89a3", letterSpacing: "0.06em" }}>{h}</div>
              ))}
            </div>
            {monthlySummaries.map(({ staff, summary }) => (
              <div key={staff.id} style={{ display: "grid", gridTemplateColumns: "1.6fr repeat(5, 0.8fr) 1fr", padding: "12px 20px", borderBottom: "1px solid #f8f8fc", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{staff.name}</div>
                <div style={{ fontSize: 12, color: STATUS_META.present.color, fontWeight: 700 }}>{summary.present}</div>
                <div style={{ fontSize: 12, color: STATUS_META.late.color, fontWeight: 700 }}>{summary.late}</div>
                <div style={{ fontSize: 12, color: STATUS_META["half-day"].color, fontWeight: 700 }}>{summary.halfDay}</div>
                <div style={{ fontSize: 12, color: STATUS_META.absent.color, fontWeight: 700 }}>{summary.absent}</div>
                <div style={{ fontSize: 12, color: STATUS_META.leave.color, fontWeight: 700 }}>{summary.leave}</div>
                <div style={{ fontSize: 12, color: "#6b6b8a" }}>{summary.markedDays}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#b0b0c8", marginTop: 8 }}>
            This summary feeds salary pro-ration in Payouts for any staff member paid a fixed or partial salary.
          </div>
        </div>
      )}
    </div>
  );
}
