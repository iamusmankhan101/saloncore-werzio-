/**
 * GET /api/public/salon?salonId=xxx
 *
 * Returns public salon data (services, staff, settings) for the online booking page.
 * No auth required — data is public by design.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const salonId = req.nextUrl.searchParams.get("salonId");
  if (!salonId) return Response.json({ ok: false, error: "Missing salonId" }, { status: 400 });

  try {
    const [servicesRow, staffRow, settingsRow, apptRow] = await Promise.all([
      db.execute({ sql: "SELECT data FROM salon_data WHERE entity = ?", args: [`${salonId}_services`] }),
      db.execute({ sql: "SELECT data FROM salon_data WHERE entity = ?", args: [`${salonId}_staff`] }),
      db.execute({ sql: "SELECT data FROM salon_data WHERE entity = ?", args: [`${salonId}_settings`] }),
      db.execute({ sql: "SELECT data FROM salon_data WHERE entity = ?", args: [`${salonId}_appointments`] }),
    ]);

    const services    = servicesRow.rows.length    > 0 ? JSON.parse(servicesRow.rows[0].data    as string) : [];
    const staff       = staffRow.rows.length       > 0 ? JSON.parse(staffRow.rows[0].data       as string) : [];
    const settings    = settingsRow.rows.length    > 0 ? JSON.parse(settingsRow.rows[0].data    as string) : {};
    const appointments = apptRow.rows.length       > 0 ? JSON.parse(apptRow.rows[0].data        as string) : [];

    return Response.json({ ok: true, services, staff, settings, appointments });
  } catch (err) {
    console.error("[public/salon] error:", err);
    return Response.json({ ok: false, error: "Failed to load salon data" }, { status: 500 });
  }
}
