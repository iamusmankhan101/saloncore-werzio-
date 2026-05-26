"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MessageSquare, CheckCircle2, XCircle, Clock, Send, RefreshCw,
  Zap, Bell, ThumbsUp, Package, ChevronRight, Phone, Copy, Check,
  Eye, EyeOff, Save,
} from "lucide-react";
import DashboardHeader from "@/components/dashboard-header";
import { saveSettings, settingsStore } from "@/lib/settings-store";
import { getStoredClients } from "@/lib/storage";
import { getWaLogs, appendLog, WaLogEntry, WaMsgType, normalizePhone } from "@/lib/whatsapp-scheduler";
import type { Client } from "@/lib/types";

const TYPE_META: Record<WaMsgType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  reminder:     { label: "Reminder",     color: "#7C3AED", bg: "rgba(124,58,237,0.1)",  icon: Bell },
  confirmation: { label: "Confirmation", color: "#059669", bg: "rgba(5,150,105,0.1)",   icon: CheckCircle2 },
  followup:     { label: "Follow-up",    color: "#0284c7", bg: "rgba(2,132,199,0.1)",   icon: ThumbsUp },
  lowstock:     { label: "Low Stock",    color: "#ea580c", bg: "rgba(234,88,12,0.1)",   icon: Package },
  manual:       { label: "Manual",       color: "#6b7280", bg: "rgba(107,114,128,0.1)", icon: Send },
};

const SAMPLE_VARS: Record<string, string> = {
  name: "Fatima",
  service: "Haircut & Style",
  date: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
  time: "3:00pm",
  salon_name: (settingsStore.salon as { name: string }).name,
  items: "Loreal Hair Color (2 left), OPI Nail Polish (1 left)",
  count: "2",
};

function previewText(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => SAMPLE_VARS[key] ?? `{{${key}}}`);
}

function Badge({ type }: { type: WaMsgType }) {
  const m = TYPE_META[type];
  const Icon = m.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: m.bg, color: m.color, fontSize: 11, fontWeight: 700 }}>
      <Icon size={11} /> {m.label}
    </span>
  );
}

function StatusDot({ status }: { status: "sent" | "failed" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: status === "sent" ? "#059669" : "#dc2626" }}>
      {status === "sent" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {status === "sent" ? "Sent" : "Failed"}
    </span>
  );
}

function AutoCard({ icon: Icon, label, enabled, templateId, color }: {
  icon: React.ElementType; label: string; enabled: boolean; templateId: string; color: string;
}) {
  return (
    <div style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${enabled ? color + "33" : "#e8e8f4"}`, background: enabled ? color + "08" : "#fafafd", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: enabled ? color + "18" : "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={15} color={enabled ? color : "#b0b0c8"} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1d1d2f" }}>{label}</div>
        <div style={{ fontSize: 11, color: enabled ? (templateId ? "#059669" : "#ea580c") : "#9999b0", marginTop: 1 }}>
          {enabled ? (templateId ? `Template: ${templateId}` : "Template name missing") : "Disabled"}
        </div>
      </div>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: enabled && templateId ? "#22c55e" : enabled ? "#f97316" : "#d1d1e0", flexShrink: 0 }} />
    </div>
  );
}

// ── Templates Tab ─────────────────────────────────────────────────────────────

type TplKey = "reminder" | "confirmation" | "followup" | "lowstock";

const TPL_CONFIG: { key: TplKey; label: string; description: string; vars: string[]; color: string; icon: React.ElementType }[] = [
  {
    key: "reminder",
    label: "Appointment Reminder",
    description: "Sent automatically X hours before the appointment",
    vars: ["name", "service", "date", "time", "salon_name"],
    color: "#7C3AED",
    icon: Bell,
  },
  {
    key: "confirmation",
    label: "Booking Confirmation",
    description: "Sent when a new appointment is booked",
    vars: ["name", "service", "date", "time", "salon_name"],
    color: "#059669",
    icon: CheckCircle2,
  },
  {
    key: "followup",
    label: "Follow-up Message",
    description: "Sent after appointment is marked as completed",
    vars: ["name", "service", "salon_name"],
    color: "#0284c7",
    icon: ThumbsUp,
  },
  {
    key: "lowstock",
    label: "Low Stock Alert",
    description: "Sent once daily to your WhatsApp when stock is low",
    vars: ["items", "count", "salon_name"],
    color: "#ea580c",
    icon: Package,
  },
];

function TemplateCard({ cfg }: { cfg: typeof TPL_CONFIG[0] }) {
  const wa = settingsStore.whatsapp as Record<string, string>;
  const [text, setText] = useState(wa[cfg.key] || "");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const Icon = cfg.icon;
  const preview = previewText(text);

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function save() {
    (settingsStore.whatsapp as Record<string, string>)[cfg.key] = text;
    saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: cfg.color + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} color={cfg.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1d1d2f" }}>{cfg.label}</div>
          <div style={{ fontSize: 11, color: "#9999b0", marginTop: 2 }}>{cfg.description}</div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button type="button" onClick={() => setShowPreview((p) => !p)}
            style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid #e8e8f0", background: showPreview ? "#f5f4ff" : "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: showPreview ? cfg.color : "#9999b0", cursor: "pointer" }}>
            {showPreview ? <EyeOff size={12} /> : <Eye size={12} />} Preview
          </button>
          <button type="button" onClick={copy}
            style={{ display: "flex", alignItems: "center", gap: 5, border: "1px solid #e8e8f0", background: "#fff", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, color: copied ? "#059669" : "#9999b0", cursor: "pointer" }}>
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Variable chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {cfg.vars.map((v) => (
            <button key={v} type="button"
              onClick={() => setText((t) => t + `{{${v}}}`)}
              title="Click to insert"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: cfg.color + "10", border: `1px solid ${cfg.color}30`, color: cfg.color, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              + {`{{${v}}}`}
            </button>
          ))}
        </div>

        {/* Editor */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={`Write your ${cfg.label.toLowerCase()} message here...`}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e4e4ee", fontSize: 13, color: "#1d1d2f", lineHeight: 1.65, resize: "vertical", outline: "none", fontFamily: "inherit" }}
        />

        {/* Preview */}
        {showPreview && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9999b0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Preview (sample data)</div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "14px 16px" }}>
              {/* WhatsApp bubble */}
              <div style={{ background: "#dcf8c6", borderRadius: "12px 12px 2px 12px", padding: "10px 14px", maxWidth: "85%", marginLeft: "auto", fontSize: 13, color: "#1d1d2f", lineHeight: 1.6, whiteSpace: "pre-wrap", boxShadow: "0 1px 2px rgba(0,0,0,0.12)" }}>
                {preview || <span style={{ color: "#b0b0c8", fontStyle: "italic" }}>Write a message above to preview</span>}
                <div style={{ fontSize: 10, color: "#7a9a7a", textAlign: "right", marginTop: 4 }}>
                  {new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })} ✓✓
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
          <div style={{ fontSize: 11, color: "#b0b0c8" }}>
            {text.length} chars · Use this text when creating your BotSailor template
          </div>
          <button type="button" onClick={save}
            style={{ display: "flex", alignItems: "center", gap: 6, border: "none", borderRadius: 9, padding: "8px 18px", fontSize: 12, fontWeight: 800, cursor: "pointer", background: saved ? "#ecfdf5" : "linear-gradient(135deg,#5B21B6,#9333EA)", color: saved ? "#059669" : "#fff" }}>
            {saved ? <><Check size={13} /> Saved</> : <><Save size={13} /> Save Template</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const [tab, setTab] = useState<"messages" | "templates">("messages");
  const [logs, setLogs] = useState<WaLogEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<WaMsgType | "all">("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const [selClientId, setSelClientId] = useState("");
  const [msgType, setMsgType] = useState<"reminder" | "confirmation" | "followup">("confirmation");
  const [manualService, setManualService] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setLogs(getWaLogs());
    setClients(getStoredClients());
  }, [refreshKey]);

  const bs = settingsStore.botsailor as {
    apiToken: string; phoneNumberId: string; ownerPhone: string;
    autoReminder: boolean; reminderTemplateId: string; reminderHours: number;
    autoConfirmation: boolean; confirmationTemplateId: string;
    autoFollowup: boolean; followupTemplateId: string;
    autoLowStock: boolean; lowStockTemplateId: string;
  };

  const isConnected = !!(bs.apiToken && bs.phoneNumberId);

  const filtered = useMemo(() =>
    filter === "all" ? logs : logs.filter((l) => l.type === filter),
    [logs, filter],
  );

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = logs.filter((l) => l.timestamp.startsWith(todayStr)).length;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const weekCount = logs.filter((l) => l.timestamp >= weekAgo).length;
  const failCount = logs.filter((l) => l.status === "failed").length;
  const confirmQueue = (() => { try { return JSON.parse(localStorage.getItem("glowbook_wa_confirm_queue") || "[]").length; } catch { return 0; } })();
  const followupQueue = (() => { try { return JSON.parse(localStorage.getItem("glowbook_wa_followup_queue") || "[]").length; } catch { return 0; } })();

  async function sendManual() {
    if (!selClientId) return;
    const client = clients.find((c) => c.id === selClientId);
    if (!client) return;
    setSending(true);
    setSendResult(null);
    try {
      const templateId = msgType === "reminder" ? bs.reminderTemplateId : msgType === "confirmation" ? bs.confirmationTemplateId : bs.followupTemplateId;
      if (!templateId) {
        setSendResult({ ok: false, msg: `Template name for "${msgType}" not set in Account → WhatsApp Settings.` });
        setSending(false);
        return;
      }
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiToken: bs.apiToken, phoneNumberId: bs.phoneNumberId, templateId, phone: normalizePhone(client.phone), variables: { name: client.name, service: manualService.trim() || "your service", date: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }), time: manualTime.trim() || "your appointment time", salon_name: settingsStore.salon.name } }),
      });
      const data = await res.json() as { ok: boolean; status: number; data?: unknown; raw?: string; error?: string };
      const success = data.ok && data.status !== 401 && data.status !== 422 && data.status !== 400;
      setSendResult(success ? { ok: true, msg: `Sent to ${client.name} (${normalizePhone(client.phone)})` } : { ok: false, msg: `Failed (${data.status}): ${data.error || JSON.stringify(data.data || data.raw || "").slice(0, 120)}` });
      if (success) {
        appendLog({ type: "manual", clientName: client.name, phone: normalizePhone(client.phone), status: "sent", templateId });
        setRefreshKey((k) => k + 1);
      }
    } catch (err) { setSendResult({ ok: false, msg: String(err) }); }
    setSending(false);
  }

  function openWa(phone: string, message?: string) {
    const num = phone.replace(/\D/g, "");
    const url = message ? `https://wa.me/${num}?text=${encodeURIComponent(message)}` : `https://wa.me/${num}`;
    window.open(url, "_blank");
  }

  function fmtTime(iso: string) {
    const d = new Date(iso);
    const isToday = d.toDateString() === new Date().toDateString();
    return isToday
      ? d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString("en-PK", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  }

  const FILTERS: { value: WaMsgType | "all"; label: string }[] = [
    { value: "all", label: "All" }, { value: "reminder", label: "Reminders" },
    { value: "confirmation", label: "Confirmations" }, { value: "followup", label: "Follow-ups" },
    { value: "lowstock", label: "Low Stock" }, { value: "manual", label: "Manual" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6f9" }}>
      <DashboardHeader />
      <div style={{ padding: "0 32px 32px" }}>

        {/* Connection banner */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderRadius: 14, background: isConnected ? "linear-gradient(135deg,#5B21B6,#9333EA)" : "#1d1d2f", marginBottom: 24, color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{isConnected ? "WhatsApp Connected" : "WhatsApp Not Configured"}</div>
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
                {isConnected ? `Meta API active · Phone ID: ${bs.phoneNumberId}` : "Go to Account → WhatsApp Settings to configure"}
              </div>
            </div>
          </div>
          <a href="/dashboard/account" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 9, padding: "8px 14px", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            {isConnected ? "Settings" : "Configure"} <ChevronRight size={13} />
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Sent Today", value: todayCount, icon: Send, color: "#7C3AED" },
            { label: "This Week", value: weekCount, icon: Zap, color: "#0284c7" },
            { label: "Failed", value: failCount, icon: XCircle, color: "#dc2626" },
            { label: "In Queue", value: confirmQueue + followupQueue, icon: Clock, color: "#ea580c" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "#9999b0", fontWeight: 600 }}>{label}</div>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={14} color={color} /></div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#1d1d2f" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 4, background: "#ececf4", borderRadius: 12, padding: 4, marginBottom: 20, width: "fit-content" }}>
          {[{ id: "messages", label: "Message Log" }, { id: "templates", label: "Templates" }].map(({ id, label }) => (
            <button key={id} type="button" onClick={() => setTab(id as typeof tab)}
              style={{ border: "none", borderRadius: 9, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", background: tab === id ? "#fff" : "transparent", color: tab === id ? "#1d1d2f" : "#9999b0", boxShadow: tab === id ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── TEMPLATES TAB ── */}
        {tab === "templates" && (
          <div>
            <div style={{ background: "#f5f4ff", border: "1px solid #ddd6fe", borderRadius: 12, padding: "14px 18px", marginBottom: 22, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 20 }}>💡</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#5B21B6", marginBottom: 4 }}>How to use these templates</div>
                <div style={{ fontSize: 12, color: "#6a6a8a", lineHeight: 1.6 }}>
                  Write your message below, then <strong>Copy</strong> it and paste it when creating a template in BotSailor.
                  Click any <code style={{ background: "#ede9fe", borderRadius: 4, padding: "1px 5px", fontSize: 11 }}>{"{{variable}}"}</code> chip to insert it.
                  Toggle <strong>Preview</strong> to see how the message looks with real data.
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
              {TPL_CONFIG.map((cfg) => <TemplateCard key={cfg.key} cfg={cfg} />)}
            </div>
          </div>
        )}

        {/* ── MESSAGES TAB ── */}
        {tab === "messages" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

            {/* Message Log */}
            <div style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ padding: "18px 20px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#1d1d2f" }}>Message Log</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", gap: 4, background: "#f5f5fb", borderRadius: 8, padding: 3 }}>
                    {FILTERS.map((f) => (
                      <button key={f.value} type="button" onClick={() => setFilter(f.value)}
                        style={{ border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: filter === f.value ? "#fff" : "transparent", color: filter === f.value ? "#1d1d2f" : "#9999b0", boxShadow: filter === f.value ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={() => setRefreshKey((k) => k + 1)}
                    style={{ border: "1px solid #e8e8f0", background: "#fff", borderRadius: 8, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <RefreshCw size={13} color="#9999b0" />
                  </button>
                </div>
              </div>
              {filtered.length === 0 ? (
                <div style={{ padding: "64px 32px", textAlign: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <MessageSquare size={24} color="#c8c8e0" />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#9999b0" }}>No messages yet</div>
                  <div style={{ fontSize: 12, color: "#c0c0d0", marginTop: 6 }}>
                    {isConnected ? "Messages will appear here once the scheduler sends them." : "Configure WhatsApp in Account settings to start sending."}
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#fafafd", borderBottom: "1px solid #f0f0f8" }}>
                        {["Time", "Client", "Phone", "Type", "Template", "Status"].map((h) => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "#9999b0", letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((log) => (
                        <tr key={log.id} style={{ borderBottom: "1px solid #f7f7fb" }}>
                          <td style={{ padding: "12px 16px", color: "#7c7c9a", whiteSpace: "nowrap", fontSize: 12 }}>{fmtTime(log.timestamp)}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#1d1d2f" }}>{log.clientName}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <button type="button" onClick={() => openWa(log.phone)}
                              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#7c7c9a", fontSize: 12, padding: 0 }}>
                              <Phone size={12} /> {log.phone}
                            </button>
                          </td>
                          <td style={{ padding: "12px 16px" }}><Badge type={log.type} /></td>
                          <td style={{ padding: "12px 16px", color: "#7c7c9a", fontSize: 12 }}>{log.templateId}</td>
                          <td style={{ padding: "12px 16px" }}><StatusDot status={log.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Manual send */}
              <div style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 16, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#1d1d2f", marginBottom: 16 }}>Send Message</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#5a5a78", display: "block", marginBottom: 6 }}>Client</label>
                    <select value={selClientId} onChange={(e) => setSelClientId(e.target.value)}
                      style={{ width: "100%", height: 40, padding: "0 12px", borderRadius: 9, border: "1px solid #e4e4ee", fontSize: 13, color: "#29293d", background: "#fff", outline: "none" }}>
                      <option value="">Select client...</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#5a5a78", display: "block", marginBottom: 6 }}>Message Type</label>
                    <select value={msgType} onChange={(e) => setMsgType(e.target.value as typeof msgType)}
                      style={{ width: "100%", height: 40, padding: "0 12px", borderRadius: 9, border: "1px solid #e4e4ee", fontSize: 13, color: "#29293d", background: "#fff", outline: "none" }}>
                      <option value="confirmation">Booking Confirmation</option>
                      <option value="reminder">Appointment Reminder</option>
                      <option value="followup">Follow-up</option>
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#5a5a78", display: "block", marginBottom: 6 }}>Service</label>
                      <input value={manualService} onChange={(e) => setManualService(e.target.value)}
                        placeholder="e.g. Haircut"
                        style={{ width: "100%", height: 40, padding: "0 12px", borderRadius: 9, border: "1px solid #e4e4ee", fontSize: 13, color: "#29293d", background: "#fff", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#5a5a78", display: "block", marginBottom: 6 }}>Time</label>
                      <input value={manualTime} onChange={(e) => setManualTime(e.target.value)}
                        placeholder="e.g. 3:00 PM"
                        style={{ width: "100%", height: 40, padding: "0 12px", borderRadius: 9, border: "1px solid #e4e4ee", fontSize: 13, color: "#29293d", background: "#fff", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  {selClientId && (
                    <button type="button" onClick={() => {
                      const c = clients.find((cl) => cl.id === selClientId);
                      if (!c) return;
                      const wa = settingsStore.whatsapp as Record<string, string>;
                      const tpl = msgType === "reminder" ? wa.reminder : msgType === "confirmation" ? wa.confirmation : wa.followup;
                      const now = new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
                      const msg = tpl?.replace(/\{{1,2}(\w+)\}{1,2}/g, (_, key: string) => ({
                        name: c.name,
                        service: manualService.trim() || "your service",
                        salon_name: (settingsStore.salon.name as string).trim(),
                        date: now,
                        time: manualTime.trim() || "your appointment time",
                      }[key] ?? _));
                      openWa(c.phone, msg);
                    }}
                      style={{ width: "100%", border: "1px solid #e8e8f0", background: "#fafafd", borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 700, color: "#5a5a78", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                      <Phone size={13} /> Open in WhatsApp Web
                    </button>
                  )}
                  <button type="button" onClick={sendManual} disabled={!selClientId || !isConnected || sending}
                    style={{ width: "100%", border: "none", borderRadius: 9, padding: "10px 0", fontSize: 13, fontWeight: 800, cursor: (!selClientId || !isConnected || sending) ? "not-allowed" : "pointer", background: (!selClientId || !isConnected || sending) ? "#e8e8f0" : "linear-gradient(135deg,#5B21B6,#9333EA)", color: (!selClientId || !isConnected || sending) ? "#aaaabc" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Send size={14} /> {sending ? "Sending..." : "Send via API"}
                  </button>
                  {sendResult && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: sendResult.ok ? "#059669" : "#dc2626", padding: "8px 12px", borderRadius: 8, background: sendResult.ok ? "#ecfdf5" : "#fef2f2" }}>
                      {sendResult.msg}
                    </div>
                  )}
                </div>
              </div>

              {/* Automation status */}
              <div style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 16, padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#1d1d2f", marginBottom: 14 }}>Automation Status</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <AutoCard icon={Bell}         label="Appointment Reminder" enabled={bs.autoReminder}     templateId={bs.reminderTemplateId}     color="#7C3AED" />
                  <AutoCard icon={CheckCircle2} label="Booking Confirmation" enabled={bs.autoConfirmation} templateId={bs.confirmationTemplateId} color="#059669" />
                  <AutoCard icon={ThumbsUp}     label="Follow-up Message"    enabled={bs.autoFollowup}     templateId={bs.followupTemplateId}     color="#0284c7" />
                  <AutoCard icon={Package}      label="Low Stock Alert"      enabled={bs.autoLowStock}     templateId={bs.lowStockTemplateId}     color="#ea580c" />
                </div>
                {confirmQueue + followupQueue > 0 && (
                  <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#fef9ec", border: "1px solid #fde68a", fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                    <Clock size={13} style={{ display: "inline", marginRight: 6 }} />
                    {confirmQueue + followupQueue} message(s) pending — sends on next scheduler tick
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}