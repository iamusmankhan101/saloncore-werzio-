"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredStaff, saveStaff, getStoredServices, saveServices, getStoredAppointments } from "@/lib/storage";
import type { Staff, Service, StaffRole, Appointment } from "@/lib/types";
import { X, Plus, Check, ChevronRight, Trash2 } from "lucide-react";
import { getCurrentPlan, isAtLimit } from "@/lib/plan-limits";

const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  owner:           { color: "#7C3AED", bg: "#EDE9FE" },
  manager:         { color: "#0369a1", bg: "#e0f2fe" },
  "senior-stylist":{ color: "#059669", bg: "#ecfdf5" },
  "junior-stylist":{ color: "#d97706", bg: "#fffbeb" },
  receptionist:    { color: "#db2777", bg: "#fdf2f8" },
  trainee:         { color: "#6b7280", bg: "#f9fafb" },
};

import { fmtCurrency as fmt } from "@/lib/format";

function getStaffStats(staffId: string, appointments: Appointment[]) {
  const mine      = appointments.filter((a) => a.staffId === staffId);
  const completed = mine.filter((a) => a.status === "completed");
  return { total: mine.length, revenue: completed.reduce((s, a) => s + (a.totalAmount ?? 0), 0) };
}

// ── Staff Form Modal (Add & Edit) ─────────────────────────────────────────────
function StaffFormModal({ onClose, onSave, staff, servicesList }: { onClose: () => void; onSave: (s: Staff, assignedServiceIds: string[]) => void; staff?: Staff; servicesList: Service[] }) {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: staff?.name ?? "",
    phone: staff?.phone ?? "",
    role: staff?.role ?? "",
  });

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    if (staff) {
      return servicesList.filter(s => s.assignedStaffIds.includes(staff.id)).map(s => s.id);
    }
    return [];
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const canSubmit = form.name && form.phone && form.role;

  const toggleService = (id: string) => {
    const current = [...selectedServiceIds];
    if (current.includes(id)) {
      setSelectedServiceIds(current.filter(x => x !== id));
    } else {
      setSelectedServiceIds([...current, id]);
    }
  };

  const handleSave = () => {
    if (!canSubmit) return;

    // Determine specialties from selected services names
    const selectedServices = servicesList.filter(s => selectedServiceIds.includes(s.id));
    const specialtiesArray = selectedServices.map(s => s.name);

    const colors = ["#8B5CF6", "#f472b6", "#34d399", "#fb923c", "#38bdf8", "#ec4899", "#f59e0b", "#6366f1"];
    const color = staff?.color ?? colors[Math.floor(Math.random() * colors.length)];

    const savedStaff: Staff = {
      id: staff?.id ?? "s" + Date.now(),
      name: form.name,
      phone: form.phone,
      role: form.role as StaffRole,
      specialties: specialtiesArray,
      color,
      isActive: staff?.isActive ?? true,
    };

    onSave(savedStaff, selectedServiceIds);
    setDone(true);
  };

  if (done) return (
    <div onClick={onClose} className="modal-overlay" style={{ zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 360, maxWidth: "100%", padding: "48px 32px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, color: "#059669", fontWeight: "bold" }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a2e", marginBottom: 8 }}>Staff Member Saved</div>
        <div style={{ fontSize: 13, color: "#9898b0", marginBottom: 24 }}>The staff member record has been updated.</div>
        <button onClick={onClose} style={{ padding: "10px 32px", borderRadius: 10, background: "#7C3AED", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} className="modal-overlay" style={{ zIndex: 100 }}>
      <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 20, width: 440, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>{staff ? "Edit Staff Member" : "Add Staff Member"}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={18} color="#6b6b8a" /></button>
        </div>
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Full Name</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sara Ahmed"
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Phone</label>
            <input type="text" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="e.g. 0300-1234567"
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Role</label>
            <select value={form.role} onChange={(e) => set("role", e.target.value)} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none", background: "#fff" }}>
              <option value="">Select a role…</option>
              {Object.keys(ROLE_COLORS).map((r) => <option key={r} value={r}>{r.replace(/-/g, " ")}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>Assign Services (Dropdown Selection)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 150, overflowY: "auto", border: "1px solid #e8e8f0", borderRadius: 8, padding: 8 }}>
              {servicesList.length > 0 ? servicesList.map((sv) => {
                const checked = selectedServiceIds.includes(sv.id);
                return (
                  <div key={sv.id} onClick={() => toggleService(sv.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: checked ? "#f4f0fe" : "transparent" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: "1px solid #7C3AED", display: "flex", alignItems: "center", justifyContent: "center", background: checked ? "#7C3AED" : "#fff" }}>
                      {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a2e" }}>
                      {sv.name} <span style={{ fontSize: 11, color: "#9898b0" }}>— {fmt(sv.price)}</span>
                    </span>
                  </div>
                );
              }) : <div style={{ fontSize: 12, color: "#9898b0", fontStyle: "italic", padding: "8px 0" }}>No salon services found. Please add services first.</div>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSave} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: canSubmit ? "#7C3AED" : "#e8e8f0", fontSize: 13, fontWeight: 600, color: canSubmit ? "#fff" : "#b0b0c8", cursor: canSubmit ? "pointer" : "not-allowed" }}>
              {staff ? "Save Changes" : "Add Staff Member"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, width: 340, padding: "32px 28px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Trash2 size={22} color="#dc2626" />
        </div>
        <div style={{ fontWeight: 700, fontSize: 17, color: "#1a1a2e", marginBottom: 8 }}>Delete Staff Member?</div>
        <div style={{ fontSize: 13, color: "#6b6b8a", marginBottom: 24 }}>
          This will permanently delete <strong>{name}</strong> and cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#dc2626", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const router = useRouter();
  const [showAdd, setShowAdd]       = useState(false);
  const [staffList, setStaffList]   = useState<Staff[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);

  const plan        = getCurrentPlan();
  const activeCount = staffList.filter((s) => s.isActive).length;
  const staffLimited = isAtLimit(plan.staffLimit, activeCount);

  useEffect(() => {
    setStaffList(getStoredStaff());
    setServicesList(getStoredServices());
    setAppointmentsList(getStoredAppointments());
  }, []);

  const handleSaveStaff = (savedStaff: Staff, assignedServiceIds: string[]) => {
    const exists = staffList.some((s) => s.id === savedStaff.id);
    const updatedStaffList = exists
      ? staffList.map((s) => (s.id === savedStaff.id ? savedStaff : s))
      : [...staffList, savedStaff];
    setStaffList(updatedStaffList);
    saveStaff(updatedStaffList);

    const updatedServicesList = servicesList.map((sv) => {
      const isAssigned = assignedServiceIds.includes(sv.id);
      const hasStaff   = sv.assignedStaffIds.includes(savedStaff.id);
      if (isAssigned && !hasStaff)  return { ...sv, assignedStaffIds: [...sv.assignedStaffIds, savedStaff.id] };
      if (!isAssigned && hasStaff)  return { ...sv, assignedStaffIds: sv.assignedStaffIds.filter((id) => id !== savedStaff.id) };
      return sv;
    });
    setServicesList(updatedServicesList);
    saveServices(updatedServicesList);
  };

  const handleDeleteStaff = (id: string) => {
    const updated = staffList.filter((s) => s.id !== id);
    setStaffList(updated);
    saveStaff(updated);
    // Remove this staff member from all service assignments
    const updatedServices = servicesList.map((sv) => ({
      ...sv,
      assignedStaffIds: sv.assignedStaffIds.filter((sid) => sid !== id),
    }));
    setServicesList(updatedServices);
    saveServices(updatedServices);
    setDeleteTarget(null);
  };

  return (
    <div className="dash-page" style={{ background: "#f4f5f7", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 16 }}>

      {showAdd && (
        <StaffFormModal
          servicesList={servicesList}
          onClose={() => setShowAdd(false)}
          onSave={handleSaveStaff}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          onConfirm={() => handleDeleteStaff(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, color: "#1a1a2e" }}>Staff</div>
          <div style={{ fontSize: 13, color: "#9898b0", marginTop: 2 }}>
            {staffList.length} team members
            {plan.staffLimit !== -1 && <span style={{ marginLeft: 8, color: staffLimited ? "#dc2626" : "#b0b0c8" }}>· {activeCount}/{plan.staffLimit} active</span>}
          </div>
        </div>
        <button
          onClick={() => !staffLimited && setShowAdd(true)}
          className="page-header-btn"
          title={staffLimited ? `Free plan: ${plan.staffLimit} active staff limit reached. Upgrade to Pro for unlimited.` : ""}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: staffLimited ? "#e8e8f0" : "#7C3AED", fontSize: 13, fontWeight: 600, color: staffLimited ? "#aaaabc" : "#fff", cursor: staffLimited ? "not-allowed" : "pointer" }}>
          <Plus size={16} /> Add Staff
          {staffLimited && <span style={{ fontSize: 10, background: "#dc2626", color: "#fff", borderRadius: 20, padding: "1px 7px" }}>Limit reached</span>}
        </button>
      </div>

      {/* Free-plan staff limit banner */}
      {staffLimited && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
            Free plan allows up to {plan.staffLimit} active staff members. Deactivate a member or upgrade to add more.
          </span>
          <a href="/dashboard/billing" style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", textDecoration: "none", whiteSpace: "nowrap", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 7, padding: "5px 12px" }}>Upgrade →</a>
        </div>
      )}

      {/* Cards grid */}
      <div className="cards-grid-auto">
        {staffList.map((s) => {
          const stats = getStaffStats(s.id, appointmentsList);
          const role  = ROLE_COLORS[s.role] ?? { color: "#6b7280", bg: "#f9fafb" };
          return (
            <div
              key={s.id}
              onClick={() => router.push(`/dashboard/staff/${s.id}`)}
              style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "20px", cursor: "pointer", transition: "box-shadow 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)")}
            >
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: s.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: s.color }}>
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{s.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: role.color, background: role.bg, padding: "2px 8px", borderRadius: 20, textTransform: "capitalize" }}>
                      {s.role.replace(/-/g, " ")}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: s.isActive ? "#059669" : "#dc2626", background: s.isActive ? "#ecfdf5" : "#fef2f2", padding: "3px 8px", borderRadius: 20 }}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                    style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #fee2e2", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#fef2f2"; }}>
                    <Trash2 size={13} color="#dc2626" />
                  </button>
                </div>
              </div>

              {/* Specialties */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 14 }}>
                {s.specialties.length > 0
                  ? s.specialties.slice(0, 3).map((sp) => (
                    <span key={sp} style={{ fontSize: 11, color: s.color, background: s.color + "15", padding: "2px 8px", borderRadius: 12 }}>{sp}</span>
                  ))
                  : <span style={{ fontSize: 11, color: "#9898b0", fontStyle: "italic" }}>No specialties</span>}
              </div>

              {/* Stats + view profile CTA */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, borderTop: "1px solid #f4f4f8", paddingTop: 14, alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#b0b0c8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Appointments</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginTop: 2 }}>{stats.total}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#b0b0c8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Revenue</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#7C3AED", marginTop: 2 }}>{fmt(stats.revenue)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: "#f0eeff" }}>
                  <ChevronRight size={14} color="#7C3AED" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
