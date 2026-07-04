import { locationUserKey } from "./locations";
import type { Appointment, Service, StaffPayType } from "./types";

export type PayoutStatus = "pending" | "paid";

export interface Payout {
  id: string;
  staffId: string;
  staffName: string;
  periodStart: string;   // YYYY-MM-DD
  periodEnd: string;     // YYYY-MM-DD
  payType: StaffPayType;
  /** Revenue the staff member generated in the period (commission basis; informational for salary). */
  revenueGenerated: number;
  /** Commission % snapshot at the time this payout was processed (commission only). */
  commissionRate?: number;
  /** Computed pay before adjustments — revenue × rate for commission, or baseSalary for salary. */
  baseAmount: number;
  /** Manual bonus (positive) or deduction (negative). */
  adjustment: number;
  adjustmentNote?: string;
  /** baseAmount + adjustment. */
  totalAmount: number;
  status: PayoutStatus;
  paymentMethod?: string;
  paidDate?: string;     // YYYY-MM-DD, set when marked paid
  notes?: string;
  createdAt: string;     // ISO timestamp
}

const KEY = "werzio_payouts";

export function getPayouts(): Payout[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(locationUserKey(KEY)) ?? "[]"); } catch { return []; }
}

export function savePayouts(list: Payout[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(locationUserKey(KEY), JSON.stringify(list));
}

export function addPayout(data: Omit<Payout, "id" | "createdAt">): Payout {
  const entry: Payout = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  const list = getPayouts();
  list.push(entry);
  savePayouts(list);
  return entry;
}

export function updatePayout(id: string, patch: Partial<Omit<Payout, "id" | "createdAt">>): void {
  savePayouts(getPayouts().map((p) => p.id === id ? { ...p, ...patch } : p));
}

export function deletePayout(id: string): void {
  savePayouts(getPayouts().filter((p) => p.id !== id));
}

/** The most recent paid-through date for a staff member, or null if they've never been paid out. */
export function lastPayoutEnd(staffId: string, payouts: Payout[]): string | null {
  const mine = payouts.filter((p) => p.staffId === staffId).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
  return mine[0]?.periodEnd ?? null;
}

/**
 * Revenue a staff member is credited with from one appointment. Ordinary services credit the
 * appointment's assigned staff in full; team services (Service.multiStylist) split their
 * price-weighted portion of the appointment total evenly across that service's assigned team,
 * regardless of which one staff was picked when booking.
 */
export function staffRevenueFromAppointment(appt: Appointment, staffId: string, services: Service[]): number {
  const total = appt.totalAmount ?? 0;
  const apptServices = appt.serviceIds
    .map((id) => services.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s));
  if (apptServices.length === 0) return appt.staffId === staffId ? total : 0;

  const priceSum = apptServices.reduce((sum, s) => sum + (s.price || 0), 0);
  return apptServices.reduce((credited, s) => {
    const weight = priceSum > 0 ? (s.price || 0) / priceSum : 1 / apptServices.length;
    const portion = total * weight;
    if (s.multiStylist && s.assignedStaffIds.length >= 2) {
      return s.assignedStaffIds.includes(staffId) ? credited + portion / s.assignedStaffIds.length : credited;
    }
    return appt.staffId === staffId ? credited + portion : credited;
  }, 0);
}

/** Revenue a staff member generated from completed appointments within [start, end] inclusive, splitting team-service revenue evenly among the assigned stylist team. */
export function revenueInPeriod(staffId: string, appointments: Appointment[], services: Service[], start: string, end: string): number {
  return appointments
    .filter((a) => a.status === "completed" && a.date >= start && a.date <= end)
    .reduce((sum, a) => sum + staffRevenueFromAppointment(a, staffId, services), 0);
}
