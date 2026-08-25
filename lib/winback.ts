/**
 * Win-back targeting — clients who haven't visited the salon in a long time.
 *
 * A "lapsed" client is one who has been in at least once but hasn't come back
 * within the salon's configured inactivity window, has no upcoming booking, and
 * hasn't opted out of WhatsApp marketing. Shared by the /api/cron/winback scan,
 * the manual "Queue Now" route, and the WhatsApp Messaging page's live count, so
 * all three agree on exactly who counts as lapsed rather than each re-deriving it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

// Hard ceiling on win-back volume. This is bulk marketing to dormant numbers —
// the send pattern most likely to get a WhatsApp number flagged — so the salon
// can dial the cap down but never up past WINBACK_DAILY_MAX. The exact number
// varies day to day inside this range (see todaysWinbackCap) rather than being
// the same round figure every morning.
export const WINBACK_DAILY_MIN = 10;
export const WINBACK_DAILY_MAX = 12;

export interface WinbackConfig {
  autoWinback: boolean;
  /** A client is lapsed once this many days have passed since their last visit. */
  daysInactive: number;
  /** Never send the same client another win-back until this many days have passed. */
  cooldownDays: number;
  discountEnabled: boolean;
  discount: string;
  /** Cap on how many win-backs a single salon sends per day — this is a bulk
   * marketing send, so it drips out over days instead of blasting the whole
   * dormant list at once. Never exceeds WINBACK_DAILY_MAX. */
  dailyLimit: number;
}

// Off by default, unlike the other automations: turning this on messages every
// dormant client the salon has ever had, so it has to be a deliberate choice by
// the owner rather than something that starts firing on its own after an update.
export const WINBACK_DEFAULTS: WinbackConfig = {
  autoWinback: false,
  daysInactive: 90,
  cooldownDays: 180,
  discountEnabled: true,
  discount: "",
  dailyLimit: WINBACK_DAILY_MAX,
};

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

/** Read the winback block out of a raw settings object (localStorage or salon_data). */
export function resolveWinbackConfig(settings: unknown): WinbackConfig {
  const raw = (settings as { winback?: Record<string, unknown> } | null)?.winback ?? {};
  return {
    autoWinback: raw.autoWinback === true,
    daysInactive: positiveNumber(raw.winbackDaysInactive, WINBACK_DEFAULTS.daysInactive),
    cooldownDays: positiveNumber(raw.winbackCooldownDays, WINBACK_DEFAULTS.cooldownDays),
    discountEnabled: raw.winbackDiscountEnabled !== false,
    discount: typeof raw.winbackDiscount === "string" ? raw.winbackDiscount : "",
    // Clamped, not just defaulted — an old saved value (or a hand-edited one)
    // must never lift the ceiling above WINBACK_DAILY_MAX.
    dailyLimit: Math.min(positiveNumber(raw.winbackDailyLimit, WINBACK_DEFAULTS.dailyLimit), WINBACK_DAILY_MAX),
  };
}

export interface WinbackClient {
  id: string;
  name: string;
  phone?: string;
  lastVisitDate?: string;
  totalVisits?: number;
  whatsappOptedOut?: boolean;
  section?: string;
}

export interface WinbackAppointment {
  clientId: string;
  date: string;
  status: string;
}

export interface LapsedClient {
  client: WinbackClient;
  /** YYYY-MM-DD of the most recent completed visit. */
  lastVisit: string;
  daysSinceVisit: number;
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function isValidDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value);
}

/**
 * The client's real last visit: the newest of the stored lastVisitDate and the
 * newest completed appointment. The stored field can lag behind (it's written by
 * whichever screen completed the visit), so neither source alone is reliable.
 */
export function effectiveLastVisit(client: WinbackClient, appointments: WinbackAppointment[]): string | undefined {
  let latest = isValidDay(client.lastVisitDate) ? client.lastVisitDate.slice(0, 10) : undefined;
  for (const appt of appointments) {
    if (appt.clientId !== client.id) continue;
    if (appt.status !== "completed") continue;
    if (!isValidDay(appt.date)) continue;
    const date = appt.date.slice(0, 10);
    if (!latest || date > latest) latest = date;
  }
  return latest;
}

/** A booking still on the calendar means they're already coming back — don't nag. */
function hasUpcomingBooking(clientId: string, appointments: WinbackAppointment[], todayKey: string): boolean {
  return appointments.some((appt) =>
    appt.clientId === clientId
    && isValidDay(appt.date)
    && appt.date.slice(0, 10) >= todayKey
    && !["completed", "cancelled", "no-show"].includes(appt.status));
}

/**
 * Everyone eligible for a win-back message, longest-absent first — so a capped
 * run reaches the clients who've been gone the longest before the rest.
 */
export function findLapsedClients(
  clients: WinbackClient[],
  appointments: WinbackAppointment[],
  daysInactive: number,
  nowMs = Date.now(),
): LapsedClient[] {
  const today = dayKey(nowMs);
  const lapsed: LapsedClient[] = [];

  for (const client of clients) {
    if (!client.phone?.trim()) continue;
    if (client.whatsappOptedOut) continue;

    const lastVisit = effectiveLastVisit(client, appointments);
    // Never visited at all — a lead, not a lapsed client. Nothing to win back.
    if (!lastVisit) continue;

    const lastVisitMs = Date.parse(`${lastVisit}T00:00:00Z`);
    if (!Number.isFinite(lastVisitMs)) continue;
    const daysSinceVisit = Math.floor((nowMs - lastVisitMs) / DAY_MS);
    if (daysSinceVisit < daysInactive) continue;

    if (hasUpcomingBooking(client.id, appointments, today)) continue;

    lapsed.push({ client, lastVisit, daysSinceVisit });
  }

  return lapsed.sort((a, b) => b.daysSinceVisit - a.daysSinceVisit);
}

// Deterministic 0-1 from a seed string, so the same salon on the same day always
// lands on the same number — the nightly cron and a manual "Queue Now" have to
// agree on today's budget without persisting it anywhere.
function hashToUnit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100_000) / 100_000;
}

/**
 * How many win-backs this salon may send today: a stable random pick inside
 * WINBACK_DAILY_MIN..MAX, further limited by whatever the salon configured. The
 * day-to-day variation matters — sending an identical round number every single
 * day is itself a bot signature.
 */
export function todaysWinbackCap(userId: string, salonDayKey: string, configuredLimit: number): number {
  const span = WINBACK_DAILY_MAX - WINBACK_DAILY_MIN + 1;
  const todaysCap = WINBACK_DAILY_MIN + Math.floor(hashToUnit(`${userId}:${salonDayKey}`) * span);
  return Math.max(1, Math.min(configuredLimit, todaysCap));
}

/** Variables available to the win-back template. */
export function winbackTemplateVars(input: {
  clientName: string;
  salonName: string;
  discount: string;
  lastVisit: string;
  daysSinceVisit: number;
}): Record<string, string> {
  return {
    name: input.clientName,
    salon_name: input.salonName,
    discount: input.discount,
    last_visit: input.lastVisit,
    days: String(input.daysSinceVisit),
  };
}
