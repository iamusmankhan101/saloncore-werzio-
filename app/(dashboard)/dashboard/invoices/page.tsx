"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, Eye, Trash2, CheckCircle, Clock, X,
  ReceiptText, ShoppingCart, TrendingUp, Users,
} from "lucide-react";
import {
  getSalonInvoices, deleteSalonInvoice, markSalonInvoicePaid,
  type SalonInvoice,
} from "@/lib/salon-invoices";
import { getStoredAppointments, saveAppointments } from "@/lib/storage";
import { purgeQueuedPosThankYou } from "@/lib/whatsapp-scheduler";
import { settingsStore } from "@/lib/settings-store";
import SalonInvoicePrint from "@/components/salon-invoice-print";
import MobilePageHeader from "@/components/mobile-page-header";
import PageTitle from "@/components/page-title";
import { fmtCurrency as fmt } from "@/lib/format";

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-PK", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_META = {
  paid:   { label: "Paid",   color: "#059669", bg: "#ecfdf5", icon: CheckCircle },
  unpaid: { label: "Unpaid", color: "#d97706", bg: "#fffbeb", icon: Clock },
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", jazzcash: "JazzCash", easypaisa: "EasyPaisa",
  raast: "Raast", card: "Card", bank: "Bank Transfer", "": "—",
};

function StatCard({ label, value, sub, color = "var(--accent)", bg = "rgba(124, 58, 237, 0.08)", icon }: {
  label: string; value: string; sub?: string; color?: string; bg?: string; icon?: React.ReactNode;
}) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(226,223,235,0.8)", padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.02)", flex: 1 }}>
      {icon && <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color }}>{icon}</div>}
      <div>
        <div style={{ fontSize: 24, fontWeight: 850, color, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2, fontWeight: 500 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices]         = useState<SalonInvoice[]>([]);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all");
  const [viewingInvoice, setViewingInvoice] = useState<SalonInvoice | null>(null);
  const [deleteConfirm, setDeleteConfirm]   = useState<string | null>(null);

  const salon = settingsStore.salon;

  function reload() {
    // Only show POS-originated invoices (source === "pos", or legacy ones with no source)
    const all = getSalonInvoices();
    const pos = all.filter((inv) => !inv.source || inv.source === "pos");
    setInvoices(pos);
  }

  useEffect(() => { reload(); }, []);

  const stats = useMemo(() => {
    const paid   = invoices.filter((i) => i.status === "paid");
    const unpaid = invoices.filter((i) => i.status === "unpaid");
    const uniqueClients = new Set(invoices.map((i) => i.clientPhone || i.clientName)).size;
    return {
      total:        invoices.length,
      paidCount:    paid.length,
      unpaidCount:  unpaid.length,
      revenue:      paid.reduce((s, i) => s + i.total, 0),
      outstanding:  unpaid.reduce((s, i) => s + i.total, 0),
      uniqueClients,
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return invoices.filter((inv) => {
      const matchSearch = !q ||
        inv.clientName.toLowerCase().includes(q) ||
        inv.number.toLowerCase().includes(q) ||
        inv.staffName.toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || inv.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, filterStatus]);

  function handleMarkPaid(id: string) {
    markSalonInvoicePaid(id);
    reload();
    if (viewingInvoice?.id === id) {
      setViewingInvoice((prev) => prev ? { ...prev, status: "paid" } : prev);
    }
  }

  function handleDelete(id: string) {
    const invoice = getSalonInvoices().find((item) => item.id === id);
    purgeQueuedPosThankYou([id]);
    deleteSalonInvoice(id);
    if (invoice?.appointmentId) {
      const appointments = getStoredAppointments();
      const updatedAppointments = appointments.map((appt) =>
        appt.id === invoice.appointmentId && appt.status === "completed"
          ? { ...appt, status: "booked" as const, totalAmount: 0 }
          : appt
      );
      saveAppointments(updatedAppointments);
    }
    setDeleteConfirm(null);
    reload();
    if (viewingInvoice?.id === id) setViewingInvoice(null);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e",
    background: "#fff", outline: "none", boxSizing: "border-box",
  };

  return (
    <div className="dashboard-polish" style={{ background: "#f4f5f7", minHeight: "100vh" }}>

      {/* Mobile header */}
      <MobilePageHeader
        title="POS Invoices"
        subtitle={`${stats.total} transactions · ${stats.paidCount} paid`}
      />

      {/* Mobile stat scroll */}
      <div className="mobile-stat-scroll mobile-only">
        {[
          { label: "Total",     value: String(stats.total),     color: "#7C3AED" },
          { label: "Revenue",   value: fmt(stats.revenue),      color: "#059669" },
          { label: "Outstanding", value: fmt(stats.outstanding), color: "#d97706" },
          { label: "Clients",   value: String(stats.uniqueClients), color: "#0284c7" },
        ].map((s) => (
          <div key={s.label} className="mobile-stat-card">
            <div className="mobile-stat-card-label">{s.label}</div>
            <div className="mobile-stat-card-value" style={{ fontSize: s.value.length > 8 ? 13 : 18, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Mobile search */}
      <div className="mobile-search-bar mobile-only">
        <Search size={16} color="#9898b0" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices…" />
      </div>

      {/* Mobile filter chips */}
      <div className="mobile-filter-row mobile-only">
        {(["all", "paid", "unpaid"] as const).map((s) => (
          <button key={s} type="button" className={`mobile-filter-chip ${filterStatus === s ? "active" : ""}`} onClick={() => setFilterStatus(s)}>
            {s === "all" ? "All" : s === "paid" ? "Paid" : "Unpaid"}
          </button>
        ))}
      </div>

      {/* Mobile list */}
      <div className="mobile-only">
        {filtered.length === 0 ? (
          <div className="mobile-empty">
            <div className="mobile-empty-icon"><ShoppingCart size={26} color="#c8c8e0" /></div>
            <div className="mobile-empty-title">No POS transactions yet</div>
            <div className="mobile-empty-sub">Complete a sale through the POS to see it here.</div>
          </div>
        ) : filtered.map((inv) => {
          const sm = STATUS_META[inv.status];
          const Icon = sm.icon;
          return (
            <div key={inv.id} className="mobile-list-card" onClick={() => setViewingInvoice(inv)}>
              <div className="mobile-list-icon" style={{ background: sm.bg }}><Icon size={18} color={sm.color} /></div>
              <div className="mobile-list-body">
                <div className="mobile-list-title">{inv.clientName}</div>
                <div className="mobile-list-sub">{inv.number} · {fmtDate(inv.date)}{inv.staffName ? ` · ${inv.staffName}` : ""}</div>
              </div>
              <div className="mobile-list-right">
                <div className="mobile-list-amount">{fmt(inv.total)}</div>
                <span className="mobile-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overlays */}
      {viewingInvoice && (
        <SalonInvoicePrint
          invoice={viewingInvoice}
          salonName={salon.name as string}
          salonPhone={salon.phone as string}
          salonEmail={salon.email as string}
          salonAddress={salon.address as string}
          onClose={() => setViewingInvoice(null)}
          onMarkPaid={() => handleMarkPaid(viewingInvoice.id)}
        />
      )}
      {deleteConfirm && (
        <div onClick={() => setDeleteConfirm(null)} className="modal-overlay" style={{ zIndex: 250 }}>
          <div onClick={(e) => e.stopPropagation()} className="modal-sheet" style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", maxWidth: 360, width: "100%", boxShadow: "0 16px 50px rgba(0,0,0,0.2)", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 size={22} color="#dc2626" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 6 }}>Delete Invoice?</div>
            <div style={{ fontSize: 13, color: "#6b6b8a", marginBottom: 24 }}>This action cannot be undone.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, fontWeight: 600, color: "#6b6b8a", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "#dc2626", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop layout */}
      <div className="dash-page dashboard-polish desktop-only" style={{ background: "#ffffff", display: "flex", flexDirection: "column", gap: 20, paddingTop: 20, minHeight: "100vh" }}>

        {/* Page header */}
        <PageTitle
          icon={<ShoppingCart size={24} />}
          title="POS Invoices"
          subtitle="Receipts from completed POS transactions"
        />

        {/* Stats */}
        <div className="stats-grid-4">
          <StatCard label="Total Transactions" value={String(stats.total)}        sub={`${stats.paidCount} paid · ${stats.unpaidCount} unpaid`} icon={<ReceiptText size={22} />} bg="rgba(124, 58, 237, 0.08)" color="var(--accent)" />
          <StatCard label="Revenue Collected"  value={fmt(stats.revenue)}         icon={<TrendingUp size={22} />} bg="#ecfdf5" color="#059669" />
          <StatCard label="Outstanding"        value={fmt(stats.outstanding)}      sub={`${stats.unpaidCount} unpaid`} icon={<Clock size={22} />} bg="#fffbeb" color="#d97706" />
          <StatCard label="Unique Clients"     value={String(stats.uniqueClients)} icon={<Users size={22} />} bg="#f0f9ff" color="#0284c7" />
        </div>

        {/* Table card */}
        <div className="table-scroll-wrap" style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(226,223,235,.95)", boxShadow: "0 8px 28px rgba(38,25,75,.04)", overflow: "hidden" }}>

          {/* Toolbar */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f0f5", display: "flex", alignItems: "center", gap: 12, background: "#fff" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={15} color="#b0b0c8" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client, invoice #, or staff…"
                style={{ ...inputStyle, paddingLeft: 38, maxWidth: 360, borderRadius: 12, border: "1px solid #e3e0eb", padding: "10px 14px 10px 38px", boxShadow: "0 2px 8px rgba(0,0,0,0.01)", transition: "border-color 0.15s" }}
              />
            </div>
            {(["all", "paid", "unpaid"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: "9px 20px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 750, transition: "all 0.15s",
                  border: filterStatus === s ? "none" : "1px solid #e3e0eb",
                  background: filterStatus === s ? "var(--accent-gradient)" : "#fff",
                  color: filterStatus === s ? "#fff" : "#6b6b8a",
                  boxShadow: filterStatus === s ? "0 3px 10px var(--accent-glow)" : "none",
                }}
                className={filterStatus !== s ? "hover-bg-light" : ""}
              >
                {s === "all" ? "All" : s === "paid" ? "Paid" : "Unpaid"}
              </button>
            ))}
          </div>

          <div className="table-scroll-inner">
            <div style={{ background: "#fff" }}>

              {/* Column headers */}
              <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 160px 110px 80px 110px 100px 100px", padding: "12px 24px", borderBottom: "1px solid #f0f0f5", background: "#faf9fd", alignItems: "center" }}>
                {["Invoice #", "Client", "Staff", "Date", "Items", "Method", "Amount", "Actions"].map((h) => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#8e89a3", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</div>
                ))}
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: "64px 24px", textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(226,223,235,0.5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 4px 12px rgba(0,0,0,0.02)" }}>
                    <ShoppingCart size={28} color="#9898b0" />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", marginBottom: 8 }}>No POS transactions yet</div>
                  <div style={{ fontSize: 13, color: "#9898b0", fontWeight: 500 }}>
                    Complete a sale through the <strong style={{ color: "var(--accent)", fontWeight: 700 }}>POS</strong> to see invoices here.
                  </div>
                </div>
              ) : filtered.map((inv, i) => {
                const sm = STATUS_META[inv.status];
                const StatusIcon = sm.icon;
                return (
                  <div
                    key={inv.id}
                    className="hover-bg-row"
                    style={{
                      display: "grid", gridTemplateColumns: "150px 1fr 160px 110px 80px 110px 100px 100px",
                      padding: "16px 24px",
                      borderBottom: i < filtered.length - 1 ? "1px solid #f8f8fc" : "none",
                      alignItems: "center", transition: "background 0.15s",
                    }}
                  >
                    {/* Invoice # */}
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)", fontFamily: "monospace", letterSpacing: "-0.02em" }}>{inv.number}</div>

                    {/* Client */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 750, color: "#1a1a2e" }}>{inv.clientName}</div>
                      {inv.clientPhone && <div style={{ fontSize: 11, color: "#9898b0", marginTop: 2, fontWeight: 500 }}>{inv.clientPhone}</div>}
                    </div>

                    {/* Staff */}
                    <div style={{ fontSize: 13, color: "#4a4a6a", fontWeight: 600 }}>{inv.staffName || "—"}</div>

                    {/* Date */}
                    <div style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 500 }}>{fmtDate(inv.date)}</div>

                    {/* Items count */}
                    <div style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 500 }}>{inv.items.length} item{inv.items.length !== 1 ? "s" : ""}</div>

                    {/* Payment method */}
                    <div style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 500 }}>{METHOD_LABELS[inv.paymentMethod] ?? inv.paymentMethod}</div>

                    {/* Amount */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e" }}>{fmt(inv.total)}</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, padding: "3px 8px", borderRadius: 20, background: sm.bg, fontSize: 10, fontWeight: 750, color: sm.color, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        <StatusIcon size={10} /> {sm.label}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setViewingInvoice(inv)}
                        title="View / Print"
                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e3e0eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
                        className="hover-bg-light"
                      >
                        <Eye size={14} color="#9898b0" />
                      </button>
                      {inv.status === "unpaid" && (
                        <button
                          onClick={() => handleMarkPaid(inv.id)}
                          title="Mark Paid"
                          style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #bbf7d0", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
                          className="hover-scale"
                        >
                          <CheckCircle size={14} color="#059669" />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirm(inv.id)}
                        title="Delete"
                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s" }}
                        className="hover-scale"
                      >
                        <Trash2 size={14} color="#dc2626" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
