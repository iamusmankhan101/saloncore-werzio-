/**
 * lib/auth-db.ts
 * Database-backed authentication using Turso (SQLite)
 */

import { db } from "@/lib/db";

// ─── Schema ───────────────────────────────────────────────────────────────────

export async function ensureAuthTables(): Promise<void> {
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

  // Create index for faster email lookups
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `).catch(() => { /* index already exists */ });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  password: string;
  ownerName: string;
  salonName: string;
  phone: string;
  role: "owner" | "admin";
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  ownerName: string;
  salonName: string;
  phone: string;
  role: "owner" | "admin";
  emailVerified: boolean;
  createdAt: string;
}

// ─── Row mapping ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToUser(r: any): User {
  return {
    id: r.id as string,
    email: r.email as string,
    password: r.password as string,
    ownerName: r.owner_name as string,
    salonName: r.salon_name as string,
    phone: (r.phone as string) ?? "",
    role: r.role as "owner" | "admin",
    emailVerified: (r.email_verified as number) === 1,
    createdAt: r.created_at as string,
  };
}

function withoutPassword(user: User): AuthUser {
  const { password, ...rest } = user;
  return rest;
}

// ─── User operations ──────────────────────────────────────────────────────────

export async function createUser(input: {
  email: string;
  password: string;
  ownerName: string;
  salonName: string;
  phone: string;
  role?: "owner" | "admin";
  emailVerified?: boolean;
}): Promise<AuthUser> {
  await ensureAuthTables();

  const id = "user_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  const createdAt = new Date().toISOString().split("T")[0];

  try {
    await db.execute({
      sql: `INSERT INTO users (id, email, password, owner_name, salon_name, phone, role, email_verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        input.email.trim().toLowerCase(),
        input.password,
        input.ownerName.trim(),
        input.salonName?.trim() || input.ownerName.trim(),
        input.phone?.trim() || "",
        input.role || "owner",
        input.emailVerified ? 1 : 0,
        createdAt,
      ],
    });

    const user = await getUserById(id);
    if (!user) throw new Error("Failed to create user");
    return withoutPassword(user);
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint failed")) {
      throw new Error("An account with this email already exists.");
    }
    throw err;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureAuthTables();
  const res = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [id],
  });
  return res.rows.length ? rowToUser(res.rows[0]) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await ensureAuthTables();
  const res = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email.trim().toLowerCase()],
  });
  return res.rows.length ? rowToUser(res.rows[0]) : null;
}

export async function verifyUserEmail(email: string): Promise<AuthUser> {
  await ensureAuthTables();
  
  const user = await getUserByEmail(email);
  if (!user) throw new Error("Account not found.");

  await db.execute({
    sql: "UPDATE users SET email_verified = 1 WHERE email = ?",
    args: [email.trim().toLowerCase()],
  });

  return withoutPassword({ ...user, emailVerified: true });
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, "ownerName" | "salonName" | "phone">>
): Promise<AuthUser> {
  await ensureAuthTables();

  const user = await getUserById(id);
  if (!user) throw new Error("User not found.");

  const fields: string[] = [];
  const args: any[] = [];

  if (updates.ownerName !== undefined) {
    fields.push("owner_name = ?");
    args.push(updates.ownerName.trim());
  }
  if (updates.salonName !== undefined) {
    fields.push("salon_name = ?");
    args.push(updates.salonName.trim());
  }
  if (updates.phone !== undefined) {
    fields.push("phone = ?");
    args.push(updates.phone.trim());
  }

  if (fields.length === 0) return withoutPassword(user);

  args.push(id);
  await db.execute({
    sql: `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    args,
  });

  const updated = await getUserById(id);
  if (!updated) throw new Error("Failed to update user");
  return withoutPassword(updated);
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<AuthUser> {
  const user = await getUserByEmail(email);
  if (!user) throw new Error("Invalid email or password.");
  if (user.password !== password) throw new Error("Invalid email or password.");
  if (!user.emailVerified && user.role !== "admin") {
    throw new Error("EMAIL_NOT_VERIFIED");
  }
  return withoutPassword(user);
}
