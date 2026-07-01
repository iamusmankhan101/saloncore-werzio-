/**
 * lib/billing-db.ts
 * Server-side billing state stored in Turso (SQLite).
 *
 * Billing model — 30-day rolling cycles (not calendar months):
 *   • billing_anchor  = signup_date             (invoice issued on day 1 of account)
 *   • cycle_index     = floor((today − anchor) / 30)  starting at 0
 *   • period_start    = anchor + cycle_index × 30 days
 *   • due_date        = period_start + 30 days  (30 days to pay)
 *   • overdue on      due_date                  (no extra grace)
 *   • suspended on    due_date                  (no extra grace)
 *
 * Invoice ID format : {userId}_{period_start}   e.g.  user_123_2026-05-15
 * Invoice number    : INV-{YYYYMMDD}              e.g.  INV-20260515
 */

import { db } from "@/lib/db";

// ─── Billing constants ────────────────────────────────────────────────────────
export const TRIAL_DAYS = 0;
export const BILLING_CYCLE_DAYS = 30;
export const INVOICE_DUE_DAYS = 30;
export const OVERDUE_GRACE_DAYS = 0;     // overdue immediately at due_date (day 30 from signup)
export const SUSPENSION_GRACE_DAYS = 0;  // suspend immediately at due_date

// ─── Schema ───────────────────────────────────────────────────────────────────

export async function ensureBillingTables(): Promise<void> {
  // Core tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS billing_users (
      id                TEXT PRIMARY KEY,
      email             TEXT NOT NULL,
      owner_name        TEXT NOT NULL,
      salon_name        TEXT NOT NULL,
      phone             TEXT,
      plan_id           TEXT NOT NULL,
      plan_name         TEXT NOT NULL,
      plan_price        INTEGER NOT NULL,
      trial_start       TEXT NOT NULL,
      billing_anchor    TEXT,
      suspended         INTEGER NOT NULL DEFAULT 0,
      suspension_reason TEXT,
      created_at        TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS billing_invoices (
      id                    TEXT PRIMARY KEY,
      user_id               TEXT NOT NULL,
      number                TEXT NOT NULL,
      amount                INTEGER NOT NULL,
      status                TEXT NOT NULL DEFAULT 'unpaid',
      period_start          TEXT NOT NULL DEFAULT '',
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

  // ── Migrations: add columns that may not exist in older deployments ──────────
  for (const [table, column, def] of [
    ["billing_users",    "billing_anchor",    "TEXT"],
    ["billing_invoices", "period_start",      "TEXT NOT NULL DEFAULT ''"],
  ] as const) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`)
      .catch(() => { /* column already exists — ignore */ });
  }
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
  trialStart: string;     // YYYY-MM-DD
  billingAnchor: string | null; // YYYY-MM-DD — set on first invoice, null until then
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
  periodStart: string;    // YYYY-MM-DD — start of the 30-day period
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
  notifiedIssuedAt: string | null;
  notifiedOverdueAt: string | null;
  notifiedSuspendedAt: string | null;
  createdAt: string;
}

// ─── Row → typed objects ──────────────────────────────────────────────────────

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
    billingAnchor:    (r.billing_anchor as string) ?? null,
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
    periodStart:          (r.period_start as string) ?? "",
    issuedDate:           r.issued_date as string,
    dueDate:              r.due_date as string,
    paidDate:             (r.paid_date as string) ?? null,
    notifiedIssuedAt:     (r.notified_issued_at as string) ?? null,
    notifiedOverdueAt:    (r.notified_overdue_at as string) ?? null,
    notifiedSuspendedAt:  (r.notified_suspended_at as string) ?? null,
    createdAt:            r.created_at as string,
  };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Add N days to a YYYY-MM-DD string, returns YYYY-MM-DD. */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Difference in whole days (a − b). Positive if a is later. */
function daysDiff(a: string, b: string): number {
  const ms = new Date(a + "T00:00:00Z").getTime() - new Date(b + "T00:00:00Z").getTime();
  return Math.floor(ms / 86_400_000);
}

/**
 * Compute the billing anchor: signup_date + 30 days.
 * The very first invoice is issued on this date.
 */
export function computeBillingAnchor(signupDate: string): string {
  return addDays(signupDate, TRIAL_DAYS);
}

/** Returns true if today is still within the 30-day grace period before first billing. */
export function isInTrial(signupDate: string): boolean {
  const today  = new Date().toISOString().slice(0, 10);
  const anchor = computeBillingAnchor(signupDate);
  return today < anchor;
}

/**
 * Given a billing anchor, return the period_start for the 30-day cycle that
 * contains `today`.  Returns null if today is still before the anchor.
 */
export function currentPeriodStart(anchor: string, today?: string): string | null {
  const t = today ?? new Date().toISOString().slice(0, 10);
  const elapsed = daysDiff(t, anchor);
  if (elapsed < 0) return null;                        // still in trial
  const cycleIndex = Math.floor(elapsed / BILLING_CYCLE_DAYS);
  return addDays(anchor, cycleIndex * BILLING_CYCLE_DAYS);
}

// ─── Billing Users ─────────────────────────────────────────────────────────────

export async function upsertBillingUser(
  user: Omit<BillingUser, "billingAnchor" | "suspended" | "suspensionReason" | "createdAt">
): Promise<void> {
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

/** Persist the billing_anchor once it's computed for the first time. */
async function setBillingAnchor(userId: string, anchor: string): Promise<void> {
  await db.execute({
    sql: "UPDATE billing_users SET billing_anchor = ? WHERE id = ? AND (billing_anchor IS NULL OR billing_anchor = '')",
    args: [anchor, userId],
  });
}

// ─── Billing Invoices — 30-day cycles ─────────────────────────────────────────

function invoiceId(userId: string, periodStart: string): string {
  return `${userId}_${periodStart}`;
}

function invoiceNumber(periodStart: string): string {
  // INV-YYYYMMDD  e.g. INV-20260515
  return "INV-" + periodStart.replace(/-/g, "");
}

/**
 * Idempotently create the invoice for the 30-day period that contains today.
 * Returns null if still in trial.
 */
export async function getOrCreate30DayInvoice(
  user: BillingUser
): Promise<{ invoice: BillingInvoice; created: boolean } | null> {
  const anchor = user.billingAnchor ?? computeBillingAnchor(user.trialStart);
  const periodStart = currentPeriodStart(anchor);
  if (!periodStart) return null;  // still in trial

  // Persist the anchor if not yet saved
  if (!user.billingAnchor) await setBillingAnchor(user.id, anchor);

  const id = invoiceId(user.id, periodStart);

  // Return existing invoice if already created for this period
  const existing = await db.execute({ sql: "SELECT * FROM billing_invoices WHERE id = ?", args: [id] });
  if (existing.rows.length) {
    return { invoice: rowToInvoice(existing.rows[0]), created: false };
  }

  // Create new invoice
  const dueDate = addDays(periodStart, INVOICE_DUE_DAYS);
  const now     = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO billing_invoices
            (id, user_id, number, amount, status, period_start, issued_date, due_date, created_at)
          VALUES (?, ?, ?, ?, 'unpaid', ?, ?, ?, ?)`,
    args: [id, user.id, invoiceNumber(periodStart), user.planPrice, periodStart, periodStart, dueDate, now],
  });

  const created = await db.execute({ sql: "SELECT * FROM billing_invoices WHERE id = ?", args: [id] });
  return { invoice: rowToInvoice(created.rows[0]), created: true };
}

/**
 * Get the invoice for the current 30-day cycle (if it exists).
 * Used when approving payments / unsuspending.
 */
export async function getCurrentCycleInvoice(userId: string): Promise<BillingInvoice | null> {
  // Get the user's billing anchor first
  const user = await getBillingUser(userId);
  if (!user) return null;

  const anchor = user.billingAnchor ?? computeBillingAnchor(user.trialStart);
  const periodStart = currentPeriodStart(anchor);
  if (!periodStart) return null;

  const id = invoiceId(userId, periodStart);
  const res = await db.execute({ sql: "SELECT * FROM billing_invoices WHERE id = ?", args: [id] });
  return res.rows.length ? rowToInvoice(res.rows[0]) : null;
}

/**
 * Get all invoices for a user that are unpaid/overdue (any cycle).
 */
export async function getAllUnpaidInvoicesForUser(userId: string): Promise<BillingInvoice[]> {
  const res = await db.execute({
    sql: "SELECT * FROM billing_invoices WHERE user_id = ? AND status IN ('unpaid', 'overdue') ORDER BY period_start ASC",
    args: [userId],
  });
  return res.rows.map(rowToInvoice);
}

/**
 * All invoices that are unpaid/overdue AND at least OVERDUE_GRACE_DAYS past their due_date.
 * Overdue/suspension triggers on day 40 (due_date + 3).
 * Used by the daily cron.
 */
export async function getAllUnpaidOverdueInvoices(): Promise<BillingInvoice[]> {
  const today = new Date().toISOString().slice(0, 10);
  // Only trigger if today >= due_date + OVERDUE_GRACE_DAYS
  const overdueThreshold = addDays(today, -OVERDUE_GRACE_DAYS);
  const res = await db.execute({
    sql: "SELECT * FROM billing_invoices WHERE status IN ('unpaid','overdue') AND due_date <= ?",
    args: [overdueThreshold],
  });
  return res.rows.map(rowToInvoice);
}

export async function markInvoiceOverdue(id: string): Promise<void> {
  await db.execute({
    sql: "UPDATE billing_invoices SET status = 'overdue' WHERE id = ? AND status = 'unpaid'",
    args: [id],
  });
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