/**
 * lib/billing-db.ts
 * Server-side billing state stored in Turso (SQLite).
 * This is the source of truth for the cron engine — independent of localStorage.
 */

import { db } from "@/lib/db";

// ─── Schema ───────────────────────────────────────────────────────────────────

export async function ensureBillingTables(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS billing_users (
      id               TEXT PRIMARY KEY,
      email            TEXT NOT NULL,
      owner_name       TEXT NOT NULL,
      salon_name       TEXT NOT NULL,
      phone            TEXT,
      plan_id          TEXT NOT NULL,
      plan_name        TEXT NOT NULL,
      plan_price       INTEGER NOT NULL,
      trial_start      TEXT NOT NULL,
      suspended        INTEGER NOT NULL DEFAULT 0,
      suspension_reason TEXT,
      created_at       TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS billing_invoices (
      id                    TEXT PRIMARY KEY,
      user_id               TEXT NOT NULL,
      number                TEXT NOT NULL,
      amount                INTEGER NOT NULL,
      status                TEXT NOT NULL DEFAULT 'unpaid',
      issued_date           TEXT NOT NULL,
      due_date              TEXT NOT NULL,
      paid_date             TEXT,
      notified_issued_at    TEXT,
      notified_overdue_at   TEXT,
      notified_suspended_at TEXT,
      created_at            TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES billing_users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS billing_run_log (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      mode               TEXT NOT NULL,
      run_at             TEXT NOT NULL,
      invoices_generated INTEGER DEFAULT 0,
      emails_sent        INTEGER DEFAULT 0,
      users_suspended    INTEGER DEFAULT 0
    )
  `);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BillingUser {
  id: string;
  email: string;
  ownerName: string;
  salonName: string;
  phone: string;
  planId: string;
  planName: string;
  planPrice: number;
  trialStart: string;   // YYYY-MM-DD
  suspended: boolean;
  suspensionReason: string | null;
  createdAt: string;
}

export interface BillingInvoice {
  id: string;
  userId: string;
  number: string;
  amount: number;
  status: "unpaid" | "paid" | "overdue";
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
  notifiedIssuedAt: string | null;
  notifiedOverdueAt: string | null;
  notifiedSuspendedAt: string | null;
  createdAt: string;
}

// ─── Row → typed object ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToUser(r: any): BillingUser {
  return {
    id:               r.id as string,
    email:            r.email as string,
    ownerName:        r.owner_name as string,
    salonName:        r.salon_name as string,
    phone:            (r.phone as string) ?? "",
    planId:           r.plan_id as string,
    planName:         r.plan_name as string,
    planPrice:        r.plan_price as number,
    trialStart:       r.trial_start as string,
    suspended:        (r.suspended as number) === 1,
    suspensionReason: (r.suspension_reason as string) ?? null,
    createdAt:        r.created_at as string,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToInvoice(r: any): BillingInvoice {
  return {
    id:                   r.id as string,
    userId:               r.user_id as string,
    number:               r.number as string,
    amount:               r.amount as number,
    status:               r.status as BillingInvoice["status"],
    issuedDate:           r.issued_date as string,
    dueDate:              r.due_date as string,
    paidDate:             (r.paid_date as string) ?? null,
    notifiedIssuedAt:     (r.notified_issued_at as string) ?? null,
    notifiedOverdueAt:    (r.notified_overdue_at as string) ?? null,
    notifiedSuspendedAt:  (r.notified_suspended_at as string) ?? null,
    createdAt:            r.created_at as string,
  };
}

// ─── Billing Users ─────────────────────────────────────────────────────────────

export async function upsertBillingUser(user: Omit<BillingUser, "suspended" | "suspensionReason" | "createdAt">): Promise<void> {
  await db.execute({
    sql: `
      INSERT INTO billing_users (id, email, owner_name, salon_name, phone, plan_id, plan_name, plan_price, trial_start, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email       = excluded.email,
        owner_name  = excluded.owner_name,
        salon_name  = excluded.salon_name,
        phone       = excluded.phone,
        plan_id     = excluded.plan_id,
        plan_name   = excluded.plan_name,
        plan_price  = excluded.plan_price
    `,
    args: [
      user.id, user.email, user.ownerName, user.salonName, user.phone,
      user.planId, user.planName, user.planPrice, user.trialStart,
      new Date().toISOString(),
    ],
  });
}

export async function getBillingUser(id: string): Promise<BillingUser | null> {
  const res = await db.execute({ sql: "SELECT * FROM billing_users WHERE id = ?", args: [id] });
  return res.rows.length ? rowToUser(res.rows[0]) : null;
}

export async function getAllActiveBillingUsers(): Promise<BillingUser[]> {
  const res = await db.execute("SELECT * FROM billing_users");
  return res.rows.map(rowToUser);
}

export async function suspendUser(userId: string, reason: string): Promise<void> {
  await db.execute({
    sql: "UPDATE billing_users SET suspended = 1, suspension_reason = ? WHERE id = ?",
    args: [reason, userId],
  });
}

export async function unsuspendUser(userId: string): Promise<void> {
  await db.execute({
    sql: "UPDATE billing_users SET suspended = 0, suspension_reason = NULL WHERE id = ?",
    args: [userId],
  });
}

// ─── Billing Invoices ─────────────────────────────────────────────────────────

function invoiceId(userId: string, year: number, month: number): string {
  return `${userId}_${year}_${month}`;
}

function invoiceNumber(year: number, month: number): string {
  return `INV-${year}-${String(month).padStart(2, "0")}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getOrCreateMonthlyInvoice(
  user: BillingUser, year: number, month: number
): Promise<{ invoice: BillingInvoice; created: boolean }> {
  const id = invoiceId(user.id, year, month);
  const existing = await db.execute({ sql: "SELECT * FROM billing_invoices WHERE id = ?", args: [id] });
  if (existing.rows.length) {
    return { invoice: rowToInvoice(existing.rows[0]), created: false };
  }

  const issuedDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const dueDate    = addDays(issuedDate, 7);
  const now        = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO billing_invoices (id, user_id, number, amount, status, issued_date, due_date, created_at)
          VALUES (?, ?, ?, ?, 'unpaid', ?, ?, ?)`,
    args: [id, user.id, invoiceNumber(year, month), user.planPrice, issuedDate, dueDate, now],
  });

  const created = await db.execute({ sql: "SELECT * FROM billing_invoices WHERE id = ?", args: [id] });
  return { invoice: rowToInvoice(created.rows[0]), created: true };
}

export async function getMonthlyInvoice(userId: string, year: number, month: number): Promise<BillingInvoice | null> {
  const id = invoiceId(userId, year, month);
  const res = await db.execute({ sql: "SELECT * FROM billing_invoices WHERE id = ?", args: [id] });
  return res.rows.length ? rowToInvoice(res.rows[0]) : null;
}

export async function getAllUnpaidOverdueInvoices(): Promise<BillingInvoice[]> {
  const today = new Date().toISOString().slice(0, 10);
  const res = await db.execute({
    sql: "SELECT * FROM billing_invoices WHERE status IN ('unpaid','overdue') AND due_date < ?",
    args: [today],
  });
  return res.rows.map(rowToInvoice);
}

export async function markInvoiceOverdue(id: string): Promise<void> {
  await db.execute({ sql: "UPDATE billing_invoices SET status = 'overdue' WHERE id = ? AND status = 'unpaid'", args: [id] });
}

export async function markInvoicePaidDB(invoiceId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await db.execute({
    sql: "UPDATE billing_invoices SET status = 'paid', paid_date = ? WHERE id = ?",
    args: [today, invoiceId],
  });
}

export async function stampInvoiceNotification(
  id: string,
  field: "notified_issued_at" | "notified_overdue_at" | "notified_suspended_at"
): Promise<void> {
  const now = new Date().toISOString();
  await db.execute({ sql: `UPDATE billing_invoices SET ${field} = ? WHERE id = ?`, args: [now, id] });
}

// ─── Run log ──────────────────────────────────────────────────────────────────

export async function logBillingRun(
  mode: string, invoicesGenerated: number, emailsSent: number, usersSuspended: number
): Promise<void> {
  await db.execute({
    sql: "INSERT INTO billing_run_log (mode, run_at, invoices_generated, emails_sent, users_suspended) VALUES (?, ?, ?, ?, ?)",
    args: [mode, new Date().toISOString(), invoicesGenerated, emailsSent, usersSuspended],
  });
}