"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, ImageIcon, ChevronDown, ChevronUp, Shield, Store, Pencil, Save, Ban, Trash2, AlertTriangle, X, ReceiptText, Users as UsersIcon, BadgeCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getPaymentRequests,
  updatePaymentRequest,
  setActivePlan,
  type PaymentRequest,
  type PaymentStatus,
} from "@/lib/payment-requests";
import type { Invoice } from "@/lib/invoices";

import { fmtCurrency as fmt } from "@/lib/format";

interface BillingUserRow {
  id: string;
  email: string;
  ownerName: string;
  salonName: string;
  planId: string;
  planName: string;
  planPrice: number;
  suspended: boolean;
  suspensionReason: string | null;
}

interface AccountUserRow {
  id: string;
  email: string;
  ownerName: string;
  salonName: string;
  phone: string;
  role: "owner" | "manager" | "staff" | "admin";
  salonOwnerId?: string;
  staffId?: string;
  emailVerified: boolean;
  approvalStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}

const ROLE_META: Record<AccountUserRow["role"], { label: string; color: string; bg: string }> = {
  admin:   { label: "Admin",   color: "#7C3AED", bg: "#f5f3ff" },
  owner:   { label: "Owner",   color: "#0284c7", bg: "#e0f2fe" },
  manager: { label: "Manager", color: "#d97706", bg: "#fffbeb" },
  staff:   { label: "Staff",   color: "#6b6b8a", bg: "#f4f5f7" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
}

// Account signup dates are stored date-only ("YYYY-MM-DD"), not a full timestamp
// — appending T12:00:00 keeps the displayed day from shifting a day back in
// timezones behind UTC (midnight UTC parses as the previous day locally).
function fmtSignupDate(dateOnly: string) {
  return new Date(`${dateOnly}T12:00:00`).toLocaleDateString("en-PK", { dateStyle: "medium" });
}

const STATUS_META: Record<PaymentStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:  { label: "Pending",  color: "#d97706", bg: "#fffbeb", icon: Clock },
  approved: { label: "Approved", color: "#059669", bg: "#ecfdf5", icon: CheckCircle },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fef2f2", icon: XCircle },
};

function StatusBadge({ status }: { status: PaymentStatus }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: m.bg, border: `1px solid ${m.color}44`, fontSize: 11, fontWeight: 700, color: m.color }}>
      <Icon size={11} /> {m.label}
    </span>
  );
}

function RequestCard({ req, onUpdate }: { req: PaymentRequest; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  function act(status: PaymentStatus) {
    setLoading(true);
    updatePaymentRequest(req.id, status, note || undefined);
    if (status === "approved") {
      setActivePlan(req.planId);
      
      // Update plan in database
      fetch("/api/billing/update-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: req.userId, planId: req.planId }),
      }).catch((e) => console.warn("[billing/update-plan] failed:", e));
      
      // Mark the current cycle's invoice paid + unsuspend in Turso + send "account restored" email (server-side)
      fetch("/api/billing/unsuspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: req.userId }),
      }).catch((e) => console.warn("[billing/unsuspend] failed:", e));
    }
    setTimeout(() => { setLoading(false); onUpdate(); }, 400);
  }

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${req.status === "pending" ? "#fde68a" : "#ebebf0"}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      {/* Card header */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => setExpanded((p) => !p)}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#7C3AED", flexShrink: 0 }}>
          {req.userName.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{req.userName} <span style={{ fontWeight: 400, color: "#9898b0" }}>· {req.salonName}</span></div>
          <div style={{ fontSize: 12, color: "#6b6b8a", marginTop: 2 }}>{req.userEmail} · {fmtDate(req.submittedAt)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#7C3AED" }}>{fmt(req.amount)}</div>
            <div style={{ fontSize: 11, color: "#9898b0", marginTop: 1 }}>{req.planName} · {req.payMethod === "easypaisa" ? "EasyPaisa" : "Bank Transfer"}</div>
          </div>
          <StatusBadge status={req.status} />
          {expanded ? <ChevronUp size={16} color="#9898b0" /> : <ChevronDown size={16} color="#9898b0" />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f0f0f8", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Screenshot */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Payment Screenshot</div>
            {req.screenshotBase64 ? (
              <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <img src={req.screenshotBase64} alt="Payment proof" style={{ width: "100%", maxHeight: 320, objectFit: "contain", background: "#f9fafb", display: "block" }} />
                {req.screenshotName && (
                  <div style={{ padding: "8px 12px", fontSize: 11, color: "#6b7280", background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>{req.screenshotName}</div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px", background: "#f9fafb", borderRadius: 10, border: "1px dashed #d1d5db" }}>
                <ImageIcon size={16} color="#9898b0" />
                <span style={{ fontSize: 12, color: "#9898b0" }}>No screenshot attached</span>
              </div>
            )}
          </div>

          {/* Review note */}
          {req.status === "pending" && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Note (optional)</div>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the user..."
                style={{ width: "100%", padding: "10px 13px", borderRadius: 9, border: "1px solid #e4e4ee", fontSize: 13, color: "#1a1a2e", resize: "vertical", minHeight: 60, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          )}

          {req.reviewNote && (
            <div style={{ padding: "10px 14px", borderRadius: 9, background: "#f4f5f7", fontSize: 12, color: "#6b6b8a" }}>
              <strong>Note:</strong> {req.reviewNote}
            </div>
          )}

          {req.reviewedAt && (
            <div style={{ fontSize: 11, color: "#9898b0" }}>Reviewed on {fmtDate(req.reviewedAt)}</div>
          )}

          {/* Actions */}
          {req.status === "pending" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => act("rejected")} disabled={loading}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 13, fontWeight: 700, color: "#dc2626", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <XCircle size={14} /> Reject
              </button>
              <button onClick={() => act("approved")} disabled={loading}
                style={{ flex: 2, padding: "10px 0", borderRadius: 10, border: "none", background: loading ? "#e8e8f0" : "linear-gradient(135deg,#059669,#10b981)", fontSize: 13, fontWeight: 700, color: loading ? "#aaaabc" : "#fff", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <CheckCircle size={14} /> Approve & Activate Plan
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PriceCell({ row, onSaved }: { row: BillingUserRow; onSaved: (userId: string, price: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(row.planPrice));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/set-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: row.id, price }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to save");
      onSaved(row.id, price);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{fmt(row.planPrice)}</span>
        <button onClick={() => { setValue(String(row.planPrice)); setEditing(true); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6, color: "#9898b0", display: "flex" }} title="Edit price">
          <Pencil size={13} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={saving}
          style={{ width: 90, padding: "6px 8px", borderRadius: 8, border: "1px solid #e4e4ee", fontSize: 13, outline: "none" }}
        />
        <button onClick={save} disabled={saving}
          style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 8, padding: "6px 8px", cursor: saving ? "not-allowed" : "pointer", color: "#059669", display: "flex" }} title="Save">
          <Save size={13} />
        </button>
        <button onClick={() => { setEditing(false); setError(null); }} disabled={saving}
          style={{ background: "#f4f5f7", border: "1px solid #e4e4ee", borderRadius: 8, padding: "6px 8px", cursor: "pointer", color: "#6b6b8a", display: "flex" }} title="Cancel">
          <Ban size={13} />
        </button>
      </div>
      {error && <div style={{ fontSize: 11, color: "#dc2626" }}>{error}</div>}
    </div>
  );
}

function DeleteAccountModal({ row, onClose, onDeleted }: { row: BillingUserRow; onClose: () => void; onDeleted: (userId: string) => void }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = confirmText.trim() === row.salonName;

  async function handleDelete() {
    if (!matches) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: row.id, confirmSalonName: confirmText.trim() }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to delete account");
      onDeleted(row.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
    }
  }

  return (
    <div onClick={deleting ? undefined : onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,17,27,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: 440, maxWidth: "100%", boxShadow: "0 24px 64px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={18} color="#dc2626" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>Delete salon account</div>
            <div style={{ fontSize: 12, color: "#9898b0" }}>This cannot be undone</div>
          </div>
          <button onClick={onClose} disabled={deleting} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9898b0" }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, color: "#4a4a6a", lineHeight: 1.6 }}>
            This permanently deletes <strong>{row.salonName}</strong> ({row.email}) — their login, staff accounts, appointments, clients, staff, services, inventory, invoices, settings, and billing history. There is no undo.
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b6b8a", marginBottom: 6 }}>
              Type <strong>{row.salonName}</strong> to confirm
            </div>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
              placeholder={row.salonName}
              style={{ width: "100%", padding: "10px 13px", borderRadius: 9, border: "1px solid #e4e4ee", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: "#dc2626" }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} disabled={deleting}
              style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 700, color: "#6b6b8a", cursor: deleting ? "not-allowed" : "pointer" }}>
              Cancel
            </button>
            <button onClick={handleDelete} disabled={!matches || deleting}
              style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: !matches || deleting ? "#f4f5f7" : "#dc2626", fontSize: 13, fontWeight: 700, color: !matches || deleting ? "#c4c4d4" : "#fff", cursor: !matches || deleting ? "not-allowed" : "pointer" }}>
              {deleting ? "Deleting…" : "Delete Permanently"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoicesModal({ row, onClose, onMarkedPaid }: { row: BillingUserRow; onClose: () => void; onMarkedPaid: (userId: string) => void }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadInvoices() {
    setLoading(true);
    setError(null);
    fetch(`/api/billing/invoices?userId=${encodeURIComponent(row.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.ok) throw new Error(data.error || "Failed to load invoices");
        setInvoices(data.invoices ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load invoices"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadInvoices(); }, [row.id]);

  async function markPaid(invoice: Invoice) {
    if (invoice.status === "paid" || markingId) return;
    if (!window.confirm(`Mark ${invoice.number} as paid for ${row.salonName}?`)) return;
    setMarkingId(invoice.id);
    setError(null);
    try {
      const res = await fetch("/api/billing/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: row.id, invoiceId: invoice.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to mark invoice paid");
      setInvoices((prev) => prev.map((inv) => (
        inv.id === invoice.id
          ? { ...inv, status: "paid", paidDate: new Date().toISOString().slice(0, 10) }
          : inv
      )));
      onMarkedPaid(row.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark invoice paid");
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div onClick={markingId ? undefined : onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,17,27,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: 720, maxWidth: "100%", maxHeight: "86vh", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#f5f3ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ReceiptText size={18} color="#7C3AED" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a2e" }}>{row.salonName} invoices</div>
            <div style={{ fontSize: 12, color: "#9898b0" }}>{row.ownerName} · {row.email}</div>
          </div>
          <button onClick={onClose} disabled={!!markingId} style={{ background: "none", border: "none", cursor: markingId ? "not-allowed" : "pointer", padding: 4, color: "#9898b0" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: "auto", maxHeight: "calc(86vh - 80px)" }}>
          {error && <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 9, background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 700 }}>{error}</div>}
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", fontSize: 13, color: "#9898b0" }}>Loading invoices…</div>
          ) : invoices.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", fontSize: 13, color: "#9898b0" }}>No invoices found for this salon.</div>
          ) : (
            <div style={{ border: "1px solid #ebebf0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 110px 110px 110px 130px", padding: "10px 14px", background: "#fafafa", borderBottom: "1px solid #f0f0f8" }}>
                {["INVOICE", "DUE", "AMOUNT", "STATUS", "ACTION"].map((h) => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", letterSpacing: "0.08em" }}>{h}</div>
                ))}
              </div>
              {invoices.map((invoice, i) => {
                const paid = invoice.status === "paid";
                return (
                  <div key={invoice.id} style={{ display: "grid", gridTemplateColumns: "1.1fr 110px 110px 110px 130px", padding: "13px 14px", alignItems: "center", borderBottom: i < invoices.length - 1 ? "1px solid #f4f4f8" : "none" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>{invoice.number}</div>
                      <div style={{ fontSize: 11, color: "#9898b0", marginTop: 1 }}>{invoice.planName}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "#6b6b8a" }}>{fmtDate(invoice.dueDate)}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#7C3AED" }}>{fmt(invoice.total)}</div>
                    <div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 16, background: paid ? "#ecfdf5" : invoice.status === "overdue" ? "#fef2f2" : "#fffbeb", border: `1px solid ${paid ? "#6ee7b7" : invoice.status === "overdue" ? "#fecaca" : "#fde68a"}`, fontSize: 10, fontWeight: 800, color: paid ? "#059669" : invoice.status === "overdue" ? "#dc2626" : "#d97706", textTransform: "capitalize" }}>
                        {invoice.status}
                      </span>
                    </div>
                    <button
                      onClick={() => markPaid(invoice)}
                      disabled={paid || !!markingId}
                      style={{ padding: "8px 10px", borderRadius: 9, border: paid ? "1px solid #e8e8f0" : "none", background: paid ? "#f8f8fc" : "#059669", color: paid ? "#b0b0c8" : "#fff", fontSize: 12, fontWeight: 800, cursor: paid || markingId ? "not-allowed" : "pointer" }}
                    >
                      {paid ? "Paid" : markingId === invoice.id ? "Marking…" : "Mark Paid"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SalonAccountsPanel() {
  const [rows, setRows] = useState<BillingUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<BillingUserRow | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<BillingUserRow | null>(null);

  useEffect(() => {
    fetch("/api/billing/users")
      .then((res) => res.json())
      .then((data) => { if (data.ok) setRows(data.users); })
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(userId: string, price: number) {
    setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, planPrice: price } : r)));
  }

  function handleDeleted(userId: string) {
    setRows((prev) => prev.filter((r) => r.id !== userId));
    setDeleteTarget(null);
  }

  function handleMarkedPaid(userId: string) {
    setRows((prev) => prev.map((r) => (r.id === userId ? { ...r, suspended: false, suspensionReason: null } : r)));
  }

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.salonName.toLowerCase().includes(q) || r.ownerName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #ebebf0", padding: "48px", textAlign: "center", fontSize: 13, color: "#9898b0" }}>
        Loading salon accounts…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by salon, owner, or email…"
        style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e4ee", fontSize: 13, outline: "none", maxWidth: 340 }}
      />
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #ebebf0", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 100px 160px 96px 44px", padding: "10px 20px", background: "#fafafa", borderBottom: "1px solid #f0f0f8" }}>
          {["SALON", "PLAN", "STATUS", "MONTHLY PRICE", "INVOICES", ""].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", fontSize: 13, color: "#9898b0" }}>No salon accounts found</div>
        ) : (
          filtered.map((row, i) => (
            <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 100px 160px 96px 44px", padding: "14px 20px", alignItems: "center", borderBottom: i < filtered.length - 1 ? "1px solid #f4f4f8" : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{row.salonName}</div>
                <div style={{ fontSize: 11, color: "#9898b0", marginTop: 1 }}>{row.ownerName} · {row.email}</div>
              </div>
              <div style={{ fontSize: 12, color: "#6b6b8a" }}>{row.planName}</div>
              <div>
                {row.suspended ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 16, background: "#fef2f2", border: "1px solid #fecaca", fontSize: 10, fontWeight: 700, color: "#dc2626" }}>Suspended</span>
                ) : (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 16, background: "#ecfdf5", border: "1px solid #6ee7b7", fontSize: 10, fontWeight: 700, color: "#059669" }}>Active</span>
                )}
              </div>
              <PriceCell row={row} onSaved={handleSaved} />
              <button onClick={() => setInvoiceTarget(row)}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, width: 78, padding: "7px 0", borderRadius: 9, border: "1px solid #ddd6fe", background: "#f5f3ff", color: "#7C3AED", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                <ReceiptText size={12} /> View
              </button>
              <button onClick={() => setDeleteTarget(row)} title="Delete account"
                style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#c4c4d4", display: "flex", justifySelf: "start" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#c4c4d4")}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {deleteTarget && (
        <DeleteAccountModal row={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />
      )}
      {invoiceTarget && (
        <InvoicesModal row={invoiceTarget} onClose={() => setInvoiceTarget(null)} onMarkedPaid={handleMarkedPaid} />
      )}
    </div>
  );
}

function UsersPanel() {
  const [rows, setRows] = useState<AccountUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AccountUserRow["role"] | "all">("all");
  const [updatingApproval, setUpdatingApproval] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => { if (data.ok) setRows(data.users); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) => {
    if (roleFilter !== "all" && r.role !== roleFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      r.ownerName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.salonName.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q)
    );
  });

  const counts = {
    all: rows.length,
    owner: rows.filter((r) => r.role === "owner").length,
    manager: rows.filter((r) => r.role === "manager").length,
    staff: rows.filter((r) => r.role === "staff").length,
    admin: rows.filter((r) => r.role === "admin").length,
  };

  async function updateApproval(userId: string, approvalStatus: AccountUserRow["approvalStatus"]) {
    setUpdatingApproval(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, approvalStatus }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to update approval.");
      setRows((prev) => prev.map((row) => row.id === userId ? { ...row, approvalStatus } : row));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update approval.");
    } finally {
      setUpdatingApproval(null);
    }
  }

  if (loading) {
    return (
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #ebebf0", padding: "48px", textAlign: "center", fontSize: 13, color: "#9898b0" }}>
        Loading users…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, salon, or phone…"
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #e4e4ee", fontSize: 13, outline: "none", minWidth: 280, flex: 1, maxWidth: 340 }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "owner", "manager", "staff", "admin"] as const).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              style={{
                padding: "7px 12px", borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                border: `1.5px solid ${roleFilter === r ? "#7C3AED" : "#ebebf0"}`,
                background: roleFilter === r ? "#f5f3ff" : "#fff",
                color: roleFilter === r ? "#7C3AED" : "#6b6b8a",
              }}>
              {r === "all" ? "All" : ROLE_META[r].label} {r !== "all" && `(${counts[r]})`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #ebebf0", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 100px 110px 130px 180px", padding: "10px 20px", background: "#fafafa", borderBottom: "1px solid #f0f0f8" }}>
          {["NAME / EMAIL", "SALON", "PHONE", "ROLE", "APPROVAL", "SIGNED UP", "ACTIONS"].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#b0b0c8", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", fontSize: 13, color: "#9898b0" }}>No users found</div>
        ) : (
          filtered.map((row, i) => {
            const role = ROLE_META[row.role] ?? ROLE_META.staff;
            return (
              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 100px 110px 130px 180px", padding: "14px 20px", alignItems: "center", borderBottom: i < filtered.length - 1 ? "1px solid #f4f4f8" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "#f0f0f8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#7C3AED", flexShrink: 0 }}>
                    {row.ownerName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.ownerName}</div>
                    <div style={{ fontSize: 11, color: "#9898b0", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.email}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#6b6b8a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.salonName}</div>
                <div style={{ fontSize: 12, color: "#6b6b8a" }}>{row.phone || "—"}</div>
                <div>
                  <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 16, background: role.bg, border: `1px solid ${role.color}44`, fontSize: 10, fontWeight: 700, color: role.color }}>
                    {role.label}
                  </span>
                </div>
                <div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 16,
                    background: row.approvalStatus === "approved" ? "#ecfdf5" : row.approvalStatus === "rejected" ? "#fef2f2" : "#fffbeb",
                    color: row.approvalStatus === "approved" ? "#059669" : row.approvalStatus === "rejected" ? "#dc2626" : "#d97706",
                    fontSize: 11, fontWeight: 800, textTransform: "capitalize",
                  }}>
                    {row.approvalStatus === "approved" ? <BadgeCheck size={13} /> : row.approvalStatus === "rejected" ? <XCircle size={13} /> : <Clock size={13} />}
                    {row.approvalStatus}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#9898b0" }}>{fmtSignupDate(row.createdAt)}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {row.role === "owner" && row.approvalStatus !== "approved" && (
                    <button onClick={() => updateApproval(row.id, "approved")} disabled={updatingApproval === row.id}
                      style={{ padding: "7px 10px", borderRadius: 8, border: "none", background: "#059669", color: "#fff", fontSize: 11, fontWeight: 800, cursor: updatingApproval === row.id ? "not-allowed" : "pointer" }}>
                      Approve
                    </button>
                  )}
                  {row.role === "owner" && row.approvalStatus !== "rejected" && (
                    <button onClick={() => updateApproval(row.id, "rejected")} disabled={updatingApproval === row.id}
                      style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 800, cursor: updatingApproval === row.id ? "not-allowed" : "pointer" }}>
                      Disapprove
                    </button>
                  )}
                  {row.role !== "owner" && <span style={{ fontSize: 11, color: "#c4c4d4" }}>—</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [filter, setFilter] = useState<PaymentStatus | "all">("all");
  const [tab, setTab] = useState<"requests" | "salons" | "users">("requests");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    queueMicrotask(() => {
      setIsAdmin(true);
      setChecking(false);
      setRequests(getPaymentRequests());
    });
  }, [router]);

  function refresh() {
    setRequests(getPaymentRequests());
  }

  if (checking || !isAdmin) return null;

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);
  const counts = { all: requests.length, pending: requests.filter((r) => r.status === "pending").length, approved: requests.filter((r) => r.status === "approved").length, rejected: requests.filter((r) => r.status === "rejected").length };

  return (
    <div className="dash-page dashboard-polish" style={{ background: "#f4f5f7", minHeight: "100vh", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#5B21B6,#9333EA)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shield size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#1a1a2e" }}>Admin Panel</div>
          <div style={{ fontSize: 13, color: "#9898b0", marginTop: 1 }}>
            {tab === "requests" ? "Review and approve payment requests"
              : tab === "salons" ? "Manage salon accounts and set custom pricing"
              : "Every login account on the platform"}
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setTab("requests")}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: `2px solid ${tab === "requests" ? "#7C3AED" : "#ebebf0"}`, background: tab === "requests" ? "#f5f3ff" : "#fff", fontSize: 13, fontWeight: 700, color: tab === "requests" ? "#7C3AED" : "#6b6b8a", cursor: "pointer" }}>
          <Clock size={14} /> Payment Requests
        </button>
        <button onClick={() => setTab("salons")}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: `2px solid ${tab === "salons" ? "#7C3AED" : "#ebebf0"}`, background: tab === "salons" ? "#f5f3ff" : "#fff", fontSize: 13, fontWeight: 700, color: tab === "salons" ? "#7C3AED" : "#6b6b8a", cursor: "pointer" }}>
          <Store size={14} /> Salon Accounts
        </button>
        <button onClick={() => setTab("users")}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: `2px solid ${tab === "users" ? "#7C3AED" : "#ebebf0"}`, background: tab === "users" ? "#f5f3ff" : "#fff", fontSize: 13, fontWeight: 700, color: tab === "users" ? "#7C3AED" : "#6b6b8a", cursor: "pointer" }}>
          <UsersIcon size={14} /> Users
        </button>
      </div>

      {tab === "requests" ? (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {(["all", "pending", "approved", "rejected"] as const).map((s) => {
              const meta = s === "all" ? { label: "Total", color: "#7C3AED", bg: "#EDE9FE" } : { label: STATUS_META[s].label, color: STATUS_META[s].color, bg: STATUS_META[s].bg };
              return (
                <button key={s} onClick={() => setFilter(s)}
                  style={{ background: filter === s ? meta.bg : "#fff", border: `2px solid ${filter === s ? meta.color : "#ebebf0"}`, borderRadius: 14, padding: "16px 18px", textAlign: "left", cursor: "pointer" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: meta.color }}>{counts[s]}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: filter === s ? meta.color : "#9898b0", marginTop: 2 }}>{meta.label}</div>
                </button>
              );
            })}
          </div>

          {/* Requests */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #ebebf0", padding: "48px", textAlign: "center" }}>
                <Clock size={32} color="#d1d5db" style={{ margin: "0 auto 12px" }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: "#9898b0" }}>No {filter === "all" ? "" : filter} requests</div>
              </div>
            ) : (
              filtered.map((req) => <RequestCard key={req.id} req={req} onUpdate={refresh} />)
            )}
          </div>
        </>
      ) : tab === "salons" ? (
        <SalonAccountsPanel />
      ) : (
        <UsersPanel />
      )}
    </div>
  );
}
