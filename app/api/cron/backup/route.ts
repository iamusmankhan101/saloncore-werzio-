/**
 * /api/cron/backup
 *
 * Creates daily restore points for salon_data plus a complete database archive.
 * The salon_data backups are easy admin restores for accidental user deletes;
 * the database archive is a full-table safety net.
 */

import { NextRequest } from "next/server";
import { snapshotAllSalonData, snapshotFullDatabase } from "@/lib/data-backup";

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
    console.log("[backup] scheduled backup complete:", { salonData, database });
    return Response.json({ ok: true, salonData, database });
  } catch (err) {
    console.error("[backup] scheduled snapshot error:", err);
    return Response.json({ ok: false, error: "Backup failed." }, { status: 500 });
  }
}
