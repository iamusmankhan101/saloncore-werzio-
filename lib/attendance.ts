import { locationUserKey } from "./locations";
import { saveToDB } from "./turso-sync";

export type AttendanceStatus = "present" | "absent" | "late" | "half-day" | "leave";

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;        // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// How much of a working day each status counts for when pro-rating a salary.
// "leave" defaults to unpaid — a staff member's own paidLeavesPerMonth (see
// lib/types.ts) grants the first N leave days per period full credit instead;
// see the `paidLeaveAllowance` param on getAttendanceSummary below.
const CREDIT_WEIGHT: Record<AttendanceStatus, number> = {
  present: 1,
  late: 1,
  "half-day": 0.5,
  absent: 0,
  leave: 0,
};

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  /** Of the `leave` count above, how many fell within the paid allowance. */
  paidLeave: number;
  markedDays: number;
  /** Weighted credit ÷ marked days — 1 when nothing is marked (safe default: full pay). */
  creditFactor: number;
}

const KEY = "werzio_attendance";

export function getAttendance(): AttendanceRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(locationUserKey(KEY)) ?? "[]"); } catch { return []; }
}

export function saveAttendance(list: AttendanceRecord[]): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  localStorage.setItem(locationUserKey(KEY), JSON.stringify(list));
  return saveToDB("attendance", list);
}

/** Upserts the one record for (staffId, date) — a register only ever needs a single status per staff per day. */
export function setAttendanceStatus(staffId: string, date: string, status: AttendanceStatus, notes?: string): AttendanceRecord {
  const list = getAttendance();
  const now = new Date().toISOString();
  const existing = list.find((r) => r.staffId === staffId && r.date === date);
  let record: AttendanceRecord;
  if (existing) {
    record = { ...existing, status, notes: notes ?? existing.notes, updatedAt: now };
    saveAttendance(list.map((r) => (r.id === existing.id ? record : r)));
  } else {
    record = { id: crypto.randomUUID(), staffId, date, status, notes, createdAt: now, updatedAt: now };
    saveAttendance([record, ...list]);
  }
  return record;
}

export function deleteAttendanceRecord(id: string): void {
  saveAttendance(getAttendance().filter((r) => r.id !== id));
}

/**
 * @param paidLeaveAllowance How many "leave" days within this exact period count
 *   as fully paid (a staff member's `paidLeavesPerMonth`, treated as a flat
 *   per-period allowance rather than split across calendar-month boundaries,
 *   consistent with how the rest of this feature treats "the period being
 *   evaluated" as the unit, not a strict calendar month). Leaves beyond the
 *   allowance stay unpaid. Defaults to 0 (no paid leave).
 */
export function getAttendanceSummary(staffId: string, start: string, end: string, records?: AttendanceRecord[], paidLeaveAllowance = 0): AttendanceSummary {
  const inRange = (records ?? getAttendance()).filter((r) => r.staffId === staffId && r.date >= start && r.date <= end);
  const summary = { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, paidLeave: 0, markedDays: 0, creditFactor: 1 };
  let credit = 0;
  let leaveSeen = 0;
  for (const r of inRange) {
    summary.markedDays++;
    if (r.status === "leave") {
      summary.leave++;
      leaveSeen++;
      const isPaid = leaveSeen <= paidLeaveAllowance;
      if (isPaid) { summary.paidLeave++; credit += 1; }
      // unpaid leave contributes 0, same as CREDIT_WEIGHT.leave
    } else {
      credit += CREDIT_WEIGHT[r.status];
      if (r.status === "present") summary.present++;
      else if (r.status === "absent") summary.absent++;
      else if (r.status === "late") summary.late++;
      else if (r.status === "half-day") summary.halfDay++;
    }
  }
  summary.creditFactor = summary.markedDays > 0 ? credit / summary.markedDays : 1;
  return summary;
}
