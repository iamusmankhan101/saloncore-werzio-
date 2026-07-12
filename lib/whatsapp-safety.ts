export type WhatsAppMessageIntent = "utility" | "marketing" | "internal";

export interface WhatsAppSafetyConfig {
  safetyEnabled?: boolean;
  emergencyPause?: boolean;
  dailySendLimit?: number;
  perRecipientDailyLimit?: number;
  recipientCooldownSeconds?: number;
  randomDelayMinSeconds?: number;
  randomDelayMaxSeconds?: number;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
  blockMarketingWithoutOptIn?: boolean;
}

export interface WhatsAppSafetyCheckInput {
  phone: string;
  intent?: WhatsAppMessageIntent;
  recipientOptedIn?: boolean;
  /** Overrides the intent-based default (only "marketing" respects quiet hours by
   * default) for message types that aren't time-critical, e.g. follow-ups. Leave
   * unset for confirmations/reminders — holding those back defeats their purpose. */
  respectQuietHours?: boolean;
  config?: WhatsAppSafetyConfig;
}

interface SafetyState {
  dayKey: string;
  totalSent: number;
  byRecipient: Record<string, number>;
  /** Per-recipient timestamp (ms) before which a resend is blocked — jittered around recipientCooldownSeconds so the cooldown isn't a fixed, guessable interval. */
  cooldownUntil: Record<string, number>;
}

// Jitter the configured cooldown by ±15% each time it's recorded, so "wait N
// seconds before texting the same client again" isn't an exact, robotic interval.
const COOLDOWN_JITTER_MIN = 0.85;
const COOLDOWN_JITTER_MAX = 1.15;

const DEFAULT_SAFETY: Required<WhatsAppSafetyConfig> = {
  safetyEnabled: true,
  emergencyPause: false,
  dailySendLimit: 300,
  perRecipientDailyLimit: 12,
  recipientCooldownSeconds: 15,
  randomDelayMinSeconds: 300,
  randomDelayMaxSeconds: 600,
  quietHoursEnabled: true,
  quietHoursStart: "21:00",
  quietHoursEnd: "09:00",
  quietHoursTimezone: "Asia/Karachi",
  blockMarketingWithoutOptIn: true,
};

const g = globalThis as typeof globalThis & { __werzioWaSafetyState?: SafetyState };

function todayKey(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function currentMinutes(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function minutesFromTime(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function isInQuietHours(config: Required<WhatsAppSafetyConfig>) {
  const start = minutesFromTime(config.quietHoursStart);
  const end = minutesFromTime(config.quietHoursEnd);
  const now = currentMinutes(config.quietHoursTimezone);
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

// Seconds from now until the next occurrence of quietHoursEnd, so a deferred
// send lands right after quiet hours lift instead of retrying blindly every
// 30-60s. Small random buffer so a backlog doesn't all fire in the same minute.
function secondsUntilQuietHoursEnd(config: Required<WhatsAppSafetyConfig>): number {
  const end = minutesFromTime(config.quietHoursEnd);
  const now = currentMinutes(config.quietHoursTimezone);
  const minutesUntilEnd = now < end ? end - now : (24 * 60 - now) + end;
  return (minutesUntilEnd + Math.round(Math.random() * 10)) * 60;
}

function normalizeRecipient(phone: string) {
  return phone.endsWith("@g.us") ? phone : phone.replace(/\D/g, "");
}

function getState(config: Required<WhatsAppSafetyConfig>) {
  const dayKey = todayKey(config.quietHoursTimezone);
  if (!g.__werzioWaSafetyState || g.__werzioWaSafetyState.dayKey !== dayKey) {
    g.__werzioWaSafetyState = { dayKey, totalSent: 0, byRecipient: {}, cooldownUntil: {} };
  }
  return g.__werzioWaSafetyState;
}

export function getWhatsAppSafetyConfig(config?: WhatsAppSafetyConfig): Required<WhatsAppSafetyConfig> {
  return {
    ...DEFAULT_SAFETY,
    ...config,
    dailySendLimit: Math.max(1, Number(config?.dailySendLimit ?? DEFAULT_SAFETY.dailySendLimit)),
    perRecipientDailyLimit: Math.max(1, Number(config?.perRecipientDailyLimit ?? DEFAULT_SAFETY.perRecipientDailyLimit)),
    recipientCooldownSeconds: Math.max(0, Number(config?.recipientCooldownSeconds ?? DEFAULT_SAFETY.recipientCooldownSeconds)),
    randomDelayMinSeconds: Math.max(0, Number(config?.randomDelayMinSeconds ?? DEFAULT_SAFETY.randomDelayMinSeconds)),
    randomDelayMaxSeconds: Math.max(0, Number(config?.randomDelayMaxSeconds ?? DEFAULT_SAFETY.randomDelayMaxSeconds)),
  };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function getWhatsAppRandomDelayMs(config?: WhatsAppSafetyConfig) {
  const resolved = getWhatsAppSafetyConfig(config);
  if (!resolved.safetyEnabled) return 0;
  const min = Math.min(resolved.randomDelayMinSeconds, resolved.randomDelayMaxSeconds);
  const max = Math.max(resolved.randomDelayMinSeconds, resolved.randomDelayMaxSeconds);
  if (max <= 0) return 0;
  return Math.round((min + Math.random() * (max - min)) * 1000);
}

export async function applyWhatsAppRandomDelay(config?: WhatsAppSafetyConfig) {
  const delayMs = getWhatsAppRandomDelayMs(config);
  if (delayMs > 0) await sleep(delayMs);
  return delayMs;
}

export function checkWhatsAppSafety(input: WhatsAppSafetyCheckInput) {
  const config = getWhatsAppSafetyConfig(input.config);
  const intent = input.intent ?? "utility";
  const recipient = normalizeRecipient(input.phone);
  const state = getState(config);
  const isGroup = recipient.endsWith("@g.us");

  // The daily send cap always applies, even when the optional Safety toggle below
  // is off — it backs the WhatsApp number warm-up ramp (see getTodaysWarmupCap in
  // whatsapp-scheduler.ts): volume must never jump from a handful of messages one
  // day to hundreds the next, regardless of settings.
  if (!isGroup && state.totalSent >= config.dailySendLimit) {
    return { ok: false, status: 429, error: `Daily WhatsApp send limit reached (${config.dailySendLimit}).` };
  }

  // Quiet hours has its own toggle in Account settings, separate from the general
  // Safety switch below — so it must not be silently neutered when that switch is
  // off. Applies by default to marketing sends (cancellations, birthdays); other
  // kinds opt in per-call via respectQuietHours (e.g. follow-ups, which have no
  // time pressure). Confirmations/reminders never opt in — holding those back
  // defeats their purpose.
  const quietHoursApply = input.respectQuietHours ?? (intent === "marketing");
  if (quietHoursApply && config.quietHoursEnabled && isInQuietHours(config)) {
    return {
      ok: false,
      status: 429,
      error: `WhatsApp sends are paused during quiet hours (${config.quietHoursStart}-${config.quietHoursEnd} ${config.quietHoursTimezone}).`,
      retryAfter: secondsUntilQuietHoursEnd(config),
    };
  }

  if (!config.safetyEnabled) return { ok: true };
  if (config.emergencyPause) {
    return { ok: false, status: 423, error: "WhatsApp sending is paused from Account → WhatsApp Safety." };
  }
  if (intent === "marketing" && config.blockMarketingWithoutOptIn && input.recipientOptedIn !== true) {
    return { ok: false, status: 403, error: "Marketing WhatsApp send blocked because this client has not opted in." };
  }
  if (!isGroup && (state.byRecipient[recipient] ?? 0) >= config.perRecipientDailyLimit) {
    return { ok: false, status: 429, error: `Daily WhatsApp limit reached for this recipient (${config.perRecipientDailyLimit}).` };
  }

  const cooldownUntil = state.cooldownUntil[recipient] ?? 0;
  if (!isGroup && config.recipientCooldownSeconds > 0 && Date.now() < cooldownUntil) {
    const retryAfter = Math.ceil((cooldownUntil - Date.now()) / 1000);
    return { ok: false, status: 429, error: `WhatsApp safety cooldown active. Try again in ${retryAfter}s.`, retryAfter };
  }

  return { ok: true };
}

export function recordWhatsAppSafetySend(input: { phone: string; config?: WhatsAppSafetyConfig }) {
  const config = getWhatsAppSafetyConfig(input.config);
  const recipient = normalizeRecipient(input.phone);
  if (recipient.endsWith("@g.us")) return;
  const state = getState(config);
  // Always recorded (not gated behind the optional Safety toggle) — the daily total
  // backs the mandatory warm-up cap check in checkWhatsAppSafety above.
  state.totalSent += 1;
  state.byRecipient[recipient] = (state.byRecipient[recipient] ?? 0) + 1;
  // Jitter the cooldown window ±15% so it's not an exact, predictable interval —
  // e.g. a configured 30-minute cooldown lands somewhere between ~25.5-34.5 min.
  const jitteredCooldownMs = config.recipientCooldownSeconds * 1000
    * (COOLDOWN_JITTER_MIN + Math.random() * (COOLDOWN_JITTER_MAX - COOLDOWN_JITTER_MIN));
  state.cooldownUntil[recipient] = Date.now() + jitteredCooldownMs;
}
