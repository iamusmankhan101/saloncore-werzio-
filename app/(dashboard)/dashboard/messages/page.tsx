"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MessageSquare, CheckCircle2, XCircle, Clock, Send, RefreshCw,
  Zap, Bell, ThumbsUp, Package, ChevronRight, Phone, Copy, Check,
  Eye, EyeOff, Save, TrendingUp, Wifi, WifiOff, Calendar, AlertCircle, Cake, CalendarX, CalendarPlus,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard-header";
import MobilePageHeader from "@/components/mobile-page-header";
import { saveSettings, settingsStore } from "@/lib/settings-store";
import { getStoredClients } from "@/lib/storage";
import { getWaLogs, appendLog, WaLogEntry, WaMsgType, normalizePhone, enqueueWhatsAppCancellation, checkBirthdayReminders } from "@/lib/whatsapp-scheduler";
import { getCurrentUser, userKey } from "@/lib/auth";
import { getCurrentPlan } from "@/lib/plan-limits";
import type { Client } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<WaMsgType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  reminder:     { label: "Reminder",     color: "#7C3AED", bg: "rgba(124,58,237,0.1)",  icon: Bell },
  confirmation: { label: "Confirmation", color: "#059669", bg: "rgba(5,150,105,0.1)",   icon: CheckCircle2 },
  followup:     { label: "Follow-up",    color: "#0284c7", bg: "rgba(2,132,199,0.1)",   icon: ThumbsUp },
  cancellation: { label: "Cancellation", color: "#dc2626", bg: "rgba(220,38,38,0.1)",   icon: CalendarX },
  lowstock:     { label: "Low Stock",    color: "#ea580c", bg: "rgba(234,88,12,0.1)",   icon: Package },
  manual:       { label: "Manual",       color: "#6b7280", bg: "rgba(107,114,128,0.1)", icon: Send },
  birthday:     { label: "Birthday",     color: "#db2777", bg: "rgba(219,39,119,0.1)",  icon: Cake },
  new_booking:  { label: "New Booking",  color: "#0284c7", bg: "rgba(2,132,199,0.1)",   icon: CalendarPlus },
};

const SAMPLE_VARS: Record<string, string> = {
  name: "Fatima",
  service: "Haircut & Style",
  date: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
  time: "3:00pm",
  salon_name: (settingsStore.salon as { name: string }).name,
  items: "Loreal Hair Color (2 left), OPI Nail Polish (1 left)",
  count: "2",
  discount: "10%",
  amount: "2500",
};

const TPL_CONFIG: { key: "reminder" | "confirmation" | "followup" | "cancellation" | "lowstock" | "birthday" | "newBooking"; label: string; description: string; vars: string[]; color: string; icon: React.ElementType }[] = [
  { key: "reminder",     label: "Appointment Reminder",    description: "Sent automatically X hours before the appointment",              vars: ["name","service","date","time","salon_name"],          color: "#7C3AED", icon: Bell },
  { key: "confirmation", label: "Booking Confirmation",    description: "Sent when a new appointment is booked",                          vars: ["name","service","date","time","salon_name"],          color: "#059669", icon: CheckCircle2 },
  { key: "followup",     label: "Follow-up Message",       description: "Sent 24h after appointment is marked as completed",              vars: ["name","service","salon_name"],                        color: "#0284c7", icon: ThumbsUp },
  { key: "cancellation", label: "Cancellation Win-back",   description: "Sent 24h after cancellation with a discount to re-book",        vars: ["name","salon_name","discount"],                       color: "#dc2626", icon: CalendarX },
  { key: "newBooking",   label: "New Online Booking Alert",description: "Sent to salon owner when a client books via the online page",    vars: ["name","service","date","time","salon_name","amount"], color: "#0284c7", icon: CalendarPlus },
  { key: "lowstock",     label: "Low Stock Alert",         description: "Sent once daily to your WhatsApp when stock is low",             vars: ["items","count","salon_name"],                         color: "#ea580c", icon: Package },
  { key: "birthday",     label: "Birthday Greeting",       description: "Auto-sent on client's birthday at 9 AM (server cron)",          vars: ["name","salon_name","discount"],                       color: "#db2777", icon: Cake },
];

const FILTERS: { value: WaMsgType | "all"; label: string }[] = [
  { value: "all",          label: "All" },
  { value: "reminder",     label: "Reminders" },
  { value: "confirmation", label: "Confirmations" },
  { value: "followup",     label: "Follow-ups" },
  { value: "cancellation", label: "Cancellations" },
  { value: "new_booking",  label: "New Bookings" },
  { value: "birthday",     label: "Birthdays" },
  { value: "lowstock",     label: "Low Stock" },
  { value: "manual",       label: "Manual" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function previewText(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_VARS[key] ?? `{{${key}}}`);
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  if (isYesterday) return "Yesterday " + d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-PK", { day: "2-digit", month: "short" }) + " · " + d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-PK", { weekday: "long", day: "2-digit", month: "short" });
}

function getQueueLength(baseKey: string): number {
  try { return JSON.parse(localStorage.getItem(userKey(baseKey)) || "[]").length; } catch { return 0; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ type }: { type: WaMsgType }) {
  const m = TYPE_META[type];
  const Icon = m.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 20, background: m.bg, color: m.color, fontSize: 11, fontWeight: 700 }}>
      <Icon size={10} /> {m.label}
    </span>
  );
}

function StatusChip({ status }: { status: "sent" | "failed" }) {
  const ok = status === "sent";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: ok ? "#059669" : "#dc2626", background: ok ? "rgba(5,150,105,0.08)" : "rgba(220,38,38,0.08)", padding: "3px 8px", borderRadius: 20 }}>
      {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {ok ? "Sent" : "Failed"}
    </span>
  );
}

function AutoCard({ icon: Icon, label, enabled, color }: {
  icon: React.ElementType; label: string; enabled: boolean; color: string;
}) {
  return (
    <div style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${enabled ? color + "25" : "#e8e8f4"}`, background: enabled ? color + "06" : "#fafafd", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: enabled ? color + "15" : "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={14} color={enabled ? color : "#b0b0c8"} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1d1d2f" }}>{label}</div>
        <div style={{ fontSize: 10, color: enabled ? "#059669" : "#9999b0", marginTop: 1 }}>
          {enabled ? "✓ Active" : "Disabled"}
        </div>
      </div>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: enabled ? "#22c55e" : "#e0e0e8", flexShrink: 0, boxShadow: enabled ? "0 0 6px #22c55e80" : "none" }} />
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({ cfg }: { cfg: typeof TPL_CONFIG[0] }) {
  const wa = settingsStore.whatsapp as Record<string, string>;
  const [text, setText] = useState(wa[cfg.key] || "");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const Icon = cfg.icon;
  const preview = previewText(text);
  const charCount = text.length;

  function copy() {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  function save() {
    (settingsStore.whatsapp as Record<string, string>)[cfg.key] = text;
    saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", gap: 12, background: cfg.color + "05" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} color={cfg.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1d1d2f" }}>{cfg.label}</div>
          <div style={{ fontSize: 11, color: "#9999b0", marginTop: 2 }}>{cfg.description}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setShowPreview((p) => !p)}
            style={{ display: "flex", alignItems: "center", gap: 5, border: `1px solid ${showPreview ? cfg.color + "50" : "#e8e8f0"}`, background: showPreview ? cfg.color + "10" : "#fff", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: showPreview ? cfg.color : "#9999b0", cursor: "pointer" }}>
            {showPreview ? <EyeOff size={11} /> : <Eye size={11} />} Preview
          </button>
          <button type="button" onClick={copy}
            style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid #e8e8f0", background: "#fff", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: copied ? "#059669" : "#9999b0", cursor: "pointer" }}>
            {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {cfg.vars.map((v) => (
            <button key={v} type="button" onClick={() => setText((t) => t + `{{${v}}}`)} title="Click to insert"
              style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 9px", borderRadius: 20, background: cfg.color + "10", border: `1px solid ${cfg.color}28`, color: cfg.color, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              + {`{{${v}}}`}
            </button>
          ))}
        </div>

        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
          placeholder={`Write your ${cfg.label.toLowerCase()} message here…`}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e4e4ee", fontSize: 13, color: "#1d1d2f", lineHeight: 1.65, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />

        {showPreview && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9999b0", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Preview — sample data</div>
            <div style={{ background: "#e5ddd5", borderRadius: 12, padding: "14px", backgroundImage: "url('https://www.transparenttextures.com/patterns/45-degree-fabric-light.png')" }}>
              <div style={{ background: "#dcf8c6", borderRadius: "12px 12px 2px 12px", padding: "10px 14px", maxWidth: "90%", marginLeft: "auto", fontSize: 13, color: "#1d1d2f", lineHeight: 1.6, whiteSpace: "pre-wrap", boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
                {preview || <span style={{ color: "#b0b0c8", fontStyle: "italic" }}>Write a message above to preview</span>}
                <div style={{ fontSize: 10, color: "#7a9a7a", textAlign: "right", marginTop: 5 }}>
                  {new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })} ✓✓
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 2 }}>
          <div style={{ fontSize: 11, color: charCount > 1000 ? "#dc2626" : "#b0b0c8" }}>
            {charCount} chars {charCount > 1000 && "· Consider shortening"}
          </div>
          <button type="button" onClick={save}
            style={{ display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 9, padding: "8px 18px", fontSize: 12, fontWeight: 800, cursor: "pointer", transition: "all 0.15s", background: saved ? "#ecfdf5" : `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`, color: saved ? "#059669" : "#fff" }}>
            {saved ? <><Check size={12} /> Saved</> : <><Save size={12} /> Save Template</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const waPlan = getCurrentPlan();
  if (!waPlan.whatsapp) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f6f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 460, width: "100%", margin: "0 auto", textAlign: "center", padding: "0 24px" }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,#5B21B6,#9333EA)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 8px 28px rgba(91,33,182,0.35)" }}>
            <span style={{ fontSize: 34 }}>💬</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#1a1a2e", marginBottom: 10 }}>WhatsApp Automation</div>
          <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.7, marginBottom: 28 }}>
            Automated WhatsApp reminders, booking confirmations, follow-ups, and low-stock alerts are available on the <strong>Werzio Pro</strong> and <strong>Werzio Premium</strong> plans.
          </div>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", padding: "20px 22px", marginBottom: 24, textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
            {["Appointment reminders sent automatically", "Booking confirmation messages", "Post-visit follow-up messages", "Low inventory stock alerts", "Manual WhatsApp sends with templates"].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11 }}>✓</span>
                </div>
                <span style={{ fontSize: 13, color: "#374151" }}>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "#9898b0" }}>Current plan:</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: waPlan.color, background: waPlan.bg, borderRadius: 20, padding: "2px 12px", border: `1px solid ${waPlan.color}30` }}>{waPlan.label}</span>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <a href="/dashboard/billing" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 12, background: "linear-gradient(135deg,#7C3AED,#9333EA)", color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 16px rgba(124,58,237,0.38)" }}>
              Upgrade to Pro — PKR 6,000/mo →
            </a>
            <a href="/dashboard/billing" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 12, background: "linear-gradient(135deg,#9333EA,#A855F7)", color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 16px rgba(147,51,234,0.38)" }}>
              Upgrade to Premium — PKR 20,000/mo →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const [tab, setTab]           = useState<"messages" | "templates">("messages");
  const [logs, setLogs]         = useState<WaLogEntry[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [filter, setFilter]     = useState<WaMsgType | "all">("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Birthday reminder settings
  const bdDefaults = settingsStore.birthday as { autoBirthday: boolean; birthdayDiscount: string };
  const [bdEnabled,    setBdEnabled]    = useState(bdDefaults.autoBirthday);
  const [bdDiscount,   setBdDiscount]   = useState(bdDefaults.birthdayDiscount);
  const [bdSaving,     setBdSaving]     = useState(false);
  const [bdSaved,      setBdSaved]      = useState(false);
  const [bdSending,    setBdSending]    = useState(false);
  const [bdSendDone,   setBdSendDone]   = useState(false);

  const todayBirthdayClients = useMemo(() => {
    const today = new Date();
    return clients.filter((c) => {
      if (!c.dob || !c.phone) return false;
      const [, m, d] = c.dob.split("-").map(Number);
      return m === today.getMonth() + 1 && d === today.getDate();
    });
  }, [clients]);

  async function saveBirthdaySettings() {
    setBdSaving(true);
    // Persist locally
    const bd = settingsStore.birthday as Record<string, unknown>;
    bd.autoBirthday     = bdEnabled;
    bd.birthdayDiscount = bdDiscount;
    saveSettings();
    setBdSaving(false);
    setBdSaved(true);
    setTimeout(() => setBdSaved(false), 2500);
  }

  async function sendBirthdayNow() {
    setBdSending(true);
    await checkBirthdayReminders(true); // force=true bypasses the "already sent" dedup
    setBdSending(false);
    setBdSendDone(true);
    setTimeout(() => setBdSendDone(false), 3000);
    setRefreshKey((k) => k + 1);
  }

  // Manual send state
  const [selClientId, setSelClientId] = useState("");
  const [msgType, setMsgType]         = useState<"reminder" | "confirmation" | "followup">("confirmation");
  const [manualService, setManualService] = useState("");
  const [manualTime, setManualTime]       = useState("");
  const [manualDate, setManualDate]       = useState(new Date().toISOString().slice(0, 10));
  const [sending, setSending]             = useState(false);
  const [sendResult, setSendResult]       = useState<{ ok: boolean; msg: string } | null>(null);

  // Load logs: try Turso first, fall back to localStorage
  useEffect(() => {
    async function load() {
      setLoadingLogs(true);
      const user = getCurrentUser();
      if (user) {
        try {
          const res = await fetch(`/api/wa/messages?userId=${encodeURIComponent(user.id)}&limit=200`);
          if (res.ok) {
            const data = await res.json() as { ok: boolean; logs: WaLogEntry[] };
            if (data.ok && Array.isArray(data.logs) && data.logs.length > 0) {
              setLogs(data.logs);
              setLoadingLogs(false);
              setClients(getStoredClients());
              return;
            }
          }
        } catch { /* fall through to localStorage */ }
      }
      // Fallback: localStorage
      setLogs(getWaLogs());
      setClients(getStoredClients());
      setLoadingLogs(false);
    }
    load();
  }, [refreshKey]);

  const ws = settingsStore.wasender as {
    apiKey: string; ownerPhone: string;
    autoReminder: boolean; autoConfirmation: boolean; autoFollowup: boolean;
    autoCancellation: boolean; autoLowStock: boolean; autoNewBooking: boolean;
  };
  const waTpl = settingsStore.whatsapp as { reminder: string; confirmation: string; followup: string };
  const isConnected = !!ws.apiKey;
  const [testingConn, setTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<{ ok: boolean; message?: string; status?: string } | null>(null);

  async function testConnection() {
    if (!ws.apiKey || testingConn) return;
    setTestingConn(true);
    setConnStatus(null);
    try {
      const res = await fetch(`/api/whatsapp/status?apiKey=${encodeURIComponent(ws.apiKey)}`);
      const data = await res.json() as { ok: boolean; connected: boolean; status?: string; message?: string; error?: string };
      setConnStatus({ ok: data.connected, message: data.message || data.error, status: data.status });
    } catch {
      setConnStatus({ ok: false, message: "Network error" });
    } finally {
      setTestingConn(false);
    }
  }

  const filtered = useMemo(() =>
    filter === "all" ? logs : logs.filter((l) => l.type === filter),
    [logs, filter],
  );

  // Stats
  const todayStr    = new Date().toISOString().slice(0, 10);
  const weekAgo     = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const todayCount  = logs.filter((l) => l.timestamp.startsWith(todayStr)).length;
  const weekCount   = logs.filter((l) => l.timestamp >= weekAgo).length;
  const failCount   = logs.filter((l) => l.status === "failed").length;
  const sentCount   = logs.filter((l) => l.status === "sent").length;
  const successRate = logs.length > 0 ? Math.round((sentCount / logs.length) * 100) : 100;
  const confirmQueue  = getQueueLength("werzio_wa_confirm_queue");
  const followupQueue = getQueueLength("werzio_wa_followup_queue");
  const totalQueue    = confirmQueue + followupQueue;

  // Group logs by day
  const grouped = useMemo(() => {
    const groups: { day: string; items: WaLogEntry[] }[] = [];
    for (const log of filtered) {
      const day = dayLabel(log.timestamp);
      const last = groups[groups.length - 1];
      if (last?.day === day) last.items.push(log);
      else groups.push({ day, items: [log] });
    }
    return groups;
  }, [filtered]);

  async function sendManual() {
    if (!selClientId) return;
    const client = clients.find((c) => c.id === selClientId);
    if (!client) return;
    setSending(true);
    setSendResult(null);
    try {
      const rawTemplate = msgType === "reminder" ? waTpl.reminder : msgType === "confirmation" ? waTpl.confirmation : waTpl.followup;
      if (!rawTemplate) {
        setSendResult({ ok: false, msg: `No template set for "${msgType}" — edit it in the Messages → Templates tab.` });
        setSending(false);
        return;
      }
      const dateLabel = new Date(manualDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
      const salonName = settingsStore.salon.name as string;
      const text = rawTemplate
        .replace(/\{\{name\}\}/g, client.name)
        .replace(/\{\{service\}\}/g, manualService.trim() || "your service")
        .replace(/\{\{date\}\}/g, dateLabel)
        .replace(/\{\{time\}\}/g, manualTime.trim() || "your appointment time")
        .replace(/\{\{salon_name\}\}/g, salonName);
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: ws.apiKey, phone: normalizePhone(client.phone), text }),
      });
      const data = await res.json() as { ok: boolean; status: number; error?: string };
      const success = data.ok;
      setSendResult(success
        ? { ok: true, msg: `✓ Sent to ${client.name} (${normalizePhone(client.phone)})` }
        : { ok: false, msg: `Failed (${data.status ?? ""}): ${data.error || "Check your WaSender API key"}` },
      );
      if (success) {
        appendLog({ type: "manual", clientName: client.name, phone: normalizePhone(client.phone), status: "sent", templateId: "direct" });
        setTimeout(() => setRefreshKey((k) => k + 1), 600);
      }
    } catch (err) { setSendResult({ ok: false, msg: String(err) }); }
    setSending(false);
  }

  function openWa(phone: string, message?: string) {
    const num = phone.replace(/\D/g, "");
    window.open(message ? `https://wa.me/${num}?text=${encodeURIComponent(message)}` : `https://wa.me/${num}`, "_blank");
  }

  function openWaPreview() {
    const c = clients.find((cl) => cl.id === selClientId);
    if (!c) return;
    const wa = settingsStore.whatsapp as Record<string, string>;
    const tpl = msgType === "reminder" ? wa.reminder : msgType === "confirmation" ? wa.confirmation : wa.followup;
    const dateLabel = new Date(manualDate).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
    const msg = tpl?.replace(/\{{1,2}(\w+)\}{1,2}/g, (_: string, key: string) => ({
      name: c.name, service: manualService.trim() || "your service",
      salon_name: (settingsStore.salon.name as string).trim(),
      date: dateLabel, time: manualTime.trim() || "your appointment time",
    } as Record<string, string>)[key] ?? _);
    openWa(c.phone, msg);
  }

  const inputSt: React.CSSProperties = { width: "100%", height: 38, padding: "0 12px", borderRadius: 9, border: "1px solid #e4e4ee", fontSize: 13, color: "#29293d", background: "#fff", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f9" }}>
      <div style={{ paddingLeft: 25 }}>
        <DashboardHeader title="WhatsApp Messaging" subtitle="Send & manage client messages" />
      </div>

      {/* ── Native mobile app bar ── */}
      <MobilePageHeader
        title="WhatsApp"
        subtitle={isConnected ? "Connected · Live" : "Not configured"}
        action={{ label: "Settings", href: "/dashboard/account" }}
      />

      {/* ── Mobile connection status ── */}
      <div className="mobile-only" style={{ margin: "10px 16px 0", padding: "12px 14px", borderRadius: 16, display: "flex", alignItems: "center", gap: 10, background: isConnected ? "linear-gradient(135deg,#4C1D95,#9333EA)" : "#1a1a2e", color: "#fff" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>{isConnected ? "WhatsApp Connected" : "Not Configured"}</div>
          <div style={{ fontSize: 10, opacity: 0.72, marginTop: 2 }}>{isConnected ? "WaSenderAPI connected" : "Tap Settings to connect"}</div>
        </div>
        {isConnected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80", flexShrink: 0 }} />}
      </div>

      {/* ── Mobile stats ── */}
      <div className="mobile-stat-scroll mobile-only">
        {[
          { label: "Today",    value: todayCount,       color: "#7C3AED" },
          { label: "This Week", value: weekCount,       color: "#0284c7" },
          { label: "Failed",   value: failCount,        color: "#dc2626" },
          { label: "Success",  value: `${successRate}%`, color: "#059669" },
        ].map((s) => (
          <div key={s.label} className="mobile-stat-card">
            <div className="mobile-stat-card-label">{s.label}</div>
            <div className="mobile-stat-card-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Mobile tab bar ── */}
      <div className="mobile-tab-bar mobile-only">
        {[{ id: "messages", label: "Messages" }, { id: "templates", label: "Templates" }].map((t) => (
          <button key={t.id} type="button" className={`mobile-tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id as typeof tab)}>{t.label}</button>
        ))}
      </div>

      {/* ── Mobile: Message log list ── */}
      {tab === "messages" && (
        <div className="mobile-only">
          {filtered.length === 0 ? (
            <div className="mobile-empty">
              <div className="mobile-empty-icon"><MessageSquare size={26} color="#c8c8e0" /></div>
              <div className="mobile-empty-title">No messages yet</div>
              <div className="mobile-empty-sub">{isConnected ? "Messages appear here once the scheduler sends them." : "Connect WhatsApp in Account settings."}</div>
            </div>
          ) : (
            <>
              <div className="mobile-filter-row">
                {FILTERS.map((f) => (
                  <button key={f.value} type="button" className={`mobile-filter-chip ${filter === f.value ? "active" : ""}`} onClick={() => setFilter(f.value)}>{f.label}</button>
                ))}
              </div>
              <div className="mobile-list">
                {filtered.map((log) => {
                  const m = TYPE_META[log.type];
                  const Icon = m.icon;
                  return (
                    <div key={log.id} className="mobile-list-card">
                      <div className="mobile-list-icon" style={{ background: m.bg }}><Icon size={18} color={m.color} /></div>
                      <div className="mobile-list-body">
                        <div className="mobile-list-title">{log.clientName}</div>
                        <div className="mobile-list-sub">{log.phone} · {fmtTime(log.timestamp)}</div>
                      </div>
                      <div className="mobile-list-right">
                        <span className="mobile-badge" style={{ background: m.bg, color: m.color }}>{m.label}</span>
                        <span className="mobile-badge" style={{ background: log.status === "sent" ? "#ecfdf5" : "#fef2f2", color: log.status === "sent" ? "#059669" : "#dc2626" }}>{log.status === "sent" ? "✓ Sent" : "✗ Failed"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Mobile: Templates ── */}
      {tab === "templates" && (
        <div className="mobile-only" style={{ padding: "0 16px 24px" }}>
          <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 14, background: "#f5f4ff", border: "1px solid #ddd6fe", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#5B21B6", marginBottom: 4 }}>💡 How templates work</div>
            <div style={{ fontSize: 12, color: "#6a6a8a", lineHeight: 1.65 }}>Write your message, copy it, then paste when creating a template in Meta Business Manager. Click variable chips to insert them.</div>
          </div>
          {TPL_CONFIG.map((cfg) => <TemplateCard key={cfg.key} cfg={cfg} />)}
        </div>
      )}

      <div className="dash-page desktop-only" style={{ paddingTop: 0 }}>

        {/* ── Connection Banner ─────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 22px", borderRadius: 16, marginBottom: 22,
          background: isConnected
            ? "linear-gradient(135deg, #4C1D95 0%, #7C3AED 60%, #9333EA 100%)"
            : "#1a1a2e",
          boxShadow: isConnected ? "0 4px 24px rgba(124,58,237,0.35)" : "0 2px 12px rgba(0,0,0,0.12)",
          color: "#fff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {isConnected ? <Wifi size={22} /> : <WifiOff size={22} />}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-0.01em" }}>
                {isConnected ? "WhatsApp Connected" : "WhatsApp Not Configured"}
              </div>
              <div style={{ fontSize: 11, opacity: 0.72, marginTop: 3 }}>
                {isConnected
                  ? "WaSenderAPI connected · Scheduler runs every 60s"
                  : "Go to Account → WhatsApp Settings to connect your number"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {isConnected && connStatus && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: connStatus.ok ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.18)", borderRadius: 20, padding: "5px 10px", border: `1px solid ${connStatus.ok ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.4)"}` }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: connStatus.ok ? "#4ade80" : "#ef4444", boxShadow: connStatus.ok ? "0 0 8px #4ade80" : "0 0 8px #ef4444" }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>{connStatus.ok ? `Active (${connStatus.status || "CONNECTED"})` : (connStatus.message || "Session error")}</span>
              </div>
            )}
            {isConnected && !connStatus && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "5px 12px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>Live</span>
              </div>
            )}
            {isConnected && (
              <button type="button" onClick={testConnection} disabled={testingConn}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 9, padding: "7px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: testingConn ? "wait" : "pointer", opacity: testingConn ? 0.7 : 1 }}>
                <Wifi size={11} /> {testingConn ? "Testing…" : "Test Connection"}
              </button>
            )}
            <a href="/dashboard/account"
              style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)", borderRadius: 9, padding: "8px 14px", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
              {isConnected ? "Settings" : "Configure"} <ChevronRight size={12} />
            </a>
          </div>
        </div>

        {/* ── Stats Row ─────────────────────────────────────────────────── */}
        <div className="stats-grid-4" style={{ marginBottom: 24 }}>
          {[
            { label: "Sent Today",    value: todayCount,  icon: Send,        color: "#7C3AED", sub: "messages dispatched" },
            { label: "This Week",     value: weekCount,   icon: TrendingUp,  color: "#0284c7", sub: "last 7 days" },
            { label: "Failed",        value: failCount,   icon: XCircle,     color: "#dc2626", sub: failCount > 0 ? "check API credentials" : "all clear ✓" },
            { label: "Success Rate",  value: `${successRate}%`, icon: Zap,   color: "#059669", sub: `${sentCount} of ${logs.length} sent` },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #ebebf5", borderRadius: 16, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "0 16px 0 100%", background: color + "08" }} />
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#9999b0", fontWeight: 600 }}>{label}</div>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={15} color={color} />
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#1d1d2f", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: "#b0b0c8", marginTop: 6 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Tab Switcher ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 4, background: "#ecedf5", borderRadius: 12, padding: 4, marginBottom: 22, width: "fit-content" }}>
          {[
            { id: "messages",  label: "Message Log",  badge: logs.length > 0 ? logs.length : null },
            { id: "templates", label: "Templates",    badge: null },
          ].map(({ id, label, badge }) => (
            <button key={id} type="button" onClick={() => setTab(id as typeof tab)}
              style={{ display: "flex", alignItems: "center", gap: 7, border: "none", borderRadius: 9, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: tab === id ? "#fff" : "transparent", color: tab === id ? "#1d1d2f" : "#9999b0", boxShadow: tab === id ? "0 1px 6px rgba(0,0,0,0.10)" : "none", transition: "all 0.15s" }}>
              {label}
              {badge !== null && (
                <span style={{ background: tab === id ? "var(--accent)" : "#c8c8e0", color: "#fff", borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "1px 7px", minWidth: 20, textAlign: "center" }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════ TEMPLATES TAB ══════════════════ */}
        {tab === "templates" && (
          <div>
            <div style={{ background: "linear-gradient(135deg, #f5f4ff, #fdf4ff)", border: "1px solid #ddd6fe", borderRadius: 14, padding: "16px 20px", marginBottom: 22, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>💡</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#5B21B6", marginBottom: 4 }}>How templates work</div>
                <div style={{ fontSize: 12, color: "#6a6a8a", lineHeight: 1.65 }}>
                  Write your message, <strong>Copy</strong> it, then paste it when creating a WhatsApp template in Meta Business Manager.
                  Click any <code style={{ background: "#ede9fe", borderRadius: 4, padding: "1px 5px", fontSize: 11 }}>{"{{variable}}"}</code> chip to insert it into the message.
                  Use <strong>Preview</strong> to see how it looks with sample client data.
                </div>
              </div>
            </div>
            <div className="two-col-grid" style={{ gap: 18 }}>
              {TPL_CONFIG.map((cfg) => <TemplateCard key={cfg.key} cfg={cfg} />)}
            </div>
          </div>
        )}

        {/* ══════════════════ MESSAGES TAB ══════════════════ */}
        {tab === "messages" && (
          <div className="sidebar-layout">

            {/* ── Left: Message Log ── */}
            <div style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>

              {/* Log header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafd" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#1d1d2f" }}>Message Log</div>
                  {loadingLogs && <div style={{ fontSize: 11, color: "#9999b0" }}>Loading…</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Filter pills */}
                  <div style={{ display: "flex", gap: 3, background: "#f0f0f8", borderRadius: 9, padding: "3px" }}>
                    {FILTERS.map((f) => (
                      <button key={f.value} type="button" onClick={() => setFilter(f.value)}
                        style={{ border: "none", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: filter === f.value ? "#fff" : "transparent", color: filter === f.value ? "#1d1d2f" : "#9999b0", boxShadow: filter === f.value ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.12s" }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setRefreshKey((k) => k + 1)} title="Refresh"
                    style={{ border: "1px solid #e8e8f0", background: "#fff", borderRadius: 8, padding: "6px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <RefreshCw size={13} color="#9999b0" />
                  </button>
                </div>
              </div>

              {/* Log body */}
              {filtered.length === 0 ? (
                <div style={{ padding: "60px 32px", textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #f0f0f8, #e8e8f8)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                    <MessageSquare size={26} color="#c8c8e0" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#9999b0", marginBottom: 8 }}>No messages yet</div>
                  <div style={{ fontSize: 12, color: "#c0c0d0", lineHeight: 1.65, maxWidth: 280, margin: "0 auto" }}>
                    {isConnected
                      ? "Messages will appear here once the WhatsApp scheduler sends them."
                      : "Connect your WhatsApp number in Account → WhatsApp Settings to start sending automated messages."}
                  </div>
                  {!isConnected && (
                    <a href="/dashboard/account" style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 18, padding: "9px 18px", borderRadius: 10, background: "linear-gradient(135deg,#5B21B6,#9333EA)", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                      Configure WhatsApp <ChevronRight size={13} />
                    </a>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <div style={{ minWidth: 560 }}>
                  {grouped.map(({ day, items }) => (
                    <div key={day}>
                      {/* Day separator */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px 6px", background: "#fafafd" }}>
                        <div style={{ height: 1, flex: 1, background: "#ededf5" }} />
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#aaaabc", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>{day}</span>
                        <div style={{ height: 1, flex: 1, background: "#ededf5" }} />
                      </div>
                      {items.map((log) => (
                        <div key={log.id}
                          style={{ display: "grid", gridTemplateColumns: "110px 1fr 130px 100px 80px", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid #f8f8fc", gap: 12, transition: "background 0.1s" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafe")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <div style={{ fontSize: 11, color: "#aaaabc", fontVariantNumeric: "tabular-nums" }}>{fmtTime(log.timestamp)}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1d1d2f" }}>{log.clientName}</div>
                            {log.templateId && <div style={{ fontSize: 10, color: "#b0b0c8", marginTop: 1 }}>tpl: {log.templateId}</div>}
                            {log.status === "failed" && log.error && (
                              <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                                <AlertCircle size={9} /> {log.error}
                              </div>
                            )}
                          </div>
                          <button type="button" onClick={() => openWa(log.phone)}
                            style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid #e8e8f0", borderRadius: 7, padding: "4px 10px", cursor: "pointer", color: "#6a6a8a", fontSize: 11, fontWeight: 600 }}>
                            <Phone size={11} /> {log.phone}
                          </button>
                          <Badge type={log.type} />
                          <StatusChip status={log.status} />
                        </div>
                      ))}
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right column ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Send Message Panel */}
              <div style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 18, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#5B21B6,#9333EA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Send size={14} color="#fff" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#1d1d2f" }}>Send Message</div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#7c7c9a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Client</label>
                    <select value={selClientId} onChange={(e) => setSelClientId(e.target.value)} style={{ ...inputSt }}>
                      <option value="">Select client…</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#7c7c9a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message Type</label>
                    <select value={msgType} onChange={(e) => setMsgType(e.target.value as typeof msgType)} style={{ ...inputSt }}>
                      <option value="confirmation">Booking Confirmation</option>
                      <option value="reminder">Appointment Reminder</option>
                      <option value="followup">Follow-up Message</option>
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#7c7c9a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Service</label>
                      <input value={manualService} onChange={(e) => setManualService(e.target.value)} placeholder="e.g. Haircut" style={{ ...inputSt }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#7c7c9a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>Time</label>
                      <input value={manualTime} onChange={(e) => setManualTime(e.target.value)} placeholder="e.g. 3:00 PM" style={{ ...inputSt }} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#7c7c9a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <Calendar size={10} style={{ display: "inline", marginRight: 4 }} />Date
                    </label>
                    <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} style={{ ...inputSt }} />
                  </div>

                  {/* Action buttons */}
                  <button type="button" onClick={sendManual} disabled={!selClientId || !isConnected || sending}
                    style={{ width: "100%", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 800, cursor: (!selClientId || !isConnected || sending) ? "not-allowed" : "pointer", background: (!selClientId || !isConnected || sending) ? "#e8e8f0" : "linear-gradient(135deg,#5B21B6,#9333EA)", color: (!selClientId || !isConnected || sending) ? "#aaaabc" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: (!selClientId || !isConnected || sending) ? "none" : "0 3px 12px rgba(91,33,182,0.35)" }}>
                    <Send size={14} /> {sending ? "Sending…" : "Send via API"}
                  </button>

                  {selClientId && (
                    <button type="button" onClick={openWaPreview}
                      style={{ width: "100%", border: "1px solid #e8e8f0", background: "#fafafd", borderRadius: 10, padding: "9px 0", fontSize: 12, fontWeight: 700, color: "#5a5a78", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                      <Phone size={12} /> Open in WhatsApp Web
                    </button>
                  )}

                  {sendResult && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: sendResult.ok ? "#059669" : "#dc2626", padding: "9px 12px", borderRadius: 9, background: sendResult.ok ? "#ecfdf5" : "#fef2f2", border: `1px solid ${sendResult.ok ? "#bbf7d0" : "#fecaca"}`, lineHeight: 1.5 }}>
                      {sendResult.msg}
                    </div>
                  )}
                </div>
              </div>

              {/* Automation Status */}
              <div style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 18, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#1d1d2f", marginBottom: 14 }}>Automation Status</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <AutoCard icon={Bell}         label="Appointment Reminder"  enabled={ws.autoReminder}     color="#7C3AED" />
                  <AutoCard icon={CheckCircle2} label="Booking Confirmation"  enabled={ws.autoConfirmation} color="#059669" />
                  <AutoCard icon={ThumbsUp}     label="Follow-up Message"     enabled={ws.autoFollowup}     color="#0284c7" />
                  <AutoCard icon={CalendarX}    label="Cancellation Win-back"    enabled={ws.autoCancellation} color="#dc2626" />
                  <AutoCard icon={CalendarPlus} label="New Online Booking Alert" enabled={ws.autoNewBooking}    color="#0284c7" />
                  <AutoCard icon={Package}      label="Low Stock Alert"          enabled={ws.autoLowStock}     color="#ea580c" />
                  <AutoCard icon={Cake}         label="Birthday Reminder"     enabled={bdEnabled}           color="#db2777" />
                </div>

                {totalQueue > 0 && (
                  <div style={{ marginTop: 12, padding: "10px 13px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 12, color: "#92400e", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={13} style={{ flexShrink: 0 }} />
                    {totalQueue} message{totalQueue > 1 ? "s" : ""} queued — sends on next scheduler tick
                  </div>
                )}

                {!isConnected && (
                  <div style={{ marginTop: 12, padding: "10px 13px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 12, color: "#991b1b", fontWeight: 600, display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                    No API credentials configured — automation is paused.
                  </div>
                )}
              </div>

              {/* Birthday Reminder Settings */}
              <div style={{ background: "#fff", border: "1px solid #fce7f3", borderRadius: 18, padding: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(219,39,119,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Cake size={16} color="#db2777" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#1d1d2f" }}>Birthday Reminders</div>
                    <div style={{ fontSize: 11, color: "#9999b0", marginTop: 1 }}>Auto-sent at 9 AM on each client&apos;s birthday</div>
                  </div>
                  {/* Toggle */}
                  <button type="button" onClick={() => setBdEnabled((v) => !v)}
                    style={{ marginLeft: "auto", width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: bdEnabled ? "#db2777" : "#d1d5db", transition: "background 0.2s", position: "relative", flexShrink: 0 }}>
                    <span style={{ position: "absolute", top: 3, left: bdEnabled ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Today's birthday clients */}
                  <div style={{ padding: "10px 12px", borderRadius: 9, background: todayBirthdayClients.length > 0 ? "#fdf2f8" : "#f8f8fc", border: `1px solid ${todayBirthdayClients.length > 0 ? "#fce7f3" : "#e8e8f0"}`, fontSize: 11, color: todayBirthdayClients.length > 0 ? "#9d174d" : "#6b6b8a", lineHeight: 1.6 }}>
                    {todayBirthdayClients.length > 0
                      ? <><strong>🎂 {todayBirthdayClients.length} client{todayBirthdayClients.length > 1 ? "s have" : " has"} a birthday today:</strong> {todayBirthdayClients.map((c) => c.name).join(", ")}</>
                      : "No clients have a birthday today. Make sure clients have their Date of Birth saved in their profile."}
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#7c7c9a", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Discount / Gift (optional)
                    </label>
                    <input
                      value={bdDiscount}
                      onChange={(e) => setBdDiscount(e.target.value)}
                      placeholder="e.g. 15% off or a free blow-dry"
                      style={{ width: "100%", height: 36, padding: "0 12px", borderRadius: 9, border: "1px solid #e4e4ee", fontSize: 13, color: "#29293d", outline: "none", boxSizing: "border-box" }}
                    />
                    <div style={{ fontSize: 10, color: "#b0b0c8", marginTop: 4 }}>Inserted as {"{{discount}}"} in the birthday template</div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={saveBirthdaySettings} disabled={bdSaving}
                      style={{ flex: 1, border: "none", borderRadius: 10, padding: "10px 0", fontSize: 12, fontWeight: 800, cursor: bdSaving ? "not-allowed" : "pointer", background: bdSaved ? "#ecfdf5" : "linear-gradient(135deg,#be185d,#db2777)", color: bdSaved ? "#059669" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: bdSaved ? "none" : "0 3px 10px rgba(219,39,119,0.3)" }}>
                      {bdSaved ? <><Check size={13} /> Saved</> : bdSaving ? "Saving…" : <><Save size={13} /> Save</>}
                    </button>
                    <button type="button" onClick={sendBirthdayNow} disabled={bdSending || todayBirthdayClients.length === 0}
                      title={todayBirthdayClients.length === 0 ? "No clients have a birthday today" : "Send birthday messages now"}
                      style={{ flex: 1, border: "1px solid #fce7f3", borderRadius: 10, padding: "10px 0", fontSize: 12, fontWeight: 800, cursor: (bdSending || todayBirthdayClients.length === 0) ? "not-allowed" : "pointer", background: bdSendDone ? "#ecfdf5" : "#fff3f8", color: bdSendDone ? "#059669" : "#db2777", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: todayBirthdayClients.length === 0 ? 0.5 : 1 }}>
                      {bdSendDone ? <><Check size={13} /> Sent!</> : bdSending ? "Sending…" : <><Send size={13} /> Send Now</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}