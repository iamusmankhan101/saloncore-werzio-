import { userKey, getCurrentUser } from "./auth";
import { settingsStore } from "./settings-store";
import { getStoredAppointments, getStoredClients, getStoredInventory } from "./storage";

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
}

const LOG_KEY = "werzio_wa_logs";
const MAX_LOG = 200;
const LOW_STOCK_SENT_KEY = "werzio_wa_lowstock_sent";

export function getWaLogs(): WaLogEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(userKey(LOG_KEY)) || "[]"); } catch { return []; }
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
  localStorage.setItem(userKey(LOG_KEY), JSON.stringify(logs));

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
const CONFIRM_QUEUE_KEY = "werzio_wa_confirm_queue";
const FOLLOWUP_QUEUE_KEY = "werzio_wa_followup_queue";
const CANCEL_QUEUE_KEY  = "werzio_wa_cancel_queue";

function getSentLog(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(userKey(SENT_KEY)) || "{}"); } catch { return {}; }
}

function markSent(key: string) {
  const log = getSentLog();
  log[key] = Date.now();
  localStorage.setItem(userKey(SENT_KEY), JSON.stringify(log));
}

function alreadySent(key: string): boolean {
  return !!getSentLog()[key];
}

const MAX_RETRIES = 3;
const FOLLOWUP_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours after completion
const SEND_RATE_LIMIT_MS = 60_000; // WaSender free plan: 1 message per minute

let lastSentAt = 0;
let schedulerRunning = false;

// sendAfter: unix ms timestamp — scheduler skips item until Date.now() >= sendAfter
type QueueItem = { id: string; retries: number; sendAfter?: number };

function getQueue(storageKey: string): QueueItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(userKey(storageKey)) || "[]") as (string | QueueItem)[];
    // Migrate old string[] format → {id, retries} format
    return raw.map((item) => typeof item === "string" ? { id: item, retries: 0 } : item);
  } catch { return []; }
}

function setQueue(storageKey: string, items: QueueItem[]) {
  localStorage.setItem(userKey(storageKey), JSON.stringify(items));
}

/** Call when a new appointment is booked — sends confirmation on the next scheduler tick. */
export function enqueueWhatsAppConfirmation(apptId: string) {
  if (typeof window === "undefined") return;
  const q = getQueue(CONFIRM_QUEUE_KEY);
  if (!q.some((item) => item.id === apptId)) {
    setQueue(CONFIRM_QUEUE_KEY, [...q, { id: apptId, retries: 0 }]);
  }
}

/** Call when an appointment is marked completed — sends follow-up 24 hours later. */
export function enqueueWhatsAppFollowup(apptId: string) {
  if (typeof window === "undefined") return;
  const q = getQueue(FOLLOWUP_QUEUE_KEY);
  if (!q.some((item) => item.id === apptId)) {
    setQueue(FOLLOWUP_QUEUE_KEY, [...q, { id: apptId, retries: 0, sendAfter: Date.now() + FOLLOWUP_DELAY_MS }]);
  }
}

/** Call when an appointment is cancelled — sends a win-back discount message 24 hours later. */
export function enqueueWhatsAppCancellation(apptId: string) {
  if (typeof window === "undefined") return;
  const q = getQueue(CANCEL_QUEUE_KEY);
  if (!q.some((item) => item.id === apptId)) {
    setQueue(CANCEL_QUEUE_KEY, [...q, { id: apptId, retries: 0, sendAfter: Date.now() + FOLLOWUP_DELAY_MS }]);
  }
}

async function callSendApi(
  phone: string,
  text: string,
  logMeta: { type: WaMsgType; clientName: string },
): Promise<boolean> {
  // Respect WaSender rate limit: wait until 60s have elapsed since the last send
  const wait = SEND_RATE_LIMIT_MS - (Date.now() - lastSentAt);
  if (lastSentAt > 0 && wait > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, wait));
  }
  lastSentAt = Date.now();

  const { apiKey } = settingsStore.wasender as { apiKey: string };
  let ok = false;
  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, phone, text }),
    });
    const data = await res.json() as { ok?: boolean };
    ok = data.ok === true;
  } catch {
    ok = false;
  }
  appendLog({ type: logMeta.type, clientName: logMeta.clientName, phone, status: ok ? "sent" : "failed", templateId: "direct" });
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

/**
 * Client-side birthday check — runs as part of the scheduler loop.
 * The server-side cron (/api/cron/birthday) is the primary mechanism;
 * this acts as a same-day backup when the dashboard is open.
 */
export async function checkBirthdayReminders(): Promise<void> {
  if (typeof window === "undefined") return;

  const ws = settingsStore.wasender as { apiKey: string; autoReminder: boolean };
  const bd = settingsStore.birthday as {
    autoBirthday: boolean;
    birthdayDiscount: string;
  };

  if (!bd.autoBirthday) return;
  if (!ws.apiKey) return;

  const birthdayTemplate = (settingsStore.whatsapp as { birthday: string }).birthday;
  if (!birthdayTemplate) return;

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const year = String(today.getFullYear());

  const sent: Record<string, string> = (() => {
    try { return JSON.parse(localStorage.getItem(userKey(BIRTHDAY_SENT_KEY)) || "{}"); } catch { return {}; }
  })();

  const clients = getStoredClients();
  const salonName = settingsStore.salon.name as string;

  for (const client of clients) {
    if (!client.dob || !client.phone) continue;

    const [, dobMonth, dobDay] = client.dob.split("-").map(Number);
    const isToday = dobMonth === today.getMonth() + 1 && dobDay === today.getDate();
    if (!isToday) continue;

    const sentKey = `${client.id}_${year}`;
    if (sent[sentKey]) continue;

    const phone = normalizePhone(client.phone);
    if (!phone) continue;

    const text = fillTemplate(birthdayTemplate, {
      name: client.name,
      salon_name: salonName,
      discount: bd.birthdayDiscount || "a special treat",
    });

    console.log(`Birthday wish → ${client.name} (${phone})`);
    const ok = await callSendApi(phone, text, { type: "birthday", clientName: client.name });

    if (ok) {
      sent[sentKey] = todayKey;
      localStorage.setItem(userKey(BIRTHDAY_SENT_KEY), JSON.stringify(sent));
    }
  }
}

export async function runWhatsAppScheduler(): Promise<void> {
  if (typeof window === "undefined") return;
  if (schedulerRunning) return;
  schedulerRunning = true;

  try { await runSchedulerInternal(); } finally { schedulerRunning = false; }
}

async function runSchedulerInternal(): Promise<void> {
  const ws = settingsStore.wasender as {
    apiKey: string;
    ownerPhone: string;
    autoReminder: boolean;
    reminderHours: number;
    autoConfirmation: boolean;
    autoFollowup: boolean;
    autoCancellation: boolean;
    autoLowStock: boolean;
  };

  if (!ws.apiKey) return;

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

  function clientPhone(clientId: string): string {
    const client = clients.find((c) => c.id === clientId);
    return client?.phone ? normalizePhone(client.phone) : "";
  }

  // 1. Appointment reminders — send X hours before appointment
  if (ws.autoReminder && waTpl.reminder) {
    for (const appt of appointments) {
      if (appt.status === "cancelled" || appt.status === "no-show" || appt.status === "completed") continue;
      const apptTime = new Date(`${appt.date}T${appt.startTime}:00`);
      const hoursUntil = (apptTime.getTime() - now.getTime()) / 3_600_000;
      const sentKey = `reminder_${appt.id}`;
      const phone = clientPhone(appt.clientId);
      if (phone && !alreadySent(sentKey) && hoursUntil > 0 && hoursUntil <= ws.reminderHours) {
        const text = fillTemplate(waTpl.reminder, buildVars(appt, salonName));
        await callSendApi(phone, text, { type: "reminder", clientName: appt.clientName });
        markSent(sentKey);
      }
    }
  }

  // 2. Booking confirmations — drain the confirm queue (max 3 attempts per item)
  if (ws.autoConfirmation && waTpl.confirmation) {
    const queue = getQueue(CONFIRM_QUEUE_KEY);
    const remaining: QueueItem[] = [];
    for (const item of queue) {
      const appt = appointments.find((a) => a.id === item.id);
      const phone = appt ? clientPhone(appt.clientId) : "";
      if (appt && phone) {
        const text = fillTemplate(waTpl.confirmation, buildVars(appt, salonName));
        const ok = await callSendApi(phone, text, { type: "confirmation", clientName: appt.clientName });
        if (!ok && item.retries < MAX_RETRIES - 1) {
          remaining.push({ id: item.id, retries: item.retries + 1 });
        }
        // On success or after MAX_RETRIES attempts: drop from queue
      }
    }
    setQueue(CONFIRM_QUEUE_KEY, remaining);
  }

  // 3. Follow-up messages — send 24h after completion (max 3 attempts)
  if (ws.autoFollowup && waTpl.followup) {
    const queue = getQueue(FOLLOWUP_QUEUE_KEY);
    const remaining: QueueItem[] = [];
    for (const item of queue) {
      // Not yet time — keep in queue untouched
      if (item.sendAfter && Date.now() < item.sendAfter) {
        remaining.push(item);
        continue;
      }
      const appt = appointments.find((a) => a.id === item.id);
      const phone = appt ? clientPhone(appt.clientId) : "";
      if (appt && phone) {
        const text = fillTemplate(waTpl.followup, buildVars(appt, salonName));
        const ok = await callSendApi(phone, text, { type: "followup", clientName: appt.clientName });
        if (!ok && item.retries < MAX_RETRIES - 1) {
          remaining.push({ id: item.id, retries: item.retries + 1 });
        }
        // On success or after MAX_RETRIES attempts: drop from queue
      }
    }
    setQueue(FOLLOWUP_QUEUE_KEY, remaining);
  }

  // 4. Cancellation win-back messages — sent 24h after cancellation
  const cancelTpl = (settingsStore.whatsapp as { cancellation: string }).cancellation;
  if (ws.autoCancellation && cancelTpl) {
    const queue = getQueue(CANCEL_QUEUE_KEY);
    const remaining: QueueItem[] = [];
    for (const item of queue) {
      if (item.sendAfter && Date.now() < item.sendAfter) {
        remaining.push(item);
        continue;
      }
      const appt = appointments.find((a) => a.id === item.id);
      const phone = appt ? clientPhone(appt.clientId) : "";
      if (appt && phone) {
        const cancelDiscount = (settingsStore.wasender as { cancelDiscount?: string }).cancelDiscount || "10%";
        const text = fillTemplate(cancelTpl, {
          ...buildVars(appt, salonName),
          discount: cancelDiscount,
        });
        const ok = await callSendApi(phone, text, { type: "cancellation", clientName: appt.clientName });
        if (!ok && item.retries < MAX_RETRIES - 1) {
          remaining.push({ id: item.id, retries: item.retries + 1 });
        }
      }
    }
    setQueue(CANCEL_QUEUE_KEY, remaining);
  }

  // 5. Low stock alerts
  await checkLowStockAlerts();

  // 6. Birthday reminders
  await checkBirthdayReminders();
}

/** Call this whenever inventory is saved to send alerts immediately for newly-low items. */
export async function checkLowStockAlerts(): Promise<void> {
  if (typeof window === "undefined") return;

  const ws = settingsStore.wasender as {
    apiKey: string; autoLowStock: boolean; ownerPhone: string;
  };
  if (!ws.autoLowStock) { console.warn("⚠️ Low stock alerts disabled — enable in Account → WhatsApp Settings"); return; }
  if (!ws.ownerPhone) { console.warn("⚠️ No owner phone set — add it in Account → WhatsApp Settings"); return; }
  if (!ws.apiKey) { console.warn("⚠️ No WaSender API key set — add it in Account → WhatsApp Settings"); return; }

  const lowstockTemplate = (settingsStore.whatsapp as { lowstock: string }).lowstock;
  if (!lowstockTemplate) { console.warn("⚠️ No low stock template found in WhatsApp Settings"); return; }

  const today = new Date().toISOString().slice(0, 10);
  const sent: Record<string, string> = (() => {
    try { return JSON.parse(localStorage.getItem(userKey(LOW_STOCK_SENT_KEY)) || "{}"); } catch { return {}; }
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
  localStorage.setItem(userKey(LOW_STOCK_SENT_KEY), JSON.stringify(sent));
}
