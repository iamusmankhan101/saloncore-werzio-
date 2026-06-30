export interface ManualCashIncome {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  createdAt: string;
}

const KEY = "werzio_cash_flow_income";

export function getManualCashIncome(): ManualCashIncome[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(locationUserKey(KEY)) ?? "[]") as ManualCashIncome[];
  } catch {
    return [];
  }
}

export function saveManualCashIncome(entries: ManualCashIncome[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(locationUserKey(KEY), JSON.stringify(entries));
}
import { locationUserKey } from "./locations";
