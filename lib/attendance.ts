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
// "leave" is unpaid by default — there's no separate paid-leave concept here.
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

export function getAttendanceSummary(staffId: string, start: string, end: string, records?: AttendanceRecord[]): AttendanceSummary {
  const inRange = (records ?? getAttendance()).filter((r) => r.staffId === staffId && r.date >= start && r.date <= end);
  const summary = { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, markedDays: 0, creditFactor: 1 };
  let credit = 0;
  for (const r of inRange) {
    summary.markedDays++;
    credit += CREDIT_WEIGHT[r.status];
    if (r.status === "present") summary.present++;
    else if (r.status === "absent") summary.absent++;
    else if (r.status === "late") summary.late++;
    else if (r.status === "half-day") summary.halfDay++;
    else if (r.status === "leave") summary.leave++;
  }
  summary.creditFactor = summary.markedDays > 0 ? credit / summary.markedDays : 1;
  return summary;
}
