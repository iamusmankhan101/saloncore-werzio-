import { getCurrentUser } from "./auth";
import { settingsStore } from "./settings-store";
import { getStoredAppointments, getStoredClients, getStoredInventory } from "./storage";
import { locationUserKey } from "./locations";
import { getWhatsAppRandomDelayMs, type WhatsAppSafetyConfig } from "./whatsapp-safety";

/**
 * Normalize a phone number to international format required by WhatsApp API.
 * e.g. "0300-1234567"  → "923001234567"
 *      "+92 300 1234567" → "923001234567"
 *      "3001234567"     → "923001234567"  (10-digit PK mobile, no leading 0)
 *      "923001234567"   → "923001234567"  (already correct)
 */
export function normalizePhone(raw: string, countryCode = "92"): string {
  let digits = raw.replace(/\D/g, "");
  // Leading 0 → replace with country code (e.g. 03001234567 → 923001234567)
  if (digits.startsWith("0")) digits = countryCode + digits.slice(1);
  // 10-digit Pakistani mobile starting with 3 (no leading 0, no country code)
  else if (digits.length === 10 && digits.startsWith("3")) digits = countryCode + digits;
  // Already has country code
  return digits;
}

/** Replace {{variable}} placeholders in a template string with actual values. */
function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export type WaMsgType = "reminder" | "confirmation" | "followup" | "cancellation" | "lowstock" | "manual" | "birthday" | "thankyou" | "newbooking";
export type WaMsgStatus = "sent" | "failed";

export interface WaLogEntry {
  id: string;
  timestamp: string;
  type: WaMsgType;
  clientName: string;
  phone: string;
  status: WaMsgStatus;
  templateId: string;
  error?: string;
}

const LOG_KEY = "werzio_wa_logs";
const MAX_LOG = 200;
const LOW_STOCK_SENT_KEY = "werzio_wa_lowstock_sent";

export function getWaLogs(): WaLogEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(locationUserKey(LOG_KEY)) || "[]"); } catch { return []; }
}

export function appendLog(entry: Omit<WaLogEntry, "id" | "timestamp">) {
  const fullEntry: WaLogEntry = {
    ...entry,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    timestamp: new Date().toISOString(),
  };
  const logs = getWaLogs();
  logs.unshift(fullEntry);
  if (logs.length > MAX_LOG) logs.length = MAX_LOG;
  localStorage.setItem(locationUserKey(LOG_KEY), JSON.stringify(logs));

  // Notify the dashboard UI so it can show a toast
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("werzio_wa_message_logged", { detail: fullEntry }));
  }

  // Persist to Turso so message history survives across devices / localStorage clears
  const user = getCurrentUser();
  if (user) {
    fetch("/api/wa/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, entry: fullEntry }),
    }).catch(() => { /* fire-and-forget — non-critical */ });
  }
}

const SENT_KEY = "werzio_wa_sent";
// Once a reminder first becomes due (crosses the salon's configured reminderHours
// window), it doesn't send on that same tick — it waits a random 0-10 min from the
// moment it was first detected as due. The offset is picked once per appointment
// and cached, so 50 reminders all due at once spread over the next few minutes
// instead of firing in the same tick, while still landing close to the configured time.
const REMINDER_JITTER_KEY = "werzio_wa_reminder_jitter"; // { [apptId]: sendAtTimestampMs }

function getReminderSendAt(apptId: string): number {
  const key = locationUserKey(REMINDER_JITTER_KEY);
  let map: Record<string, number> = {};
  try { map = JSON.parse(localStorage.getItem(key) || "{}"); } catch { /* reset below */ }
  if (map[apptId] != null) return map[apptId];
  const sendAt = Date.now() + Math.random() * 10 * 60_000; // 0-10 min from now
  map[apptId] = sendAt;
  localStorage.setItem(key, JSON.stringify(map));
  return sendAt;
}

function clearReminderSendAt(apptId: string) {
  const key = locationUserKey(REMINDER_JITTER_KEY);
  try {
    const map = JSON.parse(localStorage.getItem(key) || "{}") as Record<string, number>;
    delete map[apptId];
    localStorage.setItem(key, JSON.stringify(map));
  } catch { /* ignore */ }
}

const CONFIRM_QUEUE_KEY = "werzio_wa_confirm_queue";
const FOLLOWUP_QUEUE_KEY = "werzio_wa_followup_queue";
const CANCEL_QUEUE_KEY  = "werzio_wa_cancel_queue";
const BIRTHDAY_QUEUE_KEY = "werzio_wa_birthday_queue";
const POS_THANK_QUEUE_KEY = "werzio_wa_pos_thank_queue";
// Birthday messages carry a discount, so all of today's birthdays should never land
// in the same 4-hour block — spread across a random 6-8 hour window, chosen once
// per day (cached) so every client that day shares the same spread, not a fresh
// window recalculated on every scheduler tick.
const BIRTHDAY_SPREAD_MIN_MS = 6 * 60 * 60 * 1000;
const BIRTHDAY_SPREAD_MAX_MS = 8 * 60 * 60 * 1000;
const BIRTHDAY_SPREAD_CACHE_KEY = "werzio_wa_birthday_spread_window";

function getTodaysBirthdaySpreadWindowMs(): number {
  const todayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = locationUserKey(BIRTHDAY_SPREAD_CACHE_KEY);
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null") as { date: string; windowMs: number } | null;
    if (cached && cached.date === todayKey) return cached.windowMs;
  } catch { /* recompute below */ }

  const windowMs = Math.round(BIRTHDAY_SPREAD_MIN_MS + Math.random() * (BIRTHDAY_SPREAD_MAX_MS - BIRTHDAY_SPREAD_MIN_MS));
  localStorage.setItem(cacheKey, JSON.stringify({ date: todayKey, windowMs }));
  return windowMs;
}

function getSentLog(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(locationUserKey(SENT_KEY)) || "{}"); } catch { return {}; }
}

function markSent(key: string) {
  const log = getSentLog();
  log[key] = Date.now();
  localStorage.setItem(locationUserKey(SENT_KEY), JSON.stringify(log));
}

function alreadySent(key: string): boolean {
  return !!getSentLog()[key];
}

// Exported for one-off "has this exact thing already been sent" checks outside
// this file (e.g. the POS invoice PDF, which isn't queued/sent through here) —
// callers should namespace their own key (e.g. `invoice_${invoiceId}`) so it
// can't collide with the confirm_/followup_/cancel_/reminder_/etc. keys used above.
export { alreadySent as hasBeenSent, markSent as markAsSent };

// Initial attempt + exactly one retry — repeatedly hammering a bad number or a down
// provider is riskier than just giving up sooner, so we no longer retry more than once.
const MAX_RETRIES = 2;
const RETRY_MIN_DELAY_MS = 30 * 60_000;
const RETRY_MAX_DELAY_MS = 60 * 60_000;
function nextRetryDelayMs(): number {
  return RETRY_MIN_DELAY_MS + Math.random() * (RETRY_MAX_DELAY_MS - RETRY_MIN_DELAY_MS);
}
const SEND_RATE_LIMIT_MS = 60_000;       // WaSender free plan: 1 message per minute

// Mandatory floor between any two automated sends, independent of the optional
// WhatsApp Safety toggle and of provider — without this, disabling Safety (or using
// BotSailor/Zaptick, which have no built-in rate limit) let two different automated
// queues (e.g. a follow-up and a cancellation due in the same scheduler tick) fire
// back-to-back with no gap at all.
//
// Base pacing is a random 3-7 minutes between every message. On top of that, every
// 10th/50th/100th message gets a longer break before the next one — only the largest
// matching tier applies (e.g. message #100 gets the 60-90 min break, not all three).
function randBetween(minMs: number, maxMs: number): number {
  return minMs + Math.random() * (maxMs - minMs);
}
function minNaturalGapMs(sentSoFar: number): number {
  if (sentSoFar > 0 && sentSoFar % 100 === 0) return randBetween(60 * 60_000, 90 * 60_000);
  if (sentSoFar > 0 && sentSoFar % 50  === 0) return randBetween(30 * 60_000, 45 * 60_000);
  if (sentSoFar > 0 && sentSoFar % 10  === 0) return randBetween(10 * 60_000, 20 * 60_000);
  return randBetween(3 * 60_000, 7 * 60_000);
}

let lastSentAt = 0;
let sentCount = 0;
let schedulerRunning = false;

// Booking confirmations and the new-booking group alert are the two most
// time-sensitive, highest-visibility messages (a client/owner expects them
// within minutes of booking, not up to ~15 later), so they get their own much
// shorter 2-3 min random jitter instead of the slower general pacing floor
// above — tracked on a separate clock so they never wait on an unrelated
// bulk/marketing send (birthday, cancellation win-back) that happened to fire
// moments earlier, and vice versa.
const FAST_TIER_TYPES = new Set<WaMsgType>(["confirmation", "newbooking"]);
const FAST_JITTER_MIN_MS = 2 * 60_000;
const FAST_JITTER_MAX_MS = 3 * 60_000;
let lastFastSentAt = 0;

// The POS thank-you text (and, via posJitterMs() below, the invoice PDF — sent
// through a separate API route that has no pacing gate of its own) should reach
// the client within about a minute of the sale completing, with a small random
// jitter so the two don't fire at the exact same instant a real bot would. This
// is its own, even shorter tier than confirmations/new-booking — tracked on its
// own clock so it never waits behind either of those.
const POS_TIER_TYPES = new Set<WaMsgType>(["thankyou"]);
const POS_JITTER_MIN_MS = 5_000;   // 5 seconds
const POS_JITTER_MAX_MS = 60_000;  // 60 seconds
let lastPosSentAt = 0;

/** Random 5-60s delay for POS-transaction messages sent outside this file's own pacing gate (e.g. the invoice PDF route). */
export function posJitterMs(): number {
  return randBetween(POS_JITTER_MIN_MS, POS_JITTER_MAX_MS);
}

// ── Number warm-up ramp ──────────────────────────────────────────────────────
// Unofficial WhatsApp warm-up schedule: a brand-new number's daily send volume
// should climb gradually as it builds a sending history, never jumping from e.g.
// 20 messages one day to 1,000 the next (which is what gets numbers flagged/banned).
// The cap is a random number within that week's range, picked once per calendar
// day and cached so it doesn't change mid-day.
const WARMUP_START_KEY = "werzio_wa_warmup_start"; // first day this salon ever sent a WhatsApp message
const WARMUP_CAP_KEY   = "werzio_wa_warmup_cap";   // { date, cap } — today's chosen ceiling

function getWarmupStartDate(): string {
  const key = locationUserKey(WARMUP_START_KEY);
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(key, today);
  return today;
}

/** 1-indexed day count since the warm-up start date (start date itself = day 1). */
function daysSinceWarmupStart(startDate: string): number {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
}

function warmupTierRange(dayNum: number): [number, number] {
  if (dayNum <= 7)  return [30, 40];    // Week 1
  if (dayNum <= 14) return [40, 80];    // Week 2
  if (dayNum <= 21) return [80, 180];   // Week 3
  return [180, 300];                    // After a month
}

/** Today's warm-up daily send ceiling — random within the current week's tier, cached per calendar day. */
function getTodaysWarmupCap(): number {
  const todayKey = new Date().toISOString().slice(0, 10);
  const cacheKey = locationUserKey(WARMUP_CAP_KEY);
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null") as { date: string; cap: number } | null;
    if (cached && cached.date === todayKey) return cached.cap;
  } catch { /* recompute below */ }

  const dayNum = daysSinceWarmupStart(getWarmupStartDate());
  const [min, max] = warmupTierRange(dayNum);
  const cap = Math.round(min + Math.random() * (max - min));
  localStorage.setItem(cacheKey, JSON.stringify({ date: todayKey, cap }));
  return cap;
}

// sendAfter: unix ms timestamp — scheduler skips item until Date.now() >= sendAfter
// phone/clientName/serviceNames/date/startTime: snapshotted at enqueue time so the
// message can still send (with correct template variables) even if the appointment
// record is deleted before the delay elapses. Always preserve these via `...item`
// when requeuing for a retry — rebuilding a bare-bones object silently throws this
// safety net away, which is exactly what happened before this fix.
type QueueItem = {
  id: string; retries: number; sendAfter?: number;
  phone?: string; clientName?: string;
  serviceNames?: string[]; date?: string; startTime?: string;
};

function getQueue(storageKey: string): QueueItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(locationUserKey(storageKey)) || "[]") as (string | QueueItem)[];
    // Migrate old string[] format → {id, retries} format
    return raw.map((item) => typeof item === "string" ? { id: item, retries: 0 } : item);
  } catch { return []; }
}

function setQueue(storageKey: string, items: QueueItem[]) {
  localStorage.setItem(locationUserKey(storageKey), JSON.stringify(items));
}

/** Send a new-booking alert to the salon WhatsApp group immediately (fire-and-forget). */
export async function sendGroupBookingAlert(appt: {
  id?: string;
  clientName: string;
  serviceNames: string[];
  date: string;
  startTime: string;
  totalAmount?: number;
}): Promise<void> {
  if (typeof window === "undefined") return;

  // Scoped to this one booking — this function has no queue of its own (it fires
  // once, immediately, from the booking-creation call site), so a caller-side
  // double-invocation for the same appointment is the only way this could
  // duplicate; guard it here too rather than trusting every call site. Checked
  // synchronously up front (fails fast on a duplicate call), but only actually
  // marked sent once every validation gate below has passed — a config problem
  // (no credentials, no group linked) must not permanently block a later, valid
  // attempt for the same booking.
  const sentKey = appt.id ? `newbooking_${appt.id}` : undefined;
  if (sentKey && alreadySent(sentKey)) return;

  const ws = settingsStore.wasender as {
    provider?: string;
    apiKey: string;
    botSailorApiToken?: string;
    zaptickApiKey?: string;
    bookingGroupJid?: string;
    autoGroupBooking?: boolean;
  };

  if (ws.provider === "botsailor") { console.warn("⚠️ New Booking group alert skipped — BotSailor doesn't support sending to groups."); return; }
  if (!ws.autoGroupBooking) { console.warn("⚠️ New Booking group alert disabled — enable \"New Booking Group Alert\" in Account → WhatsApp Settings"); return; }
  const hasCredentials = ws.provider === "zaptick" ? !!ws.zaptickApiKey : !!ws.apiKey;
  if (!hasCredentials) { console.warn("⚠️ New Booking group alert skipped — no WhatsApp provider credentials set"); return; }
  if (!ws.bookingGroupJid?.endsWith("@g.us")) { console.warn("⚠️ New Booking group alert skipped — no WhatsApp group linked in Account → WhatsApp Settings"); return; }

  const tpl = (settingsStore.whatsapp as { newBooking?: string }).newBooking ||
    "📅 New Booking! {{name}} has booked {{service}} on {{date}} at {{time}} at {{salon_name}}. Total: PKR {{amount}}.";

  const salonName = settingsStore.salon.name as string;
  const text = fillTemplate(tpl, {
    ...buildVars(appt, salonName),
    amount: appt.totalAmount != null ? String(appt.totalAmount) : "",
  });

  if (sentKey) markSent(sentKey);
  await callSendApi(ws.bookingGroupJid, text, { type: "newbooking", clientName: "Group" });
}

/** Call when a new appointment is booked — sends confirmation after a random 0-5 min delay, not instantly, so every booking's confirmation doesn't land at the same moment. */
export function enqueueWhatsAppConfirmation(apptId: string) {
  if (typeof window === "undefined") return;
  const q = getQueue(CONFIRM_QUEUE_KEY);
  const appt = getStoredAppointments().find(a => a.id === apptId);
  // Never queue a confirmation for a booking that was already in the past the
  // moment it was added to the system (backdated/historical entries, bulk
  // imports, etc). This check happens once, here, at enqueue time — it does not
  // conflict with always sending an already-queued confirmation even if pacing
  // delay later nudges it slightly past a genuinely future appointment's start
  // time (see the confirmation drain loop below); that's normal processing
  // drift for a real booking, not a backdated one.
  if (appt && new Date(`${appt.date}T${appt.startTime}:00`) < new Date()) return;
  // Snapshot phone/name/service/date/time now so the message can still send with
  // the right details even if the appointment record is deleted before this fires.
  const clients = getStoredClients();
  const client = appt ? clients.find(c => c.id === appt.clientId) : undefined;
  const phone = client?.phone ? normalizePhone(client.phone) : "";
  if (!phone) return;
  // Scoped to this one booking, not the client overall — a duplicate enqueue call
  // for the *same* appointment (e.g. a double-click slipping past the form's own
  // guard) must never queue a second confirmation, but a genuinely separate
  // booking for the same client is still its own event and gets its own message.
  if (q.some((item) => item.id === apptId)) return;
  const delayMs = Math.random() * 5 * 60_000; // 0-5 minutes
  setQueue(CONFIRM_QUEUE_KEY, [...q, {
    id: apptId, retries: 0, sendAfter: Date.now() + delayMs,
    phone, clientName: appt?.clientName,
    serviceNames: appt?.serviceNames, date: appt?.date, startTime: appt?.startTime,
  }]);
}

/** Call when an appointment is marked completed — sends follow-up after the configured delay. */
export function enqueueWhatsAppFollowup(apptId: string) {
  if (typeof window === "undefined") return;
  const delayMinutes = (settingsStore.wasender as { followupDelayMinutes?: number }).followupDelayMinutes ?? 1440;
  const delayMs = delayMinutes * 60 * 1000;
  // On top of the configured base delay (24h by default), add a random 5-30 min
  // jitter so every customer's follow-up lands at a slightly different time instead
  // of everyone getting it at exactly the same clock time 24h later.
  const jitterMs = (5 + Math.random() * 25) * 60_000;
  const q = getQueue(FOLLOWUP_QUEUE_KEY);
  // Snapshot phone/name/service/date/time now so the message can still send with
  // the right details even if the appointment record is deleted before this fires
  // (this is what caused follow-ups to fail as "Unknown client" with no phone).
  const appt = getStoredAppointments().find(a => a.id === apptId);
  const clients = getStoredClients();
  const client = appt ? clients.find(c => c.id === appt.clientId) : undefined;
  const phone = client?.phone ? normalizePhone(client.phone) : "";
  if (!phone) return;
  // Scoped to this one booking, not the client overall — see enqueueWhatsAppConfirmation.
  if (q.some((item) => item.id === apptId)) return;
  setQueue(FOLLOWUP_QUEUE_KEY, [...q, {
    id: apptId, retries: 0, sendAfter: Date.now() + delayMs + jitterMs,
    phone, clientName: appt?.clientName,
    serviceNames: appt?.serviceNames, date: appt?.date, startTime: appt?.startTime,
  }]);
}

/** Call when an appointment is cancelled — sends a win-back discount message after the configured delay. */
export function enqueueWhatsAppCancellation(apptId: string) {
  if (typeof window === "undefined") return;
  const delayMinutes = (settingsStore.wasender as { cancellationDelayMinutes?: number }).cancellationDelayMinutes ?? 1440;
  const delayMs = delayMinutes * 60 * 1000;
  // On top of the configured base delay (24h by default), add a random 10-30 min
  // jitter so this win-back offer never lands at exactly the same clock-round
  // interval after every cancellation.
  const jitterMs = (10 + Math.random() * 20) * 60_000;
  const q = getQueue(CANCEL_QUEUE_KEY);
  if (!q.some((item) => item.id === apptId)) {
    // Snapshot phone + name now so the message can fire even if the appointment record is deleted
    const appt = getStoredAppointments().find(a => a.id === apptId);
    const clients = getStoredClients();
    const client = appt ? clients.find(c => c.id === appt.clientId) : undefined;
    const phone = client?.phone ? normalizePhone(client.phone) : "";
    if (!phone) return;
    setQueue(CANCEL_QUEUE_KEY, [...q, { id: apptId, retries: 0, sendAfter: Date.now() + delayMs + jitterMs, phone, clientName: appt?.clientName }]);
  }
}

/**
 * Call right after a POS sale completes — sends a short thank-you text to the
 * client, on top of (not instead of) the invoice PDF. Sent immediately (subject to
 * the same pacing gate as every other message), since the client may still be at
 * the counter. Uses "utility" intent (see callSendApi) — a courtesy thank-you tied
 * to a real, just-completed purchase, not a discount-laden marketing push.
 */
export async function sendPosThankYou(phone: string, clientName: string, invoiceId?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const ws = settingsStore.wasender as { autoPosThankYou?: boolean };
  if (ws.autoPosThankYou === false) return false;
  const tpl = (settingsStore.whatsapp as { posThankYou?: string }).posThankYou;
  if (!tpl || !phone) return false;
  // Scoped to this one invoice — the receipt view has a manual "resend" action on
  // top of the automatic send-on-sale-complete, so without this a resend would
  // also fire a second thank-you text alongside the (intentionally) resent PDF.
  const sentKey = invoiceId ? `thankyou_${invoiceId}` : undefined;
  if (sentKey && alreadySent(sentKey)) return false;
  const salonName = settingsStore.salon.name as string;
  const text = fillTemplate(tpl, { name: clientName, salon_name: salonName });
  const ok = await callSendApi(phone, text, { type: "thankyou", clientName });
  if (ok && sentKey) markSent(sentKey);
  return ok;
}

/** Queue a POS thank-you text so the scheduler can send it after the POS jitter. */
export function enqueuePosThankYou(phone: string, clientName: string, invoiceId: string): boolean {
  if (typeof window === "undefined") return false;
  const ws = settingsStore.wasender as { autoPosThankYou?: boolean };
  if (ws.autoPosThankYou === false) return false;
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || !invoiceId) return false;
  const sentKey = `thankyou_${invoiceId}`;
  if (alreadySent(sentKey)) return false;
  const queue = getQueue(POS_THANK_QUEUE_KEY);
  if (queue.some((item) => item.id === invoiceId)) return false;
  setQueue(POS_THANK_QUEUE_KEY, [...queue, {
    id: invoiceId,
    retries: 0,
    sendAfter: Date.now() + posJitterMs(),
    phone: normalizedPhone,
    clientName,
  }]);
  return true;
}

type ProviderConfig = WhatsAppSafetyConfig & {
  provider?: string;
  apiKey?: string;
  botSailorApiToken?: string;
  botSailorPhoneNumberId?: string;
  zaptickApiKey?: string;
};

// Natural, randomized pacing applied before *every* logged outcome — a successful
// send, a failed send, or an instant validation failure (missing phone, appointment
// not found, etc.) — not just real network attempts. A validation failure never
// touches the network, but if it skipped this gate it could still log at the exact
// same timestamp as a real send processed earlier in the same tick (e.g. two
// different message types landing in the log at the same minute), which looks
// exactly like an unpaced burst even though only one real message went out.
//
// Base pacing is a random 3-7 minutes between every logged item, with longer
// escalating breaks every 10th/50th/100th one (see minNaturalGapMs). This floor
// always applies regardless of the optional WhatsApp Safety toggle or provider —
// the Safety setting and WaSender's rate limit can only make the gap longer, never
// shorter. Also always runs for the very first item of a fresh page load — e.g.
// right after WhatsApp gets reconfigured with a backlog queued up while it was
// disconnected — so that backlog's first item doesn't fire instantly before pacing
// kicks in for the rest. Runs client-side via setTimeout — never inside the API
// route — so it can never block a serverless request into a platform timeout.
//
// Exception: confirmation and new-booking-group-alert messages use their own much
// shorter 2-3 min jitter (see FAST_TIER_TYPES above) instead of this slower floor.
async function applyPacingGate(providerConfig: ProviderConfig, msgType?: WaMsgType): Promise<void> {
  if (msgType && POS_TIER_TYPES.has(msgType)) {
    const targetGapMs = posJitterMs();
    const elapsedSinceLast = lastPosSentAt > 0 ? Date.now() - lastPosSentAt : 0;
    const wait = targetGapMs - elapsedSinceLast;
    if (wait > 0) await new Promise<void>((resolve) => setTimeout(resolve, wait));
    lastPosSentAt = Date.now();
    return;
  }
  if (msgType && FAST_TIER_TYPES.has(msgType)) {
    const targetGapMs = randBetween(FAST_JITTER_MIN_MS, FAST_JITTER_MAX_MS);
    const elapsedSinceLast = lastFastSentAt > 0 ? Date.now() - lastFastSentAt : 0;
    const wait = targetGapMs - elapsedSinceLast;
    if (wait > 0) await new Promise<void>((resolve) => setTimeout(resolve, wait));
    lastFastSentAt = Date.now();
    return;
  }
  const selectedProvider = providerConfig.provider ?? "wasender";
  const targetGapMs = Math.max(
    getWhatsAppRandomDelayMs(providerConfig),
    selectedProvider === "wasender" ? SEND_RATE_LIMIT_MS : 0,
    minNaturalGapMs(sentCount),
  );
  const elapsedSinceLast = lastSentAt > 0 ? Date.now() - lastSentAt : 0;
  const wait = targetGapMs - elapsedSinceLast;
  if (wait > 0) await new Promise<void>((resolve) => setTimeout(resolve, wait));
  lastSentAt = Date.now();
  sentCount += 1;
}

async function callSendApi(
  phone: string,
  text: string,
  logMeta: { type: WaMsgType; clientName: string },
): Promise<boolean> {
  if (!phone.trim()) return false;
  const providerConfig = settingsStore.wasender as WhatsAppSafetyConfig & {
    provider?: "wasender" | "botsailor" | "zaptick";
    apiKey: string;
    botSailorApiToken?: string;
    botSailorPhoneNumberId?: string;
    zaptickApiKey?: string;
  };

  await applyPacingGate(providerConfig, logMeta.type);

  // Warm-up ramp: never let today's effective daily limit exceed the number's
  // warm-up ceiling, even if the salon's own Safety setting allows more.
  const warmupCap = getTodaysWarmupCap();
  const effectiveDailyLimit = Math.min(providerConfig.dailySendLimit ?? warmupCap, warmupCap);

  // Intent drives which safety rules apply (see checkWhatsAppSafety):
  //   marketing → quiet hours + opt-in required + daily/recipient caps
  //   utility   → none of the above (still paced, still capped by daily send limit)
  //   internal  → owner-facing alerts, no client-safety rules at all
  // Follow-ups are transactional (thank-you/feedback), not a promotional discount
  // push like birthday/cancellation offers, so they stay in "utility" — no quiet
  // hours, no hard opt-in block (opt-in is only *recommended* for these, not
  // enforced).
  const messageIntent =
    logMeta.type === "lowstock" ? "internal"
    : ["cancellation", "birthday"].includes(logMeta.type) ? "marketing"
    : "utility";

  // Real per-client opt-out status — without this, blockMarketingWithoutOptIn in
  // Account → WhatsApp Safety has nothing to check against and never actually blocks
  // anything. undefined (client not found) is treated as "unknown", not opted out,
  // so marketing sends aren't blocked for phone numbers we can't match to a client.
  const matchedClient = getStoredClients().find((c) => c.phone && normalizePhone(c.phone) === phone);
  const recipientOptedIn = matchedClient ? !matchedClient.whatsappOptedOut : undefined;

  let ok = false;
  let errorReason: string | undefined;
  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...providerConfig,
        dailySendLimit: effectiveDailyLimit,
        phone,
        text,
        messageIntent,
        messageType: logMeta.type,
        recipientOptedIn,
      }),
    });
    const data = await res.json() as { ok?: boolean; errorReason?: string };
    ok = data.ok === true;
    if (!ok) errorReason = data.errorReason || `HTTP ${res.status}`;
  } catch (err) {
    ok = false;
    errorReason = String(err);
  }
  appendLog({ type: logMeta.type, clientName: logMeta.clientName, phone, status: ok ? "sent" : "failed", templateId: "direct", error: errorReason });
  return ok;
}

function to12h(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

function buildVars(appt: {
  clientName: string;
  serviceNames: string[];
  date: string;
  startTime: string;
}, salonName: string): Record<string, string> {
  return {
    name: appt.clientName,
    service: appt.serviceNames[0] || "",
    date: appt.date,
    time: to12h(appt.startTime),
    salon_name: salonName,
  };
}

const BIRTHDAY_SENT_KEY = "werzio_wa_birthday_sent";

function birthdaySpreadDelay(index: number, total: number): number {
  const safeTotal = Math.max(1, total);
  const slotMs = getTodaysBirthdaySpreadWindowMs() / safeTotal;
  return Math.floor(index * slotMs + Math.random() * slotMs);
}

/**
 * Client-side birthday check — runs as part of the scheduler loop.
 * The server-side cron (/api/cron/birthday) is the primary mechanism;
 * this acts as a same-day backup when the dashboard is open.
 */
export async function checkBirthdayReminders(force = false, queueNewBirthdays = true): Promise<void> {
  if (typeof window === "undefined") return;

  const ws = settingsStore.wasender as { provider?: string; apiKey: string; botSailorApiToken?: string; autoReminder: boolean };
  const bd = settingsStore.birthday as {
    autoBirthday: boolean;
    birthdayDiscountEnabled?: boolean;
    birthdayDiscount: string;
  };

  if (!force && !bd.autoBirthday) return;
  if (!force && !(ws.provider === "botsailor" ? ws.botSailorApiToken : ws.apiKey)) return;

  const birthdayTemplate = (settingsStore.whatsapp as { birthday: string; birthdayNoDiscount?: string })[
    bd.birthdayDiscountEnabled === false ? "birthdayNoDiscount" : "birthday"
  ] || (settingsStore.whatsapp as { birthday: string }).birthday;
  if (!birthdayTemplate) return;

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const year = String(today.getFullYear());

  const sent: Record<string, string> = (() => {
    try { return JSON.parse(localStorage.getItem(locationUserKey(BIRTHDAY_SENT_KEY)) || "{}"); } catch { return {}; }
  })();

  const clients = getStoredClients();
  const salonName = settingsStore.salon.name as string;
  const birthdayClients = clients.filter((client) => {
    if (!client.dob || !client.phone) return false;
    const [, dobMonth, dobDay] = client.dob.split("-").map(Number);
    return dobMonth === today.getMonth() + 1 && dobDay === today.getDate();
  });
  const birthdayQueue = getQueue(BIRTHDAY_QUEUE_KEY);
  const queuedIds = new Set(birthdayQueue.map((item) => item.id));
  const newQueueItems: QueueItem[] = [];
  let scheduleIndex = 0;

  if (queueNewBirthdays) {
    for (const client of birthdayClients) {
      const sentKey = `${client.id}_${year}`;
      if (sent[sentKey]) continue;
      if (queuedIds.has(client.id)) continue;

      const phone = normalizePhone(client.phone);
      if (!phone) continue;
      newQueueItems.push({
        id: client.id,
        retries: 0,
        sendAfter: Date.now() + birthdaySpreadDelay(scheduleIndex, birthdayClients.length),
        phone,
        clientName: client.name,
      });
      scheduleIndex++;
    }
    if (newQueueItems.length > 0) {
      setQueue(BIRTHDAY_QUEUE_KEY, [...birthdayQueue, ...newQueueItems]);
    }
  }

  const queue = getQueue(BIRTHDAY_QUEUE_KEY);
  const remaining: QueueItem[] = [];
  let sentOneThisTick = false;
  for (const item of queue) {
    if (item.sendAfter && Date.now() < item.sendAfter) { remaining.push(item); continue; }
    const client = clients.find((candidate) => candidate.id === item.id);
    const clientName = client?.name ?? item.clientName ?? "there";
    const phone = item.phone ?? (client?.phone ? normalizePhone(client.phone) : "");
    const sentKey = `${item.id}_${year}`;
    if (sent[sentKey]) continue;
    if (!phone) {
      continue;
    }

    if (sentOneThisTick) {
      remaining.push({ ...item, sendAfter: Date.now() + 10 * 60 * 1000 });
      continue;
    }

    const text = fillTemplate(birthdayTemplate, {
      name: clientName,
      salon_name: salonName,
      discount: bd.birthdayDiscountEnabled === false ? "" : (bd.birthdayDiscount || "a special treat"),
    });

    console.log(`Birthday wish queued → ${clientName} (${phone})`);
    const ok = await callSendApi(phone, text, { type: "birthday", clientName });
    sentOneThisTick = true;

    if (ok) {
      sent[sentKey] = todayKey;
      localStorage.setItem(locationUserKey(BIRTHDAY_SENT_KEY), JSON.stringify(sent));
    } else if (item.retries < MAX_RETRIES - 1) {
      remaining.push({ ...item, retries: item.retries + 1, sendAfter: Date.now() + nextRetryDelayMs() });
    }
  }
  setQueue(BIRTHDAY_QUEUE_KEY, remaining);
}

export async function runWhatsAppScheduler(): Promise<void> {
  if (typeof window === "undefined") return;
  if (schedulerRunning) return;
  schedulerRunning = true;

  try { await runSchedulerInternal(); } finally { schedulerRunning = false; }
}

/** Returns true when the current local time falls within the salon's opening hours for today. */
function isWithinSalonHours(): boolean {
  const hoursConfig = settingsStore.hours as Array<{ day: string; open: boolean; from: string; to: string }>;
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const now = new Date();
  const todayHours = hoursConfig.find(h => h.day === dayNames[now.getDay()]);
  if (!todayHours || !todayHours.open) return false;
  const [fromH, fromM] = todayHours.from.split(":").map(Number);
  const [toH, toM]     = todayHours.to.split(":").map(Number);
  const nowMin  = now.getHours() * 60 + now.getMinutes();
  return nowMin >= fromH * 60 + fromM && nowMin <= toH * 60 + toM;
}

async function runSchedulerInternal(): Promise<void> {
  const ws = settingsStore.wasender as {
    enabled?: boolean;
    provider?: string;
    apiKey: string;
    botSailorApiToken?: string;
    zaptickApiKey?: string;
    ownerPhone: string;
    autoReminder: boolean;
    reminderHours: number;
    autoConfirmation: boolean;
    autoFollowup: boolean;
    autoCancellation: boolean;
    autoLowStock: boolean;
    autoPosThankYou?: boolean;
  };

  // Check if WhatsApp automation is enabled
  if (ws.enabled === false) return;

  if (!(ws.provider === "botsailor" ? ws.botSailorApiToken : ws.provider === "zaptick" ? ws.zaptickApiKey : ws.apiKey)) return;

  const waTpl = settingsStore.whatsapp as {
    reminder: string;
    confirmation: string;
    followup: string;
    cancellation: string;
  };

  const appointments = getStoredAppointments();
  const clients = getStoredClients();
  const salonName = settingsStore.salon.name as string;
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Reminders, follow-ups, cancellations, birthdays, and low-stock alerts only
  // fire during salon opening hours so clients aren't messaged at midnight.
  // Booking confirmations always fire immediately regardless of the hour.
  const openNow = isWithinSalonHours();

  // 0. POS thank-you queue — sends due thank-you texts created by POS sales.
  // This catches queued POS thank-yous on the next scheduler tick if the first
  // attempt did not happen immediately.
  if (ws.autoPosThankYou !== false) {
    const tpl = (settingsStore.whatsapp as { posThankYou?: string }).posThankYou;
    const queue = getQueue(POS_THANK_QUEUE_KEY);
    const remaining: QueueItem[] = [];
    if (tpl) {
      for (const item of queue) {
        if (item.sendAfter && Date.now() < item.sendAfter) { remaining.push(item); continue; }
        const phone = item.phone ? normalizePhone(item.phone) : "";
        const clientName = item.clientName || "there";
        const sentKey = `thankyou_${item.id}`;
        if (!phone || alreadySent(sentKey)) continue;
        const text = fillTemplate(tpl, { name: clientName, salon_name: salonName });
        const ok = await callSendApi(phone, text, { type: "thankyou", clientName });
        if (ok) {
          markSent(sentKey);
        } else if (item.retries < MAX_RETRIES - 1) {
          remaining.push({ ...item, retries: item.retries + 1, sendAfter: Date.now() + nextRetryDelayMs() });
        }
      }
      setQueue(POS_THANK_QUEUE_KEY, remaining);
    } else {
      setQueue(POS_THANK_QUEUE_KEY, queue);
    }
  }

  function clientPhone(clientId: string): string {
    const client = clients.find((c) => c.id === clientId);
    return client?.phone ? normalizePhone(client.phone) : "";
  }

  // Confirmations should always land in the client's chat before any reminder does —
  // skip reminders for appointments still waiting on a queued confirmation (it sends
  // after a deliberate 0-5 min delay, see enqueueWhatsAppConfirmation) so a same-day
  // booking's reminder can't win the race and arrive first.
  const pendingConfirmIds = new Set(getQueue(CONFIRM_QUEUE_KEY).map((item) => item.id));

  // 1. Appointment reminders — send X hours before appointment (only during salon hours).
  // Same-day bookings never get a reminder — reminders only make sense for a future day.
  if (openNow && ws.autoReminder && waTpl.reminder) {
    for (const appt of appointments) {
      if (appt.status === "cancelled" || appt.status === "no-show" || appt.status === "completed") continue;
      if (appt.date === todayKey) continue;
      if (ws.autoConfirmation && pendingConfirmIds.has(appt.id)) continue;
      const apptTime = new Date(`${appt.date}T${appt.startTime}:00`);
      const hoursUntil = (apptTime.getTime() - now.getTime()) / 3_600_000;
      // Scoped to this one appointment, not the client overall — sentKey is keyed by
      // appt.id, so a client with two distinct upcoming appointments both due for a
      // reminder still gets one reminder per appointment, not just one total.
      const sentKey = `reminder_${appt.id}`;
      const phone = clientPhone(appt.clientId);
      if (phone && !alreadySent(sentKey) && hoursUntil > 0 && hoursUntil <= ws.reminderHours) {
        // Wait out this reminder's own 0-10 min jitter (from when it first became
        // due) before sending — see getReminderSendAt.
        if (Date.now() < getReminderSendAt(appt.id)) continue;
        const text = fillTemplate(waTpl.reminder, buildVars(appt, salonName));
        const ok = await callSendApi(phone, text, { type: "reminder", clientName: appt.clientName });
        if (ok) { markSent(sentKey); clearReminderSendAt(appt.id); } // only mark sent on success so failures are retried
      }
    }
  }

  // 2. Booking confirmations — drain the confirm queue (one retry after 30-60 min on failure)
  if (ws.autoConfirmation && waTpl.confirmation) {
    const queue = getQueue(CONFIRM_QUEUE_KEY);
    const remaining: QueueItem[] = [];
    for (const item of queue) {
      // Retry delay — keep waiting if last attempt was too recent
      if (item.sendAfter && Date.now() < item.sendAfter) { remaining.push(item); continue; }
      // Prefer the live appointment (freshest data), but fall back to what was
      // snapshotted at enqueue time if it's since been deleted — this is what lets a
      // confirmation still go out instead of failing as "Unknown client".
      const appt = appointments.find((a) => a.id === item.id);
      const phone = appt ? clientPhone(appt.clientId) : (item.phone ?? "");
      const clientName = appt?.clientName ?? item.clientName ?? "there";
      if (!phone) {
        continue;
      }
      const sentKey = `confirm_${item.id}`;
      if (alreadySent(sentKey)) continue;
      const serviceNames = appt?.serviceNames ?? item.serviceNames ?? [];
      const date = appt?.date ?? item.date ?? "";
      const startTime = appt?.startTime ?? item.startTime ?? "";
      // A confirmation is purely informational ("your booking is confirmed"), not
      // time-boxed like a reminder — our own pacing gate (0-5 min enqueue jitter +
      // the mandatory 3-7+ min gap between any two sends) can occasionally push a
      // near-term/walk-in booking's confirmation past its own start time. Send it
      // regardless rather than dropping it as a "failure"; a slightly late
      // confirmation is still useful, an undelivered one is not.
      const text = fillTemplate(waTpl.confirmation, buildVars({ clientName, serviceNames, date, startTime }, salonName));
      const ok = await callSendApi(phone, text, { type: "confirmation", clientName });
      if (ok) {
        markSent(sentKey);
      } else if (item.retries < MAX_RETRIES - 1) {
        remaining.push({ ...item, retries: item.retries + 1, sendAfter: Date.now() + nextRetryDelayMs() });
      }
    }
    setQueue(CONFIRM_QUEUE_KEY, remaining);
  }

  // 3. Follow-up messages — sendAfter controls initial delay; retries once after a 30-60 min delay on failure.
  if (ws.autoFollowup && waTpl.followup) {
    const queue = getQueue(FOLLOWUP_QUEUE_KEY);
    const remaining: QueueItem[] = [];
    for (const item of queue) {
      if (item.sendAfter && Date.now() < item.sendAfter) { remaining.push(item); continue; }
      // Prefer the live appointment (freshest data), but fall back to what was
      // snapshotted at enqueue time if it's since been deleted — this is what lets a
      // follow-up still go out instead of failing as "Unknown client" with no number.
      const appt = appointments.find((a) => a.id === item.id);
      const phone = appt ? clientPhone(appt.clientId) : (item.phone ?? "");
      const clientName = appt?.clientName ?? item.clientName ?? "there";
      if (!phone) {
        continue;
      }
      const sentKey = `followup_${item.id}`;
      if (alreadySent(sentKey)) continue;
      const serviceNames = appt?.serviceNames ?? item.serviceNames ?? [];
      const date = appt?.date ?? item.date ?? "";
      const startTime = appt?.startTime ?? item.startTime ?? "";
      const text = fillTemplate(waTpl.followup, buildVars({ clientName, serviceNames, date, startTime }, salonName));
      const ok = await callSendApi(phone, text, { type: "followup", clientName });
      if (ok) {
        markSent(sentKey);
      } else if (item.retries < MAX_RETRIES - 1) {
        remaining.push({ ...item, retries: item.retries + 1, sendAfter: Date.now() + nextRetryDelayMs() });
      }
    }
    setQueue(FOLLOWUP_QUEUE_KEY, remaining);
  }

  // 4. Cancellation win-back — retries once after a 30-60 min delay on failure.
  const cancelSettings = settingsStore.wasender as { cancelDiscount?: string; cancelDiscountEnabled?: boolean };
  const cancelTpl = (settingsStore.whatsapp as { cancellation: string; cancellationNoDiscount?: string })[
    cancelSettings.cancelDiscountEnabled === false ? "cancellationNoDiscount" : "cancellation"
  ] || (settingsStore.whatsapp as { cancellation: string }).cancellation;
  if (ws.autoCancellation && cancelTpl) {
    const queue = getQueue(CANCEL_QUEUE_KEY);
    const remaining: QueueItem[] = [];
    for (const item of queue) {
      if (item.sendAfter && Date.now() < item.sendAfter) { remaining.push(item); continue; }
      const sentKey = `cancel_${item.id}`;
      if (alreadySent(sentKey)) continue;
      const appt = appointments.find((a) => a.id === item.id);
      const phone = appt ? clientPhone(appt.clientId) : (item.phone ?? "");
      const clientName = appt?.clientName ?? item.clientName ?? "there";
      if (!phone) {
        continue;
      }
      const cancelDiscount = cancelSettings.cancelDiscountEnabled === false ? "" : (cancelSettings.cancelDiscount || "10%");
      const text = appt
        ? fillTemplate(cancelTpl, { ...buildVars(appt, salonName), discount: cancelDiscount })
        : fillTemplate(cancelTpl, { name: clientName, salon_name: salonName, discount: cancelDiscount, service: "", date: "", time: "", staff: "" });
      const ok = await callSendApi(phone, text, { type: "cancellation", clientName });
      if (ok) {
        markSent(sentKey);
      } else if (item.retries < MAX_RETRIES - 1) {
        remaining.push({ ...item, retries: item.retries + 1, sendAfter: Date.now() + nextRetryDelayMs() });
      }
    }
    setQueue(CANCEL_QUEUE_KEY, remaining);
  }

  // 5. Low stock alerts (only during salon hours)
  if (openNow) await checkLowStockAlerts();

  // 6. Birthday reminders are queued during salon hours, but queued birthday
  // messages continue processing after close so the spread window can finish.
  await checkBirthdayReminders(false, openNow);
}


/** Call this whenever inventory is saved to send alerts immediately for newly-low items. */
export async function checkLowStockAlerts(): Promise<void> {
  if (typeof window === "undefined") return;

  const ws = settingsStore.wasender as {
    provider?: string; apiKey: string; botSailorApiToken?: string; autoLowStock: boolean; ownerPhone: string; bookingGroupJid?: string;
  };
  if (!ws.autoLowStock) { console.warn("⚠️ Low stock alerts disabled — enable in Account → WhatsApp Settings"); return; }
  // BotSailor doesn't support sending to groups (same restriction as the New Booking
  // group alert), so the group target only applies for the WaSender provider.
  const groupJid = ws.provider !== "botsailor" && ws.bookingGroupJid?.endsWith("@g.us") ? ws.bookingGroupJid : "";
  if (!ws.ownerPhone && !groupJid) { console.warn("⚠️ No owner phone or linked WhatsApp group set — add one in Account → WhatsApp Settings"); return; }
  if (!(ws.provider === "botsailor" ? ws.botSailorApiToken : ws.apiKey)) { console.warn("⚠️ No WhatsApp provider credentials set — add them in Account → WhatsApp Settings"); return; }

  const lowstockTemplate = (settingsStore.whatsapp as { lowstock: string }).lowstock;
  if (!lowstockTemplate) { console.warn("⚠️ No low stock template found in WhatsApp Settings"); return; }

  const today = new Date().toISOString().slice(0, 10);
  const sent: Record<string, string> = (() => {
    try { return JSON.parse(localStorage.getItem(locationUserKey(LOW_STOCK_SENT_KEY)) || "{}"); } catch { return {}; }
  })();

  const inventory = getStoredInventory();
  const newlyLow = inventory.filter(
    (item) => item.currentStock <= item.minStock && sent[item.id] !== today,
  );
  if (newlyLow.length === 0) return;

  const salonName = settingsStore.salon.name as string;
  const itemList = newlyLow.map((i) => `${i.name} (${i.currentStock} ${i.unit} left)`).join(", ");

  const text = fillTemplate(lowstockTemplate, {
    items: itemList,
    count: String(newlyLow.length),
    salon_name: salonName,
  });

  // Send to the owner's own number and the linked salon WhatsApp group — either or
  // both, whichever are configured — so the whole team can see it, not just one phone.
  if (ws.ownerPhone) {
    console.log("📦 Sending low stock alert for:", newlyLow.map((i) => i.name), "→", normalizePhone(ws.ownerPhone));
    const ok = await callSendApi(normalizePhone(ws.ownerPhone), text, { type: "lowstock", clientName: "Owner" });
    console.log("📦 Low stock alert (owner) result:", ok ? "sent ✅" : "failed ❌");
  }
  if (groupJid) {
    console.log("📦 Sending low stock alert for:", newlyLow.map((i) => i.name), "→ linked group");
    const ok = await callSendApi(groupJid, text, { type: "lowstock", clientName: "Group" });
    console.log("📦 Low stock alert (group) result:", ok ? "sent ✅" : "failed ❌");
  }

  // Mark attempted regardless of outcome — low stock alerts send once per day only
  newlyLow.forEach((i) => { sent[i.id] = today; });
  localStorage.setItem(locationUserKey(LOW_STOCK_SENT_KEY), JSON.stringify(sent));
}
