/**
 * /api/backups
 *
 * Self-service backup/restore for a salon's own data — scoped to the caller's
 * own userId via resolveActor(), never a client-supplied id, so one salon can
 * never read or restore another salon's backups. Owner-only: managers and
 * staff share the same underlying data, but restoring is destructive enough
 * that it's kept to the account owner. Platform admin has a separate,
 * cross-salon version of this at /api/admin/backups.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveActor } from "@/lib/api-auth";
import { ensureSalonDataBackupTable, restoreSalonDataBackup, snapshotSalonDataForOwner } from "@/lib/data-backup";

export async function GET(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "owner") {
    return Response.json({ ok: false, error: "Only the salon owner can view backups." }, { status: 403 });
  }

  try {
    await ensureSalonDataBackupTable();
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") || 100), 1), 300);
    const result = await db.execute({
      sql: `SELECT id, entity, location_id, data_kind, record_count, reason, source_updated_at, created_at
            FROM salon_data_backups
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?`,
      args: [actor.userId, limit],
    });
    return Response.json({
      ok: true,
      backups: result.rows.map((row) => ({
        id: row.id,
        entity: row.entity,
        locationId: row.location_id,
        dataKind: row.data_kind,
        recordCount: row.record_count,
        reason: row.reason,
        sourceUpdatedAt: row.source_updated_at,
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    console.error("[backups] GET error:", err);
    return Response.json({ ok: false, error: "Could not load backups." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "owner") {
    return Response.json({ ok: false, error: "Only the salon owner can manage backups." }, { status: 403 });
  }

  let body: { action?: "snapshot" | "restore"; backupId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  try {
    if (body.action === "snapshot") {
      const result = await snapshotSalonDataForOwner(actor.userId, "manual-snapshot");
      return Response.json({ ok: true, ...result });
    }

    if (body.action === "restore") {
      if (!body.backupId) return Response.json({ ok: false, error: "Missing backupId." }, { status: 400 });

      // restoreSalonDataBackup() doesn't check ownership on its own — it'll
      // restore whatever id it's given — so this must confirm the backup
      // actually belongs to this salon before touching anything.
      const owned = await db.execute({
        sql: "SELECT id FROM salon_data_backups WHERE id = ? AND user_id = ?",
        args: [body.backupId, actor.userId],
      });
      if (owned.rows.length === 0) {
        return Response.json({ ok: false, error: "Backup not found." }, { status: 404 });
      }

      const restored = await restoreSalonDataBackup(body.backupId);
      if (!restored) return Response.json({ ok: false, error: "Backup not found." }, { status: 404 });
      return Response.json({
        ok: true,
        restored: {
          id: restored.id,
          entity: restored.entity,
          locationId: restored.locationId,
          dataKind: restored.dataKind,
          recordCount: restored.recordCount,
          createdAt: restored.createdAt,
        },
      });
    }

    return Response.json({ ok: false, error: "Unsupported action." }, { status: 400 });
  } catch (err) {
    console.error("[backups] POST error:", err);
    return Response.json({ ok: false, error: "Backup operation failed." }, { status: 500 });
  }
}
