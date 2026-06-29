"use client";

import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Banknote, Check, ChevronLeft, ChevronRight, Clock, ImageIcon, LogOut, Save, Shield, Smartphone, Store, Trash2, User, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut, updateCurrentPassword, updateCurrentUser } from "@/lib/auth";
import { saveSettings, settingsStore } from "@/lib/settings-store";
import MobilePageHeader from "@/components/mobile-page-header";

type SectionId = "profile" | "salon" | "hours" | "security" | "whatsapp" | "decidr" | "tryon";

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
  { id: "security", label: "Security",        icon: Shield },
  { id: "whatsapp", label: "WhatsApp",        icon: Smartphone },
];

const inputStyle: CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid #e4e4ee",
  fontSize: 13,
  color: "#29293d",
  outline: "none",
  background: "#fff",
};

function Field({ label, children, full = false, hint }: { label: string; children: ReactNode; full?: boolean; hint?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8, gridColumn: full ? "1 / -1" : undefined }}>
      <span style={{ color: "#242438", fontSize: 13, fontWeight: 800 }}>{label}</span>
      {children}
      {hint && <span style={{ color: "#9999b0", fontSize: 11 }}>{hint}</span>}
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
    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 18, borderTop: "1px solid #eeeeF6", marginTop: 22 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "none",
          borderRadius: 10,
          padding: "12px 24px",
          background: disabled ? "#e8e8f0" : "var(--accent)",
          color: disabled ? "#aaaabc" : "#fff",
          fontSize: 13,
          fontWeight: 800,
          cursor: disabled ? "not-allowed" : "pointer",
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
        padding: "22px 24px", marginBottom: 30,
        background: "linear-gradient(135deg, #5B21B6 0%, #9333EA 100%)",
        borderRadius: 16,
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "rgba(255,255,255,0.2)", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 900, color: "#fff",
          border: "2px solid rgba(255,255,255,0.35)",
        }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>{user?.ownerName}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>{user?.email}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{user?.salonName}</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Member since</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 700, marginTop: 2 }}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-PK", { month: "short", year: "numeric" }) : "—"}
          </div>
        </div>
      </div>

      <h2 style={{ margin: "0 0 22px", color: "#1d1d2f", fontSize: 20, fontWeight: 900 }}>My Profile</h2>

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

  function save() {
    if (!canSave) return;
    setError("");
    try {
      updateCurrentPassword(form.current, form.next);
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
  apiKey: string;
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
    if (!form.apiKey) {
      setTestResult({ ok: false, msg: "Enter your WaSender API key first." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/whatsapp/status?force=1&apiKey=${encodeURIComponent(form.apiKey)}`);
      const data = await res.json();
      if (data.connected) {
        setConnectionState("connected");
        setTestResult({ ok: true, msg: "Connected! The salon WhatsApp session is active." });
      } else {
        setConnectionState("disconnected");
        setTestResult({ ok: false, msg: data.message || "Session disconnected. Reconnect it in WaSender and copy its current API key." });
      }
    } catch {
      setConnectionState("disconnected");
      setTestResult({ ok: false, msg: "Could not reach WaSender API. Check your internet connection." });
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
          phone: form.bookingGroupJid,
          text: "Werzio booking group connected ✅",
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
          : "No groups found. Make sure the connected salon number is a member of the group.",
      });
    } catch {
      setGroups([]);
      setTestResult({ ok: false, msg: "Could not reach WaSender API. Check your connection." });
    } finally {
      setLoadingGroups(false);
    }
  }

  const isConnected = !!form.apiKey && connectionState !== "disconnected";

  return (
    <section>
      <h2 style={{ margin: "0 0 6px", color: "#1d1d2f", fontSize: 20, fontWeight: 900 }}>WhatsApp Automation</h2>
      <p style={{ margin: "0 0 24px", color: "#9999b0", fontSize: 12 }}>
        Powered by <strong style={{ color: "#1d1d2f" }}>WaSenderAPI</strong> — connect your WhatsApp number at{" "}
        <span style={{ color: "var(--accent)", fontWeight: 700 }}>wasenderapi.com</span>, then paste your API key below.
      </p>

      {/* Connection status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, border: `1px solid ${isConnected ? "#c4b5fd" : "#e8e8f4"}`, background: isConnected ? "rgba(124,58,237,0.06)" : "#fafafd", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isConnected ? "var(--accent)" : "#d1d1e0" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: isConnected ? "var(--accent)" : "#9999b0" }}>
            {!form.apiKey ? "Not configured" : connectionState === "disconnected" ? "WhatsApp Disconnected" : connectionState === "connected" ? "WhatsApp Connected" : "WhatsApp Configured"}
          </span>
        </div>
        {isConnected && <span style={{ fontSize: 11, color: "#9999b0" }}>Scheduler runs every 60 seconds</span>}
      </div>

      {/* Credentials */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#7c7c9a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
          WaSender Credentials
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <Field label="API Key" hint="wasenderapi.com → Dashboard → API Keys">
            <input
              style={inputStyle}
              type="password"
              value={form.apiKey}
              onChange={(e) => set("apiKey", e.target.value)}
              placeholder="your-api-key"
            />
          </Field>
          <Field label="Your WhatsApp Number" hint="International format — e.g. 923001234567 (for owner alerts)">
            <input
              style={inputStyle}
              value={form.ownerPhone}
              onChange={(e) => set("ownerPhone", e.target.value)}
              placeholder="923001234567"
            />
          </Field>
          <Field label="Booking WhatsApp Group" hint="Load groups joined by the connected salon number, then select one">
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
          </Field>
          <div>
            <button
              type="button"
              onClick={testConnection}
              disabled={testing}
              style={{ border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", borderRadius: 9, padding: "8px 18px", fontSize: 12, fontWeight: 800, cursor: testing ? "wait" : "pointer" }}
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
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
            <Field label="Hours before appointment">
              <select style={inputStyle} value={form.reminderHours} onChange={(e) => set("reminderHours", Number(e.target.value))}>
                <option value={1}>1 hour before</option>
                <option value={2}>2 hours before</option>
                <option value={4}>4 hours before</option>
                <option value={12}>12 hours before</option>
                <option value={24}>24 hours before</option>
                <option value={48}>48 hours before</option>
              </select>
            </Field>
          }
        />
        <AutoRow
          label="Booking Confirmation"
          hint="Sent when a new appointment is booked"
          enabled={form.autoConfirmation}
          onToggle={() => set("autoConfirmation", !form.autoConfirmation)}
        />
        <AutoRow
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
        />
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
        body: JSON.stringify({ salonName: salon.name || "Werzio", logoUrl, bgColor: "#5B21B6" }),
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
        Manage your Google Wallet loyalty card branding. Push your salon name and Werzio theme to all client passes.
      </p>

      {/* Google Wallet card preview */}
      <div style={{ marginBottom: 24, borderRadius: 18, overflow: "hidden", background: "linear-gradient(135deg,#5B21B6,#7C3AED)", padding: "22px 24px", color: "#fff", position: "relative" }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Google Wallet</div>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 2 }}>{(settingsStore.salon as { name?: string }).name || "Your Salon"} Loyalty</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 18 }}>Powered by Werzio</div>
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

function SectionContent({ active }: { active: SectionId }) {
  if (active === "profile")  return <ProfileSection />;
  if (active === "salon")    return <SalonProfile />;
  if (active === "hours")    return <BusinessHours />;
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
    <div style={{ minHeight: "100vh", background: "#f5f6f9" }}>

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
                security: "#fef2f2", whatsapp: "#dcfce7", decidr: "#ecfdf5", tryon: "#fdf4ff",
              };
              const iconColors: Record<string, string> = {
                profile: "#7C3AED", salon: "#0284c7", hours: "#ca8a04",
                security: "#dc2626", whatsapp: "#16a34a", decidr: "#059669", tryon: "#a21caf",
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
      <div className="desktop-only" style={{ padding: "28px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <h1 style={{ margin: 0, color: "#1d1d2f", fontSize: 22, fontWeight: 900 }}>Account</h1>
            <p style={{ margin: "5px 0 0", color: "#9393aa", fontSize: 12 }}>Manage your salon profile, operations, and account preferences.</p>
          </div>
          <button onClick={handleSignOut} style={{ display: "flex", alignItems: "center", gap: 7, border: "1px solid #fecaca", background: "#fff", color: "#dc2626", borderRadius: 20, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 22 }}>
          <aside style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 16, overflow: "hidden", alignSelf: "start", boxShadow: "0 1px 4px rgba(20,20,40,0.03)" }}>
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = active === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  style={{ width: "100%", height: 56, display: "flex", alignItems: "center", gap: 14, padding: "0 20px", border: "none", borderLeft: isActive ? "4px solid var(--accent)" : "4px solid transparent", background: isActive ? "var(--accent-dim)" : "#fff", color: isActive ? "var(--accent)" : "#8989a6", fontSize: 15, fontWeight: isActive ? 900 : 600, cursor: "pointer", textAlign: "left" }}
                >
                  <Icon size={18} />
                  <span style={{ flex: 1 }}>{section.label}</span>
                  <ChevronRight size={17} color={isActive ? "var(--accent)" : "#b8b8c8"} />
                </button>
              );
            })}
          </aside>

          <main style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 16, padding: "32px 34px", minHeight: 520, boxShadow: "0 1px 4px rgba(20,20,40,0.03)" }}>
            <SectionContent active={active} />
          </main>
        </div>
      </div>
    </div>
  );
}
