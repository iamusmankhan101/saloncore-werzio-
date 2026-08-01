/**
 * /api/cron/backup
 *
 * Creates daily restore points for salon_data plus a complete database archive,
 * then prunes anything past its retention window (see RETENTION_DAYS in
 * lib/data-backup.ts) so these tables don't grow forever. Manual snapshots and
 * before-account-delete backups are never pruned.
 */

import { NextRequest } from "next/server";
import { pruneOldBackups, snapshotAllSalonData, snapshotFullDatabase } from "@/lib/data-backup";

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
    const [salonData, database] = await Promise.all([
      snapshotAllSalonData("scheduled-snapshot"),
      snapshotFullDatabase("scheduled-snapshot"),
    ]);
    const pruned = await pruneOldBackups();
    console.log("[backup] scheduled backup complete:", { salonData, database, pruned });
    return Response.json({ ok: true, salonData, database, pruned });
  } catch (err) {
    console.error("[backup] scheduled snapshot error:", err);
    return Response.json({ ok: false, error: "Backup failed." }, { status: 500 });
  }
}
