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
import { activeWhatsAppCredential, type WhatsAppProviderConfig } from "@/lib/whatsapp-provider";
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
  // Drained by /api/cron/booking-queue — see that route for why this can't just
  // be sent immediately (a serverless function can't sleep for 5-7 minutes).
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wa_booking_send_queue (
      id           TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      kind         TEXT NOT NULL,
      phone        TEXT NOT NULL,
      text         TEXT NOT NULL,
      client_name  TEXT NOT NULL,
      appt_date    TEXT,
      appt_time    TEXT,
      scheduled_at TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      attempts     INTEGER NOT NULL DEFAULT 0,
      last_error   TEXT,
      created_at   TEXT NOT NULL,
      sent_at      TEXT,
      PRIMARY KEY (user_id, id)
    )
  `);
  // Older deployments may predate appt_date/appt_time — add them if missing.
  await db.execute(`ALTER TABLE wa_booking_send_queue ADD COLUMN appt_date TEXT`).catch(() => {});
  await db.execute(`ALTER TABLE wa_booking_send_queue ADD COLUMN appt_time TEXT`).catch(() => {});
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

    // A double-click on "Confirm Booking" (or a network-level retry of this exact
    // request) resubmits the same appointment.id — without this check, each
    // request still independently sends its own client confirmation + group
    // alert even when the row itself collapses to one on write.
    const isDuplicateSubmission = existingAppts.some((a) => a.id === appointment.id);
    if (!isDuplicateSubmission) {
      const updatedAppts = [appointment, ...existingAppts];
      await db.execute({
        sql: "INSERT OR REPLACE INTO salon_data (entity, data, updated_at) VALUES (?, ?, ?)",
        args: [apptKey, JSON.stringify(updatedAppts), now],
      });
    }

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
    // Skipped entirely on a duplicate submission — a resubmitted request for an
    // appointment.id already on file must not send a second confirmation/group alert.
    // clientPhone is always sent from the booking form (covers both new and returning clients)
    const phone = body.clientPhone || client?.phone || "";
    if (isDuplicateSubmission) {
      console.log(`[public/booking] Duplicate submission for appointment ${appointment.id} — skipping WhatsApp sends`);
    } else try {
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
        zaptickApiKey: settings?.wasender?.zaptickApiKey,
      };
      const autoConfirmation: boolean = settings?.wasender?.autoConfirmation !== false; // default true
      const bookingGroupJid: string = settings?.wasender?.bookingGroupJid?.trim() || "";
      const autoGroupBooking: boolean = settings?.wasender?.autoGroupBooking === true;
      const salonName: string = settings?.salon?.name || "the salon";
      const tpl = settings?.whatsapp ?? {};

      // Master "WhatsApp Automation" toggle in Account settings — when off, the
      // online-booking confirmation/group alert must stay silent too, not just
      // the dashboard scheduler and cron jobs.
      const automationEnabled = settings?.wasender?.enabled !== false;

      if (automationEnabled && activeWhatsAppCredential(providerConfig)) {
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

        // Both sends below are queued (not sent immediately) so an online booking
        // doesn't fire off a burst of WhatsApp traffic the instant it lands — same
        // 5-7 min jitter floor as every dashboard-triggered send. A serverless
        // function can't just sleep for 5-7 minutes, so /api/cron/booking-queue
        // drains this table on its own schedule instead.
        const jitterMs = () => 5 * 60_000 + Math.random() * 2 * 60_000; // 5-7 min
        async function queueBookingSend(kind: "confirmation" | "groupalert", targetPhone: string, text: string, clientNameForLog: string) {
          const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          await db.execute({
            sql: `INSERT INTO wa_booking_send_queue
                    (id, user_id, kind, phone, text, client_name, appt_date, appt_time, scheduled_at, status, attempts, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
            args: [
              id, salonId, kind, targetPhone, text, clientNameForLog,
              appointment.date, appointment.startTime,
              new Date(Date.now() + jitterMs()).toISOString(), new Date().toISOString(),
            ],
          });
        }

        // Confirmation to client — skipped up front if the appointment's start time
        // has already passed (e.g. a same-day/near-term booking whose 5-7 min queue
        // delay pushed it past its own start), same as the dashboard's confirmation
        // queue: confirming a booking that's already happened isn't useful.
        const apptAlreadyStarted = new Date(`${appointment.date}T${appointment.startTime}:00`) < new Date();
        if (phone && autoConfirmation && !apptAlreadyStarted) {
          const confirmationTpl: string =
            tpl.confirmation ||
            "Hi {{name}}, your {{service}} booking on {{date}} at {{time}} is confirmed at {{salon_name}}. We look forward to seeing you! 💜";
          const confirmText = fillTemplate(confirmationTpl, vars);
          const normalizedPhone = normalizePhone(phone);
          await queueBookingSend("confirmation", normalizedPhone, confirmText, appointment.clientName);
          console.log(`[public/booking] Queued confirmation to ${normalizedPhone}`);
        } else if (!phone) {
          console.warn("[public/booking] No phone number — skipping WhatsApp confirmation");
        } else if (apptAlreadyStarted) {
          console.log("[public/booking] Appointment time already passed — skipping WhatsApp confirmation");
        }

        // Salon group alert — respects the same "New Booking Group Alert" toggle as
        // dashboard-created bookings (previously ignored here, so it fired regardless).
        if (autoGroupBooking && providerConfig.provider === "wasender" && bookingGroupJid.endsWith("@g.us")) {
          const groupTpl: string =
            tpl.newBooking ||
            "📅 New Online Booking!\n👤 Name: {{name}}\n💇 Service: {{service}}\n📅 Date: {{date}}\n⏰ Time: {{time}}\n💰 Total: PKR {{amount}}\n\nBooked via {{salon_name}} online booking page.";
          const groupText = fillTemplate(groupTpl, vars);
          await queueBookingSend("groupalert", bookingGroupJid, groupText, "Group");
          console.log(`[public/booking] Queued group alert to ${bookingGroupJid}`);
        } else if (!autoGroupBooking) {
          console.log("[public/booking] New Booking Group Alert is disabled — skipping group alert");
        } else if (bookingGroupJid) {
          console.warn("[public/booking] bookingGroupJid is set but not a valid group JID (@g.us):", bookingGroupJid);
        } else {
          console.log("[public/booking] No group JID configured — skipping group alert");
        }

      } else if (!automationEnabled) {
        console.log("[public/booking] WhatsApp Automation is disabled — skipping confirmation");
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
