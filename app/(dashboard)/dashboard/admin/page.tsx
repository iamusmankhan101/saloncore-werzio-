"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, ImageIcon, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getPaymentRequests,
  updatePaymentRequest,
  setActivePlan,
  type PaymentRequest,
  type PaymentStatus,
} from "@/lib/payment-requests";
import { getInvoices, markInvoicePaid } from "@/lib/invoices";

import { fmtCurrency as fmt } from "@/lib/format";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
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
      
      // Mark the current month's invoice as paid in localStorage
      const now = new Date();
      const invId = `${req.userId}_${now.getFullYear()}_${now.getMonth() + 1}`;
      const inv = getInvoices().find((i) => i.id === invId);
      if (inv) markInvoicePaid(invId);
      // Unsuspend in Turso + send "account restored" email (server-side)
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

export default function AdminPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [filter, setFilter] = useState<PaymentStatus | "all">("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    setIsAdmin(true);
    setChecking(false);
    setRequests(getPaymentRequests());
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
          <div style={{ fontSize: 13, color: "#9898b0", marginTop: 1 }}>Review and approve payment requests</div>
        </div>
      </div>

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
    </div>
  );
}
