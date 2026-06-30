"use client";

import { useState, useMemo, useEffect } from "react";
import { getStoredAppointments, saveAppointments, getStoredClients, saveClients, getStoredStaff, getStoredServices } from "@/lib/storage";
import type { Appointment, AppointmentStatus, Client, Staff, Service } from "@/lib/types";
import { Search, Filter, X, Clock, User, Scissors, Tag, ChevronDown, Plus, CalendarDays, CheckCircle2, ArrowRight, ShoppingCart, Camera, Trash2 } from "lucide-react";
import { enqueueWhatsAppConfirmation, enqueueWhatsAppFollowup, enqueueWhatsAppCancellation, sendGroupBookingAlert } from "@/lib/whatsapp-scheduler";
import { awardPoints } from "@/lib/loyalty";
import { settingsStore } from "@/lib/settings-store";
import { getCurrentPlan, isAtLimit, thisMonthCount } from "@/lib/plan-limits";
import PageTitle from "@/components/page-title";

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

import { fmtCurrency as fmt } from "@/lib/format";

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
  const [photos, setPhotos] = useState<{ before?: string; after?: string }>({});

  const handlePhotoUpload = (side: "before" | "after", file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPhotos((p) => ({ ...p, [side]: e.target?.result as string }));
    reader.readAsDataURL(file);
  };
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
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 480, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 70px rgba(0,0,0,0.22)", overflow: "hidden" }}>

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

          {/* ── Before & After Photos ── */}
          {(currentStatus === "in-progress" || currentStatus === "completed") && (
            <div style={{ borderTop: "1px solid #f0f0f8", paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#b0b0c8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                Before &amp; After Photos
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {(["before", "after"] as const).map((side) => (
                  <div key={side}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{side}</div>
                    {photos[side] ? (
                      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden" }}>
                        <img src={photos[side]} alt={side} style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
                        <button
                          onClick={() => setPhotos((p) => ({ ...p, [side]: undefined }))}
                          style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <X size={11} color="#fff" />
                        </button>
                      </div>
                    ) : (
                      <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, height: 100, borderRadius: 10, border: "2px dashed #a78bfa", background: "#faf5ff", cursor: "pointer" }}>
                        <Camera size={18} color="#a78bfa" />
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#a78bfa" }}>Upload {side}</span>
                        <input type="file" accept="image/*" style={{ display: "none" }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(side, f); }} />
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>

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

// ── Cancellations Tab ─────────────────────────────────────────────────────────

function CancellationsTab({ appointments, staffList, onReschedule, onSelect }: {
  appointments: Appointment[];
  staffList: Staff[];
  onReschedule: () => void;
  onSelect: (a: Appointment) => void;
}) {
  const cancelled = appointments
    .filter((a) => a.status === "cancelled" || a.status === "no-show")
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalCancelled = cancelled.filter((a) => a.status === "cancelled").length;
  const totalNoShow    = cancelled.filter((a) => a.status === "no-show").length;
  const lostRevenue    = cancelled.reduce((s, a) => s + a.totalAmount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Cancelled",    value: totalCancelled,  color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
          { label: "No Shows",     value: totalNoShow,     color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
          { label: "Lost Revenue", value: fmt(lostRevenue),color: "#7C3AED", bg: "#f5f3ff", border: "#ddd6fe" },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: 16,
            padding: "16px 20px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.01)"
          }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: s.color, letterSpacing: "-0.02em" }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: s.color, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div style={{
        background: "#fff",
        borderRadius: 18,
        border: "1px solid rgba(226,223,235,.95)",
        boxShadow: "0 8px 28px rgba(38,25,75,.04)",
        overflow: "hidden"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 130px 1.5fr 120px 110px 150px",
          padding: "12px 20px",
          borderBottom: "1px solid #f0f0f5",
          background: "#faf9fd"
        }}>
          {["CLIENT", "DATE", "SERVICE", "STYLIST", "STATUS", "ACTIONS"].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#8e89a3", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>

        {cancelled.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#b0b0c8", fontSize: 14 }}>
            No cancellations or no-shows yet.
          </div>
        ) : (
          cancelled.map((appt, i) => {
            const staff      = staffList.find((s) => s.id === appt.staffId);
            const isLast     = i === cancelled.length - 1;
            const isCancelled = appt.status === "cancelled";
            return (
              <div
                key={appt.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 130px 1.5fr 120px 110px 150px",
                  padding: "14px 20px",
                  borderBottom: isLast ? "none" : "1px solid #f8f8fc",
                  alignItems: "center",
                  transition: "background 0.2s"
                }}
                className="hover-bg-row"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#6b6b8a", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                    {appt.clientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 750, color: "#1a1a2e", letterSpacing: "-0.01em" }}>{appt.clientName}</div>
                    <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2, fontWeight: 500 }}>{fmt(appt.totalAmount)} lost</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#1a1a2e", fontWeight: 650 }}>{fmtDate(appt.date)}</div>
                  <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2, display: "flex", alignItems: "center", gap: 3, fontWeight: 500 }}>
                    <Clock size={10} />
                    <span>{fmtTime(appt.startTime)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 550 }}>
                  {appt.serviceNames.join(", ")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: staff?.color ?? "#ccc", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.8)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                  <span style={{ fontSize: 13, color: "#1a1a2e", fontWeight: 600 }}>{appt.staffName.split(" ")[0]}</span>
                </div>
                <div>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10,
                    fontWeight: 800,
                    color: isCancelled ? "#dc2626" : "#d97706",
                    background: isCancelled ? "#fef2f2" : "#fffbeb",
                    padding: "3px 10px",
                    borderRadius: 20
                  }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: isCancelled ? "#dc2626" : "#d97706" }} />
                    {isCancelled ? "Cancelled" : "No Show"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => onSelect(appt)}
                    style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e3e0eb", background: "#fff", fontSize: 11, fontWeight: 700, color: "#6b6b8a", cursor: "pointer", transition: "all 0.15s" }}
                    className="hover-bg-light"
                  >
                    View
                  </button>
                  <button
                    onClick={onReschedule}
                    style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "var(--accent-gradient)", fontSize: 11, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "0 2px 6px var(--accent-glow)", transition: "transform 0.15s" }}
                    className="hover-scale"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            );
          })
        )}

        {cancelled.length > 0 && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #eef0f5", background: "#faf9fd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 750, color: "#6b6b8a" }}>{cancelled.length} records total</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#dc2626" }}>− {fmt(lostRevenue)} lost revenue</span>
          </div>
        )}
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
  const [tab, setTab] = useState<"appointments" | "cancellations">("appointments");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

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
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return (b.startTime || "").localeCompare(a.startTime || "");
      })
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

  const allChecked = filtered.length > 0 && filtered.every(a => checkedIds.has(a.id));
  const someChecked = filtered.some(a => checkedIds.has(a.id));

  function toggleCheck(id: string) {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allChecked) {
      setCheckedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(a => next.delete(a.id));
        return next;
      });
    } else {
      setCheckedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(a => next.add(a.id));
        return next;
      });
    }
  }

  function deleteChecked() {
    if (!checkedIds.size) return;
    if (!window.confirm(`Delete ${checkedIds.size} appointment${checkedIds.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setAppointments(prev => {
      const updated = prev.filter(a => !checkedIds.has(a.id));
      saveAppointments(updated);
      return updated;
    });
    setCheckedIds(new Set());
  }

  return (
    <div className="dash-page dashboard-polish" style={{ background: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 20 }}>

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

            if (newStatus === "cancelled" || newStatus === "no-show") {
              enqueueWhatsAppCancellation(apptId);
            }
            if (newStatus === "completed") {
              enqueueWhatsAppFollowup(apptId);
              const appt = appointments.find((a) => a.id === apptId);
              if (appt?.clientId) {
                setClients((prev) => {
                  const loyaltySettings = settingsStore.loyalty as Parameters<typeof awardPoints>[2];
                  const updated = prev.map((c) => {
                    if (c.id !== appt.clientId) return c;
                    const withVisit = { ...c, totalVisits: c.totalVisits + 1, totalSpend: c.totalSpend + appt.totalAmount, lastVisitDate: appt.date };
                    return awardPoints(withVisit, appt.totalAmount, loyaltySettings, appt.id);
                  });
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
            sendGroupBookingAlert(newAppt);

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
        <PageTitle
          icon={<CalendarDays size={24} />}
          title="Appointments"
          subtitle={<>{filtered.length} appointments · <span style={{ color: "var(--accent)", fontWeight: 700 }}>{fmt(totalRevenue)} total</span></>}
        />
        <button
          onClick={() => !apptLimited && setShowCreate(true)}
          title={apptLimited ? `Free plan: 30 appointments/month limit reached. Upgrade to Pro for unlimited.` : ""}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: apptLimited ? "#e8e8f0" : "var(--accent-gradient)",
            fontSize: 13,
            fontWeight: 750,
            color: apptLimited ? "#aaaabc" : "#fff",
            boxShadow: apptLimited ? "none" : "0 4px 14px var(--accent-glow)",
            cursor: apptLimited ? "not-allowed" : "pointer",
            transition: "all 0.18s ease"
          }}
          className={!apptLimited ? "page-header-btn" : ""}
        >
          <Plus size={16} />
          New Appointment
          {apptLimited && <span style={{ fontSize: 11, background: "#dc2626", color: "#fff", borderRadius: 20, padding: "1px 7px", marginLeft: 2 }}>Limit reached</span>}
        </button>
      </div>

      {/* Free-plan usage bar */}
      {plan.appointmentsPerMonth !== -1 && (
        <div style={{
          padding: "14px 20px",
          borderRadius: 14,
          background: apptLimited ? "#fef2f2" : monthCount >= plan.appointmentsPerMonth * 0.8 ? "#fffbeb" : "#faf9fd",
          border: `1px solid ${apptLimited ? "#fecaca" : monthCount >= plan.appointmentsPerMonth * 0.8 ? "#fde68a" : "rgba(124, 58, 237, 0.1)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          boxShadow: "0 4px 12px rgba(38,25,75,0.02)"
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: apptLimited ? "#dc2626" : "var(--accent)", marginBottom: 6 }}>
              {apptLimited ? "Monthly limit reached" : `${monthCount} / ${plan.appointmentsPerMonth} appointments this month`}
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "#eef0f5", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 99, background: apptLimited ? "#dc2626" : monthCount >= plan.appointmentsPerMonth * 0.8 ? "#d97706" : "var(--accent-gradient)", width: `${Math.min(100, (monthCount / plan.appointmentsPerMonth) * 100)}%`, transition: "width 0.3s" }} />
            </div>
          </div>
          <a href="/dashboard/billing" style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap", background: "#fff", border: "1px solid rgba(124, 58, 237, 0.15)", borderRadius: 8, padding: "6px 12px", boxShadow: "0 2px 6px rgba(0,0,0,0.02)", transition: "all 0.15s" }} className="hover-bg-light">
            Upgrade Plan
          </a>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#f4f4f9", border: "1px solid #e3e0eb", borderRadius: 12, padding: 4, alignSelf: "flex-start" }}>
        {([["appointments", "All Appointments"], ["cancellations", "Cancellations"]] as const).map(([t, label]) => {
          const cancCount = appointments.filter((a) => a.status === "cancelled" || a.status === "no-show").length;
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "7px 18px",
                borderRadius: 9,
                border: "none",
                background: isActive ? "var(--accent-gradient)" : "transparent",
                color: isActive ? "#fff" : "#6b6b8a",
                fontSize: 13,
                fontWeight: 755,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: isActive ? "0 4px 10px var(--accent-glow)" : "none",
                transition: "all 0.18s ease"
              }}
            >
              {label}
              {t === "cancellations" && cancCount > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  background: isActive ? "rgba(255,255,255,0.25)" : "#fef2f2",
                  color: isActive ? "#fff" : "#dc2626",
                  borderRadius: 20,
                  padding: "1px 7px"
                }}>
                  {cancCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "cancellations" ? (
        <CancellationsTab appointments={appointments} staffList={staffList} onReschedule={() => setShowCreate(true)} onSelect={setSelected} />
      ) : (<>

      {/* Search + filter bar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #e3e0eb", borderRadius: 12, padding: "10px 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.01)", transition: "border-color 0.15s" }}>
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "10px 18px",
            borderRadius: 12,
            border: `1px solid ${activeFilters > 0 ? "var(--accent-light)" : "#e3e0eb"}`,
            background: activeFilters > 0 ? "rgba(124, 58, 237, 0.04)" : "#fff",
            fontSize: 13,
            fontWeight: 750,
            color: activeFilters > 0 ? "var(--accent)" : "#6b6b8a",
            cursor: "pointer",
            transition: "all 0.15s"
          }}
          className="hover-bg-light"
        >
          <Filter size={14} />
          Filters
          {activeFilters > 0 && (
            <span style={{ background: "var(--accent-gradient)", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px var(--accent-glow)" }}>
              {activeFilters}
            </span>
          )}
          <ChevronDown size={13} style={{ transform: showFilters ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{
          background: "#fff",
          border: "1px solid rgba(226,223,235,.95)",
          borderRadius: 14,
          padding: "16px 20px",
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          alignItems: "flex-end",
          boxShadow: "0 8px 24px rgba(38,25,75,.03)"
        }}>
          <FilterSelect label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as AppointmentStatus | "all")}>
            <option value="all">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </FilterSelect>
          <FilterSelect label="Stylist" value={staffFilter} onChange={setStaffFilter}>
            <option value="all">All Stylists</option>
            {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </FilterSelect>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e3e0eb", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff" }} />
          </div>
          {activeFilters > 0 && (
            <button onClick={() => { setStatusFilter("all"); setStaffFilter("all"); setDateFilter(""); }} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 12, fontWeight: 700, color: "#dc2626", cursor: "pointer", transition: "all 0.15s" }}>
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {someChecked && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderRadius: 12, background: "#1a1a2e", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{checkedIds.size} selected</span>
          <button
            onClick={deleteChecked}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
          >
            <Trash2 size={13} /> Delete
          </button>
          <button
            onClick={() => setCheckedIds(new Set())}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#ccc", fontSize: 12, fontWeight: 750, cursor: "pointer" }}
          >
            <X size={12} /> Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-scroll-wrap" style={{
        background: "#fff",
        borderRadius: 18,
        border: "1px solid rgba(226,223,235,.95)",
        boxShadow: "0 8px 28px rgba(38,25,75,.04)",
        overflow: "hidden"
      }}>
        <div className="table-scroll-inner">
        <div className="appt-table-inner">
        <div style={{ display: "grid", gridTemplateColumns: "40px 1.2fr 130px 1.5fr 120px 110px 90px 110px", padding: "12px 20px", borderBottom: "1px solid #f0f0f5", background: "#faf9fd" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={allChecked}
              ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
              onChange={toggleAll}
              style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#7C3AED" }}
            />
          </div>
          {["CLIENT", "DATE", "SERVICE", "STYLIST", "STATUS", "AMOUNT", ""].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#8e89a3", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#b0b0c8", fontSize: 14 }}>No appointments match your filters.</div>
        ) : (
          filtered.map((appt, i) => {
            const cfg = STATUS[appt.status];
            const staff = staffList.find((s) => s.id === appt.staffId);
            const isLast = i === filtered.length - 1;
            const isChecked = checkedIds.has(appt.id);
            return (
              <div
                key={appt.id}
                onClick={() => setSelected(appt)}
                style={{ display: "grid", gridTemplateColumns: "40px 1.2fr 130px 1.5fr 120px 110px 90px 110px", padding: "14px 20px", borderBottom: isLast ? "none" : "1px solid #f8f8fc", alignItems: "center", cursor: "pointer", background: isChecked ? "#F5F3FF" : "transparent", transition: "background 0.2s" }}
                className="hover-bg-row"
              >
                <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCheck(appt.id)}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#7C3AED" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: (staff?.color ?? "#7C3AED") + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: staff?.color ?? "#7C3AED", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}>
                    {appt.clientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 750, color: "#1a1a2e", letterSpacing: "-0.01em" }}>{appt.clientName}</div>
                    <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2, textTransform: "capitalize", fontWeight: 500 }}>{appt.source}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#1a1a2e", fontWeight: 650 }}>{fmtDate(appt.date)}</div>
                  <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2, display: "flex", alignItems: "center", gap: 3, fontWeight: 500 }}>
                    <Clock size={10} />
                    <span>{fmtTime(appt.startTime)}</span>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 550 }}>
                  {appt.serviceNames.join(", ")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: staff?.color ?? "#ccc", flexShrink: 0, border: "1.5px solid rgba(255,255,255,0.8)", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
                  <span style={{ fontSize: 13, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{appt.staffName.split(" ")[0]}</span>
                </div>
                <div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 800, color: cfg.color, background: cfg.bg, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: cfg.color }} />
                    {cfg.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>{fmt(appt.totalAmount)}</div>
                {/* Checkout button — visible for arrived / in-progress / completed */}
                <div onClick={(e) => e.stopPropagation()}>
                  {["arrived", "in-progress", "completed"].includes(appt.status) ? (
                    <a
                      href={`/dashboard/pos?appointmentId=${appt.id}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "var(--accent-gradient)", color: "#fff", fontSize: 11, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap", boxShadow: "0 3px 8px var(--accent-glow)" }}
                    >
                      <ShoppingCart size={11} /> Checkout
                    </a>
                  ) : <span />}
                </div>
              </div>
            );
          })
        )}

        {filtered.length > 0 && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #eef0f5", background: "#faf9fd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 750, color: "#6b6b8a" }}>{filtered.length} appointments total</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: "var(--accent)" }}>{fmt(totalRevenue)}</span>
          </div>
        )}
        </div>{/* /appt-table-inner */}
        </div>{/* /table-scroll-inner */}
      </div>{/* /table-scroll-wrap */}
      </>)}
    </div>
  );
}
