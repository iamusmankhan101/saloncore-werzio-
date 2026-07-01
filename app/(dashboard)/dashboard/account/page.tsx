"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Banknote, Check, ChevronLeft, ChevronRight, Clock, ImageIcon, KeyRound, LogOut, MapPin, Save, Shield, Smartphone, Store, Trash2, User, UserCog, Wand2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthUser, getCurrentUser, signOut, updateCurrentPassword, updateCurrentUser } from "@/lib/auth";
import { saveSettings, settingsStore } from "@/lib/settings-store";
import MobilePageHeader from "@/components/mobile-page-header";
import PageTitle from "@/components/page-title";
import { getStoredStaff } from "@/lib/storage";
import type { Staff } from "@/lib/types";
import { getDefaultLocationId, getSalonLocations, type SalonLocation } from "@/lib/locations";

type SectionId = "profile" | "salon" | "hours" | "roles" | "security" | "whatsapp" | "decidr" | "tryon";

interface SalonSettings {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  currency: string;
  timezone: string;
  logo: string;
}

interface BusinessHour {
  day: string;
  open: boolean;
  from: string;
  to: string;
}

const BASE_SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: "profile",  label: "My Profile",     icon: User },
  { id: "salon",    label: "Salon Settings",  icon: Store },
  { id: "hours",    label: "Business Hours",  icon: Clock },
  { id: "roles",    label: "Roles & Permissions", icon: UserCog },
  { id: "security", label: "Security",        icon: Shield },
  { id: "whatsapp", label: "WhatsApp",        icon: Smartphone },
];

const inputStyle: CSSProperties = {
  width: "100%",
  height: 48,
  padding: "0 15px",
  borderRadius: 12,
  border: "1.5px solid #e5e3ef",
  fontSize: 14,
  color: "#29293d",
  outline: "none",
  background: "#fff",
  boxShadow: "0 1px 2px rgba(30,20,60,.02)",
};

function Field({ label, children, full = false, hint }: { label: string; children: ReactNode; full?: boolean; hint?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8, gridColumn: full ? "1 / -1" : undefined }}>
      <span style={{ color: "#29263d", fontSize: 12, fontWeight: 800, letterSpacing: ".01em" }}>{label}</span>
      {children}
      {hint && <span style={{ color: "#9995ad", fontSize: 11, lineHeight: 1.5 }}>{hint}</span>}
    </label>
  );
}

function SavedBanner({ text = "Changes saved successfully." }: { text?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#ecfdf5", borderRadius: 10, fontSize: 12, color: "#059669", fontWeight: 700 }}>
      <Check size={14} /> {text}
    </div>
  );
}

function SaveButton({ label = "Save Changes", onClick, disabled = false }: { label?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 22, borderTop: "1px solid #efedf5", marginTop: 26 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "none",
          borderRadius: 12,
          padding: "13px 24px",
          background: disabled ? "#e8e8f0" : "linear-gradient(135deg,#6D28D9,#9333EA)",
          color: disabled ? "#aaaabc" : "#fff",
          fontSize: 13,
          fontWeight: 800,
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: disabled ? "none" : "0 8px 20px rgba(109,40,217,.2)",
        }}
      >
        <Save size={15} /> {label}
      </button>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={value}
      style={{ width: 44, height: 24, border: "none", borderRadius: 999, background: value ? "var(--accent)" : "#dedeea", position: "relative", cursor: "pointer" }}
    >
      <span style={{ position: "absolute", top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left 0.15s" }} />
    </button>
  );
}

// ─── My Profile ───────────────────────────────────────────────────────────────

function ProfileSection() {
  const user = getCurrentUser();
  const salonLogo = (settingsStore.salon as SalonSettings).logo;
  const initials = (user?.ownerName || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [form, setForm] = useState({
    ownerName: user?.ownerName || "",
    salonName: user?.salonName || "",
    phone:     user?.phone     || "",
  });
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");

  function save() {
    setError("");
    try {
      const updated = updateCurrentUser(form);
      // Sync salon name back to settings store so Salon Settings reflects the change
      if (form.salonName) {
        (settingsStore.salon as SalonSettings).name = form.salonName;
        saveSettings();
      }
      // Fire-and-forget: sync to Turso billing_users
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:    updated.id,
          ownerName: form.ownerName,
          salonName: form.salonName,
          phone:     form.phone,
        }),
      }).catch(() => { /* non-critical — billing DB sync */ });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile.");
    }
  }

  return (
    <section>
      {/* Avatar card */}
      <div style={{
        display: "flex", alignItems: "center", gap: 18,
        padding: "26px 28px", marginBottom: 32,
        background: "linear-gradient(120deg, #3b176f 0%, #6D28D9 48%, #A334F0 100%)",
        borderRadius: 20,
        boxShadow: "0 18px 42px rgba(91,33,182,.2)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.07)", right: -70, top: -120 }} />
        <div style={{
          width: 68, height: 68, borderRadius: "50%",
          background: "rgba(255,255,255,0.2)", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 900, color: "#fff",
          border: "3px solid rgba(255,255,255,0.62)",
          overflow: "hidden", position: "relative",
        }}>
          {salonLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={salonLogo} alt="Salon logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : initials}
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>{user?.ownerName}</div>
            <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", background: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", padding: "3px 7px", borderRadius: 20 }}>
              {user?.role === "manager" ? "Manager" : "Admin"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>{user?.email}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{user?.salonName}</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right", position: "relative" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Member since</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 700, marginTop: 2 }}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-PK", { month: "short", year: "numeric" }) : "—"}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: "#1d1d2f", fontSize: 22, fontWeight: 900 }}>Personal details</h2>
        <p style={{ margin: "6px 0 0", color: "#9995ad", fontSize: 12 }}>Update the information connected to your Salon Central account.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 18px" }}>
        <Field label="Owner Name">
          <input style={inputStyle} value={form.ownerName}
            onChange={(e) => setForm((f) => ({ ...f, ownerName: e.target.value }))} />
        </Field>
        <Field label="Salon Name">
          <input style={inputStyle} value={form.salonName}
            onChange={(e) => setForm((f) => ({ ...f, salonName: e.target.value }))} />
        </Field>
        <Field label="Phone">
          <input style={inputStyle} value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </Field>
        <Field label="Email" hint="Email address cannot be changed — used for account login">
          <input
            style={{ ...inputStyle, background: "#f8f8fc", color: "#9999b0", cursor: "not-allowed" }}
            value={user?.email || ""} readOnly />
        </Field>
      </div>

      {error && (
        <div style={{ marginTop: 16, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 700 }}>
          {error}
        </div>
      )}
      {saved && <div style={{ marginTop: 16 }}><SavedBanner text="Profile updated successfully." /></div>}
      <SaveButton onClick={save} />
    </section>
  );
}

// ─── Logo resize helper ───────────────────────────────────────────────────────

function resizeImage(file: File, maxSize = 300): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Salon Settings ────────────────────────────────────────────────────────────

function SalonProfile() {
  const user = getCurrentUser();

  // Pre-fill from auth data when the store still has placeholder defaults
  const [form, setForm] = useState<SalonSettings>(() => {
    const s = { ...(settingsStore.salon as SalonSettings) };
    if (user) {
      if (!s.name || s.name === "Amna's Salon") s.name = user.salonName;
      if (!s.email || s.email === "amna@werzio.pk") s.email = user.email;
    }
    return s;
  });
  const [saved, setSaved] = useState(false);

  function setField(field: keyof SalonSettings, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function save() {
    Object.assign(settingsStore.salon, form);
    saveSettings();
    updateCurrentUser({ salonName: form.name, phone: form.phone });
    // Sync to Turso
    const u = getCurrentUser();
    if (u) {
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, salonName: form.name, phone: form.phone }),
      }).catch(() => {});
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setForm((f) => ({ ...f, logo: dataUrl }));
  }

  return (
    <section>
      <h2 style={{ margin: "0 0 26px", color: "#1d1d2f", fontSize: 20, fontWeight: 900 }}>Salon Profile</h2>

      {/* Logo upload */}
      <div style={{ marginBottom: 28, padding: "20px 22px", background: "#fafafd", border: "1px solid #eeeeF6", borderRadius: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#242438", marginBottom: 14 }}>Salon Logo</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* Preview */}
          {form.logo ? (
            <img src={form.logo} alt="logo" style={{ height: 80, maxWidth: 160, objectFit: "contain", flexShrink: 0, borderRadius: 4 }} />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: 16, flexShrink: 0,
              background: "linear-gradient(135deg, #5B21B6, #9333EA)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: "#fff" }}>
                {(form.name || "S").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
              </span>
            </div>
          )}
          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "9px 18px", borderRadius: 9, cursor: "pointer",
              background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 700,
            }}>
              <ImageIcon size={14} />
              {form.logo ? "Change Logo" : "Upload Logo"}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
            </label>
            {form.logo && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, logo: "" }))}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 9, cursor: "pointer", background: "#fff", border: "1px solid #fecaca", color: "#dc2626", fontSize: 12, fontWeight: 700 }}
              >
                <Trash2 size={14} /> Remove Logo
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#9999b0", lineHeight: 1.6 }}>
            Appears on invoices and sidebar.<br />PNG or JPG recommended.<br />Max displayed size: 300×300 px.
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 18px" }}>
        <Field label="Salon Name"><input style={inputStyle} value={form.name} onChange={(event) => setField("name", event.target.value)} /></Field>
        <Field label="Phone"><input style={inputStyle} value={form.phone} onChange={(event) => setField("phone", event.target.value)} /></Field>
        <Field label="Email"><input style={inputStyle} value={form.email} onChange={(event) => setField("email", event.target.value)} /></Field>
        <Field label="City"><input style={inputStyle} value={form.city} onChange={(event) => setField("city", event.target.value)} /></Field>
        <Field label="Address" full><input style={inputStyle} value={form.address} onChange={(event) => setField("address", event.target.value)} /></Field>
        <Field label="Currency">
          <select style={inputStyle} value={form.currency} onChange={(event) => setField("currency", event.target.value)}>
            <option value="PKR">PKR — Pakistani Rupee</option>
            <option value="USD">USD — US Dollar</option>
            <option value="AED">AED — UAE Dirham</option>
          </select>
        </Field>
        <Field label="Timezone">
          <select style={inputStyle} value={form.timezone} onChange={(event) => setField("timezone", event.target.value)}>
            <option value="Asia/Karachi">Asia/Karachi (PKT +5:00)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
            <option value="UTC">UTC</option>
          </select>
        </Field>
      </div>
      {saved && <div style={{ marginTop: 16 }}><SavedBanner /></div>}
      <SaveButton onClick={save} />
    </section>
  );
}

function BusinessHours() {
  const [hours, setHours] = useState<BusinessHour[]>(() => (settingsStore.hours as BusinessHour[]).map((hour) => ({ ...hour })));
  const [saved, setSaved] = useState(false);

  function updateHour(index: number, patch: Partial<BusinessHour>) {
    setHours((current) => current.map((hour, i) => (i === index ? { ...hour, ...patch } : hour)));
  }

  function save() {
    hours.forEach((hour, index) => Object.assign(settingsStore.hours[index], hour));
    saveSettings();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <section>
      <h2 style={{ margin: "0 0 24px", color: "#1d1d2f", fontSize: 20, fontWeight: 900 }}>Business Hours</h2>
      <div style={{ display: "grid", gap: 10 }}>
        {hours.map((hour, index) => (
          <div key={hour.day} style={{ display: "grid", gridTemplateColumns: "140px 56px 1fr", alignItems: "center", gap: 14, padding: "12px 14px", background: "#fafafd", border: "1px solid #eeeeF6", borderRadius: 12 }}>
            <strong style={{ fontSize: 13, color: "#242438" }}>{hour.day}</strong>
            <Toggle value={hour.open} onChange={() => updateHour(index, { open: !hour.open })} />
            {hour.open ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="time" style={{ ...inputStyle, width: 132 }} value={hour.from} onChange={(event) => updateHour(index, { from: event.target.value })} />
                <span style={{ fontSize: 12, color: "#9999b0" }}>to</span>
                <input type="time" style={{ ...inputStyle, width: 132 }} value={hour.to} onChange={(event) => updateHour(index, { to: event.target.value })} />
              </div>
            ) : (
              <span style={{ color: "#aaaabc", fontSize: 12, fontStyle: "italic" }}>Closed</span>
            )}
          </div>
        ))}
      </div>
      {saved && <div style={{ marginTop: 16 }}><SavedBanner /></div>}
      <SaveButton onClick={save} />
    </section>
  );
}

function Security() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const canSave = form.current.length > 0 && form.next.length >= 8 && form.next === form.confirm;

  async function save() {
    if (!canSave) return;
    setError("");
    try {
      await updateCurrentPassword(form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password could not be updated.");
    }
  }

  return (
    <section>
      <h2 style={{ margin: "0 0 24px", color: "#1d1d2f", fontSize: 20, fontWeight: 900 }}>Security</h2>
      <div style={{ display: "grid", gap: 18 }}>
        <Field label="Current Password"><input type="password" style={inputStyle} value={form.current} onChange={(event) => setForm((current) => ({ ...current, current: event.target.value }))} placeholder="••••••••" /></Field>
        <Field label="New Password" hint="Use at least 8 characters."><input type="password" style={inputStyle} value={form.next} onChange={(event) => setForm((current) => ({ ...current, next: event.target.value }))} placeholder="••••••••" /></Field>
        <Field label="Confirm New Password"><input type="password" style={{ ...inputStyle, borderColor: form.confirm && form.confirm !== form.next ? "#dc2626" : "#e4e4ee" }} value={form.confirm} onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))} placeholder="••••••••" /></Field>
      </div>
      {error && <div style={{ marginTop: 16, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 700 }}>{error}</div>}
      {saved && <div style={{ marginTop: 16 }}><SavedBanner text="Password updated successfully." /></div>}
      <SaveButton label="Update Password" onClick={save} disabled={!canSave} />
    </section>
  );
}

interface WhatsAppSettings {
  enabled: boolean;
  provider: "wasender" | "botsailor" | "zaptick";
  apiKey: string;
  botSailorApiToken: string;
  botSailorPhoneNumberId: string;
  botSailorTemplateReminder?: string;
  botSailorTemplateConfirmation?: string;
  botSailorTemplateFollowup?: string;
  botSailorTemplateCancellation?: string;
  botSailorTemplateBirthday?: string;
  zaptickApiKey: string;
  ownerPhone: string;
  bookingGroupJid: string;
  autoReminder: boolean;
  reminderHours: number;
  autoConfirmation: boolean;
  autoFollowup: boolean;
  followupDelayMinutes: number;
  autoCancellation: boolean;
  cancellationDelayMinutes: number;
  cancelDiscount: string;
  autoLowStock: boolean;
  autoGroupBooking: boolean;
  safetyEnabled: boolean;
  emergencyPause: boolean;
  dailySendLimit: number;
  perRecipientDailyLimit: number;
  recipientCooldownSeconds: number;
  randomDelayMinSeconds: number;
  randomDelayMaxSeconds: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  blockMarketingWithoutOptIn: boolean;
}

const DELAY_PRESETS = [
  { label: "15 minutes", value: 15  },
  { label: "30 minutes", value: 30  },
  { label: "1 hour",     value: 60  },
  { label: "2 hours",    value: 120 },
  { label: "4 hours",    value: 240 },
  { label: "6 hours",    value: 360 },
  { label: "12 hours",   value: 720 },
  { label: "24 hours",   value: 1440 },
];

function DelaySelector({ minutes, onChange, label }: { minutes: number; onChange: (v: number) => void; label: string }) {
  const isPreset = DELAY_PRESETS.some(p => p.value === minutes);
  const [custom, setCustom] = useState(!isPreset);
  const [customNum, setCustomNum] = useState(
    !isPreset ? (minutes >= 60 ? String(minutes / 60) : String(minutes)) : "1"
  );
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours">(
    !isPreset ? (minutes >= 60 ? "hours" : "minutes") : "hours"
  );

  const selectVal = custom ? "custom" : String(minutes);

  function applyCustom(num: string, unit: "minutes" | "hours") {
    const n = Math.max(1, Number(num) || 1);
    onChange(unit === "hours" ? n * 60 : n);
  }

  return (
    <Field label={label}>
      <select
        style={inputStyle}
        value={selectVal}
        onChange={(e) => {
          if (e.target.value === "custom") {
            setCustom(true);
            applyCustom(customNum, customUnit);
          } else {
            setCustom(false);
            onChange(Number(e.target.value));
          }
        }}
      >
        {DELAY_PRESETS.map(p => (
          <option key={p.value} value={String(p.value)}>{p.label} after</option>
        ))}
        <option value="custom">Custom...</option>
      </select>
      {custom && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            type="number"
            min={1}
            value={customNum}
            onChange={(e) => { setCustomNum(e.target.value); applyCustom(e.target.value, customUnit); }}
            style={{ ...inputStyle, width: 90 }}
          />
          <select
            style={{ ...inputStyle, flex: 1 }}
            value={customUnit}
            onChange={(e) => { const u = e.target.value as "minutes" | "hours"; setCustomUnit(u); applyCustom(customNum, u); }}
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
          </select>
        </div>
      )}
    </Field>
  );
}

function secondsToWholeMinutes(seconds: number | undefined, fallbackMinutes: number) {
  return Math.max(1, Math.round((seconds ?? fallbackMinutes * 60) / 60));
}

const REMINDER_HOUR_PRESETS = [1, 2, 4, 12, 24, 48];

function toHours(num: number, unit: "minutes" | "hours" | "days") {
  if (unit === "minutes") return num / 60;
  if (unit === "days")    return num * 24;
  return num;
}

function ReminderLeadSelector({ hours, onChange }: { hours: number; onChange: (hours: number) => void }) {
  const isPreset = REMINDER_HOUR_PRESETS.includes(hours);
  const [customNum, setCustomNum] = useState(() => {
    if (isPreset) return "3";
    if (hours < 1)  return String(Math.round(hours * 60));
    if (hours % 24 === 0) return String(hours / 24);
    return String(hours);
  });
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours" | "days">(() => {
    if (isPreset) return "hours";
    if (hours < 1)  return "minutes";
    if (hours % 24 === 0) return "days";
    return "hours";
  });

  function applyCustom(num: string, unit: "minutes" | "hours" | "days") {
    const n = Math.max(1, Number(num) || 1);
    onChange(toHours(n, unit));
  }

  return (
    <Field label="Hours before appointment">
      <select
        style={inputStyle}
        value={isPreset ? String(hours) : "custom"}
        onChange={(event) => {
          if (event.target.value === "custom") {
            applyCustom(customNum, customUnit);
          } else {
            onChange(Number(event.target.value));
          }
        }}
      >
        {REMINDER_HOUR_PRESETS.map((value) => (
          <option key={value} value={value}>{value} hour{value === 1 ? "" : "s"} before</option>
        ))}
        <option value="custom">Custom...</option>
      </select>
      {!isPreset && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            type="number"
            min={1}
            value={customNum}
            onChange={(e) => { setCustomNum(e.target.value); applyCustom(e.target.value, customUnit); }}
            style={{ ...inputStyle, width: 90 }}
          />
          <select
            style={{ ...inputStyle, flex: 1 }}
            value={customUnit}
            onChange={(e) => { const u = e.target.value as "minutes" | "hours" | "days"; setCustomUnit(u); applyCustom(customNum, u); }}
          >
            <option value="minutes">Minutes before</option>
            <option value="hours">Hours before</option>
            <option value="days">Days before</option>
          </select>
        </div>
      )}
    </Field>
  );
}

function AutoRow({
  label,
  hint,
  enabled,
  onToggle,
  extra,
}: {
  label: string;
  hint: string;
  enabled: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ border: "1px solid #e8e8f4", borderRadius: 12, padding: "16px 18px", background: enabled ? "#faf9ff" : "#fafafd" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: enabled && extra ? 14 : 0 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1d1d2f" }}>{label}</div>
          <div style={{ fontSize: 11, color: "#9999b0", marginTop: 2 }}>{hint}</div>
        </div>
        <Toggle value={enabled} onChange={onToggle} />
      </div>
      {enabled && extra}
    </div>
  );
}

function WhatsAppSection() {
  const [form, setForm] = useState<WhatsAppSettings>({ ...(settingsStore.wasender as WhatsAppSettings) });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groups, setGroups] = useState<{ jid: string; name: string }[]>([]);
  const [groupInviteLink, setGroupInviteLink] = useState("");
  const [connectionState, setConnectionState] = useState<"unknown" | "connected" | "disconnected">("unknown");
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function set<K extends keyof WhatsAppSettings>(key: K, value: WhatsAppSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    Object.assign(settingsStore.wasender, form);
    saveSettings();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  async function testConnection() {
    const credential = form.provider === "botsailor" ? form.botSailorApiToken : form.apiKey;
    const missingProviderFields = form.provider === "botsailor" && !form.botSailorPhoneNumberId;
    if (!credential || missingProviderFields) {
      const msg = form.provider === "botsailor"
        ? "Enter your BotSailor API token and phone number ID first."
        : "Enter your WaSender API key first.";
      setTestResult({ ok: false, msg });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const params = new URLSearchParams({
        force: "1",
        provider: form.provider,
        apiKey: form.apiKey,
        botSailorApiToken: form.botSailorApiToken,
        botSailorPhoneNumberId: form.botSailorPhoneNumberId,
      });
      const res = await fetch(`/api/whatsapp/status?${params}`);
      const data = await res.json();
      if (data.connected) {
        setConnectionState("connected");
        setTestResult({ ok: true, msg: "Connected! The salon WhatsApp session is active." });
      } else {
        setConnectionState("disconnected");
        setTestResult({ ok: false, msg: data.message || `${form.provider === "botsailor" ? "BotSailor" : form.provider === "zaptick" ? "Zaptick" : "WaSender"} connection failed.` });
      }
    } catch {
      setConnectionState("disconnected");
      setTestResult({ ok: false, msg: `Could not reach ${form.provider === "botsailor" ? "BotSailor" : form.provider === "zaptick" ? "Zaptick" : "WaSender"}. Check your internet connection.` });
    }
    setTesting(false);
  }

  async function testGroup() {
    if (!form.apiKey || !form.bookingGroupJid?.endsWith("@g.us")) {
      setTestResult({ ok: false, msg: "Enter an API key and a valid Group ID ending in @g.us." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: form.apiKey,
          provider: form.provider,
          botSailorApiToken: form.botSailorApiToken,
          botSailorPhoneNumberId: form.botSailorPhoneNumberId,
          phone: form.bookingGroupJid,
          text: "Salon Central booking group connected ✅",
          messageIntent: "internal",
        }),
      });
      const data = await res.json();
      setTestResult(data.ok
        ? { ok: true, msg: "Connected! Test message sent to the booking group." }
        : { ok: false, msg: `Group test failed (status ${data.status ?? res.status}). Check the Group ID.` });
    } catch {
      setTestResult({ ok: false, msg: "Could not reach WaSender API. Check your internet connection." });
    }
    setTesting(false);
  }

  async function loadGroups() {
    if (!form.apiKey) {
      setTestResult({ ok: false, msg: "Enter your WaSender API key first." });
      return;
    }
    setLoadingGroups(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/whatsapp/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: form.apiKey }),
      });
      const data = await response.json() as {
        ok?: boolean;
        groups?: { jid: string; name: string }[];
        session?: { id?: string; name?: string };
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setGroups([]);
        setTestResult({ ok: false, msg: data.error || "Unable to load WhatsApp groups." });
        return;
      }
      const availableGroups = data.groups ?? [];
      setGroups(availableGroups);
      setTestResult({
        ok: availableGroups.length > 0,
        msg: availableGroups.length > 0
          ? `Found ${availableGroups.length} WhatsApp group${availableGroups.length === 1 ? "" : "s"}.`
          : `No groups were returned for ${data.session?.name || data.session?.id || "this WaSender session"}. Reconnect the salon number in WaSender to refresh group sync, then try again.`,
      });
    } catch {
      setGroups([]);
      setTestResult({ ok: false, msg: "Could not reach WaSender API. Check your connection." });
    } finally {
      setLoadingGroups(false);
    }
  }

  async function addGroupFromInvite() {
    if (!form.apiKey || !groupInviteLink.trim()) {
      setTestResult({ ok: false, msg: "Enter your API key and the WhatsApp group invite link." });
      return;
    }
    setLoadingGroups(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/whatsapp/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: form.apiKey, inviteLink: groupInviteLink.trim() }),
      });
      const data = await response.json() as {
        ok?: boolean;
        group?: { jid: string; name: string };
        error?: string;
      };
      if (!response.ok || !data.ok || !data.group) {
        setTestResult({ ok: false, msg: data.error || "Unable to resolve the group invite link." });
        return;
      }
      setGroups((current) => current.some((group) => group.jid === data.group!.jid)
        ? current
        : [...current, data.group!].sort((a, b) => a.name.localeCompare(b.name)));
      set("bookingGroupJid", data.group.jid);
      setTestResult({ ok: true, msg: `${data.group.name} selected from its invite link. Save settings to keep it.` });
    } catch {
      setTestResult({ ok: false, msg: "Could not resolve the group invite link." });
    } finally {
      setLoadingGroups(false);
    }
  }

  const activeCredential = form.provider === "botsailor" ? form.botSailorApiToken : form.provider === "zaptick" ? form.zaptickApiKey : form.apiKey;
  const isConnected = !!activeCredential && connectionState !== "disconnected";
  const isEnabled = form.enabled !== false; // Default to true if not set

  return (
    <section>
      {/* Header with toggle */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 8 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: "0 0 6px", color: "#1d1d2f", fontSize: 20, fontWeight: 900 }}>WhatsApp Automation</h2>
          <p style={{ margin: 0, color: "#9999b0", fontSize: 12 }}>
            Choose WaSenderAPI, BotSailor, or Zaptick as the active provider. All automated and manual messages use the selected connection.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: isEnabled ? "#059669" : "#9999b0" }}>
              {isEnabled ? "Enabled" : "Disabled"}
            </span>
            <Toggle value={isEnabled} onChange={() => set("enabled", !isEnabled)} />
          </div>
          <span style={{ fontSize: 10, color: "#b0b0c8", textAlign: "right", maxWidth: 180 }}>
            {isEnabled ? "All WhatsApp automation is active" : "All WhatsApp messages are paused"}
          </span>
        </div>
      </div>
      
      {/* Disabled overlay */}
      {!isEnabled && (
        <div style={{ padding: "16px 20px", borderRadius: 12, background: "#fef3c7", border: "1px solid #fcd34d", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fbbf24", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            ⚠️
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e", marginBottom: 2 }}>WhatsApp Automation Disabled</div>
            <div style={{ fontSize: 12, color: "#78350f", lineHeight: 1.5 }}>
              All scheduled messages, reminders, confirmations, and automated WhatsApp features are currently paused. Toggle on to resume automation.
            </div>
          </div>
        </div>
      )}

      {/* Connection status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, border: `1px solid ${isConnected ? "#c4b5fd" : "#e8e8f4"}`, background: isConnected ? "rgba(124,58,237,0.06)" : "#fafafd", marginBottom: 22, opacity: isEnabled ? 1 : 0.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isConnected && isEnabled ? "var(--accent)" : "#d1d1e0" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: isConnected && isEnabled ? "var(--accent)" : "#9999b0" }}>
            {!activeCredential ? "Not configured" : !isEnabled ? "Disabled" : connectionState === "disconnected" ? "WhatsApp Disconnected" : connectionState === "connected" ? "WhatsApp Connected" : "WhatsApp Configured"}
          </span>
        </div>
        {isConnected && isEnabled && <span style={{ fontSize: 11, color: "#9999b0" }}>Scheduler runs every 60 seconds</span>}
      </div>

      {/* Credentials */}
      <div style={{ marginBottom: 22, opacity: isEnabled ? 1 : 0.5, pointerEvents: isEnabled ? "auto" : "none" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#7c7c9a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
          Provider & Credentials
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <Field label="Active Provider" hint="Switching provider affects every new WhatsApp message">
            <select style={inputStyle} value={form.provider} onChange={(e) => { set("provider", e.target.value as WhatsAppSettings["provider"]); setConnectionState("unknown"); setTestResult(null); }}>
              <option value="wasender">WaSenderAPI</option>
              <option value="botsailor">BotSailor</option>
              <option value="zaptick">Zaptick.io</option>
            </select>
          </Field>
          {form.provider === "wasender" ? <Field label="WaSender API Key" hint="wasenderapi.com → Dashboard → API Keys">
            <input
              style={inputStyle}
              type="password"
              value={form.apiKey}
              onChange={(e) => set("apiKey", e.target.value)}
              placeholder="your-api-key"
            />
          </Field> : form.provider === "botsailor" ? (
            <>
              <Field label="BotSailor API Token" hint="BotSailor → User menu → API Developer">
                <input style={inputStyle} type="password" value={form.botSailorApiToken} onChange={(e) => set("botSailorApiToken", e.target.value)} placeholder="your-botsailor-api-token" />
              </Field>
              <Field label="WhatsApp Phone Number ID" hint="Select the connected WhatsApp account in BotSailor">
                <input style={inputStyle} value={form.botSailorPhoneNumberId} onChange={(e) => set("botSailorPhoneNumberId", e.target.value)} placeholder="e.g. 119060000000000" />
              </Field>
              <div style={{ fontSize: 12, color: "#6b7280", background: "#fef3c7", padding: "12px 16px", borderRadius: 10, border: "1px solid #fcd34d", marginTop: 8 }}>
                ℹ️ <strong>BotSailor uses Meta Message Templates:</strong> You must create and get approval for message templates in your Meta Business Manager. Enter the template IDs below for each message type.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }}>
                <Field label="Reminder Template ID" hint="Template for appointment reminders">
                  <input style={inputStyle} value={form.botSailorTemplateReminder || ""} onChange={(e) => set("botSailorTemplateReminder", e.target.value)} placeholder="e.g. appointment_reminder" />
                </Field>
                <Field label="Confirmation Template ID" hint="Template for booking confirmations">
                  <input style={inputStyle} value={form.botSailorTemplateConfirmation || ""} onChange={(e) => set("botSailorTemplateConfirmation", e.target.value)} placeholder="e.g. booking_confirmation" />
                </Field>
                <Field label="Follow-up Template ID" hint="Template for post-visit follow-ups">
                  <input style={inputStyle} value={form.botSailorTemplateFollowup || ""} onChange={(e) => set("botSailorTemplateFollowup", e.target.value)} placeholder="e.g. followup_message" />
                </Field>
                <Field label="Cancellation Template ID" hint="Template for cancellation win-backs">
                  <input style={inputStyle} value={form.botSailorTemplateCancellation || ""} onChange={(e) => set("botSailorTemplateCancellation", e.target.value)} placeholder="e.g. cancellation_winback" />
                </Field>
                <Field label="Birthday Template ID" hint="Template for birthday greetings">
                  <input style={inputStyle} value={form.botSailorTemplateBirthday || ""} onChange={(e) => set("botSailorTemplateBirthday", e.target.value)} placeholder="e.g. birthday_greeting" />
                </Field>
              </div>
            </>
          ) : form.provider === "zaptick" ? (
            <>
              <Field label="Zaptick API Key" hint="Get your API key after connecting via Zaptick dashboard">
                <input style={inputStyle} type="password" value={form.zaptickApiKey} onChange={(e) => set("zaptickApiKey", e.target.value)} placeholder="your-zaptick-api-key" />
              </Field>
              
              {/* Zaptick Connection Guide */}
              <div style={{ gridColumn: "1 / -1", border: "2px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                <div style={{ background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Smartphone size={18} style={{ color: "#fff" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>Connect WhatsApp Business API</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.9)" }}>Secure setup via Facebook Business integration</div>
                  </div>
                </div>
                <div style={{ padding: "20px", background: "#fafafa", display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Step-by-step guide */}
                  <div style={{ display: "grid", gap: 14 }}>
                    {/* Step 1 */}
                    <div style={{ display: "flex", gap: 14, padding: "16px", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>1</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#1f2937", marginBottom: 4 }}>Open Zaptick Dashboard</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10, lineHeight: 1.5 }}>
                          Click the button below to open Zaptick. You'll need a Facebook Business account to connect.
                        </div>
                        <a 
                          href="https://app.zaptick.io/connect" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", boxShadow: "0 2px 6px rgba(6,182,212,0.3)" }}
                        >
                          <Smartphone size={14} />
                          Open Zaptick Dashboard →
                        </a>
                      </div>
                    </div>
                    
                    {/* Step 2 */}
                    <div style={{ display: "flex", gap: 14, padding: "16px", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>2</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#1f2937", marginBottom: 4 }}>Connect with Facebook</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, lineHeight: 1.5 }}>
                          Click "Connect with Facebook" button in Zaptick dashboard. This will:
                        </div>
                        <div style={{ fontSize: 11, color: "#4b5563", background: "#f9fafb", padding: "10px 12px", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                          ✓ Authenticate with Meta/Facebook<br/>
                          ✓ Link your WhatsApp Business Account<br/>
                          ✓ Activate templates and campaigns instantly<br/>
                          ✓ Secure, encrypted connection (Official Meta Partner)
                        </div>
                      </div>
                    </div>
                    
                    {/* Step 3 */}
                    <div style={{ display: "flex", gap: 14, padding: "16px", background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #059669, #047857)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, flexShrink: 0 }}>3</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#1f2937", marginBottom: 4 }}>Copy API Key & Save</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, lineHeight: 1.5 }}>
                          After connecting, Zaptick will show your API key. Copy it and paste it in the field above, then click "Save Changes" at the bottom of this page.
                        </div>
                        <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                          <Check size={14} />
                          You're all set! Start sending automated WhatsApp messages
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Visual connection indicator */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, padding: "16px", background: "#fff", borderRadius: 10, border: "1px dashed #cbd5e1" }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: "#eff6ff", border: "2px solid #3b82f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                        <span style={{ fontSize: 24 }}>f</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6" }}>Facebook</div>
                    </div>
                    <div style={{ fontSize: 20, color: "#cbd5e1" }}>→</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: "#f0fdfa", border: "2px solid #14b8a6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                        <Smartphone size={24} style={{ color: "#14b8a6" }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#14b8a6" }}>WhatsApp</div>
                    </div>
                    <div style={{ fontSize: 20, color: "#cbd5e1" }}>→</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: "#eff6ff", border: "2px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                        <Zap size={24} style={{ color: "#3b82f6" }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6" }}>Zaptick</div>
                    </div>
                    <div style={{ fontSize: 20, color: "#cbd5e1" }}>→</div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: "#f5f3ff", border: "2px solid #ddd6fe", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                        <Store size={24} style={{ color: "#7c3aed" }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>Werzio</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ fontSize: 12, color: "#6b7280", background: "#f9fafb", padding: "12px 16px", borderRadius: 10, border: "1px solid #e5e7eb", gridColumn: "1 / -1" }}>
                💡 <strong>Official Meta Partner:</strong> Zaptick connects via Facebook Business integration, giving you access to WhatsApp Business API with approved message templates, instant activation, and end-to-end encryption. Works with existing or new WhatsApp Business numbers.
              </div>
            </>
          ) : null}
          <Field label="Your WhatsApp Number" hint="International format — e.g. 923001234567 (for owner alerts)">
            <input
              style={inputStyle}
              value={form.ownerPhone}
              onChange={(e) => set("ownerPhone", e.target.value)}
              placeholder="923001234567"
            />
          </Field>
          {form.provider === "wasender" && <Field label="Booking WhatsApp Group" hint="Load groups joined by the connected salon number, then select one">
            <div style={{ display: "flex", gap: 8 }}>
              <select
                style={{ ...inputStyle, flex: 1 }}
                value={form.bookingGroupJid ?? ""}
                onChange={(e) => set("bookingGroupJid", e.target.value)}
              >
                <option value="">Select a WhatsApp group</option>
                {groups.map((group) => (
                  <option key={group.jid} value={group.jid}>{group.name}</option>
                ))}
                {form.bookingGroupJid && !groups.some((group) => group.jid === form.bookingGroupJid) && (
                  <option value={form.bookingGroupJid}>Previously selected group</option>
                )}
              </select>
              <button
                type="button"
                onClick={loadGroups}
                disabled={loadingGroups}
                style={{ whiteSpace: "nowrap", border: "1px solid var(--accent)", background: "#fff", color: "var(--accent)", borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: loadingGroups ? "wait" : "pointer" }}
              >
                {loadingGroups ? "Loading..." : "Load Groups"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={groupInviteLink}
                onChange={(e) => setGroupInviteLink(e.target.value)}
                placeholder="Or paste https://chat.whatsapp.com/..."
              />
              <button
                type="button"
                onClick={addGroupFromInvite}
                disabled={loadingGroups}
                style={{ whiteSpace: "nowrap", border: "1px solid #ddd6fe", background: "#f5f3ff", color: "var(--accent)", borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: loadingGroups ? "wait" : "pointer" }}
              >
                Use Invite Link
              </button>
            </div>
          </Field>}
          <div>
            {form.provider === "wasender" && <button
              type="button"
              onClick={testConnection}
              disabled={testing}
              style={{ border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", borderRadius: 9, padding: "8px 18px", fontSize: 12, fontWeight: 800, cursor: testing ? "wait" : "pointer" }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>}
            <button
              type="button"
              onClick={testGroup}
              disabled={testing}
              style={{ marginLeft: 8, border: "1px solid #ddd6fe", background: "#f5f3ff", color: "var(--accent)", borderRadius: 9, padding: "8px 18px", fontSize: 12, fontWeight: 800, cursor: testing ? "wait" : "pointer" }}
            >
              Test Group
            </button>
            {testResult && (
              <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 700, color: testResult.ok ? "#059669" : "#dc2626" }}>
                {testResult.msg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Automation toggles */}
      <div style={{ fontSize: 11, fontWeight: 800, color: "#7c7c9a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
        Automatic Messages
      </div>
      <div style={{ display: "grid", gap: 12, marginBottom: 22 }}>
        <AutoRow
          label="Appointment Reminder"
          hint="Sent automatically X hours before appointment"
          enabled={form.autoReminder}
          onToggle={() => set("autoReminder", !form.autoReminder)}
          extra={
            <ReminderLeadSelector
              hours={form.reminderHours}
              onChange={(value) => set("reminderHours", value)}
            />
          }
        />
        <AutoRow
          label="Booking Confirmation"
          hint="Sent when a new appointment is booked"
          enabled={form.autoConfirmation}
          onToggle={() => set("autoConfirmation", !form.autoConfirmation)}
        />
        {form.provider === "wasender" && <AutoRow
          label="New Booking Group Alert"
          hint="Send each online-booking summary to your WhatsApp group from the connected salon number"
          enabled={form.autoGroupBooking ?? false}
          onToggle={() => set("autoGroupBooking", !(form.autoGroupBooking ?? false))}
          extra={
            <div style={{ fontSize: 11, color: form.bookingGroupJid?.endsWith("@g.us") ? "#059669" : "#dc2626" }}>
              {form.bookingGroupJid?.endsWith("@g.us")
                ? "Group ID configured."
                : "Enter a valid Group ID ending in @g.us above."}
            </div>
          }
        />}
        {form.provider === "botsailor" && (
          <div style={{ border: "1px solid #e0e7ff", borderRadius: 12, padding: "13px 16px", background: "#f5f7ff", color: "#5b5b78", fontSize: 11, lineHeight: 1.6 }}>
            BotSailor sends to individual phone numbers. Booking-group alerts remain available when WaSenderAPI is selected.
          </div>
        )}
        <AutoRow
          label="Follow-up Message"
          hint="Sent after appointment is completed — ask for review or re-book"
          enabled={form.autoFollowup}
          onToggle={() => set("autoFollowup", !form.autoFollowup)}
          extra={
            <DelaySelector
              label="Send follow-up after"
              minutes={form.followupDelayMinutes ?? 1440}
              onChange={(v) => set("followupDelayMinutes", v)}
            />
          }
        />
        <AutoRow
          label="Cancellation Win-back"
          hint="Sent after cancellation with a discount to encourage re-booking"
          enabled={form.autoCancellation}
          onToggle={() => set("autoCancellation", !form.autoCancellation)}
          extra={
            <div style={{ display: "grid", gap: 10 }}>
              <DelaySelector
                label="Send win-back after"
                minutes={form.cancellationDelayMinutes ?? 1440}
                onChange={(v) => set("cancellationDelayMinutes", v)}
              />
              <Field label="Discount to offer" hint="Used in {{discount}} variable in the template">
                <input
                  style={inputStyle}
                  value={form.cancelDiscount ?? "10%"}
                  onChange={(e) => set("cancelDiscount", e.target.value)}
                  placeholder="e.g. 10% or PKR 500"
                />
              </Field>
            </div>
          }
        />
        <AutoRow
          label="Low Stock Alert"
          hint="Sent to your number once daily when items run low"
          enabled={form.autoLowStock}
          onToggle={() => set("autoLowStock", !form.autoLowStock)}
        />
      </div>

      {/* Safety controls */}
      <div style={{ fontSize: 11, fontWeight: 800, color: "#7c7c9a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
        Ban-risk Protection
      </div>
      <div style={{ display: "grid", gap: 12, marginBottom: 22 }}>
        <AutoRow
          label="WhatsApp Safety Guard"
          hint="Adds daily limits, recipient cooldowns, quiet hours, and opt-in checks before sending"
          enabled={form.safetyEnabled !== false}
          onToggle={() => set("safetyEnabled", !(form.safetyEnabled !== false))}
        />
        <AutoRow
          label="Emergency Pause"
          hint="Immediately blocks all WhatsApp sends if the account receives warnings or looks unstable"
          enabled={form.emergencyPause === true}
          onToggle={() => set("emergencyPause", !(form.emergencyPause === true))}
        />
        <AutoRow
          label="Quiet Hours for Marketing"
          hint="Marketing broadcasts wait outside these hours; utility invoices and appointment updates can still send"
          enabled={form.quietHoursEnabled !== false}
          onToggle={() => set("quietHoursEnabled", !(form.quietHoursEnabled !== false))}
          extra={
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              <Field label="Start">
                <input style={inputStyle} type="time" value={form.quietHoursStart ?? "21:00"} onChange={(event) => set("quietHoursStart", event.target.value)} />
              </Field>
              <Field label="End">
                <input style={inputStyle} type="time" value={form.quietHoursEnd ?? "09:00"} onChange={(event) => set("quietHoursEnd", event.target.value)} />
              </Field>
              <Field label="Timezone">
                <input style={inputStyle} value={form.quietHoursTimezone ?? "Asia/Karachi"} onChange={(event) => set("quietHoursTimezone", event.target.value)} placeholder="Asia/Karachi" />
              </Field>
            </div>
          }
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
          <Field label="Daily Send Limit" hint="Hard stop per running server instance">
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={form.dailySendLimit ?? 300}
              onChange={(event) => set("dailySendLimit", Number(event.target.value))}
            />
          </Field>
          <Field label="Per-client Daily Limit" hint="Prevents repeat blasts to one phone">
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={form.perRecipientDailyLimit ?? 12}
              onChange={(event) => set("perRecipientDailyLimit", Number(event.target.value))}
            />
          </Field>
          <Field label="Cooldown Seconds" hint="Minimum gap before texting the same client again">
            <input
              style={inputStyle}
              type="number"
              min={0}
              value={form.recipientCooldownSeconds ?? 15}
              onChange={(event) => set("recipientCooldownSeconds", Number(event.target.value))}
            />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <Field label="Random Delay Min" hint="Shortest random wait before each WhatsApp send, in minutes">
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={secondsToWholeMinutes(form.randomDelayMinSeconds, 5)}
              onChange={(event) => set("randomDelayMinSeconds", Number(event.target.value) * 60)}
            />
          </Field>
          <Field label="Random Delay Max" hint="Longest random wait before each WhatsApp send, in minutes">
            <input
              style={inputStyle}
              type="number"
              min={1}
              value={secondsToWholeMinutes(form.randomDelayMaxSeconds, 10)}
              onChange={(event) => set("randomDelayMaxSeconds", Number(event.target.value) * 60)}
            />
          </Field>
        </div>
        <AutoRow
          label="Block Marketing Without Opt-in"
          hint="When client opt-in data is available, promotional messages are blocked unless the client opted in"
          enabled={form.blockMarketingWithoutOptIn !== false}
          onToggle={() => set("blockMarketingWithoutOptIn", !(form.blockMarketingWithoutOptIn !== false))}
        />
        <div style={{ border: "1px solid #fed7aa", borderRadius: 12, padding: "13px 16px", background: "#fff7ed", color: "#9a3412", fontSize: 11, lineHeight: 1.6 }}>
          Recommended: keep broadcasts small, send only to opted-in clients, avoid repeated promotional wording, and use WhatsApp Business approved templates whenever you move to the official Cloud API.
        </div>
      </div>

      {/* Info box */}
      <div style={{ background: "#f5f4ff", border: "1px solid #ddd6fe", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)", marginBottom: 6 }}>How it works</div>
        <div style={{ fontSize: 12, color: "#5a5a78", lineHeight: 1.6 }}>
          Messages use the templates you set in the <strong>Messages</strong> page. Variables like{" "}
          <code style={{ background: "#ede9fe", borderRadius: 4, padding: "1px 5px", color: "#5B21B6" }}>{"{{name}}"}</code>,{" "}
          <code style={{ background: "#ede9fe", borderRadius: 4, padding: "1px 5px", color: "#5B21B6" }}>{"{{service}}"}</code>,{" "}
          <code style={{ background: "#ede9fe", borderRadius: 4, padding: "1px 5px", color: "#5B21B6" }}>{"{{date}}"}</code>{" "}
          are filled in automatically. No template approval needed.
        </div>
      </div>

      {saved && <SavedBanner />}
      <SaveButton onClick={save} />
    </section>
  );
}

function DecidrLoyaltySection() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg]       = useState("");

  async function updateClass() {
    setStatus("loading"); setMsg("");
    try {
      const salon   = settingsStore.salon as { name?: string; logo?: string };
      const logoUrl = salon.logo?.startsWith("https://") ? salon.logo : undefined;
      const res  = await fetch("/api/wallet/update-class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonName: salon.name || "Salon Central", logoUrl, bgColor: "#5B21B6" }),
      });
      const data = await res.json() as { ok: boolean; message?: string; error?: string };
      if (data.ok) { setStatus("ok");    setMsg(data.message ?? "Card updated!"); }
      else         { setStatus("error"); setMsg(data.error  ?? "Update failed");  }
    } catch (e) {
      setStatus("error"); setMsg(String(e));
    }
  }

  return (
    <section>
      <h2 style={{ margin: "0 0 6px", color: "#1d1d2f", fontSize: 20, fontWeight: 900 }}>Loyalty</h2>
      <p style={{ margin: "0 0 28px", color: "#9999b0", fontSize: 12 }}>
        Manage your Google Wallet loyalty card branding. Push your salon name and Salon Central theme to all client passes.
      </p>

      {/* Google Wallet card preview */}
      <div style={{ marginBottom: 24, borderRadius: 18, overflow: "hidden", background: "linear-gradient(135deg,#5B21B6,#7C3AED)", padding: "22px 24px", color: "#fff", position: "relative" }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Google Wallet</div>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 2 }}>{(settingsStore.salon as { name?: string }).name || "Your Salon"} Loyalty</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 18 }}>Powered by Salon Central</div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 16px", fontSize: 11 }}>
            <div style={{ opacity: 0.7, marginBottom: 2 }}>Points</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>0</div>
          </div>
          <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 16px", fontSize: 11 }}>
            <div style={{ opacity: 0.7, marginBottom: 2 }}>Tier</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Member</div>
          </div>
        </div>
      </div>

      {/* Update button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", border: "1px solid #ddd6fe", borderRadius: 14, background: "#faf9ff" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#1d1d2f" }}>Push branding to Google Wallet</div>
          <div style={{ fontSize: 11, color: "#9999b0", marginTop: 2 }}>Updates the salon name on all client loyalty cards.</div>
        </div>
        <button
          onClick={updateClass}
          disabled={status === "loading"}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 20px", borderRadius: 10, border: "none",
            fontSize: 13, fontWeight: 700, cursor: status === "loading" ? "wait" : "pointer", whiteSpace: "nowrap",
            background: status === "ok" ? "#dcfce7" : status === "error" ? "#fee2e2" : "linear-gradient(135deg,#5B21B6,#9333EA)",
            color:      status === "ok" ? "#14532d" : status === "error" ? "#991b1b" : "#fff",
          }}
        >
          {status === "loading" ? "Updating…" : status === "ok" ? "✓ Updated!" : status === "error" ? "✗ Failed" : "Update Card"}
        </button>
      </div>
      {msg && (
        <div style={{ fontSize: 11, color: status === "ok" ? "#059669" : "#dc2626", marginTop: 8, fontWeight: 500, paddingLeft: 4 }}>{msg}</div>
      )}
    </section>
  );
}

function VirtualTryOnSection() {
  const [token, setToken] = useState(() => (settingsStore.huggingface as { apiToken: string }).apiToken || "");
  const [saved, setSaved] = useState(false);

  function save() {
    (settingsStore.huggingface as { apiToken: string }).apiToken = token.trim();
    saveSettings();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <section>
      <h2 style={{ margin: "0 0 6px", color: "#1d1d2f", fontSize: 20, fontWeight: 900 }}>Virtual Try-On</h2>
      <p style={{ margin: "0 0 24px", color: "#9999b0", fontSize: 12 }}>
        Powered by Qwen Image Edit AI — edits your actual photo directly. Free to use, token optional for higher rate limits.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, border: `1px solid ${token ? "#c4b5fd" : "#bbf7d0"}`, background: token ? "rgba(124,58,237,0.06)" : "#ecfdf5", marginBottom: 22 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: token ? "var(--accent)" : "#059669" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: token ? "var(--accent)" : "#059669" }}>
          {token ? "✨ Hugging Face connected — higher rate limits active" : "✅ Free tier active — no token needed"}
        </span>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Hugging Face API Token (Optional)" hint="huggingface.co/settings/tokens — Gives higher rate limits and shorter queue times">
          <input
            type="password"
            style={inputStyle}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="hf_••••••••••••••••••••••••••••••••••••"
          />
        </Field>
        <div style={{ background: "#f5f4ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#5a5a78", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--accent)", display: "block", marginBottom: 6 }}>🎨 Qwen Image Edit — Real Photo Editing</strong>
          <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 4 }}>
            <li><strong>Edits your actual photo</strong> — Not a generated image</li>
            <li><strong>Hair color, style, makeup</strong> — Instruction-based editing</li>
            <li><strong>Face preserved</strong> — Only the requested area changes</li>
            <li><strong>Model:</strong> Qwen/Qwen-Image-Edit-2511</li>
          </ul>
        </div>
        <div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#047857", lineHeight: 1.6 }}>
          <strong>How to get your Hugging Face token:</strong>
          <ol style={{ margin: "6px 0 0 0", paddingLeft: 20, display: "grid", gap: 4 }}>
            <li>Go to <strong>huggingface.co</strong> and sign up / log in</li>
            <li>Go to <strong>Settings → Access Tokens</strong></li>
            <li>Click <strong>New token</strong> → select <strong>Read</strong> or <strong>Write</strong></li>
            <li>Copy the token (starts with <strong>hf_</strong>)</li>
            <li>Paste it above and save</li>
          </ol>
        </div>
      </div>

      {saved && <div style={{ marginTop: 16 }}><SavedBanner text="Hugging Face token saved successfully." /></div>}
      <SaveButton label="Save Token" onClick={save} />
    </section>
  );
}

type AccessRole = "staff" | "manager";

interface RoleDraft {
  email: string;
  password: string;
  role: AccessRole;
  locationId: string;
  permissions: string[];
}

const DEFAULT_STAFF_PERMISSIONS = ["dashboard", "calendar", "appointments", "clients", "pos", "invoices"];
const PERMISSION_OPTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "calendar", label: "Calendar" },
  { key: "appointments", label: "Appointments" },
  { key: "clients", label: "Clients" },
  { key: "pos", label: "POS" },
  { key: "invoices", label: "Invoices" },
  { key: "loyalty", label: "Loyalty" },
  { key: "revenue", label: "Revenue" },
  { key: "cash-flow", label: "Cash Flow" },
  { key: "inventory", label: "Inventory" },
  { key: "services", label: "Services" },
  { key: "staff", label: "Staff" },
  { key: "messages", label: "WhatsApp" },
  { key: "try-on", label: "Virtual Try-On" },
];

// Routes that are always owner-only (not available for staff/manager assignment)
const OWNER_ONLY_ROUTES = ["account", "billing", "admin", "migrate", "settings"];

function RolesPermissionsSection() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [locations, setLocations] = useState<SalonLocation[]>([]);
  const [loginUsers, setLoginUsers] = useState<AuthUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RoleDraft>>({});
  const [savingId, setSavingId] = useState("");
  const [savedId, setSavedId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const staff = getStoredStaff();
    const branchList = getSalonLocations();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4500);
    setStaffList(staff);
    setLocations(branchList);

    fetch("/api/auth/staff", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: { ok?: boolean; users?: AuthUser[] }) => {
        const users = data.ok && Array.isArray(data.users) ? data.users : [];
        setLoginUsers(users);
        setDrafts(buildDrafts(staff, users, branchList));
      })
      .catch(() => {
        setDrafts(buildDrafts(staff, [], branchList));
        setError("Existing staff login records are taking too long to load. You can still create or update access from here.");
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  function buildDrafts(staff: Staff[], users: AuthUser[], branchList: SalonLocation[]) {
    const fallbackLocation = branchList[0]?.id || getDefaultLocationId();
    return staff.reduce<Record<string, RoleDraft>>((acc, member) => {
      const login = users.find((user) => user.staffId === member.id);
      const isManager = login?.role === "manager" || login?.permissions?.includes("*");
      acc[member.id] = {
        email: login?.email || member.email || "",
        password: "",
        role: isManager ? "manager" : "staff",
        locationId: login?.locationId || fallbackLocation,
        permissions: isManager ? DEFAULT_STAFF_PERMISSIONS : (login?.permissions?.length ? login.permissions.filter((p) => p !== "*") : DEFAULT_STAFF_PERMISSIONS),
      };
      return acc;
    }, {});
  }

  function updateDraft(staffId: string, patch: Partial<RoleDraft>) {
    setDrafts((current) => ({
      ...current,
      [staffId]: { ...current[staffId], ...patch },
    }));
  }

  function togglePermission(staffId: string, permission: string) {
    const draft = drafts[staffId];
    if (!draft || permission === "dashboard") return;
    const hasPermission = draft.permissions.includes(permission);
    const next = hasPermission
      ? draft.permissions.filter((item) => item !== permission)
      : [...draft.permissions, permission];
    updateDraft(staffId, { permissions: Array.from(new Set(["dashboard", ...next])) });
  }

  async function saveAccess(member: Staff) {
    const draft = drafts[member.id];
    if (!draft || !draft.email.trim()) {
      setError("Staff login email is required.");
      return;
    }
    const existing = loginUsers.find((user) => user.staffId === member.id);
    if (!existing && draft.password.length < 8) {
      setError("New staff login password must be at least 8 characters.");
      return;
    }

    setSavingId(member.id);
    setSavedId("");
    setError("");
    try {
      const response = await fetch("/api/auth/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: member.id,
          name: member.name,
          email: draft.email,
          phone: member.phone || "",
          password: draft.password || undefined,
          role: draft.role,
          locationId: draft.locationId,
          permissions: draft.permissions,
        }),
      });
      const result = await response.json() as { ok?: boolean; user?: AuthUser; error?: string };
      if (!response.ok || !result.ok || !result.user) throw new Error(result.error || "Unable to save staff access.");

      setLoginUsers((current) => {
        const others = current.filter((user) => user.staffId !== member.id);
        return [...others, result.user!];
      });
      updateDraft(member.id, { password: "" });
      setSavedId(member.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save staff access.");
    } finally {
      setSavingId("");
    }
  }

  const chipStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    background: "#f5f3ff",
    color: "#6d28d9",
    fontSize: 11,
    fontWeight: 850,
  };

  return (
    <section>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: "0 0 6px", color: "#1d1d2f", fontSize: 20, fontWeight: 900 }}>Roles & Permissions</h2>
          <p style={{ margin: 0, color: "#8d89a2", fontSize: 13, lineHeight: 1.6 }}>
            Create staff logins, choose manager/admin-style access, and control which dashboard pages each staff member can open.
          </p>
        </div>
        <span style={chipStyle}><KeyRound size={13} /> Login access</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 22 }}>
        <div style={{ border: "1px solid #ece9f5", borderRadius: 16, padding: 16, background: "#fbfaff" }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: "#ede9fe", color: "#7c3aed", display: "grid", placeItems: "center", marginBottom: 10 }}><Shield size={17} /></div>
          <div style={{ fontWeight: 900, color: "#242238", marginBottom: 4 }}>Owner/Admin</div>
          <div style={{ color: "#8d89a2", fontSize: 12, lineHeight: 1.55 }}>Salon owner account keeps full access from the main sign-in profile.</div>
        </div>
        <div style={{ border: "1px solid #ece9f5", borderRadius: 16, padding: 16, background: "#fff" }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: "#ecfeff", color: "#0891b2", display: "grid", placeItems: "center", marginBottom: 10 }}><UserCog size={17} /></div>
          <div style={{ fontWeight: 900, color: "#242238", marginBottom: 4 }}>Manager</div>
          <div style={{ color: "#8d89a2", fontSize: 12, lineHeight: 1.55 }}>Gives full dashboard access for a trusted branch/admin user.</div>
        </div>
        <div style={{ border: "1px solid #ece9f5", borderRadius: 16, padding: 16, background: "#fff" }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: "#f0fdf4", color: "#16a34a", display: "grid", placeItems: "center", marginBottom: 10 }}><MapPin size={17} /></div>
          <div style={{ fontWeight: 900, color: "#242238", marginBottom: 4 }}>Staff</div>
          <div style={{ color: "#8d89a2", fontSize: 12, lineHeight: 1.55 }}>Limited to assigned branch data and only the selected pages.</div>
        </div>
      </div>

      {error && <div style={{ marginBottom: 16, padding: "11px 13px", borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>{error}</div>}

      {staffList.length === 0 ? (
        <div style={{ border: "1px dashed #d9d4e8", borderRadius: 18, padding: 28, textAlign: "center", color: "#8d89a2" }}>
          Add staff members first, then return here to create their login access.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {staffList.map((member) => {
            const draft = drafts[member.id];
            if (!draft) return null;
            const existing = loginUsers.find((user) => user.staffId === member.id);
            const isManager = draft.role === "manager";
            return (
              <div key={member.id} style={{ border: "1px solid #ece9f5", borderRadius: 18, padding: 18, background: "#fff", boxShadow: "0 8px 22px rgba(40,24,80,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: member.color || "#7c3aed", color: "#fff", display: "grid", placeItems: "center", fontWeight: 900 }}>
                    {member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, color: "#202033", fontSize: 15 }}>{member.name}</div>
                    <div style={{ color: "#9691a8", fontSize: 12, textTransform: "capitalize" }}>{member.role.replace(/-/g, " ")} · {existing ? "Login active" : "No login yet"}</div>
                  </div>
                  {savedId === member.id && <SavedBanner text="Access saved." />}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, alignItems: "end", marginBottom: 16 }}>
                  <Field label="Login Email">
                    <input style={inputStyle} type="email" value={draft.email} onChange={(e) => updateDraft(member.id, { email: e.target.value })} placeholder="staff@salon.com" />
                  </Field>
                  <Field label={existing ? "New Password" : "Password"} hint={existing ? "Leave blank to keep current." : "Minimum 8 characters."}>
                    <input style={inputStyle} type="password" value={draft.password} onChange={(e) => updateDraft(member.id, { password: e.target.value })} placeholder={existing ? "Optional" : "Required"} />
                  </Field>
                  <Field label="Access Role">
                    <select style={inputStyle} value={draft.role} onChange={(e) => updateDraft(member.id, { role: e.target.value as AccessRole })}>
                      <option value="staff">Staff — custom access</option>
                      <option value="manager">Manager/Admin — full access</option>
                    </select>
                  </Field>
                  <Field label="Assigned Location">
                    <select style={inputStyle} value={draft.locationId} onChange={(e) => updateDraft(member.id, { locationId: e.target.value })}>
                      {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                    </select>
                  </Field>
                </div>

                <div style={{ border: "1px solid #f0eef7", borderRadius: 14, padding: 14, background: isManager ? "#fafafa" : "#fcfbff" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div style={{ color: "#29263d", fontSize: 12, fontWeight: 900, letterSpacing: ".04em", textTransform: "uppercase" }}>Page permissions</div>
                    {isManager && <span style={{ color: "#059669", fontSize: 12, fontWeight: 800 }}>Full access enabled</span>}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, opacity: isManager ? 0.45 : 1 }}>
                    {PERMISSION_OPTIONS.map((permission) => {
                      const checked = isManager || draft.permissions.includes(permission.key);
                      const locked = isManager || permission.key === "dashboard";
                      return (
                        <button
                          key={permission.key}
                          type="button"
                          disabled={locked}
                          onClick={() => togglePermission(member.id, permission.key)}
                          style={{
                            border: checked ? "1px solid rgba(124,58,237,.32)" : "1px solid #ebe8f3",
                            background: checked ? "#f5f3ff" : "#fff",
                            color: checked ? "#6d28d9" : "#77728a",
                            borderRadius: 11,
                            padding: "9px 10px",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: locked ? "default" : "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span style={{ width: 16, height: 16, borderRadius: 5, background: checked ? "#7c3aed" : "#f2f0f7", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
                            {checked && <Check size={11} strokeWidth={3} />}
                          </span>
                          {permission.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <SaveButton label={savingId === member.id ? "Saving..." : "Save Access"} disabled={savingId === member.id} onClick={() => saveAccess(member)} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SectionContent({ active }: { active: SectionId }) {
  if (active === "profile")  return <ProfileSection />;
  if (active === "salon")    return <SalonProfile />;
  if (active === "hours")    return <BusinessHours />;
  if (active === "roles")    return <RolesPermissionsSection />;
  if (active === "security") return <Security />;
  if (active === "decidr")   return <DecidrLoyaltySection />;
  if (active === "tryon")    return <VirtualTryOnSection />;
  return <WhatsAppSection />;
}

export default function AccountPage() {
  const router = useRouter();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  const SECTIONS = isAdmin
    ? [...BASE_SECTIONS,
        { id: "decidr" as SectionId, label: "Loyalty",        icon: Banknote },
        { id: "tryon"  as SectionId, label: "Virtual Try-On", icon: Wand2    },
      ]
    : BASE_SECTIONS;
  const [active, setActive]               = useState<SectionId>("profile");
  const [mobileScreen, setMobileScreen]   = useState<"menu" | SectionId>("menu");

  const initials = (currentUser?.ownerName || "?")
    .split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  async function handleSignOut() {
    await signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  const activeSection = SECTIONS.find(s => s.id === mobileScreen);

  return (
    <div className="dashboard-polish" style={{ minHeight: "100vh", background: "linear-gradient(180deg,#f7f5fc 0%,#f4f5f8 42%,#f6f7f9 100%)" }}>

      {/* ══════════ MOBILE LAYOUT ══════════ */}

      {/* Mobile app bar */}
      {mobileScreen === "menu" ? (
        <MobilePageHeader
          title="Account"
          subtitle="Salon profile & preferences"
        />
      ) : (
        <MobilePageHeader
          title={activeSection?.label ?? ""}
          left={
            <button
              type="button"
              onClick={() => setMobileScreen("menu")}
              style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: "0 4px 0 0" }}
            >
              <ChevronLeft size={22} color="var(--accent)" />
            </button>
          }
        />
      )}

      {/* Mobile menu view */}
      {mobileScreen === "menu" && (
        <div className="mobile-only">
          {/* Profile hero */}
          <div className="mobile-hero-card">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(255,255,255,0.2)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "#fff", border: "2px solid rgba(255,255,255,0.35)" }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser?.ownerName || "—"}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentUser?.email}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                  {currentUser?.salonName}
                </div>
              </div>
            </div>
            {currentUser?.createdAt && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Member since</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
                  {new Date(currentUser.createdAt).toLocaleDateString("en-PK", { month: "long", year: "numeric" })}
                </span>
              </div>
            )}
          </div>

          {/* Settings nav list */}
          <div className="mobile-section-header">Preferences</div>
          <div className="mobile-settings-group">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const iconBgs: Record<string, string> = {
                profile: "#EDE9FE", salon: "#e0f2fe", hours: "#fef9c3",
                roles: "#f5f3ff", security: "#fef2f2", whatsapp: "#dcfce7", decidr: "#ecfdf5", tryon: "#fdf4ff",
              };
              const iconColors: Record<string, string> = {
                profile: "#7C3AED", salon: "#0284c7", hours: "#ca8a04",
                roles: "#6d28d9", security: "#dc2626", whatsapp: "#16a34a", decidr: "#059669", tryon: "#a21caf",
              };
              return (
                <button
                  key={section.id}
                  type="button"
                  className="mobile-settings-row"
                  onClick={() => setMobileScreen(section.id)}
                >
                  <div className="mobile-settings-row-icon" style={{ background: iconBgs[section.id] || "#f4f4fb" }}>
                    <Icon size={18} color={iconColors[section.id] || "#7C3AED"} />
                  </div>
                  <div className="mobile-settings-row-body">
                    <div className="mobile-settings-row-label">{section.label}</div>
                  </div>
                  <ChevronRight size={16} className="mobile-settings-chevron" />
                </button>
              );
            })}
          </div>

          {/* Sign out */}
          <div className="mobile-section-header">Account</div>
          <div className="mobile-settings-group">
            <button type="button" className="mobile-settings-row" onClick={handleSignOut}>
              <div className="mobile-settings-row-icon" style={{ background: "#fef2f2" }}>
                <LogOut size={18} color="#dc2626" />
              </div>
              <div className="mobile-settings-row-body">
                <div className="mobile-settings-row-label" style={{ color: "#dc2626" }}>Sign Out</div>
              </div>
            </button>
          </div>

          <div style={{ height: 24 }} />
        </div>
      )}

      {/* Mobile section detail */}
      {mobileScreen !== "menu" && (
        <div className="mobile-only account-mobile-content">
          <SectionContent active={mobileScreen as SectionId} />
        </div>
      )}

      {/* ══════════ DESKTOP LAYOUT ══════════ */}
      <div className="desktop-only" style={{ padding: "34px 36px 48px", maxWidth: 1500, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <PageTitle
            icon={<User size={24} />}
            title="Account & preferences"
            subtitle="Manage your salon identity, operations, security, and connected services."
          />
          <button onClick={handleSignOut} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #fecaca", background: "rgba(255,255,255,.85)", color: "#dc2626", borderRadius: 12, padding: "11px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 5px 15px rgba(40,20,60,.05)" }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "250px minmax(0,1fr)", gap: 24, alignItems: "start" }}>
          <aside style={{ background: "rgba(255,255,255,.82)", border: "1px solid rgba(227,224,238,.9)", borderRadius: 20, padding: 10, alignSelf: "start", boxShadow: "0 12px 35px rgba(40,24,80,.06)", backdropFilter: "blur(12px)" }}>
            <div style={{ padding: "10px 12px 12px", color: "#aaa6b8", fontSize: 9, fontWeight: 900, letterSpacing: ".13em", textTransform: "uppercase" }}>Account settings</div>
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = active === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  style={{ width: "100%", minHeight: 50, display: "flex", alignItems: "center", gap: 11, padding: "7px 10px", marginBottom: 4, border: isActive ? "1px solid rgba(124,58,237,.14)" : "1px solid transparent", borderRadius: 12, background: isActive ? "linear-gradient(135deg,rgba(124,58,237,.12),rgba(147,51,234,.07))" : "transparent", color: isActive ? "var(--accent)" : "#747087", fontSize: 13, fontWeight: isActive ? 800 : 650, cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", background: isActive ? "#fff" : "#f6f4fa", boxShadow: isActive ? "0 4px 10px rgba(91,33,182,.1)" : "none" }}>
                    <Icon size={15} />
                  </span>
                  <span style={{ flex: 1 }}>{section.label}</span>
                  <ChevronRight size={14} color={isActive ? "var(--accent)" : "#c2bfce"} />
                </button>
              );
            })}
          </aside>

          <main style={{ background: "rgba(255,255,255,.94)", border: "1px solid rgba(227,224,238,.95)", borderRadius: 22, padding: "38px 40px", minHeight: 560, boxShadow: "0 18px 50px rgba(40,24,80,.07)" }}>
            <SectionContent active={active} />
          </main>
        </div>
      </div>
    </div>
  );
}
