// Settings persisted to localStorage so changes survive page refreshes

import { userKey } from "./auth";

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
  },
  botsailor: {
    apiToken: "",
    phoneNumberId: "",
    ownerPhone: "",
    autoReminder: true,
    reminderHours: 24,
    reminderTemplateId: "",
    autoConfirmation: true,
    confirmationTemplateId: "",
    autoFollowup: true,
    followupTemplateId: "",
    autoLowStock: true,
    lowStockTemplateId: "",
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
    lowstock: "⚠️ Low Stock Alert from {{salon_name}}: {{count}} item(s) running low — {{items}}. Please restock soon.",
  },
};

function load() {
  if (typeof window === "undefined") return structuredClone(defaults);
  try {
    const raw = localStorage.getItem(userKey(STORAGE_KEY));
    if (!raw) return structuredClone(defaults);
    // Deep merge so new default keys are always present
    const saved = JSON.parse(raw);
    return {
      replicate: { ...defaults.replicate, ...saved.replicate },
      huggingface: { ...defaults.huggingface, ...saved.huggingface },
      salon: { ...defaults.salon, ...saved.salon },
      botsailor: { ...defaults.botsailor, ...saved.botsailor },
      hours: saved.hours ?? structuredClone(defaults.hours),
      notifications: { ...defaults.notifications, ...saved.notifications },
      appearance: { ...defaults.appearance, ...saved.appearance },
      whatsapp: { ...defaults.whatsapp, ...saved.whatsapp },
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

/** Call after mutating any section to persist changes. */
export function saveSettings() {
  persist();
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