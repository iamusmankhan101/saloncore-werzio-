import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyMcpToken, mcpActorFrom, blobKey, type McpKeyActor } from "@/lib/mcp-auth";
import { rateLimit } from "@/lib/rate-limit";
import { appointmentStartMs, appointmentStartHasPassed, timezoneFromSettings, type SalonHoursDay } from "@/lib/appointment-time";
import { createBooking } from "@/lib/booking";
import type { Client, Appointment, Staff, Service } from "@/lib/types";

const MAX_BOOKING_HORIZON_DAYS = 90;
const MAX_AGENT_BOOKINGS_PER_DAY = 20;

// ── shared data-access helpers ──────────────────────────────────────────────

async function ensureSalonDataTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS salon_data (
      entity     TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

async function readBlob<T>(actor: McpKeyActor, entity: string): Promise<T[]> {
  const result = await db.execute({
    sql: "SELECT data FROM salon_data WHERE entity = ?",
    args: [blobKey(actor, entity)],
  });
  if (result.rows.length === 0) return [];
  try {
    return JSON.parse(result.rows[0].data as string) as T[];
  } catch {
    return [];
  }
}

function errorContent(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

function jsonContent(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/** Per-key rate limit, checked at the top of every tool call. Returns error content if blocked, else null. */
function checkKeyRateLimit(actor: McpKeyActor) {
  const limit = rateLimit("mcp-api-key", actor.keyId, { maxAttempts: 60, windowMs: 60_000, blockMs: 5 * 60_000 });
  if (limit.blocked) {
    return errorContent(`Rate limit exceeded. Try again in ${limit.retryAfter ?? 60} seconds.`);
  }
  return null;
}

const dateStrSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date in YYYY-MM-DD format.");

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function weekdayNameForDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAY_NAMES[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
}
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

// Statuses that actually hold a real slot on the calendar — a cancelled/no-show
// appointment must not block a new booking from reusing that time.
const BLOCKING_STATUSES = new Set(["booked", "confirmed", "arrived", "in-progress", "completed"]);

async function computeAvailability(actor: McpKeyActor, date: string, staffId?: string, serviceId?: string) {
  const [settingsRows, services, staffList, appointments] = await Promise.all([
    db.execute({ sql: "SELECT data FROM salon_data WHERE entity = ?", args: [blobKey(actor, "settings")] }),
    readBlob<Service>(actor, "services"),
    readBlob<Staff>(actor, "staff"),
    readBlob<Appointment>(actor, "appointments"),
  ]);
  const settings = settingsRows.rows.length > 0 ? JSON.parse(settingsRows.rows[0].data as string) : {};
  const timezone = timezoneFromSettings(settings);
  const hours = settings?.hours as SalonHoursDay[] | undefined;

  const service = serviceId ? services.find((s) => s.id === serviceId) : undefined;
  const durationMin = service?.durationMin ?? 30;

  const today = hours?.find((h) => h.day === weekdayNameForDateStr(date));
  if (!today || !today.open) {
    return { available: false, reason: "Salon is closed that day.", staff: [] as { staffId: string; staffName: string; slots: string[] }[] };
  }

  const startMin = timeToMinutes(today.from);
  const endMin = timeToMinutes(today.to);
  const grid: string[] = [];
  for (let t = startMin; t + Math.max(durationMin, 30) <= endMin; t += 30) grid.push(minutesToTime(t));

  const candidates = staffId
    ? staffList.filter((s) => s.id === staffId)
    : staffList.filter((s) => s.isActive && (!service || service.assignedStaffIds.includes(s.id)));

  if (candidates.length === 0) {
    return { available: false, reason: staffId ? "Staff member not found." : "No eligible staff for this service.", staff: [] as { staffId: string; staffName: string; slots: string[] }[] };
  }

  const results = candidates.map((staff) => {
    const staffAppts = appointments.filter((a) => a.staffId === staff.id && a.date === date && BLOCKING_STATUSES.has(a.status));
    const busyRanges = staffAppts
      .map((a) => {
        const s = appointmentStartMs(a.date, a.startTime, timezone);
        const e = appointmentStartMs(a.date, a.endTime, timezone);
        return s != null && e != null ? [s, e] as const : null;
      })
      .filter((r): r is readonly [number, number] => r !== null);

    const slots = grid.filter((slotTime) => {
      const slotStart = appointmentStartMs(date, slotTime, timezone);
      if (slotStart == null) return false;
      const slotEnd = slotStart + durationMin * 60_000;
      return !busyRanges.some(([bs, be]) => slotStart < be && bs < slotEnd);
    });

    return { staffId: staff.id, staffName: staff.name, slots };
  });

  return { available: results.some((r) => r.slots.length > 0), reason: null as string | null, staff: results };
}

// ── MCP server + tools ───────────────────────────────────────────────────────

const baseHandler = createMcpHandler(
  (server) => {
    server.tool(
      "list_services",
      "List the salon's active services with price and duration.",
      {},
      async (_args, extra) => {
        const actor = mcpActorFrom(extra.authInfo);
        if (!actor) return errorContent("Unauthorized.");
        const limited = checkKeyRateLimit(actor);
        if (limited) return limited;

        await ensureSalonDataTable();
        const services = await readBlob<Service>(actor, "services");
        const active = services.filter((s) => s.isActive !== false).map((s) => ({
          id: s.id, name: s.name, category: s.category, durationMin: s.durationMin, price: s.price,
        }));
        return jsonContent(active);
      },
    );

    server.tool(
      "list_staff",
      "List the salon's active staff members with role and specialties.",
      {},
      async (_args, extra) => {
        const actor = mcpActorFrom(extra.authInfo);
        if (!actor) return errorContent("Unauthorized.");
        const limited = checkKeyRateLimit(actor);
        if (limited) return limited;

        await ensureSalonDataTable();
        const staff = await readBlob<Staff>(actor, "staff");
        const active = staff.filter((s) => s.isActive).map((s) => ({
          id: s.id, name: s.name, role: s.role, specialties: s.specialties,
        }));
        return jsonContent(active);
      },
    );

    server.tool(
      "find_client",
      "Search the salon's clients by name or phone number substring.",
      { query: z.string().min(1, "query is required") },
      async ({ query }, extra) => {
        const actor = mcpActorFrom(extra.authInfo);
        if (!actor) return errorContent("Unauthorized.");
        const limited = checkKeyRateLimit(actor);
        if (limited) return limited;

        await ensureSalonDataTable();
        const clients = await readBlob<Client>(actor, "clients");
        const q = query.trim().toLowerCase();
        const qDigits = q.replace(/\D/g, "");
        const matches = clients
          .filter((c) => c.name.toLowerCase().includes(q) || (qDigits && c.phone.replace(/\D/g, "").includes(qDigits)))
          .slice(0, 10)
          .map((c) => ({
            id: c.id, name: c.name, phone: c.phone, lastVisitDate: c.lastVisitDate ?? null, loyaltyPoints: c.loyaltyPoints ?? 0,
          }));
        return jsonContent(matches);
      },
    );

    server.tool(
      "check_availability",
      "Find open appointment slots for a given date, optionally narrowed to a specific staff member and/or service.",
      {
        date: dateStrSchema,
        staffId: z.string().optional(),
        serviceId: z.string().optional(),
      },
      async ({ date, staffId, serviceId }, extra) => {
        const actor = mcpActorFrom(extra.authInfo);
        if (!actor) return errorContent("Unauthorized.");
        const limited = checkKeyRateLimit(actor);
        if (limited) return limited;

        await ensureSalonDataTable();
        const result = await computeAvailability(actor, date, staffId, serviceId);
        return jsonContent(result);
      },
    );

    server.tool(
      "list_appointments",
      "List the salon's appointments for a given date (defaults to today).",
      { date: dateStrSchema.optional() },
      async ({ date }, extra) => {
        const actor = mcpActorFrom(extra.authInfo);
        if (!actor) return errorContent("Unauthorized.");
        const limited = checkKeyRateLimit(actor);
        if (limited) return limited;

        await ensureSalonDataTable();
        const [settingsRows, appointments] = await Promise.all([
          db.execute({ sql: "SELECT data FROM salon_data WHERE entity = ?", args: [blobKey(actor, "settings")] }),
          readBlob<Appointment>(actor, "appointments"),
        ]);
        const settings = settingsRows.rows.length > 0 ? JSON.parse(settingsRows.rows[0].data as string) : {};
        const timezone = timezoneFromSettings(settings);
        const targetDate = date ?? new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());

        const dayAppts = appointments
          .filter((a) => a.date === targetDate)
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((a) => ({
            id: a.id, clientName: a.clientName, staffName: a.staffName, serviceNames: a.serviceNames,
            startTime: a.startTime, endTime: a.endTime, status: a.status,
          }));
        return jsonContent({ date: targetDate, appointments: dayAppts });
      },
    );

    server.tool(
      "book_appointment",
      "Book a new appointment for a client. Provide either an existing clientId (from find_client) or a clientName/clientPhone for a new client. If staffId is omitted it's auto-assigned when exactly one eligible stylist can perform the service(s). Call check_availability first to pick an open slot.",
      {
        clientId: z.string().optional(),
        clientName: z.string().optional(),
        clientPhone: z.string().optional(),
        serviceIds: z.array(z.string()).min(1, "At least one serviceId is required."),
        staffId: z.string().optional(),
        date: dateStrSchema,
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "Expected time in HH:MM 24-hour format."),
        notes: z.string().optional(),
      },
      async ({ clientId, clientName, clientPhone, serviceIds, staffId, date, startTime, notes }, extra) => {
        const actor = mcpActorFrom(extra.authInfo);
        if (!actor) return errorContent("Unauthorized.");
        if (actor.scope !== "read_write") return errorContent("This key is read-only and cannot book appointments.");
        const limited = checkKeyRateLimit(actor);
        if (limited) return limited;

        await ensureSalonDataTable();

        const [settingsRows, services, staffList, appointments, clients] = await Promise.all([
          db.execute({ sql: "SELECT data FROM salon_data WHERE entity = ?", args: [blobKey(actor, "settings")] }),
          readBlob<Service>(actor, "services"),
          readBlob<Staff>(actor, "staff"),
          readBlob<Appointment>(actor, "appointments"),
          readBlob<Client>(actor, "clients"),
        ]);
        const settings = settingsRows.rows.length > 0 ? JSON.parse(settingsRows.rows[0].data as string) : {};
        const timezone = timezoneFromSettings(settings);
        const salonId = actor.userId;

        // ── date bounds — nothing in the app validates this today (not even the
        // human-facing form), but an unsupervised external caller needs it. ──
        if (appointmentStartHasPassed(date, startTime, timezone)) {
          return errorContent("That date/time has already passed.");
        }
        const horizonMs = appointmentStartMs(date, startTime, timezone);
        if (horizonMs != null && horizonMs - Date.now() > MAX_BOOKING_HORIZON_DAYS * 24 * 60 * 60_000) {
          return errorContent(`Bookings can't be made more than ${MAX_BOOKING_HORIZON_DAYS} days in advance.`);
        }

        // ── resolve services ──
        const selectedServices = serviceIds.map((id) => services.find((s) => s.id === id)).filter((s): s is Service => !!s);
        if (selectedServices.length !== serviceIds.length) {
          return errorContent("One or more serviceIds were not found.");
        }
        const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
        const totalAmount = selectedServices.reduce((sum, s) => sum + s.price, 0);
        const endTime = minutesToTime(timeToMinutes(startTime) + totalDuration);

        // ── resolve staff ──
        const eligibleStaff = staffList.filter((s) => s.isActive && selectedServices.every((sv) => sv.assignedStaffIds.includes(s.id)));
        let resolvedStaff: Staff | undefined;
        if (staffId) {
          resolvedStaff = eligibleStaff.find((s) => s.id === staffId);
          if (!resolvedStaff) return errorContent("staffId is not an active stylist eligible for the selected service(s).");
        } else if (eligibleStaff.length === 1) {
          resolvedStaff = eligibleStaff[0];
        } else {
          return errorContent(
            eligibleStaff.length === 0
              ? "No active staff can perform the selected service(s)."
              : `Multiple stylists can perform this — specify staffId. Options: ${eligibleStaff.map((s) => `${s.name} (${s.id})`).join(", ")}`,
          );
        }

        // ── resolve client (existing or new) ──
        let resolvedClient: Client | undefined;
        if (clientId) {
          resolvedClient = clients.find((c) => c.id === clientId);
          if (!resolvedClient) return errorContent("clientId not found.");
        } else {
          if (!clientName) return errorContent("Provide either clientId or clientName for a new client.");
          resolvedClient = {
            id: "c_agent_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            name: clientName,
            phone: clientPhone || "",
            tags: [],
            source: "agent",
            createdAt: new Date().toISOString().slice(0, 10),
            totalVisits: 0,
            totalSpend: 0,
          };
        }
        // ── idempotency: the same existing client retrying the exact same slot
        // returns the existing booking instead of erroring or double-booking —
        // an LLM caller is far more likely than a human to blindly retry an
        // ambiguous/timed-out call. Only meaningful when booking for an
        // already-known clientId — a brand-new client has no stable identity
        // across separate calls to dedupe against. ──
        const sameSlot = appointments.filter((a) => a.staffId === resolvedStaff!.id && a.date === date && a.startTime === startTime && BLOCKING_STATUSES.has(a.status));
        const existingForSameClient = clientId ? sameSlot.find((a) => a.clientId === clientId) : undefined;
        if (existingForSameClient) {
          return jsonContent({ ok: true, duplicate: true, appointment: existingForSameClient });
        }

        // ── real conflict: a different client already holds this slot ──
        if (sameSlot.length > 0) {
          const availability = await computeAvailability(actor, date, resolvedStaff.id);
          const alternatives = availability.staff[0]?.slots.slice(0, 5) ?? [];
          return errorContent(
            `${resolvedStaff.name} already has an appointment at ${startTime} on ${date}. ` +
            (alternatives.length > 0 ? `Nearby open slots: ${alternatives.join(", ")}.` : "No other slots are open that day."),
          );
        }

        // ── circuit breaker: cap MCP-sourced bookings per salon per day — this
        // is brand-new, unvalidated write logic handed to an unsupervised
        // external caller, so bound the blast radius of a runaway loop/bug. ──
        const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
        const agentBookingsToday = appointments.filter((a) => a.source === "agent" && (a.createdAt ?? "").slice(0, 10) === todayStr).length;
        if (agentBookingsToday >= MAX_AGENT_BOOKINGS_PER_DAY) {
          return errorContent("Daily limit for AI-assisted bookings reached for this salon. Please try again tomorrow or book directly.");
        }

        const appointment: Appointment = {
          id: "a_agent_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          clientId: resolvedClient.id,
          clientName: resolvedClient.name,
          staffId: resolvedStaff.id,
          staffName: resolvedStaff.name,
          serviceIds: selectedServices.map((s) => s.id),
          serviceNames: selectedServices.map((s) => s.name),
          date,
          startTime,
          endTime,
          status: "booked",
          totalAmount,
          notes,
          source: "agent",
          createdAt: new Date().toISOString(),
        };

        const result = await createBooking(salonId, appointment, clientId ? undefined : resolvedClient, clientPhone || resolvedClient.phone, "AI assistant");
        if (!result.ok) return errorContent("Failed to create the booking.");
        return jsonContent({ ok: true, duplicate: result.duplicate, appointment });
      },
    );
  },
  { serverInfo: { name: "salon-central-mcp", version: "1.0.0" } },
  { streamableHttpEndpoint: "/api/mcp", disableSse: true },
);

const handler = withMcpAuth(baseHandler, verifyMcpToken, { required: true });

export { handler as GET, handler as POST, handler as DELETE };
