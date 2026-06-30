// Settings persisted to localStorage so changes survive page refreshes

import { userKey, getCurrentUser } from "./auth";
import { saveSettingsToDB } from "./turso-sync";

const STORAGE_KEY = "werzio_settings";
export const SETTINGS_CHANGED_EVENT = "werzio_settings_changed";

const defaults = {
  replicate: {
    apiToken: "",
  },
  huggingface: {
    apiToken: "",
  },
  salon: {
    name: "Amna's Salon",
    phone: "0300-1234567",
    email: "amna@werzio.pk",
    address: "Block 5, Gulshan-e-Iqbal, Karachi",
    city: "Karachi",
    currency: "PKR",
    timezone: "Asia/Karachi",
    logo: "",
  },
  wasender: {
    provider: "wasender" as "wasender" | "botsailor",
    apiKey: "",
    botSailorApiToken: "",
    botSailorPhoneNumberId: "",
    ownerPhone: "",
    bookingGroupJid: "",
    autoReminder: true,
    reminderHours: 24,
    autoConfirmation: true,
    autoFollowup: true,
    followupDelayMinutes: 1440,
    autoCancellation: true,
    cancellationDelayMinutes: 1440,
    cancelDiscount: "10%",
    autoLowStock: true,
    autoNewBooking: true,
    autoGroupBooking: false,
    safetyEnabled: true,
    emergencyPause: false,
    dailySendLimit: 300,
    perRecipientDailyLimit: 12,
    recipientCooldownSeconds: 15,
    randomDelayMinSeconds: 60,
    randomDelayMaxSeconds: 180,
    quietHoursEnabled: true,
    quietHoursStart: "21:00",
    quietHoursEnd: "09:00",
    quietHoursTimezone: "Asia/Karachi",
    blockMarketingWithoutOptIn: true,
  },
  hours: [
    { day: "Monday",    open: true,  from: "09:00", to: "20:00" },
    { day: "Tuesday",   open: true,  from: "09:00", to: "20:00" },
    { day: "Wednesday", open: true,  from: "09:00", to: "20:00" },
    { day: "Thursday",  open: true,  from: "09:00", to: "20:00" },
    { day: "Friday",    open: true,  from: "09:00", to: "20:00" },
    { day: "Saturday",  open: true,  from: "10:00", to: "18:00" },
    { day: "Sunday",    open: false, from: "10:00", to: "18:00" },
  ],
  notifications: {
    apptReminder: true,
    apptConfirm: true,
    noShow: true,
    dailySummary: true,
    weeklySummary: false,
    lowStock: true,
    whatsappNotify: true,
    emailNotify: false,
  },
  appearance: {
    accent: "#7C3AED",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12-hour (1:00pm)",
  },
  whatsapp: {
    connected: true,
    reminder: "Hi {{name}}, this is a reminder that your {{service}} appointment at {{salon_name}} is on {{date}} at {{time}}. See you soon! 💜",
    confirmation: "Hi {{name}}, your {{service}} booking on {{date}} at {{time}} is confirmed at {{salon_name}}. We look forward to seeing you! 💜",
    followup: "Hi {{name}}, thank you for visiting {{salon_name}}! We hope you loved your {{service}}. We'd love to see you again soon 💜",
    cancellation: "Hi {{name}}, we noticed your appointment at {{salon_name}} was cancelled. We'd love to have you back — enjoy {{discount}} off your next booking! Just reply to reschedule 💜",
    newBooking: "📅 New Booking! {{name}} has booked {{service}} on {{date}} at {{time}} at {{salon_name}}. Total: PKR {{amount}}.",
    lowstock: "⚠️ Low Stock Alert from {{salon_name}}: {{count}} item(s) running low — {{items}}. Please restock soon.",
    birthday: "🎂 Happy Birthday {{name}}! Wishing you a beautiful day from all of us at {{salon_name}}. As a birthday gift, enjoy {{discount}} off your next visit — book anytime this week 💜",
    topSpenders: "Hi {{name}}, thank you for being one of our valued top clients at {{salon_name}}! We truly appreciate your support. Come back soon for more of your favourite services 👑",
    mostFrequent: "Hi {{name}}, you're one of our most loyal visitors at {{salon_name}} with {{visits}} visits! We truly value your continued trust and look forward to your next visit 💜",
    longAbsent: "Hi {{name}}, we miss you at {{salon_name}}! It's been a while since your last visit. Come back and enjoy {{discount}} off your next appointment — we'd love to see you again 💜",
  },
  birthday: {
    autoBirthday: true,
    birthdayTemplateId: "",
    birthdayDiscount: "",
  },
  loyalty: {
    enabled: true,
    pointsPerRupee: 0.01,
    rupeePerPoint: 1,
    silverMin: 500,
    goldMin: 2000,
    platinumMin: 5000,
  },
  cashback: {
    enabled: false,
    apiKey: "",
  },
  printer: {
    enabled: false,
    ip: "",
    port: 9100,
  },
};

function load() {
  if (typeof window === "undefined") return structuredClone(defaults);
  try {
    const raw = localStorage.getItem(userKey(STORAGE_KEY));
    const user = getCurrentUser();
    const dynamicDefaults = structuredClone(defaults);
    if (user) {
      if (user.salonName) dynamicDefaults.salon.name = user.salonName;
      if (user.phone) dynamicDefaults.salon.phone = user.phone;
      if (user.email) dynamicDefaults.salon.email = user.email;
    }
    if (!raw) return dynamicDefaults;
    // Deep merge so new default keys are always present
    const saved = JSON.parse(raw);
    return {
      replicate: { ...dynamicDefaults.replicate, ...saved.replicate },
      huggingface: { ...dynamicDefaults.huggingface, ...saved.huggingface },
      salon: {
        ...dynamicDefaults.salon,
        ...saved.salon,
        name: saved.salon?.name && saved.salon.name !== "Amna's Salon"
          ? saved.salon.name
          : (user?.salonName || dynamicDefaults.salon.name),
        phone: saved.salon?.phone && saved.salon.phone !== "0300-1234567"
          ? saved.salon.phone
          : (user?.phone || dynamicDefaults.salon.phone),
        email: saved.salon?.email && saved.salon.email !== "amna@werzio.pk"
          ? saved.salon.email
          : (user?.email || dynamicDefaults.salon.email),
      },
      wasender: { ...dynamicDefaults.wasender, ...saved.wasender },
      hours: saved.hours ?? structuredClone(dynamicDefaults.hours),
      notifications: { ...dynamicDefaults.notifications, ...saved.notifications },
      appearance: { ...dynamicDefaults.appearance, ...saved.appearance },
      whatsapp: { ...dynamicDefaults.whatsapp, ...saved.whatsapp },
      birthday: { ...dynamicDefaults.birthday, ...saved.birthday },
      loyalty:  { ...dynamicDefaults.loyalty,  ...saved.loyalty  },
      cashback: { ...dynamicDefaults.cashback, ...saved.cashback },
      printer:  { ...dynamicDefaults.printer,  ...saved.printer  },
    };
  } catch {
    return structuredClone(defaults);
  }
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(userKey(STORAGE_KEY), JSON.stringify(settingsStore));
}

export const settingsStore = load();

export function reloadSettings() {
  const newSettings = load();
  // Clear and update settingsStore in place so existing imports get the new data
  for (const key of Object.keys(settingsStore)) {
    delete (settingsStore as any)[key];
  }
  Object.assign(settingsStore, newSettings);
}

/** Call after mutating any section to persist changes. */
export function saveSettings() {
  persist();
  saveSettingsToDB(settingsStore);
  applyAppearanceSettings();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));
  }
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const num = Number.parseInt(value, 16);
  if (Number.isNaN(num)) return { r: 124, g: 58, b: 237 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

export function applyAppearanceSettings() {
  if (typeof document === "undefined") return;
  // Brand gradient: always locked to the purple palette regardless of any saved value
  const GRAD_START = "#5B21B6";
  const GRAD_END   = "#9333EA";
  const ACCENT     = "#7C3AED";
  const { r, g, b } = hexToRgb(ACCENT);
  document.documentElement.style.setProperty("--accent",            ACCENT);
  document.documentElement.style.setProperty("--accent-dark",       GRAD_START);
  document.documentElement.style.setProperty("--accent-end",        GRAD_END);
  document.documentElement.style.setProperty("--accent-light",      "#A78BFA");
  document.documentElement.style.setProperty("--accent-gradient",   `linear-gradient(135deg, ${GRAD_START} 0%, ${GRAD_END} 100%)`);
  document.documentElement.style.setProperty("--accent-gradient-r", `linear-gradient(135deg, ${GRAD_END} 0%, ${GRAD_START} 100%)`);
  document.documentElement.style.setProperty("--accent-dim",        `rgba(${r}, ${g}, ${b}, 0.10)`);
  document.documentElement.style.setProperty("--accent-glow",       `rgba(${r}, ${g}, ${b}, 0.28)`);
}
