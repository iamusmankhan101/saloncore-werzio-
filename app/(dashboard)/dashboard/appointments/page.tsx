"use client";

import { useState, useMemo, useEffect } from "react";
import { getStoredAppointments, saveAppointments, getStoredClients, saveClients, getStoredStaff, getStoredServices } from "@/lib/storage";
import type { Appointment, AppointmentStatus, Client, Staff, Service } from "@/lib/types";
import { Search, Filter, X, Clock, User, Scissors, Tag, ChevronDown, Plus, CalendarDays, CheckCircle2, ArrowRight, ShoppingCart } from "lucide-react";
import { enqueueWhatsAppConfirmation, enqueueWhatsAppFollowup } from "@/lib/whatsapp-scheduler";
import { getCurrentPlan, isAtLimit, thisMonthCount } from "@/lib/plan-limits";

const STATUS: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  booked:        { label: "Booked",      color: "#6366f1", bg: "#EEF2FF" },
  confirmed:     { label: "Confirmed",   color: "#059669", bg: "#ecfdf5" },
  arrived:       { label: "Arrived",     color: "#9333EA", bg: "#F5F3FF" },
  "in-progress": { label: "In Progress", color: "#d97706", bg: "#fffbeb" },
  completed:     { label: "Completed",   color: "#16a34a", bg: "#f0fdf4" },
  "no-show":     { label: "No Show",     color: "#dc2626", bg: "#fef2f2" },
  cancelled:     { label: "Cancelled",   color: "#6b7280", bg: "#f9fafb" },
};

const ALL_STATUSES = Object.keys(STATUS) as AppointmentStatus[];

function fmt(n: number) { return "PKR " + n.toLocaleString("en-PK"); }

function fmtDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")}${ampm}`;
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMins = h * 60 + m + mins;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e",
  outline: "none", background: "#fff",
};

// ── Shared sub-components ─────────────────────────────────────────────────────

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 13, color: "#1a1a2e" }}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      {children}
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff", cursor: "pointer" }}>
        {children}
      </select>
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

const FLOW_STEPS: AppointmentStatus[] = ["booked", "confirmed", "arrived", "in-progress", "completed"];

function DetailModal({ appt, onClose, clients, staffList, allServices, onStatusChange }: {
  appt: Appointment; onClose: () => void; clients: Client[]; staffList: Staff[];
  allServices: Service[]; onStatusChange: (apptId: string, status: AppointmentStatus) => void;
}) {
  const [currentStatus, setCurrentStatus] = useState<AppointmentStatus>(appt.status);
  const cfg          = STATUS[currentStatus];
  const staff        = staffList.find((s) => s.id === appt.staffId);
  const services     = allServices.filter((s) => appt.serviceIds.includes(s.id));
  const client       = clients.find((c) => c.id === appt.clientId);
  const durationMin  = toMin(appt.endTime) - toMin(appt.startTime);
  const flowIdx      = FLOW_STEPS.indexOf(currentStatus);
  const nextStep     = flowIdx !== -1 && flowIdx < FLOW_STEPS.length - 1 ? FLOW_STEPS[flowIdx + 1] : null;
  const isTerminal   = ["completed", "cancelled", "no-show"].includes(currentStatus);

  function changeStatus(newStatus: AppointmentStatus) {
    setCurrentStatus(newStatus);
    onStatusChange(appt.id, newStatus);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 480, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 70px rgba(0,0,0,0.22)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${cfg.color}18, ${cfg.color}08)`, padding: "20px 24px 18px", borderBottom: `2px solid ${cfg.color}22`, position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, display: "flex" }}>
            <X size={16} color="#6b6b8a" />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: `linear-gradient(135deg, ${cfg.color}33, ${cfg.color}18)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: cfg.color, flexShrink: 0 }}>
              {appt.clientName.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#1a1a2e" }}>{appt.clientName}</div>
              <div style={{ fontSize: 12, color: "#9898b0", marginTop: 2 }}>
                {client?.phone && <span>{client.phone} · </span>}
                {fmtDate(appt.date)} · {fmtTime(appt.startTime)}–{fmtTime(appt.endTime)}
              </div>
            </div>
          </div>

          {/* Linear stepper */}
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {FLOW_STEPS.map((step, i) => {
              const stepCfg  = STATUS[step];
              const isDone   = flowIdx > i || (currentStatus === "completed" && i === FLOW_STEPS.length - 1);
              const isCurr   = flowIdx === i && !isTerminal;
              const isPast   = flowIdx > i;
              return (
                <div key={step} style={{ display: "flex", alignItems: "center", flex: i < FLOW_STEPS.length - 1 ? 1 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: isDone || isCurr ? stepCfg.color : "#e8e8f0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: isCurr ? `2px solid ${stepCfg.color}` : "2px solid transparent",
                      boxShadow: isCurr ? `0 0 0 3px ${stepCfg.color}28` : "none",
                      transition: "all 0.2s",
                    }}>
                      {isPast || (currentStatus === "completed" && step === "completed")
                        ? <CheckCircle2 size={14} color="#fff" />
                        : <div style={{ width: 8, height: 8, borderRadius: "50%", background: isCurr ? "#fff" : "#c8c8d8" }} />
                      }
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: isCurr ? stepCfg.color : isPast ? "#6b7280" : "#c8c8d8", textTransform: "capitalize", whiteSpace: "nowrap" }}>
                      {step === "in-progress" ? "In Progress" : step.charAt(0).toUpperCase() + step.slice(1)}
                    </span>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: flowIdx > i ? cfg.color : "#e8e8f0", margin: "0 4px", marginBottom: 16, transition: "background 0.2s" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Terminal badges */}
          {currentStatus === "no-show" && (
            <div style={{ marginTop: 8, display: "inline-block", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700, color: "#dc2626" }}>No Show</div>
          )}
          {currentStatus === "cancelled" && (
            <div style={{ marginTop: 8, display: "inline-block", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700, color: "#6b7280" }}>Cancelled</div>
          )}
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Info rows */}
          <InfoRow icon={<User size={14} color="#9898b0" />} label="Stylist">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: staff?.color ?? "#ccc", display: "inline-block" }} />
              {appt.staffName || "—"}
            </span>
          </InfoRow>

          <InfoRow icon={<Scissors size={14} color="#9898b0" />} label="Services">
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {services.length > 0 ? services.map((sv) => (
                <div key={sv.id} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{sv.name}</span>
                  <span style={{ color: "#7C3AED", fontWeight: 600 }}>{fmt(sv.price)}</span>
                </div>
              )) : appt.serviceNames.map((name) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </InfoRow>

          <InfoRow icon={<Clock size={14} color="#9898b0" />} label="Duration">
            {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)} <span style={{ color: "#9898b0", fontSize: 11 }}>({durationMin} min)</span>
          </InfoRow>

          {appt.notes && (
            <InfoRow icon={<Tag size={14} color="#9898b0" />} label="Notes">{appt.notes}</InfoRow>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f9f8ff", borderRadius: 12, border: "1px solid #ede9fe" }}>
            <span style={{ fontSize: 13, color: "#6b6b8a", fontWeight: 600 }}>Total Amount</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#7C3AED" }}>{fmt(appt.totalAmount)}</span>
          </div>

          {/* ── Status workflow ── */}
          {!isTerminal && nextStep && (
            <div style={{ borderTop: "1px solid #f0f0f8", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Update Status</div>

              {/* Primary next-step button */}
              <button type="button" onClick={() => changeStatus(nextStep)}
                style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${STATUS[nextStep].color}dd, ${STATUS[nextStep].color})`, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: `0 4px 14px ${STATUS[nextStep].color}44` }}>
                <ArrowRight size={16} />
                Mark as {STATUS[nextStep].label}
              </button>

              {/* Skip / secondary actions */}
              <div style={{ display: "flex", gap: 8 }}>
                {FLOW_STEPS.filter(s => s !== currentStatus && s !== nextStep && !["completed"].includes(s)).map(s => (
                  <button key={s} type="button" onClick={() => changeStatus(s)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: `1.5px solid ${STATUS[s].color}44`, background: STATUS[s].bg, color: STATUS[s].color, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {STATUS[s].label}
                  </button>
                ))}
                <button type="button" onClick={() => changeStatus("no-show")}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "1.5px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  No Show
                </button>
                <button type="button" onClick={() => changeStatus("cancelled")}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "1.5px solid #e5e7eb", background: "#f9fafb", color: "#6b7280", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Completed state */}
          {currentStatus === "completed" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#ecfdf5", borderRadius: 12, border: "1px solid #bbf7d0" }}>
              <CheckCircle2 size={18} color="#059669" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>Appointment Completed</div>
                <div style={{ fontSize: 11, color: "#047857", marginTop: 1 }}>Client stats updated · Follow-up WhatsApp queued</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateModal({ onClose, onAdd, clients, staffList, allServices }: { onClose: () => void; onAdd: (appt: Appointment, newClientObj?: Client) => void; clients: Client[]; staffList: Staff[]; allServices: Service[] }) {
  const [form, setForm] = useState({ clientId: "", staffId: "", serviceIds: [] as string[], date: "", startTime: "", notes: "" });
  const [done, setDone] = useState(false);
  const [newClient, setNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: "", phone: "", email: "" });
  const [newClientSaved, setNewClientSaved] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setNC = (k: string, v: string) => setNewClientForm((f) => ({ ...f, [k]: v }));
  const canSaveNewClient = newClientForm.name && newClientForm.phone;

  const availableServices = form.staffId
    ? allServices.filter((s) => s.assignedStaffIds.includes(form.staffId))
    : allServices;

  const toggleService = (id: string) =>
    setForm((f) => ({ ...f, serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s) => s !== id) : [...f.serviceIds, id] }));

  const selectedServices = allServices.filter((s) => form.serviceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const canSubmit = (newClient ? newClientSaved : !!form.clientId) && form.staffId && form.serviceIds.length > 0 && form.date && form.startTime;

  const handleBook = () => {
    if (!canSubmit) return;

    let finalClientId = form.clientId;
    let finalClientName = "";
    let newClientObj: Client | undefined = undefined;

    if (newClient) {
      const newId = "c_" + Date.now();
      newClientObj = {
        id: newId,
        name: newClientForm.name,
        phone: newClientForm.phone,
        email: newClientForm.email || undefined,
        gender: "female",
        tags: ["New"],
        source: "walk-in",
        createdAt: form.date || new Date().toISOString().split("T")[0],
        totalVisits: 1,
        totalSpend: totalPrice,
        lastVisitDate: form.date,
        averageRating: 5.0,
      };
      finalClientId = newId;
      finalClientName = newClientForm.name;
    } else {
      const existing = clients.find((c) => c.id === form.clientId);
      finalClientName = existing?.name ?? "";
    }

    const staffObj = staffList.find((s) => s.id === form.staffId);

    const appt: Appointment = {
      id: "a_" + Date.now(),
      clientId: finalClientId,
      clientName: finalClientName,
      staffId: form.staffId,
      staffName: staffObj?.name ?? "",
      serviceIds: form.serviceIds,
      serviceNames: selectedServices.map((s) => s.name),
      date: form.date,
      startTime: form.startTime,
      endTime: addMinutes(form.startTime, totalDuration),
      status: "booked",
      totalAmount: totalPrice,
      source: newClient ? "walk-in" : (clients.find((c) => c.id === form.clientId)?.source ?? "walk-in"),
      notes: form.notes || undefined,
    };

    onAdd(appt, newClientObj);
    setDone(true);
  };

  if (done) {
    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 380, padding: "48px 32px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e", marginBottom: 8 }}>Appointment Created</div>
          <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 24 }}>The appointment has been booked successfully.</div>
          <button onClick={onClose} style={{ padding: "10px 32px", borderRadius: 10, background: "#7C3AED", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>

        {/* Header */}
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CalendarDays size={18} color="#7C3AED" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>New Appointment</div>
              <div style={{ fontSize: 12, color: "#9898b0" }}>Fill in the details below</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
            <X size={18} color="#6b6b8a" />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

          <FormField label="Client">
            {!newClient ? (
              <div style={{ display: "flex", gap: 8 }}>
                <select value={form.clientId} onChange={(e) => set("clientId", e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                  <option value="">Select a client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => { setNewClient(true); setNewClientSaved(false); set("clientId", "__new__"); }}
                  style={{ padding: "9px 14px", borderRadius: 8, border: "1px dashed #7C3AED", background: "#F5F3FF", fontSize: 12, fontWeight: 600, color: "#7C3AED", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}
                >
                  <Plus size={13} /> New
                </button>
              </div>
            ) : (
              <div style={{ border: "1px solid #EDE9FE", borderRadius: 10, padding: "14px", background: "#F5F3FF", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED" }}>New Client</span>
                  <button type="button" onClick={() => { setNewClient(false); setNewClientSaved(false); set("clientId", ""); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
                    <X size={14} color="#9898b0" />
                  </button>
                </div>
                {newClientSaved ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#059669", fontWeight: 600 }}>
                    <span>✓</span> {newClientForm.name} · {newClientForm.phone}
                  </div>
                ) : (
                  <>
                    <input value={newClientForm.name} onChange={(e) => setNC("name", e.target.value)} placeholder="Full name *"
                      style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #e8e8f0", fontSize: 13, outline: "none", background: "#fff" }} />
                    <input value={newClientForm.phone} onChange={(e) => setNC("phone", e.target.value)} placeholder="Phone number *"
                      style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #e8e8f0", fontSize: 13, outline: "none", background: "#fff" }} />
                    <input value={newClientForm.email} onChange={(e) => setNC("email", e.target.value)} placeholder="Email (optional)"
                      style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid #e8e8f0", fontSize: 13, outline: "none", background: "#fff" }} />
                    <button
                      type="button"
                      onClick={() => canSaveNewClient && setNewClientSaved(true)}
                      style={{ padding: "8px 0", borderRadius: 8, border: "none", background: canSaveNewClient ? "#7C3AED" : "#e8e8f0", fontSize: 12, fontWeight: 600, color: canSaveNewClient ? "#fff" : "#b0b0c8", cursor: canSaveNewClient ? "pointer" : "not-allowed" }}
                    >
                      Save Client
                    </button>
                  </>
                )}
              </div>
            )}
          </FormField>

          <FormField label="Stylist">
            <select
              value={form.staffId}
              onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value, serviceIds: [] }))}
              style={selectStyle}
            >
              <option value="">Select a stylist…</option>
              {staffList.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.role.replace(/-/g, " ")}</option>
              ))}
            </select>
          </FormField>

          <FormField label={`Services${form.serviceIds.length > 0 ? ` (${form.serviceIds.length} selected)` : ""}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {availableServices.length === 0 ? (
                <div style={{ fontSize: 13, color: "#b0b0c8", padding: "8px 0" }}>Select a stylist first to see available services.</div>
              ) : availableServices.map((sv) => {
                const checked = form.serviceIds.includes(sv.id);
                return (
                  <label key={sv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 8, border: `1px solid ${checked ? "#7C3AED" : "#e8e8f0"}`, background: checked ? "#F5F3FF" : "#fff", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleService(sv.id)} style={{ accentColor: "#7C3AED", width: 14, height: 14 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a2e" }}>{sv.name}</div>
                        <div style={{ fontSize: 11, color: "#9898b0" }}>{sv.durationMin} min</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#7C3AED" }}>{fmt(sv.price)}</span>
                  </label>
                );
              })}
            </div>
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Date">
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} style={selectStyle} />
            </FormField>
            <FormField label="Start Time">
              <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} style={selectStyle} />
            </FormField>
          </div>

          <FormField label="Notes (optional)">
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any special requests or notes…" rows={2} style={{ ...selectStyle, resize: "none", lineHeight: 1.5 }} />
          </FormField>

          {form.serviceIds.length > 0 && (
            <div style={{ background: "#F5F3FF", border: "1px solid #EDE9FE", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#7C3AED" }}>{totalDuration} min total</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#7C3AED" }}>{fmt(totalPrice)}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>
              Cancel
            </button>
            <button
              onClick={handleBook}
              style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: canSubmit ? "#7C3AED" : "#e8e8f0", fontSize: 13, fontWeight: 600, color: canSubmit ? "#fff" : "#b0b0c8", cursor: canSubmit ? "pointer" : "not-allowed" }}
            >
              Book Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const plan         = getCurrentPlan();
  const monthCount   = thisMonthCount(appointments);
  const apptLimited  = isAtLimit(plan.appointmentsPerMonth, monthCount);

  useEffect(() => {
    setAppointments(getStoredAppointments());
    setClients(getStoredClients());
    setStaffList(getStoredStaff());
    setServices(getStoredServices());
  }, []);

  const filtered = useMemo(() => {
    return [...appointments]
      .sort((a, b) => (a.date + a.startTime) > (b.date + b.startTime) ? -1 : 1)
      .filter((a) => {
        if (statusFilter !== "all" && a.status !== statusFilter) return false;
        if (staffFilter !== "all" && a.staffId !== staffFilter) return false;
        if (dateFilter && a.date !== dateFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return a.clientName.toLowerCase().includes(q) || a.serviceNames.some((s) => s.toLowerCase().includes(q)) || a.staffName.toLowerCase().includes(q);
        }
        return true;
      });
  }, [appointments, search, statusFilter, staffFilter, dateFilter]);

  const totalRevenue = filtered.reduce((s, a) => s + a.totalAmount, 0);
  const activeFilters = [statusFilter !== "all", staffFilter !== "all", !!dateFilter].filter(Boolean).length;

  return (
    <div style={{ background: "#f4f5f7", minHeight: "100vh", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

      {selected && (
        <DetailModal
          appt={selected}
          onClose={() => setSelected(null)}
          clients={clients}
          staffList={staffList}
          allServices={services}
          onStatusChange={(apptId, newStatus) => {
            setAppointments((prev) => {
              const updated = prev.map((a) => a.id === apptId ? { ...a, status: newStatus } : a);
              saveAppointments(updated);
              return updated;
            });
            setSelected((prev) => prev ? { ...prev, status: newStatus } : null);

            if (newStatus === "completed") {
              enqueueWhatsAppFollowup(apptId);
              // Update client visit count, spend and last visit date
              const appt = appointments.find((a) => a.id === apptId);
              if (appt?.clientId) {
                setClients((prev) => {
                  const updated = prev.map((c) =>
                    c.id === appt.clientId
                      ? { ...c, totalVisits: c.totalVisits + 1, totalSpend: c.totalSpend + appt.totalAmount, lastVisitDate: appt.date }
                      : c
                  );
                  saveClients(updated);
                  return updated;
                });
              }
            }
          }}
        />
      )}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          clients={clients}
          staffList={staffList}
          allServices={services}
          onAdd={(newAppt, newClientObj) => {
            setAppointments((prevAppts) => {
              const updated = [newAppt, ...prevAppts];
              saveAppointments(updated);
              return updated;
            });
            enqueueWhatsAppConfirmation(newAppt.id);

            if (newClientObj) {
              setClients((prevClients) => {
                const updated = [newClientObj, ...prevClients];
                saveClients(updated);
                return updated;
              });
            } else {
              setClients((prevClients) => {
                const updated = prevClients.map((c) => {
                  if (c.id === newAppt.clientId) {
                    return {
                      ...c,
                      totalVisits: c.totalVisits + 1,
                      totalSpend: c.totalSpend + newAppt.totalAmount,
                      lastVisitDate: newAppt.date,
                    };
                  }
                  return c;
                });
                saveClients(updated);
                return updated;
              });
            }
          }}
        />
      )}

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#1a1a2e" }}>Appointments</div>
          <div style={{ fontSize: 13, color: "#9898b0", marginTop: 2 }}>{filtered.length} appointments · {fmt(totalRevenue)} total</div>
        </div>
        <button
          onClick={() => !apptLimited && setShowCreate(true)}
          title={apptLimited ? `Free plan: 30 appointments/month limit reached. Upgrade to Pro for unlimited.` : ""}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: apptLimited ? "#e8e8f0" : "#7C3AED", fontSize: 13, fontWeight: 600, color: apptLimited ? "#aaaabc" : "#fff", cursor: apptLimited ? "not-allowed" : "pointer" }}
        >
          <Plus size={16} />
          New Appointment
          {apptLimited && <span style={{ fontSize: 11, background: "#dc2626", color: "#fff", borderRadius: 20, padding: "1px 7px", marginLeft: 2 }}>Limit reached</span>}
        </button>
      </div>

      {/* Free-plan usage bar */}
      {plan.appointmentsPerMonth !== -1 && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: apptLimited ? "#fef2f2" : monthCount >= plan.appointmentsPerMonth * 0.8 ? "#fffbeb" : "#f5f3ff", border: `1px solid ${apptLimited ? "#fecaca" : monthCount >= plan.appointmentsPerMonth * 0.8 ? "#fde68a" : "#ddd6fe"}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: apptLimited ? "#dc2626" : "#7C3AED", marginBottom: 5 }}>
              {apptLimited ? "Monthly limit reached" : `${monthCount} / ${plan.appointmentsPerMonth} appointments this month`}
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "#e8e8f0", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, background: apptLimited ? "#dc2626" : monthCount >= plan.appointmentsPerMonth * 0.8 ? "#d97706" : "#7C3AED", width: `${Math.min(100, (monthCount / plan.appointmentsPerMonth) * 100)}%`, transition: "width 0.3s" }} />
            </div>
          </div>
          <a href="/dashboard/billing" style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", textDecoration: "none", whiteSpace: "nowrap", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 7, padding: "4px 10px" }}>
            Upgrade →
          </a>
        </div>
      )}

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e8e8f0", borderRadius: 10, padding: "9px 14px" }}>
          <Search size={15} color="#b0b0c8" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, service, or stylist…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, color: "#1a1a2e", background: "transparent" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
              <X size={14} color="#b0b0c8" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: `1px solid ${activeFilters > 0 ? "#7C3AED" : "#e8e8f0"}`, background: activeFilters > 0 ? "#F5F3FF" : "#fff", fontSize: 13, fontWeight: 500, color: activeFilters > 0 ? "#7C3AED" : "#6b6b8a", cursor: "pointer" }}
        >
          <Filter size={14} />
          Filters
          {activeFilters > 0 && (
            <span style={{ background: "linear-gradient(135deg, #5B21B6, #9333EA)", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {activeFilters}
            </span>
          )}
          <ChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ background: "#fff", border: "1px solid #e8e8f0", borderRadius: 12, padding: "16px 20px", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
          <FilterSelect label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as AppointmentStatus | "all")}>
            <option value="all">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </FilterSelect>
          <FilterSelect label="Stylist" value={staffFilter} onChange={setStaffFilter}>
            <option value="all">All Stylists</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </FilterSelect>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff" }} />
          </div>
          {activeFilters > 0 && (
            <button onClick={() => { setStatusFilter("all"); setStaffFilter("all"); setDateFilter(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}>
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 160px 120px 110px 100px 120px", padding: "10px 20px", borderBottom: "1px solid #f0f0f8", background: "#fafafa" }}>
          {["CLIENT", "DATE", "SERVICE", "STYLIST", "STATUS", "AMOUNT", ""].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#b0b0c8", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#b0b0c8", fontSize: 14 }}>No appointments match your filters.</div>
        ) : (
          filtered.map((appt, i) => {
            const cfg = STATUS[appt.status];
            const staff = staffList.find((s) => s.id === appt.staffId);
            const isLast = i === filtered.length - 1;
            return (
              <div
                key={appt.id}
                onClick={() => setSelected(appt)}
                style={{ display: "grid", gridTemplateColumns: "1fr 140px 160px 120px 110px 100px 120px", padding: "13px 20px", borderBottom: isLast ? "none" : "1px solid #f4f4f8", alignItems: "center", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: (staff?.color ?? "#7C3AED") + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: staff?.color ?? "#7C3AED", flexShrink: 0 }}>
                    {appt.clientName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{appt.clientName}</div>
                    <div style={{ fontSize: 11, color: "#9898b0", marginTop: 1, textTransform: "capitalize" }}>{appt.source}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#1a1a2e", fontWeight: 500 }}>{fmtDate(appt.date)}</div>
                  <div style={{ fontSize: 11, color: "#9898b0", marginTop: 1 }}>{fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}</div>
                </div>
                <div style={{ fontSize: 13, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {appt.serviceNames.join(", ")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: staff?.color ?? "#ccc", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{appt.staffName.split(" ")[0]}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>{cfg.label}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{fmt(appt.totalAmount)}</div>
                {/* Checkout button — visible for arrived / in-progress / completed */}
                <div onClick={(e) => e.stopPropagation()}>
                  {["arrived", "in-progress", "completed"].includes(appt.status) ? (
                    <a
                      href={`/dashboard/pos?appointmentId=${appt.id}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, background: "linear-gradient(135deg,#5B21B6,#9333EA)", color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(91,33,182,0.3)" }}
                    >
                      <ShoppingCart size={12} /> Checkout
                    </a>
                  ) : <span />}
                </div>
              </div>
            );
          })
        )}

        {filtered.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f0f0f8", background: "#fafafa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#9898b0" }}>{filtered.length} appointments</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#7C3AED" }}>{fmt(totalRevenue)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

