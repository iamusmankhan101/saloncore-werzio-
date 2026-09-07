import { locationUserKey } from "./locations";
import { persistEntity } from "./turso-sync";
import { settingsStore } from "./settings-store";

export type AttendanceStatus = "present" | "absent" | "late" | "half-day" | "leave";

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;        // YYYY-MM-DD
  status: AttendanceStatus;
  /** Clock-in time, "HH:MM" 24h local. Optional — the register still works as a plain status marker. */
  checkIn?: string;
  /** Clock-out time, "HH:MM" 24h local. A value at or before checkIn is read as a shift running past midnight. */
  checkOut?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Hours in a full working day when neither the staff member nor the salon overrides it. */
export const DEFAULT_STANDARD_HOURS = 8;

function minutesFromTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/**
 * Hours between check-in and check-out, or null when either is missing/invalid.
 *
 * A check-out at or before the check-in is treated as the next day rather than a
 * negative shift — a salon closing at 01:00 is an ordinary late night, and the
 * alternative (clamping to zero) would silently wipe out a full evening's work.
 */
export function hoursWorked(record: Pick<AttendanceRecord, "checkIn" | "checkOut">): number | null {
  if (!record.checkIn || !record.checkOut) return null;
  const start = minutesFromTime(record.checkIn);
  const end = minutesFromTime(record.checkOut);
  if (start == null || end == null) return null;
  const span = end > start ? end - start : end + 24 * 60 - start;
  return span / 60;
}

/**
 * A full working day for this staff member: their own override if set, else the
 * salon-wide standard from Settings, else 8. Anything non-positive falls through
 * to the default rather than dividing pro-rated pay by zero.
 */
export function standardHoursFor(staff?: { standardHoursPerDay?: number } | null): number {
  const own = Number(staff?.standardHoursPerDay);
  if (Number.isFinite(own) && own > 0) return own;
  const salon = Number((settingsStore.attendance as { standardHoursPerDay?: number } | undefined)?.standardHoursPerDay);
  if (Number.isFinite(salon) && salon > 0) return salon;
  return DEFAULT_STANDARD_HOURS;
}

/** Current local time as "HH:MM", for the clock-in/clock-out buttons. */
export function nowTimeString(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
  /** Total hours actually clocked across days that have both a check-in and check-out. */
  hoursWorked: number;
  /** Standard hours × those same days, so the two numbers are directly comparable. */
  expectedHours: number;
  /** How many days in range had both times recorded (the rest fall back to status-only credit). */
  daysWithTimes: number;
  /** expectedHours − hoursWorked, floored at 0. Hours over the standard aren't subtracted back out. */
  shortfallHours: number;
}

const KEY = "werzio_attendance";

export function getAttendance(): AttendanceRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(locationUserKey(KEY)) ?? "[]"); } catch { return []; }
}

export function saveAttendance(list: AttendanceRecord[]): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return persistEntity("attendance", list);
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

/**
 * Upserts the check-in/check-out times for (staffId, date), leaving the status
 * alone. Recording a time on an unmarked day implies the person turned up, so a
 * new record defaults to "present" rather than forcing a second click.
 */
export function setAttendanceTimes(
  staffId: string,
  date: string,
  times: { checkIn?: string; checkOut?: string },
): AttendanceRecord {
  const list = getAttendance();
  const now = new Date().toISOString();
  const existing = list.find((r) => r.staffId === staffId && r.date === date);
  // "" clears a time; undefined leaves whatever is already stored.
  const merge = (next: string | undefined, prev: string | undefined) =>
    next === undefined ? prev : (next || undefined);
  let record: AttendanceRecord;
  if (existing) {
    record = {
      ...existing,
      checkIn: merge(times.checkIn, existing.checkIn),
      checkOut: merge(times.checkOut, existing.checkOut),
      updatedAt: now,
    };
    saveAttendance(list.map((r) => (r.id === existing.id ? record : r)));
  } else {
    record = {
      id: crypto.randomUUID(), staffId, date, status: "present",
      checkIn: times.checkIn || undefined, checkOut: times.checkOut || undefined,
      createdAt: now, updatedAt: now,
    };
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
export function getAttendanceSummary(
  staffId: string,
  start: string,
  end: string,
  records?: AttendanceRecord[],
  paidLeaveAllowance = 0,
  standardHours = DEFAULT_STANDARD_HOURS,
): AttendanceSummary {
  const inRange = (records ?? getAttendance()).filter((r) => r.staffId === staffId && r.date >= start && r.date <= end);
  const summary: AttendanceSummary = {
    present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, paidLeave: 0, markedDays: 0, creditFactor: 1,
    hoursWorked: 0, expectedHours: 0, daysWithTimes: 0, shortfallHours: 0,
  };
  const perDay = standardHours > 0 ? standardHours : DEFAULT_STANDARD_HOURS;
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
      if (r.status === "present") summary.present++;
      else if (r.status === "absent") summary.absent++;
      else if (r.status === "late") summary.late++;
      else if (r.status === "half-day") summary.halfDay++;

      // A day with both times clocked is measured, not assumed: credit becomes
      // the fraction of a standard day actually worked. Absent days are skipped
      // — a stray pair of times on a day marked absent shouldn't pay out.
      const worked = r.status === "absent" ? null : hoursWorked(r);
      if (worked != null) {
        summary.daysWithTimes++;
        summary.hoursWorked += worked;
        summary.expectedHours += perDay;
        // Capped at a full day: hours beyond the standard don't earn extra,
        // and they must not be allowed to offset another day's shortfall.
        credit += Math.min(1, worked / perDay);
      } else {
        credit += CREDIT_WEIGHT[r.status];
      }
    }
  }
  summary.creditFactor = summary.markedDays > 0 ? credit / summary.markedDays : 1;
  summary.hoursWorked = Math.round(summary.hoursWorked * 100) / 100;
  summary.shortfallHours = Math.max(0, Math.round((summary.expectedHours - summary.hoursWorked) * 100) / 100);
  return summary;
}
