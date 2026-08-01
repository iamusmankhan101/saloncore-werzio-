/**
 * /api/cron/backup
 *
 * Creates one backup bundle per salon (all its data as a single restore
 * point) plus a complete database archive, then prunes anything past its
 * retention window (see RETENTION_DAYS in lib/data-backup.ts) so these
 * tables don't grow forever. Manual snapshots and before-account-delete
 * backups are never pruned. The old one-row-per-entity snapshotAllSalonData()
 * still runs implicitly via backupExistingSalonData() on every write
 * elsewhere in the app (the "before-write" safety net) — this cron no longer
 * duplicates that per entity, since a bundle already captures the same data
 * as one clean row per salon.
 */

import { NextRequest } from "next/server";
import { pruneOldBackups, snapshotAllSalonBundles, snapshotFullDatabase } from "@/lib/data-backup";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [salonBundles, database] = await Promise.all([
      snapshotAllSalonBundles("scheduled-snapshot"),
      snapshotFullDatabase("scheduled-snapshot"),
    ]);
    const pruned = await pruneOldBackups();
    console.log("[backup] scheduled backup complete:", { salonBundles, database, pruned });
    return Response.json({ ok: true, salonBundles, database, pruned });
  } catch (err) {
    console.error("[backup] scheduled snapshot error:", err);
    return Response.json({ ok: false, error: "Backup failed." }, { status: 500 });
  }
}
