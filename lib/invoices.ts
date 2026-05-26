export type InvoiceStatus = "paid" | "unpaid" | "overdue";

export interface InvoiceItem {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;         // e.g. INV-2026-05
  userId: string;
  userName: string;
  salonName: string;
  userEmail: string;
  userPhone: string;
  planId: string;
  planName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;            // 0 for now
  total: number;
  issuedDate: string;     // YYYY-MM-DD (always 1st of month)
  dueDate: string;        // YYYY-MM-DD (7 days after issued)
  status: InvoiceStatus;
  paidDate: string | null;
}

const KEY = "werzio_invoices";

export function getInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function saveInvoices(list: Invoice[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function invoiceNumber(year: number, month: number): string {
  return `INV-${year}-${String(month).padStart(2, "0")}`;
}

function buildInvoice(
  year: number,
  month: number,
  user: { id: string; ownerName: string; salonName: string; email: string; phone: string },
  plan: { id: string; name: string; price: number },
  status: InvoiceStatus,
  paidDate: string | null,
): Invoice {
  const issuedDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const dueDate = addDays(issuedDate, 7);
  const item: InvoiceItem = {
    description: `${plan.name} Plan — Monthly Subscription`,
    qty: 1,
    unitPrice: plan.price,
    total: plan.price,
  };
  return {
    id: `${user.id}_${year}_${month}`,
    number: invoiceNumber(year, month),
    userId: user.id,
    userName: user.ownerName,
    salonName: user.salonName,
    userEmail: user.email,
    userPhone: user.phone,
    planId: plan.id,
    planName: plan.name,
    items: [item],
    subtotal: plan.price,
    tax: 0,
    total: plan.price,
    issuedDate,
    dueDate,
    status,
    paidDate,
  };
}

export const TRIAL_DAYS = 14;

/** Returns the date when the free trial ends (exclusive — first billable day). */
export function trialEndDate(startDate: string): string {
  return addDays(startDate, TRIAL_DAYS);
}

/** True if still within the 14-day free trial. */
export function isInTrial(startDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return today < trialEndDate(startDate);
}

/** Days remaining in trial (0 if expired). */
export function trialDaysLeft(startDate: string): number {
  const end = new Date(trialEndDate(startDate));
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

/**
 * Auto-generate monthly invoices starting after the 14-day free trial.
 * Skips months that already have an invoice. Marks past unpaid as "overdue".
 */
export function syncInvoices(
  user: { id: string; ownerName: string; salonName: string; email: string; phone: string },
  plan: { id: string; name: string; price: number },
  startDate: string,   // account creation / plan activation date YYYY-MM-DD
): Invoice[] {
  const existing = getInvoices();

  // Still in trial — no invoices yet
  if (isInTrial(startDate)) return existing;

  const existingIds = new Set(existing.map((i) => i.id));

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Billing starts after trial ends
  const billingStart = trialEndDate(startDate);
  const start = new Date(billingStart);

  const newInvoices: Invoice[] = [];

  let y = start.getFullYear();
  let m = start.getMonth() + 1; // 1-based

  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    const id = `${user.id}_${y}_${m}`;
    if (!existingIds.has(id)) {
      const issuedDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const dueDate = addDays(issuedDate, 7);
      let status: InvoiceStatus = "unpaid";
      if (today > dueDate) status = "overdue";
      newInvoices.push(buildInvoice(y, m, user, plan, status, null));
    }
    m++;
    if (m > 12) { m = 1; y++; }
  }

  if (newInvoices.length > 0) {
    const merged = [...newInvoices, ...existing].sort(
      (a, b) => b.issuedDate.localeCompare(a.issuedDate)
    );
    saveInvoices(merged);
    return merged;
  }

  return existing.sort((a, b) => b.issuedDate.localeCompare(a.issuedDate));
}

export function markInvoicePaid(id: string): void {
  const list = getInvoices();
  const updated = list.map((inv) =>
    inv.id === id
      ? { ...inv, status: "paid" as InvoiceStatus, paidDate: new Date().toISOString().slice(0, 10) }
      : inv
  );
  saveInvoices(updated);
}
