/**
 * POST /api/public/booking
 *
 * Saves a new appointment (and optionally a new/updated client) for a salon.
 * Called from the public online-booking page — no auth required.
 *
 * Body: { salonId, appointment, client? }
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";

interface ClientPayload {
  id: string;
  name: string;
  phone: string;
  gender: string;
  tags: string[];
  source: string;
  createdAt: string;
  totalVisits: number;
  totalSpend: number;
  lastVisitDate: string;
  averageRating: number;
}

interface AppointmentPayload {
  id: string;
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  serviceIds: string[];
  serviceNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount: number;
  source: string;
  notes?: string;
}

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS salon_data (
      entity     TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

export async function POST(req: NextRequest) {
  let body: { salonId: string; appointment: AppointmentPayload; client?: ClientPayload };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { salonId, appointment, client } = body;
  if (!salonId || !appointment) {
    return Response.json({ ok: false, error: "Missing salonId or appointment" }, { status: 400 });
  }

  try {
    await ensureTable();
    const now = new Date().toISOString();

    // ── Save appointment ──────────────────────────────────────────────────────
    const apptKey = `${salonId}_appointments`;
    const apptRow = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [apptKey],
    });
    const existingAppts: AppointmentPayload[] = apptRow.rows.length > 0
      ? JSON.parse(apptRow.rows[0].data as string)
      : [];

    const updatedAppts = [appointment, ...existingAppts];
    await db.execute({
      sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
      args: [apptKey, JSON.stringify(updatedAppts), now],
    });

    // ── Save / update client ──────────────────────────────────────────────────
    if (client) {
      const clientKey = `${salonId}_clients`;
      const clientRow = await db.execute({
        sql: "SELECT data FROM salon_data WHERE entity = ?",
        args: [clientKey],
      });
      let clients: ClientPayload[] = clientRow.rows.length > 0
        ? JSON.parse(clientRow.rows[0].data as string)
        : [];

      // Check if client already exists (by phone)
      const normalizedPhone = client.phone.replace(/\D/g, "");
      const existingIdx = clients.findIndex(
        (c) => c.phone.replace(/\D/g, "") === normalizedPhone
      );

      if (existingIdx >= 0) {
        // Update existing client stats
        clients[existingIdx] = {
          ...clients[existingIdx],
          totalVisits: clients[existingIdx].totalVisits + 1,
          totalSpend:  clients[existingIdx].totalSpend  + appointment.totalAmount,
          lastVisitDate: appointment.date,
        };
      } else {
        clients = [client, ...clients];
      }

      await db.execute({
        sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
        args: [clientKey, JSON.stringify(clients), now],
      });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[public/booking] error:", err);
    return Response.json({ ok: false, error: "Failed to save booking" }, { status: 500 });
  }
}
