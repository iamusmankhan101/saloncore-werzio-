// ─── Salon Client Invoicing ────────────────────────────────────────────────────
// These invoices are issued by the salon TO its clients (distinct from the
// platform subscription invoices in lib/invoices.ts which are issued by Salon Central
// TO the salon owner).

import type { PaymentMethod } from "@/lib/types";
import { saveToDB } from "@/lib/turso-sync";
import { locationUserKey } from "@/lib/locations";

export type SalonInvoiceStatus = "paid" | "unpaid";

export type SalonInvoiceItemType = "service" | "product";

export interface SalonInvoiceItem {
  id: string;
  type: SalonInvoiceItemType;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface SalonInvoice {
  id: string;
  number: string;           // e.g. "SI-2026-0001"
  appointmentId?: string;   // optional link to an appointment
  clientId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  staffName: string;
  items: SalonInvoiceItem[];
  subtotal: number;
  discountAmount: number;   // flat discount in PKR
  taxAmount: number;        // 0 for now; ready for future
  total: number;
  paymentMethod: PaymentMethod | "";
  date: string;             // YYYY-MM-DD
  status: SalonInvoiceStatus;
  notes?: string;
  createdAt: string;        // ISO timestamp
  source?: "pos" | "manual";
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const BASE_KEY     = "werzio_salon_invoices";
const BASE_COUNTER = "werzio_salon_invoice_counter";

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getSalonInvoices(): SalonInvoice[] {
  if (typeof window === "undefined") return [];
  try {
    const key = locationUserKey(BASE_KEY);
    const parsed = JSON.parse(localStorage.getItem(key) || "[]") as SalonInvoice[];
    let migrated = false;
    const invoices = parsed.map((invoice) => {
      if (invoice.source !== "pos" || !invoice.createdAt) return invoice;
      const createdAt = new Date(invoice.createdAt);
      if (Number.isNaN(createdAt.getTime())) return invoice;
      const utcDate = invoice.createdAt.slice(0, 10);
      const localDate = localDateKey(createdAt);
      if (invoice.date !== utcDate || invoice.date === localDate) return invoice;
      migrated = true;
      return { ...invoice, date: localDate };
    });
    if (migrated) {
      localStorage.setItem(key, JSON.stringify(invoices));
      saveToDB("salon_invoices", invoices);
    }
    return invoices;
  } catch {
    return [];
  }
}

export function saveSalonInvoices(list: SalonInvoice[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(locationUserKey(BASE_KEY), JSON.stringify(list));
    saveToDB("salon_invoices", list);
  }
}

function nextInvoiceNumber(): string {
  if (typeof window === "undefined") return "SI-0001";
  const counterKey = locationUserKey(BASE_COUNTER);
  const n = parseInt(localStorage.getItem(counterKey) || "0", 10) + 1;
  localStorage.setItem(counterKey, String(n));
  const year = new Date().getFullYear();
  return `SI-${year}-${String(n).padStart(4, "0")}`;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export function createSalonInvoice(
  draft: Omit<SalonInvoice, "id" | "number" | "createdAt">
): SalonInvoice {
  const invoice: SalonInvoice = {
    ...draft,
    id: crypto.randomUUID(),
    number: nextInvoiceNumber(),
    createdAt: new Date().toISOString(),
  };
  const list = [invoice, ...getSalonInvoices()];
  saveSalonInvoices(list);
  return invoice;
}

export function updateSalonInvoice(updated: SalonInvoice): void {
  const list = getSalonInvoices().map((inv) => (inv.id === updated.id ? updated : inv));
  saveSalonInvoices(list);
}

export function deleteSalonInvoice(id: string): void {
  saveSalonInvoices(getSalonInvoices().filter((inv) => inv.id !== id));
}

export function markSalonInvoicePaid(id: string): void {
  const list = getSalonInvoices().map((inv) =>
    inv.id === id ? { ...inv, status: "paid" as SalonInvoiceStatus } : inv
  );
  saveSalonInvoices(list);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calcTotals(
  items: SalonInvoiceItem[],
  discountAmount: number,
  taxRate = 0
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const taxAmount = Math.round((subtotal - discountAmount) * taxRate);
  const total = Math.max(0, subtotal - discountAmount + taxAmount);
  return { subtotal, taxAmount, total };
}

export function newBlankItem(): SalonInvoiceItem {
  return {
    id: crypto.randomUUID(),
    type: "service",
    description: "",
    qty: 1,
    unitPrice: 0,
    total: 0,
  };
}
