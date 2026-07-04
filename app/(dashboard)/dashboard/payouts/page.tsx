"use client";

import { useState, useEffect, useMemo } from "react";
import { getStoredStaff, getStoredAppointments, getStoredServices } from "@/lib/storage";
import { getPayouts, savePayouts, lastPayoutEnd, revenueInPeriod, type Payout, type PayoutStatus } from "@/lib/payouts";
import type { Staff, Appointment, Service } from "@/lib/types";
import { fmtCurrency as fmt } from "@/lib/format";
import {
  Wallet, X, Trash2, Clock, TrendingUp, Users as UsersIcon,
  CheckCircle2, Banknote, FileDown,
} from "lucide-react";
import PageTitle from "@/components/page-title";
import PayoutSlipPrint from "@/components/payout-slip-print";
import { settingsStore } from "@/lib/settings-store";

const PAY_METHOD_OPTIONS = ["cash", "bank", "jazzcash", "easypaisa", "card", "other"];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function startOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }
function addDays(dateStr: string, days: number) {
  return new Date(new Date(dateStr + "T00:00:00").getTime() + days * 86400000).toISOString().slice(0, 10);
}
function fmtDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const inp: React.CSSProperties = { padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", width: "100%", boxSizing: "border-box" };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" };

// ── Process Payout Modal ────────────────────────────────────────────────────
function ProcessPayoutModal({ staff, appointments, services, payouts, onClose, onSave }: {
  staff: Staff; appointments: Appointment[]; services: Service[]; payouts: Payout[]; onClose: () => void;
  onSave: (p: Omit<Payout, "id" | "createdAt">) => void;
}) {
  const lastEnd = lastPayoutEnd(staff.id, payouts);
  const defaultStart = lastEnd ? addDays(lastEnd, 1) : startOfMonth();

  const [form, setForm] = useState({
    periodStart: defaultStart,
    periodEnd: todayStr(),
    payType: staff.payType ?? "commission",
    commissionRate: staff.commissionRate ? String(staff.commissionRate) : "",
    salaryAmount: staff.baseSalary ? String(staff.baseSalary) : "",
    adjustment: "",
    adjustmentNote: "",
    paymentMethod: "cash",
    notes: "",
    markPaidNow: true,
  });
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const [done, setDone] = useState(false);

  const revenue = useMemo(
    () => revenueInPeriod(staff.id, appointments, services, form.periodStart, form.periodEnd),
    [staff.id, appointments, services, form.periodStart, form.periodEnd],
  );
  const hasTeamRevenue = useMemo(() => appointments.some((a) =>
    a.status === "completed" && a.date >= form.periodStart && a.date <= form.periodEnd &&
    a.serviceIds.some((sid) => {
      const sv = services.find((s) => s.id === sid);
      return sv?.multiStylist && sv.assignedStaffIds.includes(staff.id);
    })
  ), [appointments, services, staff.id, form.periodStart, form.periodEnd]);
  const rate = Number(form.commissionRate) || 0;
  const baseAmount = form.payType === "commission"
    ? Math.round(revenue * rate / 100)
    : (Number(form.salaryAmount) || 0);
  const adjustment = Number(form.adjustment) || 0;
  const total = baseAmount + adjustment;

  const canSubmit = Boolean(form.periodStart && form.periodEnd && form.periodEnd >= form.periodStart && total > 0);

  const handleSave = () => {
    if (!canSubmit) return;
    onSave({
      staffId: staff.id,
      staffName: staff.name,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      payType: form.payType as "commission" | "salary",
      revenueGenerated: revenue,
      commissionRate: form.payType === "commission" ? rate : undefined,
      baseAmount,
      adjustment,
      adjustmentNote: form.adjustmentNote.trim() || undefined,
      totalAmount: total,
      status: form.markPaidNow ? "paid" : "pending",
      paymentMethod: form.markPaidNow ? form.paymentMethod : undefined,
      paidDate: form.markPaidNow ? todayStr() : undefined,
      notes: form.notes.trim() || undefined,
    });
    setDone(true);
  };

  if (done) return (
    <div onClick={onClose} className="modal-overlay" style={{ zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 360, maxWidth: "100%", padding: "48px 32px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, color: "#059669" }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e", marginBottom: 8 }}>
          {form.markPaidNow ? "Payout Recorded" : "Payout Saved as Pending"}
        </div>
        <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 24 }}>{fmt(total)} for {staff.name}</div>
        <button onClick={onClose} style={{ padding: "10px 32px", borderRadius: 10, background: "#7C3AED", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} className="modal-overlay" style={{ zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 460, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>Process Payout</div>
            <div style={{ fontSize: 12, color: "#9898b0", marginTop: 2 }}>{staff.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={18} color="#6b6b8a" /></button>
        </div>
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={label}>Period Start</label>
              <input type="date" style={inp} value={form.periodStart} onChange={(e) => set("periodStart", e.target.value)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={label}>Period End</label>
              <input type="date" style={inp} value={form.periodEnd} onChange={(e) => set("periodEnd", e.target.value)} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={label}>Pay Type for This Payout</label>
            <div style={{ display: "flex", gap: 6, background: "#f4f4f9", border: "1px solid #e3e0eb", borderRadius: 10, padding: 4 }}>
              {([["commission", "Commission"], ["salary", "Fixed Salary"]] as const).map(([val, lbl]) => {
                const active = form.payType === val;
                return (
                  <button key={val} type="button" onClick={() => set("payType", val)}
                    style={{
                      flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                      background: active ? "#7C3AED" : "transparent",
                      color: active ? "#fff" : "#6b6b8a", fontSize: 12, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.15s",
                    }}>
                    {lbl}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "#b0b0c8" }}>
              Defaults to {staff.name}&rsquo;s saved pay type — changing it here only affects this payout.
            </div>
          </div>

          {form.payType === "commission" ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={label}>Commission Rate (%)</label>
                <input type="number" min="0" max="100" style={inp} value={form.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} placeholder="e.g. 30" />
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "#f9f9fb", border: "1px solid #f0f0f8", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b6b8a" }}>
                  <span>Revenue generated in period</span><span style={{ fontWeight: 700, color: "#1a1a2e" }}>{fmt(revenue)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b6b8a" }}>
                  <span>Commission ({rate}%)</span><span style={{ fontWeight: 700, color: "#1a1a2e" }}>{fmt(baseAmount)}</span>
                </div>
                {hasTeamRevenue && (
                  <div style={{ fontSize: 11, color: "#7C3AED" }}>Includes an even split of revenue from team services done with other stylists.</div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={label}>Salary Amount (PKR)</label>
              <input type="number" min="0" style={inp} value={form.salaryAmount} onChange={(e) => set("salaryAmount", e.target.value)} placeholder="e.g. 30000" />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={label}>Adjustment (+/-)</label>
              <input type="number" style={inp} value={form.adjustment} onChange={(e) => set("adjustment", e.target.value)} placeholder="e.g. 500 or -200" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={label}>Adjustment Note</label>
              <input type="text" style={inp} value={form.adjustmentNote} onChange={(e) => set("adjustmentNote", e.target.value)} placeholder="e.g. Bonus" />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 10, background: "#f5f3ff" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#6d28d9" }}>Total Payout</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: "#6d28d9" }}>{fmt(total)}</span>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={form.markPaidNow} onChange={(e) => set("markPaidNow", e.target.checked)}
              style={{ width: 14, height: 14, accentColor: "#7C3AED", cursor: "pointer" }} />
            <span style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 500 }}>Mark as paid now (otherwise saved as pending)</span>
          </label>

          {form.markPaidNow && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={label}>Payment Method</label>
              <select style={{ ...inp, background: "#fff" }} value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                {PAY_METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={label}>Notes</label>
            <textarea style={{ ...inp, resize: "none", lineHeight: 1.5 }} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" />
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSave} disabled={!canSubmit} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: canSubmit ? "#7C3AED" : "#e8e8f0", fontSize: 13, fontWeight: 600, color: canSubmit ? "#fff" : "#b0b0c8", cursor: canSubmit ? "pointer" : "not-allowed" }}>
              {form.markPaidNow ? "Record Payout" : "Save as Pending"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mark Paid Modal ──────────────────────────────────────────────────────────
function MarkPaidModal({ payout, onClose, onConfirm }: { payout: Payout; onClose: () => void; onConfirm: (method: string, date: string) => void }) {
  const [method, setMethod] = useState("cash");
  const [date, setDate] = useState(todayStr());
  return (
    <div onClick={onClose} className="modal-overlay" style={{ zIndex: 200 }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 360, maxWidth: "100%", padding: "28px 26px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e", marginBottom: 4 }}>Mark Payout as Paid</div>
        <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 18 }}>{payout.staffName} · {fmt(payout.totalAmount)}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={label}>Payment Method</label>
            <select style={{ ...inp, background: "#fff" }} value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAY_METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={label}>Paid Date</label>
            <input type="date" style={inp} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
            <button onClick={() => onConfirm(method, date)} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: "#059669", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Confirm Paid</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 340, padding: "32px 28px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Trash2 size={22} color="#dc2626" />
        </div>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e", marginBottom: 8 }}>Delete Payout Record?</div>
        <div style={{ fontSize: 13, color: "#6b6b8a", marginBottom: 24 }}>This cannot be undone.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#dc2626", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

const STATUS_META: Record<PayoutStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#d97706", bg: "#fffbeb" },
  paid:    { label: "Paid",    color: "#059669", bg: "#ecfdf5" },
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PayoutsPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [processingFor, setProcessingFor] = useState<Staff | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<Payout | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payout | null>(null);
  const [viewingSlipFor, setViewingSlipFor] = useState<Payout | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | PayoutStatus>("all");

  useEffect(() => {
    setStaffList(getStoredStaff());
    setAppointments(getStoredAppointments());
    setServices(getStoredServices());
    setPayouts(getPayouts());
  }, []);

  const persistPayouts = (list: Payout[]) => {
    setPayouts(list);
    savePayouts(list);
  };

  const handleAddPayout = (data: Omit<Payout, "id" | "createdAt">) => {
    const entry: Payout = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    persistPayouts([entry, ...payouts]);
    setProcessingFor(null);
  };

  const handleMarkPaid = (method: string, date: string) => {
    if (!markPaidTarget) return;
    persistPayouts(payouts.map((p) => p.id === markPaidTarget.id ? { ...p, status: "paid", paymentMethod: method, paidDate: date } : p));
    setMarkPaidTarget(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    persistPayouts(payouts.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const activeStaff = staffList.filter((s) => s.isActive);

  const stats = useMemo(() => {
    const pending = payouts.filter((p) => p.status === "pending");
    const monthStart = startOfMonth();
    const paidThisMonth = payouts.filter((p) => p.status === "paid" && (p.paidDate ?? "") >= monthStart);
    const allPaid = payouts.filter((p) => p.status === "paid");
    return {
      pendingCount: pending.length,
      pendingTotal: pending.reduce((s, p) => s + p.totalAmount, 0),
      paidThisMonth: paidThisMonth.reduce((s, p) => s + p.totalAmount, 0),
      allTimePaid: allPaid.reduce((s, p) => s + p.totalAmount, 0),
    };
  }, [payouts]);

  const filteredHistory = (historyFilter === "all" ? payouts : payouts.filter((p) => p.status === historyFilter))
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="dash-page dashboard-polish" style={{ background: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 20 }}>
      {processingFor && (
        <ProcessPayoutModal
          staff={processingFor}
          appointments={appointments}
          services={services}
          payouts={payouts}
          onClose={() => setProcessingFor(null)}
          onSave={handleAddPayout}
        />
      )}
      {markPaidTarget && (
        <MarkPaidModal payout={markPaidTarget} onClose={() => setMarkPaidTarget(null)} onConfirm={handleMarkPaid} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
      {viewingSlipFor && (
        <PayoutSlipPrint
          payout={viewingSlipFor}
          staffPhone={staffList.find((s) => s.id === viewingSlipFor.staffId)?.phone}
          salonName={settingsStore.salon.name as string}
          salonPhone={settingsStore.salon.phone as string}
          salonEmail={settingsStore.salon.email as string}
          salonAddress={settingsStore.salon.address as string}
          onClose={() => setViewingSlipFor(null)}
        />
      )}

      {/* Header */}
      <PageTitle
        icon={<Wallet size={24} />}
        title="Payouts"
        subtitle={<>{activeStaff.length} staff on payroll · <span style={{ color: "var(--accent)", fontWeight: 700 }}>{stats.pendingCount} pending payouts</span></>}
      />

      {/* Stats */}
      <div className="stats-grid-4" style={{ marginBottom: 4 }}>
        {[
          { label: "Pending Payouts", value: fmt(stats.pendingTotal), sub: `${stats.pendingCount} awaiting payment`, icon: <Clock size={18} />, color: "#d97706", bg: "rgba(217,119,6,0.08)" },
          { label: "Paid This Month", value: fmt(stats.paidThisMonth), icon: <CheckCircle2 size={18} />, color: "#059669", bg: "rgba(5,150,105,0.08)" },
          { label: "All-Time Paid",   value: fmt(stats.allTimePaid),   icon: <TrendingUp size={18} />, color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
          { label: "Staff on Payroll", value: activeStaff.length,       icon: <UsersIcon size={18} />, color: "#0284c7", bg: "rgba(2,132,199,0.08)" },
        ].map((stat, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(226,223,235,.95)", boxShadow: "0 8px 28px rgba(38,25,75,.04)", padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: stat.bg, color: stat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: "#9898b0", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1a2e", marginTop: 6, letterSpacing: "-0.01em" }}>{stat.value}</div>
              {stat.sub && <div style={{ fontSize: 11, color: "#b0b0c8", marginTop: 2 }}>{stat.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Staff roster */}
      <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>Staff Payroll</div>
      {activeStaff.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#b0b0c8" }}>
          <Wallet size={32} style={{ display: "block", margin: "0 auto 10px" }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>No active staff yet</div>
        </div>
      ) : (
        <div className="cards-grid-auto">
          {activeStaff.map((s) => {
            const payType = s.payType ?? "commission";
            const lastEnd = lastPayoutEnd(s.id, payouts);
            const periodStart = lastEnd ? addDays(lastEnd, 1) : startOfMonth();
            const revenue = revenueInPeriod(s.id, appointments, services, periodStart, todayStr());
            const estimated = payType === "commission" ? Math.round(revenue * (s.commissionRate ?? 0) / 100) : (s.baseSalary ?? 0);
            return (
              <div key={s.id} style={{ background: "#fff", padding: "20px", display: "flex", flexDirection: "column", gap: 14, border: "1px solid #ebebf0", borderRadius: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: s.color, flexShrink: 0 }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: payType === "commission" ? "#7C3AED" : "#0284c7", background: payType === "commission" ? "#f5f3ff" : "#e0f2fe", padding: "2px 8px", borderRadius: 20 }}>
                      {payType === "commission" ? `${s.commissionRate ?? 0}% commission` : "Fixed salary"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f8f8fc", paddingTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#9898b0", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Since Last Payout</div>
                    <div style={{ fontSize: 11, color: "#b0b0c8", marginTop: 2 }}>{fmtDate(periodStart)} – Today</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "#9898b0", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" }}>Est. Amount</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "var(--accent)", marginTop: 2 }}>{fmt(estimated)}</div>
                  </div>
                </div>
                <button onClick={() => setProcessingFor(s)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 10, border: "none", background: "var(--accent-gradient)", color: "#fff", fontSize: 12, fontWeight: 750, cursor: "pointer" }}>
                  <Banknote size={13} /> Process Payout
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Payout history */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#1a1a2e" }}>Payout History</div>
        <div className="filter-tabs" style={{ display: "flex", gap: 6, background: "#f4f4f9", border: "1px solid #e3e0eb", borderRadius: 12, padding: 4 }}>
          {(["all", "pending", "paid"] as const).map((f) => {
            const active = historyFilter === f;
            return (
              <button key={f} onClick={() => setHistoryFilter(f)}
                style={{ padding: "6px 14px", borderRadius: 9, border: "none", background: active ? "var(--accent-gradient)" : "transparent", color: active ? "#fff" : "#6b6b8a", fontSize: 12, fontWeight: 750, cursor: "pointer" }}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#b0b0c8" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>No payouts recorded yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Process a payout from the staff roster above to get started</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #ebebf0", borderRadius: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr style={{ background: "#fafafd" }}>
                {["Staff", "Period", "Type", "Base", "Adjustment", "Total", "Status", "Paid Date", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9999b0", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #f0f0f8" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((p, i) => {
                const sm = STATUS_META[p.status];
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f8f8fc", background: i % 2 === 0 ? "#fff" : "#fafafd" }}>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#1d1d2f" }}>{p.staffName}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b6b8a", whiteSpace: "nowrap" }}>{fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b6b8a", textTransform: "capitalize" }}>{p.payType}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "#1a1a2e" }}>{fmt(p.baseAmount)}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: p.adjustment >= 0 ? "#059669" : "#dc2626" }}>{p.adjustment !== 0 ? (p.adjustment > 0 ? "+" : "") + fmt(p.adjustment) : "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>{fmt(p.totalAmount)}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: sm.color, background: sm.bg, padding: "3px 9px", borderRadius: 20 }}>{sm.label}</span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#9898b0", whiteSpace: "nowrap" }}>{p.paidDate ? fmtDate(p.paidDate) : "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {p.status === "pending" && (
                          <button onClick={() => setMarkPaidTarget(p)} title="Mark as Paid"
                            style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #d1fae5", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <CheckCircle2 size={13} color="#059669" />
                          </button>
                        )}
                        <button onClick={() => setViewingSlipFor(p)} title="View Salary Slip"
                          style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #EDE9FE", background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <FileDown size={13} color="#7C3AED" />
                        </button>
                        <button onClick={() => setDeleteTarget(p)} title="Delete"
                          style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #fee2e2", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <Trash2 size={13} color="#dc2626" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
