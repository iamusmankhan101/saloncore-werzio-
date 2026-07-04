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

export type WaMsgType = "reminder" | "confirmation" | "followup" | "cancellation" | "lowstock" | "manual" | "birthday";
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
// phone: stored at enqueue time so the message can still send even if the appointment is later deleted
type QueueItem = { id: string; retries: number; sendAfter?: number; phone?: string; clientName?: string };

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
  clientName: string;
  serviceNames: string[];
  date: string;
  startTime: string;
  totalAmount?: number;
}): Promise<void> {
  if (typeof window === "undefined") return;

  const ws = settingsStore.wasender as {
    provider?: string;
    apiKey: string;
    bookingGroupJid?: string;
    autoGroupBooking?: boolean;
  };

  if (ws.provider === "botsailor" || !ws.autoGroupBooking || !ws.apiKey) return;
  if (!ws.bookingGroupJid?.endsWith("@g.us")) return;

  const tpl = (settingsStore.whatsapp as { newBooking?: string }).newBooking ||
    "📅 New Booking! {{name}} has booked {{service}} on {{date}} at {{time}} at {{salon_name}}. Total: PKR {{amount}}.";

  const salonName = settingsStore.salon.name as string;
  const text = fillTemplate(tpl, {
    ...buildVars(appt, salonName),
    amount: appt.totalAmount != null ? String(appt.totalAmount) : "",
  });

  await callSendApi(ws.bookingGroupJid, text, { type: "manual", clientName: "Group" });
}

/** Call when a new appointment is booked — sends confirmation after a random 0-5 min delay, not instantly, so every booking's confirmation doesn't land at the same moment. */
export function enqueueWhatsAppConfirmation(apptId: string) {
  if (typeof window === "undefined") return;
  const q = getQueue(CONFIRM_QUEUE_KEY);
  if (!q.some((item) => item.id === apptId)) {
    const delayMs = Math.random() * 5 * 60_000; // 0-5 minutes
    setQueue(CONFIRM_QUEUE_KEY, [...q, { id: apptId, retries: 0, sendAfter: Date.now() + delayMs }]);
  }
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
  if (!q.some((item) => item.id === apptId)) {
    setQueue(FOLLOWUP_QUEUE_KEY, [...q, { id: apptId, retries: 0, sendAfter: Date.now() + delayMs + jitterMs }]);
  }
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
    setQueue(CANCEL_QUEUE_KEY, [...q, { id: apptId, retries: 0, sendAfter: Date.now() + delayMs + jitterMs, phone, clientName: appt?.clientName }]);
  }
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
async function applyPacingGate(providerConfig: ProviderConfig): Promise<void> {
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
  const providerConfig = settingsStore.wasender as WhatsAppSafetyConfig & {
    provider?: "wasender" | "botsailor" | "zaptick";
    apiKey: string;
    botSailorApiToken?: string;
    botSailorPhoneNumberId?: string;
    zaptickApiKey?: string;
  };

  await applyPacingGate(providerConfig);

  // Warm-up ramp: never let today's effective daily limit exceed the number's
  // warm-up ceiling, even if the salon's own Safety setting allows more.
  const warmupCap = getTodaysWarmupCap();
  const effectiveDailyLimit = Math.min(providerConfig.dailySendLimit ?? warmupCap, warmupCap);

  const messageIntent =
    logMeta.type === "lowstock" ? "internal"
    : ["followup", "cancellation", "birthday"].includes(logMeta.type) ? "marketing"
    : "utility";
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
        messageType: logMeta.type
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
    birthdayDiscount: string;
  };

  if (!force && !bd.autoBirthday) return;
  if (!force && !(ws.provider === "botsailor" ? ws.botSailorApiToken : ws.apiKey)) return;

  const birthdayTemplate = (settingsStore.whatsapp as { birthday: string }).birthday;
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
      await applyPacingGate(ws);
      appendLog({ type: "birthday", clientName, phone: "", status: "failed", templateId: "direct", error: "Client has no WhatsApp phone number." });
      continue;
    }

    if (sentOneThisTick) {
      remaining.push({ ...item, sendAfter: Date.now() + 10 * 60 * 1000 });
      continue;
    }

    const text = fillTemplate(birthdayTemplate, {
      name: clientName,
      salon_name: salonName,
      discount: bd.birthdayDiscount || "a special treat",
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
      const appt = appointments.find((a) => a.id === item.id);
      const phone = appt ? clientPhone(appt.clientId) : "";
      if (!appt) {
        await applyPacingGate(ws);
        appendLog({ type: "confirmation", clientName: item.clientName ?? "Unknown client", phone: item.phone ?? "", status: "failed", templateId: "direct", error: "Appointment was not found when the confirmation was processed." });
        continue;
      }
      if (!phone) {
        await applyPacingGate(ws);
        appendLog({ type: "confirmation", clientName: appt.clientName, phone: "", status: "failed", templateId: "direct", error: "Client has no WhatsApp phone number." });
        continue;
      }
      const sentKey = `confirm_${appt.id}`;
      if (alreadySent(sentKey)) continue;
      const apptTime = new Date(`${appt.date}T${appt.startTime}:00`);
      if (apptTime < now) {
        await applyPacingGate(ws);
        appendLog({ type: "confirmation", clientName: appt.clientName, phone, status: "failed", templateId: "direct", error: "Appointment time had already passed before confirmation could be sent." });
        continue;
      }
      const text = fillTemplate(waTpl.confirmation, buildVars(appt, salonName));
      const ok = await callSendApi(phone, text, { type: "confirmation", clientName: appt.clientName });
      if (ok) {
        markSent(sentKey);
      } else if (item.retries < MAX_RETRIES - 1) {
        remaining.push({ id: item.id, retries: item.retries + 1, sendAfter: Date.now() + nextRetryDelayMs() });
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
      const appt = appointments.find((a) => a.id === item.id);
      const phone = appt ? clientPhone(appt.clientId) : "";
      if (!appt) {
        await applyPacingGate(ws);
        appendLog({ type: "followup", clientName: item.clientName ?? "Unknown client", phone: item.phone ?? "", status: "failed", templateId: "direct", error: "Appointment was not found when the follow-up was processed." });
        continue;
      }
      if (!phone) {
        await applyPacingGate(ws);
        appendLog({ type: "followup", clientName: appt.clientName, phone: "", status: "failed", templateId: "direct", error: "Client has no WhatsApp phone number." });
        continue;
      }
      const sentKey = `followup_${appt.id}`;
      if (alreadySent(sentKey)) continue;
      const text = fillTemplate(waTpl.followup, buildVars(appt, salonName));
      const ok = await callSendApi(phone, text, { type: "followup", clientName: appt.clientName });
      if (ok) {
        markSent(sentKey);
      } else if (item.retries < MAX_RETRIES - 1) {
        remaining.push({ id: item.id, retries: item.retries + 1, sendAfter: Date.now() + nextRetryDelayMs() });
      }
    }
    setQueue(FOLLOWUP_QUEUE_KEY, remaining);
  }

  // 4. Cancellation win-back — retries once after a 30-60 min delay on failure.
  const cancelTpl = (settingsStore.whatsapp as { cancellation: string }).cancellation;
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
        await applyPacingGate(ws);
        appendLog({ type: "cancellation", clientName, phone: "", status: "failed", templateId: "direct", error: "Client has no WhatsApp phone number." });
        continue;
      }
      const cancelDiscount = (settingsStore.wasender as { cancelDiscount?: string }).cancelDiscount || "10%";
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
    provider?: string; apiKey: string; botSailorApiToken?: string; autoLowStock: boolean; ownerPhone: string;
  };
  if (!ws.autoLowStock) { console.warn("⚠️ Low stock alerts disabled — enable in Account → WhatsApp Settings"); return; }
  if (!ws.ownerPhone) { console.warn("⚠️ No owner phone set — add it in Account → WhatsApp Settings"); return; }
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

  console.log("📦 Sending low stock alert for:", newlyLow.map((i) => i.name), "→", normalizePhone(ws.ownerPhone));
  const ok = await callSendApi(normalizePhone(ws.ownerPhone), text, { type: "lowstock", clientName: "Owner" });
  console.log("📦 Low stock alert result:", ok ? "sent ✅" : "failed ❌");

  // Mark attempted regardless of outcome — low stock alerts send once per day only
  newlyLow.forEach((i) => { sent[i.id] = today; });
  localStorage.setItem(locationUserKey(LOW_STOCK_SENT_KEY), JSON.stringify(sent));
}
