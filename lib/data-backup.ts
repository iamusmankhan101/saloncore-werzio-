import { db } from "@/lib/db";

export type BackupReason =
  | "before-write"
  | "manual-snapshot"
  | "scheduled-snapshot"
  | "before-account-delete";

export interface SalonDataBackupRow {
  id: string;
  userId: string;
  entity: string;
  locationId: string;
  dataKind: string;
  data: string;
  recordCount: number | null;
  reason: BackupReason;
  sourceUpdatedAt: string | null;
  createdAt: string;
}

export interface DatabaseBackupArchive {
  id: string;
  reason: BackupReason;
  tableCount: number;
  totalRows: number;
  createdAt: string;
}

function backupId(): string {
  return `backup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function recordCountFor(data: string): number | null {
  try {
    const parsed = JSON.parse(data) as unknown;
    return Array.isArray(parsed) ? parsed.length : null;
  } catch {
    return null;
  }
}

export function dataKindFromEntity(entity: string): string {
  const parts = entity.split("_");
  const last = parts.at(-1) || entity;
  if (entity.endsWith("_salon_invoices")) return "salon_invoices";
  if (entity.endsWith("_loyalty_history")) return "loyalty_history";
  return last;
}

export function locationIdFromEntity(entity: string, userId: string): string {
  const suffix = entity === userId ? "" : entity.startsWith(`${userId}_`) ? entity.slice(userId.length + 1) : "";
  if (!suffix) return "main";
  const dataKind = dataKindFromEntity(entity);
  const bareKinds = new Set(["settings", "loyalty_history", "clients", "appointments", "staff", "services", "inventory", "expenses", "salon_invoices"]);
  if (bareKinds.has(suffix)) return "main";
  if (!suffix.endsWith(`_${dataKind}`)) return "main";
  const location = suffix.slice(0, -(dataKind.length + 1));
  return location || "main";
}

export async function ensureSalonDataBackupTable(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS salon_data_backups (
      id                TEXT PRIMARY KEY,
      user_id           TEXT NOT NULL,
      entity            TEXT NOT NULL,
      location_id       TEXT NOT NULL DEFAULT 'main',
      data_kind         TEXT NOT NULL,
      data              TEXT NOT NULL,
      record_count      INTEGER,
      reason            TEXT NOT NULL,
      source_updated_at TEXT,
      created_at        TEXT NOT NULL
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_salon_data_backups_user_created ON salon_data_backups (user_id, created_at DESC)`).catch(() => {});
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_salon_data_backups_entity_created ON salon_data_backups (entity, created_at DESC)`).catch(() => {});
}

function quoteSqlIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

export async function ensureDatabaseBackupTable(): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS database_backups (
      id          TEXT PRIMARY KEY,
      reason      TEXT NOT NULL,
      table_count INTEGER NOT NULL,
      total_rows  INTEGER NOT NULL,
      data        TEXT NOT NULL,
      created_at  TEXT NOT NULL
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_database_backups_created ON database_backups (created_at DESC)`).catch(() => {});
}

export async function createSalonDataBackup(input: {
  userId: string;
  entity: string;
  data: string;
  reason: BackupReason;
  sourceUpdatedAt?: string | null;
}): Promise<string> {
  await ensureSalonDataBackupTable();
  const id = backupId();
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO salon_data_backups
            (id, user_id, entity, location_id, data_kind, data, record_count, reason, source_updated_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      input.userId,
      input.entity,
      locationIdFromEntity(input.entity, input.userId),
      dataKindFromEntity(input.entity),
      input.data,
      recordCountFor(input.data),
      input.reason,
      input.sourceUpdatedAt ?? null,
      now,
    ],
  });
  return id;
}

export async function backupExistingSalonData(entity: string, userId: string, reason: BackupReason = "before-write"): Promise<string | null> {
  await ensureSalonDataBackupTable();
  const existing = await db.execute({
    sql: "SELECT data, updated_at FROM salon_data WHERE entity = ?",
    args: [entity],
  });
  if (existing.rows.length === 0) return null;
  return createSalonDataBackup({
    userId,
    entity,
    data: existing.rows[0].data as string,
    sourceUpdatedAt: (existing.rows[0].updated_at as string | undefined) ?? null,
    reason,
  });
}

export async function snapshotAllSalonData(reason: BackupReason = "manual-snapshot"): Promise<{ backupsCreated: number }> {
  await ensureSalonDataBackupTable();
  const rows = await db.execute("SELECT entity, data, updated_at FROM salon_data ORDER BY entity ASC");
  const users = await db.execute("SELECT id FROM users").catch(() => ({ rows: [] as Array<{ id: string }> }));
  const userIds = users.rows.map((row) => String(row.id)).sort((a, b) => b.length - a.length);
  let backupsCreated = 0;

  for (const row of rows.rows) {
    const entity = row.entity as string;
    const userId = userIds.find((id) => entity === id || entity.startsWith(`${id}_`)) ?? entity.split("_")[0];
    await createSalonDataBackup({
      userId,
      entity,
      data: row.data as string,
      sourceUpdatedAt: (row.updated_at as string | undefined) ?? null,
      reason,
    });
    backupsCreated++;
  }

  return { backupsCreated };
}

export async function snapshotFullDatabase(reason: BackupReason = "manual-snapshot"): Promise<DatabaseBackupArchive> {
  await ensureDatabaseBackupTable();
  const tables = await db.execute(`
    SELECT name, sql
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT IN ('database_backups')
    ORDER BY name ASC
  `);

  const archiveTables: Array<{ name: string; schema: string | null; rows: unknown[] }> = [];
  let totalRows = 0;

  for (const table of tables.rows) {
    const name = String(table.name);
    const rows = await db.execute(`SELECT * FROM ${quoteSqlIdentifier(name)}`);
    archiveTables.push({
      name,
      schema: (table.sql as string | null) ?? null,
      rows: rows.rows,
    });
    totalRows += rows.rows.length;
  }

  const id = backupId();
  const createdAt = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO database_backups (id, reason, table_count, total_rows, data, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, reason, archiveTables.length, totalRows, JSON.stringify({ tables: archiveTables }), createdAt],
  });

  return { id, reason, tableCount: archiveTables.length, totalRows, createdAt };
}

export async function snapshotSalonDataForOwner(userId: string, reason: BackupReason = "before-account-delete"): Promise<{ backupsCreated: number }> {
  await ensureSalonDataBackupTable();
  const rows = await db.execute({
    sql: "SELECT entity, data, updated_at FROM salon_data WHERE entity = ? OR entity LIKE ? ESCAPE '\\'",
    args: [userId, userId.replace(/[\\%_]/g, (c) => "\\" + c) + "\\_%"],
  });
  let backupsCreated = 0;
  for (const row of rows.rows) {
    await createSalonDataBackup({
      userId,
      entity: row.entity as string,
      data: row.data as string,
      sourceUpdatedAt: (row.updated_at as string | undefined) ?? null,
      reason,
    });
    backupsCreated++;
  }
  return { backupsCreated };
}

export async function restoreSalonDataBackup(backupIdToRestore: string): Promise<SalonDataBackupRow | null> {
  await ensureSalonDataBackupTable();
  const result = await db.execute({
    sql: `SELECT id, user_id, entity, location_id, data_kind, data, record_count, reason, source_updated_at, created_at
          FROM salon_data_backups
          WHERE id = ?`,
    args: [backupIdToRestore],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const backup: SalonDataBackupRow = {
    id: row.id as string,
    userId: row.user_id as string,
    entity: row.entity as string,
    locationId: row.location_id as string,
    dataKind: row.data_kind as string,
    data: row.data as string,
    recordCount: row.record_count == null ? null : Number(row.record_count),
    reason: row.reason as BackupReason,
    sourceUpdatedAt: (row.source_updated_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };

  await backupExistingSalonData(backup.entity, backup.userId, "before-write");
  await db.execute({
    sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
    args: [backup.entity, backup.data, new Date().toISOString()],
  });
  return backup;
}
