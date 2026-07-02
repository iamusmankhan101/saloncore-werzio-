import { locationUserKey } from "./locations";
import type { StaffPayType } from "./types";

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
