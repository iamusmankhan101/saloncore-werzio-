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

export type WaMsgType = "reminder" | "confirmation" | "followup" | "lowstock" | "manual";
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

function getQueue(storageKey: string): string[] {
  try { return JSON.parse(localStorage.getItem(userKey(storageKey)) || "[]"); } catch { return []; }
}

function setQueue(storageKey: string, ids: string[]) {
  localStorage.setItem(userKey(storageKey), JSON.stringify(ids));
}

/** Call when a new appointment is booked to queue a confirmation message. */
export function enqueueWhatsAppConfirmation(apptId: string) {
  if (typeof window === "undefined") return;
  const q = getQueue(CONFIRM_QUEUE_KEY);
  if (!q.includes(apptId)) setQueue(CONFIRM_QUEUE_KEY, [...q, apptId]);
}

/** Call when an appointment is marked completed to queue a follow-up message. */
export function enqueueWhatsAppFollowup(apptId: string) {
  if (typeof window === "undefined") return;
  const q = getQueue(FOLLOWUP_QUEUE_KEY);
  if (!q.includes(apptId)) setQueue(FOLLOWUP_QUEUE_KEY, [...q, apptId]);
}

async function callSendApi(
  phone: string,
  templateId: string,
  variables: Record<string, string>,
  logMeta: { type: WaMsgType; clientName: string },
): Promise<boolean> {
  const { apiToken, phoneNumberId } = settingsStore.botsailor as {
    apiToken: string;
    phoneNumberId: string;
  };
  let ok = false;
  try {
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiToken, phoneNumberId, templateId, phone, variables }),
    });
    const data = await res.json() as { ok?: boolean; status?: number };
    ok = data.ok === true;
  } catch {
    ok = false;
  }
  appendLog({ type: logMeta.type, clientName: logMeta.clientName, phone, status: ok ? "sent" : "failed", templateId });
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

export async function runWhatsAppScheduler(): Promise<void> {
  if (typeof window === "undefined") return;

  const bs = settingsStore.botsailor as {
    apiToken: string;
    phoneNumberId: string;
    ownerPhone: string;
    autoReminder: boolean;
    reminderHours: number;
    reminderTemplateId: string;
    autoConfirmation: boolean;
    confirmationTemplateId: string;
    autoFollowup: boolean;
    followupTemplateId: string;
    autoLowStock: boolean;
    lowStockTemplateId: string;
  };

  if (!bs.phoneNumberId) return;

  const appointments = getStoredAppointments();
  const clients = getStoredClients();
  const salonName = settingsStore.salon.name as string;
  const now = new Date();

  function clientPhone(clientId: string): string {
    const client = clients.find((c) => c.id === clientId);
    return client?.phone ? normalizePhone(client.phone) : "";
  }

  // 1. Appointment reminders — send X hours before appointment
  if (bs.autoReminder && bs.reminderTemplateId) {
    for (const appt of appointments) {
      if (appt.status === "cancelled" || appt.status === "no-show" || appt.status === "completed") continue;
      const apptTime = new Date(`${appt.date}T${appt.startTime}:00`);
      const hoursUntil = (apptTime.getTime() - now.getTime()) / 3_600_000;
      const sentKey = `reminder_${appt.id}`;
      const phone = clientPhone(appt.clientId);
      if (phone && !alreadySent(sentKey) && hoursUntil > 0 && hoursUntil <= bs.reminderHours) {
        await callSendApi(phone, bs.reminderTemplateId, buildVars(appt, salonName), { type: "reminder", clientName: appt.clientName });
        markSent(sentKey);
      }
    }
  }

  // 2. Booking confirmations — drain the confirm queue
  if (bs.autoConfirmation && bs.confirmationTemplateId) {
    const queue = getQueue(CONFIRM_QUEUE_KEY);
    const failed: string[] = [];
    for (const apptId of queue) {
      const appt = appointments.find((a) => a.id === apptId);
      const phone = appt ? clientPhone(appt.clientId) : "";
      if (appt && phone) {
        const ok = await callSendApi(phone, bs.confirmationTemplateId, buildVars(appt, salonName), { type: "confirmation", clientName: appt.clientName });
        if (!ok) failed.push(apptId);
      }
    }
    setQueue(CONFIRM_QUEUE_KEY, failed);
  }

  // 3. Follow-up messages — drain the followup queue
  if (bs.autoFollowup && bs.followupTemplateId) {
    const queue = getQueue(FOLLOWUP_QUEUE_KEY);
    const failed: string[] = [];
    for (const apptId of queue) {
      const appt = appointments.find((a) => a.id === apptId);
      const phone = appt ? clientPhone(appt.clientId) : "";
      if (appt && phone) {
        const ok = await callSendApi(phone, bs.followupTemplateId, buildVars(appt, salonName), { type: "followup", clientName: appt.clientName });
        if (!ok) failed.push(apptId);
      }
    }
    setQueue(FOLLOWUP_QUEUE_KEY, failed);
  }

  // 4. Low stock alerts
  await checkLowStockAlerts();
}

/** Call this whenever inventory is saved to send alerts immediately for newly-low items. */
export async function checkLowStockAlerts(): Promise<void> {
  if (typeof window === "undefined") return;

  const bs = settingsStore.botsailor as {
    autoLowStock: boolean; lowStockTemplateId: string; ownerPhone: string;
  };
  if (!bs.autoLowStock) { console.warn("⚠️ Low stock alerts disabled — enable in Account → WhatsApp Settings"); return; }
  if (!bs.lowStockTemplateId) { console.warn("⚠️ No low stock template name set — add it in Account → WhatsApp Settings"); return; }
  if (!bs.ownerPhone) { console.warn("⚠️ No owner phone set — add it in Account → WhatsApp Settings"); return; }

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

  console.log("📦 Sending low stock alert for:", newlyLow.map((i) => i.name), "→", normalizePhone(bs.ownerPhone));
  const ok = await callSendApi(normalizePhone(bs.ownerPhone), bs.lowStockTemplateId, {
    items: itemList,
    count: String(newlyLow.length),
    salon_name: salonName,
  }, { type: "lowstock", clientName: "Owner" });
  console.log("📦 Low stock alert result:", ok ? "sent ✅" : "failed ❌");

  if (ok) {
    newlyLow.forEach((i) => { sent[i.id] = today; });
    localStorage.setItem(userKey(LOW_STOCK_SENT_KEY), JSON.stringify(sent));
  }
}