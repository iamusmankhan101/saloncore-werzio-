/**
 * lib/db-schema.ts
 * Complete database schema for Werzio salon management system
 */

import { db } from "@/lib/db";

export async function ensureAllTables(): Promise<void> {
  // ─── Users (Authentication) ────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id                TEXT PRIMARY KEY,
      email             TEXT NOT NULL UNIQUE,
      password          TEXT NOT NULL,
      owner_name        TEXT NOT NULL,
      salon_name        TEXT NOT NULL,
      phone             TEXT,
      role              TEXT NOT NULL DEFAULT 'owner',
      email_verified    INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL
    )
  `);

  // ─── Appointments ──────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS appointments (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      client_id         TEXT NOT NULL,
      staff_id          TEXT,
      service_id        TEXT,
      date              TEXT NOT NULL,
      time              TEXT NOT NULL,
      duration          INTEGER NOT NULL DEFAULT 60,
      status            TEXT NOT NULL DEFAULT 'scheduled',
      notes             TEXT,
      created_at        TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── Clients ───────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      name              TEXT NOT NULL,
      phone             TEXT NOT NULL,
      email             TEXT,
      notes             TEXT,
      total_visits      INTEGER NOT NULL DEFAULT 0,
      total_spent       INTEGER NOT NULL DEFAULT 0,
      last_visit        TEXT,
      created_at        TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── Staff ─────────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS staff (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      name              TEXT NOT NULL,
      phone             TEXT,
      email             TEXT,
      role              TEXT NOT NULL DEFAULT 'stylist',
      specialties       TEXT,
      active            INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── Services ──────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      name              TEXT NOT NULL,
      category          TEXT NOT NULL,
      price             INTEGER NOT NULL,
      duration          INTEGER NOT NULL DEFAULT 60,
      description       TEXT,
      active            INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── Products (Inventory) ──────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      name              TEXT NOT NULL,
      category          TEXT NOT NULL,
      brand             TEXT,
      sku               TEXT,
      quantity          INTEGER NOT NULL DEFAULT 0,
      low_stock_alert   INTEGER NOT NULL DEFAULT 5,
      cost_price        INTEGER NOT NULL DEFAULT 0,
      selling_price     INTEGER NOT NULL DEFAULT 0,
      supplier          TEXT,
      notes             TEXT,
      created_at        TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── Invoices ──────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      client_id         TEXT,
      invoice_number    TEXT NOT NULL,
      date              TEXT NOT NULL,
      due_date          TEXT NOT NULL,
      subtotal          INTEGER NOT NULL,
      tax               INTEGER NOT NULL DEFAULT 0,
      discount          INTEGER NOT NULL DEFAULT 0,
      total             INTEGER NOT NULL,
      status            TEXT NOT NULL DEFAULT 'unpaid',
      items             TEXT NOT NULL,
      notes             TEXT,
      created_at        TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── Settings ──────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      user_id           TEXT PRIMARY KEY,
      salon_name        TEXT NOT NULL,
      salon_phone       TEXT,
      salon_email       TEXT,
      salon_address     TEXT,
      currency          TEXT NOT NULL DEFAULT 'PKR',
      timezone          TEXT NOT NULL DEFAULT 'Asia/Karachi',
      business_hours    TEXT,
      whatsapp_enabled  INTEGER NOT NULL DEFAULT 0,
      whatsapp_token    TEXT,
      whatsapp_phone    TEXT,
      email_templates   TEXT,
      updated_at        TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── Payment Requests ──────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS payment_requests (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      user_email        TEXT NOT NULL,
      user_name         TEXT NOT NULL,
      salon_name        TEXT NOT NULL,
      plan_id           TEXT NOT NULL,
      plan_name         TEXT NOT NULL,
      amount            INTEGER NOT NULL,
      pay_method        TEXT NOT NULL,
      screenshot_url    TEXT,
      status            TEXT NOT NULL DEFAULT 'pending',
      submitted_at      TEXT NOT NULL,
      reviewed_at       TEXT,
      review_note       TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── User Plans ────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_plans (
      user_id           TEXT PRIMARY KEY,
      plan_id           TEXT NOT NULL DEFAULT 'free',
      plan_name         TEXT NOT NULL DEFAULT 'Free',
      plan_price        INTEGER NOT NULL DEFAULT 0,
      trial_start       TEXT,
      updated_at        TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // ─── Create Indexes ────────────────────────────────────────────────────────
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
    "CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date)",
    "CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_services_user_id ON services(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id)",
  ];

  for (const indexSql of indexes) {
    await db.execute(indexSql).catch(() => { /* index already exists */ });
  }

  console.log("[db-schema] ✓ All tables and indexes created");
}
