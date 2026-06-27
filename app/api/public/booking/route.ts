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
  let body: { salonId: string; appointment: AppointmentPayload; client?: ClientPayload; clientPhone?: string };
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

    // ── Send WhatsApp messages using salon's saved templates ─────────────────
    // clientPhone is always sent from the booking form (covers both new and returning clients)
    const phone = body.clientPhone || client?.phone || "";
    try {
      const settingsRow = await db.execute({
        sql: "SELECT data FROM salon_data WHERE entity = ?",
        args: [`${salonId}_settings`],
      });
      const settings = settingsRow.rows.length > 0
        ? JSON.parse(settingsRow.rows[0].data as string)
        : {};

      const apiKey: string = settings?.wasender?.apiKey || process.env.WASENDER_API_KEY || "";
      const salonName: string = settings?.salon?.name || "the salon";
      const tpl = settings?.whatsapp ?? {};

      if (apiKey) {
        const to12h = (t: string) => {
          const [h, m] = t.split(":").map(Number);
          return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
        };
        const fillTemplate = (template: string, vars: Record<string, string>) =>
          template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");

        const vars = {
          name:       appointment.clientName,
          service:    appointment.serviceNames.join(", "),
          date:       appointment.date,
          time:       to12h(appointment.startTime),
          salon_name: salonName,
          amount:     String(appointment.totalAmount),
        };

        const toE164 = (p: string): string => {
          let d = p.replace(/\D/g, "");
          if (d.startsWith("0")) d = "92" + d.slice(1);          // 03001234567 → 923001234567
          else if (d.length === 10 && d.startsWith("3")) d = "92" + d; // 3001234567 → 923001234567
          return `+${d}`;
        };

        // Confirmation to client — use saved template or sensible fallback
        if (phone) {
          const confirmationTpl: string =
            tpl.confirmation ||
            "Hi {{name}}, your {{service}} booking on {{date}} at {{time}} is confirmed at {{salon_name}}. We look forward to seeing you! 💜";
          const confirmText = fillTemplate(confirmationTpl, vars);
          await fetch("https://www.wasenderapi.com/api/send-message", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ to: toE164(phone), text: confirmText }),
          });
        }

      }
    } catch (waErr) {
      // Non-fatal — booking is saved regardless
      console.warn("[public/booking] WhatsApp send failed:", waErr);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[public/booking] error:", err);
    return Response.json({ ok: false, error: "Failed to save booking" }, { status: 500 });
  }
}
