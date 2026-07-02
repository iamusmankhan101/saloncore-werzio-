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
import { activeWhatsAppCredential, sendWhatsAppMessage, type WhatsAppProviderConfig } from "@/lib/whatsapp-provider";
import { clientIp, rateLimit } from "@/lib/rate-limit";

interface ClientPayload {
  id: string;
  name: string;
  phone: string;
  locationId?: string;
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
  // Public + unauthenticated by design (customer self-booking), but each
  // booking triggers a real WhatsApp send and a DB write — throttle abuse.
  const limit = rateLimit("public-booking", clientIp(req), { maxAttempts: 8, windowMs: 10 * 60 * 1000, blockMs: 30 * 60 * 1000 });
  if (limit.blocked) {
    return Response.json(
      { ok: false, error: "Too many booking attempts. Please try again later.", retryAfter: limit.retryAfter },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 0) } },
    );
  }

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
        clients = [{ ...client, locationId: client.locationId || "main" }, ...clients];
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

      const providerConfig: WhatsAppProviderConfig = {
        provider: settings?.wasender?.provider || "wasender",
        apiKey: settings?.wasender?.apiKey,
        botSailorApiToken: settings?.wasender?.botSailorApiToken,
        botSailorPhoneNumberId: settings?.wasender?.botSailorPhoneNumberId,
      };
      const autoConfirmation: boolean = settings?.wasender?.autoConfirmation !== false; // default true
      const bookingGroupJid: string = settings?.wasender?.bookingGroupJid?.trim() || "";
      const autoGroupBooking: boolean = settings?.wasender?.autoGroupBooking === true;
      const salonName: string = settings?.salon?.name || "the salon";
      const tpl = settings?.whatsapp ?? {};

      if (activeWhatsAppCredential(providerConfig) || process.env.WASENDER_API_KEY || process.env.BOTSAILOR_API_TOKEN) {
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

        const normalizePhone = (p: string): string => {
          let d = p.replace(/\D/g, "");
          if (d.startsWith("0")) d = "92" + d.slice(1);
          else if (d.length === 10 && d.startsWith("3")) d = "92" + d;
          return d;
        };

        // Confirmation to client
        if (phone && autoConfirmation) {
          const confirmationTpl: string =
            tpl.confirmation ||
            "Hi {{name}}, your {{service}} booking on {{date}} at {{time}} is confirmed at {{salon_name}}. We look forward to seeing you! 💜";
          const confirmText = fillTemplate(confirmationTpl, vars);
          const normalizedPhone = normalizePhone(phone);
          console.log(`[public/booking] Sending confirmation to ${normalizedPhone}`);
          const confirmResult = await sendWhatsAppMessage(providerConfig, normalizedPhone, confirmText, { messageType: "confirmation" });
          if (!confirmResult.ok) {
            console.warn("[public/booking] WhatsApp confirmation failed:", confirmResult.status, confirmResult.errorReason);
          } else {
            console.log("[public/booking] WhatsApp confirmation sent ✓");
          }
        } else if (!phone) {
          console.warn("[public/booking] No phone number — skipping WhatsApp confirmation");
        }

        // Salon group alert — always fire for online bookings if a group JID is configured
        if (providerConfig.provider === "wasender" && bookingGroupJid.endsWith("@g.us")) {
          const groupTpl: string =
            tpl.newBooking ||
            "📅 New Online Booking!\n👤 Name: {{name}}\n💇 Service: {{service}}\n📅 Date: {{date}}\n⏰ Time: {{time}}\n💰 Total: PKR {{amount}}\n\nBooked via {{salon_name}} online booking page.";
          const groupText = fillTemplate(groupTpl, vars);
          console.log(`[public/booking] Sending group alert to ${bookingGroupJid}`);
          const groupResult = await sendWhatsAppMessage(providerConfig, bookingGroupJid, groupText, { messageType: "manual" });
          if (!groupResult.ok) {
            console.warn("[public/booking] WhatsApp group alert failed:", groupResult.status, groupResult.errorReason);
          } else {
            console.log("[public/booking] WhatsApp group alert sent ✓");
          }
        } else if (bookingGroupJid) {
          console.warn("[public/booking] bookingGroupJid is set but not a valid group JID (@g.us):", bookingGroupJid);
        } else {
          console.log("[public/booking] No group JID configured — skipping group alert");
        }

      } else {
        console.warn("[public/booking] No active WhatsApp provider credentials — skipping confirmation");
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
