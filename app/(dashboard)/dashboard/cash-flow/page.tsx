"use client";

import { useState, useEffect, useMemo } from "react";
import { getStoredAppointments } from "@/lib/storage";
import { getSalonInvoices } from "@/lib/salon-invoices";
import { getExpenses, addExpense, deleteExpense, updateExpense, type Expense, type ExpenseCategory } from "@/lib/expenses";
import type { Appointment } from "@/lib/types";
import DashboardHeader from "@/components/dashboard-header";
import MobilePageHeader from "@/components/mobile-page-header";
import { fmtCurrency as fmt } from "@/lib/format";
import {
  Plus, Trash2, TrendingUp, TrendingDown,
  Wallet, CalendarDays, X, Download, Pencil, Check,
} from "lucide-react";

type Period = "today" | "7d" | "30d" | "1y";

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: "today", label: "Today",  days: 1   },
  { key: "7d",    label: "7 Days", days: 7   },
  { key: "30d",   label: "Month",  days: 30  },
  { key: "1y",    label: "1 Year", days: 365 },
];

export const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string; color: string }[] = [
  { key: "rent",          label: "Rent",                color: "#ef4444" },
  { key: "salaries",      label: "Staff Salaries",      color: "#f97316" },
  { key: "utilities",     label: "Utilities",           color: "#eab308" },
  { key: "supplies",      label: "Products & Supplies", color: "#22c55e" },
  { key: "equipment",     label: "Equipment",           color: "#3b82f6" },
  { key: "marketing",     label: "Marketing",           color: "#8b5cf6" },
  { key: "food",          label: "Food & Tea",          color: "#ec4899" },
  { key: "miscellaneous", label: "Miscellaneous",       color: "#6b7280" },
];

const PAYMENT_METHODS = ["cash", "jazzcash", "easypaisa", "bank", "card"];
const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash", jazzcash: "JazzCash", easypaisa: "EasyPaisa",
  bank: "Bank Transfer", card: "Card",
};
const PAYMENT_COLORS: Record<string, string> = {
  cash: "#22c55e", jazzcash: "#f97316", easypaisa: "#10b981",
  bank: "#3b82f6", card: "#6366f1",
};

function toDateStr(d: Date) { return d.toLocaleDateString("en-CA"); }

function getDaysArr(count: number, end: string): string[] {
  const arr: string[] = [];
  const e = new Date(end + "T12:00:00");
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(e); d.setDate(d.getDate() - i);
    arr.push(toDateStr(d));
  }
  return arr;
}

function fmtK(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${Math.round(n / 1_000)}K`
    : String(Math.round(n));
}

const EMPTY_FORM = { date: "", category: "miscellaneous" as ExpenseCategory, description: "", amount: "", paymentMethod: "cash", notes: "" };

export default function CashFlowPage() {
  const [period, setPeriod]           = useState<Period>("30d");
  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [posInvoices, setPosInvoices] = useState<ReturnType<typeof getSalonInvoices>>([]);
  const [today, setToday]             = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [hoveredBar, setHoveredBar]   = useState<number | null>(null);

  useEffect(() => {
    const t = toDateStr(new Date());
    setToday(t);
    setForm(f => ({ ...f, date: t }));
    setExpenses(getExpenses());
    setAppointments(getStoredAppointments());
    setPosInvoices(getSalonInvoices().filter(inv => inv.status === "paid" && !inv.appointmentId));
  }, []);

  const cfg = PERIODS.find(p => p.key === period)!;

  const rangeStart = useMemo(() => {
    if (!today) return "";
    if (period === "today") return today;
    const d = new Date(today); d.setDate(d.getDate() - (cfg.days - 1));
    return toDateStr(d);
  }, [period, today]);

  const periodExpenses = useMemo(() =>
    expenses
      .filter(e => e.date >= rangeStart && e.date <= today)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [expenses, rangeStart, today]);

  const periodIncome = useMemo(() => {
    const appts = appointments.filter(a => a.status === "completed" && a.date >= rangeStart && a.date <= today);
    const pos   = posInvoices.filter(inv => inv.date >= rangeStart && inv.date <= today);
    return appts.reduce((s, a) => s + a.totalAmount, 0) + pos.reduce((s, inv) => s + inv.total, 0);
  }, [appointments, posInvoices, rangeStart, today]);

  const totalExpense = periodExpenses.reduce((s, e) => s + e.amount, 0);
  const netCashFlow  = periodIncome - totalExpense;

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    periodExpenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return EXPENSE_CATEGORIES
      .map(c => ({ ...c, amount: map[c.key] ?? 0 }))
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [periodExpenses]);

  // Chart: income vs expense per day (or month for 1y)
  const chartData = useMemo(() => {
    if (!today) return [] as { label: string; income: number; expense: number }[];
    if (period === "1y") {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(today); d.setDate(1); d.setMonth(d.getMonth() - (11 - i));
        const key = toDateStr(d).substring(0, 7);
        const income =
          appointments.filter(a => a.status === "completed" && a.date.startsWith(key)).reduce((s, a) => s + a.totalAmount, 0) +
          posInvoices.filter(inv => inv.date.startsWith(key)).reduce((s, inv) => s + inv.total, 0);
        const expense = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0);
        return { label: d.toLocaleDateString("en-PK", { month: "short" }), income, expense };
      });
    }
    return getDaysArr(cfg.days, today).map(date => {
      const d = new Date(date + "T12:00:00");
      const label = period === "30d" ? String(d.getDate()) : d.toLocaleDateString("en-PK", { weekday: "short" });
      const income =
        appointments.filter(a => a.status === "completed" && a.date === date).reduce((s, a) => s + a.totalAmount, 0) +
        posInvoices.filter(inv => inv.date === date).reduce((s, inv) => s + inv.total, 0);
      const expense = expenses.filter(e => e.date === date).reduce((s, e) => s + e.amount, 0);
      return { label, income, expense };
    });
  }, [period, today, appointments, posInvoices, expenses]);

  const maxChart = Math.max(...chartData.flatMap(d => [d.income, d.expense]), 1);

  const yLabels = useMemo(() => {
    const step = maxChart <= 10_000 ? 2_500 : maxChart <= 50_000 ? 10_000 : maxChart <= 200_000 ? 50_000 : 250_000;
    const top = Math.ceil(maxChart / step) * step || step;
    return [top, top * 0.75, top * 0.5, top * 0.25, 0].map(v => fmtK(v));
  }, [maxChart]);

  // Form helpers
  function openAdd() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, date: today });
    setShowForm(true);
  }

  function openEdit(exp: Expense) {
    setEditId(exp.id);
    setForm({ date: exp.date, category: exp.category, description: exp.description, amount: String(exp.amount), paymentMethod: exp.paymentMethod, notes: exp.notes ?? "" });
    setShowForm(true);
  }

  function handleSave() {
    const amt = parseFloat(form.amount);
    if (!form.description.trim() || !amt || amt <= 0) return;
    if (editId) {
      updateExpense(editId, { date: form.date, category: form.category, description: form.description.trim(), amount: amt, paymentMethod: form.paymentMethod, notes: form.notes.trim() || undefined });
      setExpenses(getExpenses());
    } else {
      const newExp = addExpense({ date: form.date, category: form.category, description: form.description.trim(), amount: amt, paymentMethod: form.paymentMethod, notes: form.notes.trim() || undefined });
      setExpenses(prev => [...prev, newExp]);
    }
    setShowForm(false);
    setEditId(null);
  }

  function handleDelete(id: string) {
    deleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  // PDF Export
  function exportPDF() {
    const now = new Date();
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Cash Flow Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Montserrat',sans-serif;background:#fff;color:#1a1a2e;font-size:13px}
    .page{max-width:820px;margin:0 auto;padding:40px 48px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #f0f0f8}
    .logo-img{height:42px;width:auto;display:block;filter:brightness(0)}
    .report-meta{text-align:right}
    .report-title{font-size:16px;font-weight:800;color:#7C3AED}
    .report-sub{font-size:12px;color:#6b6b8a;margin-top:4px}
    .report-gen{font-size:11px;color:#c0c0d0;margin-top:2px}
    .stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px}
    .stat-card{background:#F5F3FF;border-radius:12px;padding:16px;border:1px solid #EDE9FE}
    .stat-label{font-size:10px;font-weight:700;color:#a0a0b8;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}
    .stat-value{font-size:20px;font-weight:800;color:#7C3AED}
    .stat-sub{font-size:10px;color:#a0a0b8;margin-top:4px}
    .section{margin-bottom:28px}
    .section-title{font-size:14px;font-weight:700;color:#1a1a2e;margin-bottom:4px}
    .section-sub{font-size:11px;color:#a0a0b8;margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    thead tr{background:#F5F3FF}
    th{font-size:10px;font-weight:700;color:#a0a0b8;letter-spacing:.07em;text-transform:uppercase;padding:10px 14px;text-align:left;border-bottom:1px solid #f0f0f8}
    td{padding:10px 14px;font-size:12px;border-bottom:1px solid #f8f8fc}
    tr:last-child td{border-bottom:none}
    .total-row td{font-weight:700;background:#fef2f2;color:#ef4444;border-top:1px solid #f0f0f8}
    .cat-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
    .net-pos{color:#059669}.net-neg{color:#ef4444}
    .footer{margin-top:36px;padding-top:20px;border-top:1px solid #f0f0f8;display:flex;justify-content:space-between}
    .footer-txt{font-size:11px;color:#c0c0d0}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:24px 32px}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <img src="/Untitled design (5).png" alt="Werzio" class="logo-img"/>
      <div style="font-size:12px;color:#a0a0b8;margin-top:6px">Salon Management Platform</div>
    </div>
    <div class="report-meta">
      <div class="report-title">Cash Flow Report — ${cfg.label}</div>
      <div class="report-sub">${rangeStart} to ${today}</div>
      <div class="report-gen">Generated ${now.toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · ${now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Income</div>
      <div class="stat-value">${fmt(periodIncome)}</div>
      <div class="stat-sub">From appointments & POS</div>
    </div>
    <div class="stat-card" style="background:#fef2f2;border-color:#fecaca">
      <div class="stat-label">Total Expenses</div>
      <div class="stat-value" style="color:#ef4444">${fmt(totalExpense)}</div>
      <div class="stat-sub">${periodExpenses.length} entries logged</div>
    </div>
    <div class="stat-card" style="background:${netCashFlow >= 0 ? "#f0fdf4" : "#fef2f2"};border-color:${netCashFlow >= 0 ? "#bbf7d0" : "#fecaca"}">
      <div class="stat-label">Net Cash Flow</div>
      <div class="stat-value ${netCashFlow >= 0 ? "net-pos" : "net-neg"}">${netCashFlow >= 0 ? "" : "-"}${fmt(Math.abs(netCashFlow))}</div>
      <div class="stat-sub">${netCashFlow >= 0 ? "Surplus" : "Deficit"}</div>
    </div>
  </div>

  ${categoryBreakdown.length > 0 ? `
  <div class="section">
    <div class="section-title">Expenses by Category</div>
    <div class="section-sub">Breakdown for ${cfg.label}</div>
    <table>
      <thead><tr><th>Category</th><th style="text-align:right">Amount</th><th style="text-align:right">% of Total</th></tr></thead>
      <tbody>
        ${categoryBreakdown.map(c => `
        <tr>
          <td><span class="cat-badge" style="background:${c.color}18;color:${c.color}">${c.label}</span></td>
          <td style="text-align:right;font-weight:700;color:${c.color}">${fmt(c.amount)}</td>
          <td style="text-align:right;color:#6b6b8a">${totalExpense > 0 ? ((c.amount / totalExpense) * 100).toFixed(1) : "0"}%</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <div class="section">
    <div class="section-title">Expense Log</div>
    <div class="section-sub">All entries for this period</div>
    <table>
      <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Payment</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        ${periodExpenses.map(e => {
          const cat = EXPENSE_CATEGORIES.find(c => c.key === e.category);
          return `<tr>
            <td>${e.date}</td>
            <td><span class="cat-badge" style="background:${cat?.color ?? "#888"}18;color:${cat?.color ?? "#888"}">${cat?.label ?? e.category}</span></td>
            <td>${e.description}</td>
            <td>${PAYMENT_LABELS[e.paymentMethod] ?? e.paymentMethod}</td>
            <td style="text-align:right;font-weight:700;color:#ef4444">${fmt(e.amount)}</td>
          </tr>`;
        }).join("")}
        <tr class="total-row">
          <td colspan="4"><strong>Total Expenses</strong></td>
          <td style="text-align:right"><strong>${fmt(totalExpense)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div class="footer-txt">Werzio · Salon Management Platform</div>
    <div class="footer-txt">Confidential · For internal use only</div>
  </div>
</div>
</body>
</html>`;
    const win = window.open("", "_blank", "width=920,height=750");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  }

  // Input style shorthand
  const inputSt: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", background: "#fafafa", outline: "none", boxSizing: "border-box" };
  const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#a0a0b8", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 };

  return (
    <div style={{ background: "#f8f8fc", minHeight: "100vh" }}>
      <DashboardHeader title="Cash Flow" subtitle="Daily expense & income tracking" />
      <MobilePageHeader title="Cash Flow" subtitle={cfg.label} action={{ label: "Add Expense", onClick: openAdd }} />

      <div className="dash-page desktop-only" style={{ background: "#f8f8fc" }}>

        {/* Title + controls */}
        <div className="page-header" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", margin: 0 }}>Cash Flow</h1>
            <p style={{ fontSize: 13, color: "#a0a0b8", margin: "4px 0 0" }}>Track daily income vs. expenses · {rangeStart} → {today}</p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", background: "#fff", border: "1px solid #e8e8f0", borderRadius: 10, padding: 4, gap: 2 }}>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                  padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: period === p.key ? 700 : 500,
                  background: period === p.key ? "linear-gradient(135deg, #5B21B6, #9333EA)" : "transparent",
                  color: period === p.key ? "#fff" : "#6b6b8a", transition: "all 0.15s",
                }}>{p.label}</button>
              ))}
            </div>
            <button onClick={exportPDF} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderRadius: 10, border: "1px solid #e8e8f0", background: "#fff", color: "#6b6b8a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <Download size={14} /> Export PDF
            </button>
            <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #5B21B6, #9333EA)", color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 8px rgba(91,33,182,0.35)" }}>
              <Plus size={15} /> Add Expense
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="stats-grid-4" style={{ marginBottom: 20 }}>
          {[
            { label: "Total Income",   value: fmt(periodIncome),          color: "#7C3AED", bg: "#F5F3FF", icon: TrendingUp,   sub: "Appointments & POS" },
            { label: "Total Expenses", value: fmt(totalExpense),          color: "#ef4444", bg: "#fef2f2", icon: TrendingDown,  sub: `${periodExpenses.length} entries` },
            { label: "Net Cash Flow",  value: (netCashFlow < 0 ? "-" : "") + fmt(Math.abs(netCashFlow)), color: netCashFlow >= 0 ? "#059669" : "#ef4444", bg: netCashFlow >= 0 ? "#f0fdf4" : "#fef2f2", icon: Wallet, sub: netCashFlow >= 0 ? "Surplus" : "Deficit" },
            { label: "Expense Entries", value: String(periodExpenses.length), color: "#d97706", bg: "#fffbeb", icon: CalendarDays, sub: cfg.label },
          ].map(({ label, value, color, bg, icon: Icon, sub }) => (
            <div key={label} style={{ background: "#fff", borderRadius: 14, border: "1px solid #ebebf0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#a0a0b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={16} color={color} />
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 12, color: "#a0a0b8" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Cash Flow Chart */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "22px 26px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>Cash Flow Chart</div>
              <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 3 }}>Income vs Expenses · {rangeStart} → {today}</div>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "#7C3AED" }} />
                <span style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 600 }}>Income</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED" }}>{fmt(periodIncome)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: "#ef4444" }} />
                <span style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 600 }}>Expenses</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>{fmt(totalExpense)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {/* Y-axis */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: 26, minWidth: 40 }}>
              {yLabels.map(l => (
                <div key={l} style={{ fontSize: 10, color: "#c0c0d0", textAlign: "right" }}>{l}</div>
              ))}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ position: "relative", height: 220 }}>
                {[0, 25, 50, 75, 100].map(pct => (
                  <div key={pct} style={{ position: "absolute", bottom: `${pct}%`, left: 0, right: 0, height: 1, background: "#f0f0f8" }} />
                ))}
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: period === "30d" ? 3 : 8 }}>
                  {chartData.map((bar, i) => {
                    const ih = maxChart > 0 ? (bar.income / maxChart) * 100 : 0;
                    const eh = maxChart > 0 ? (bar.expense / maxChart) * 100 : 0;
                    const hovered = hoveredBar === i;
                    return (
                      <div
                        key={i}
                        style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", gap: 2, position: "relative", cursor: "default" }}
                        onMouseEnter={() => setHoveredBar(i)}
                        onMouseLeave={() => setHoveredBar(null)}
                      >
                        {hovered && (bar.income > 0 || bar.expense > 0) && (
                          <div style={{ position: "absolute", bottom: `${Math.max(ih, eh) + 4}%`, left: "50%", transform: "translateX(-50%)", background: "#1a1a2e", color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 8, whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", pointerEvents: "none" }}>
                            <div style={{ color: "#a78bfa" }}>In: {fmt(bar.income)}</div>
                            <div style={{ color: "#fca5a5" }}>Ex: {fmt(bar.expense)}</div>
                            <div style={{ color: bar.income >= bar.expense ? "#4ade80" : "#f87171", borderTop: "1px solid #2a2a3a", paddingTop: 3, marginTop: 3 }}>
                              Net: {bar.income >= bar.expense ? "+" : "-"}{fmt(Math.abs(bar.income - bar.expense))}
                            </div>
                          </div>
                        )}
                        <div style={{ flex: 1, height: `${Math.max(ih, 0.4)}%`, background: "linear-gradient(180deg, #7C3AED 0%, #A78BFA 100%)", borderRadius: "4px 4px 0 0", transition: "height 0.4s ease, opacity 0.15s", opacity: hovered ? 1 : 0.9 }} />
                        <div style={{ flex: 1, height: `${Math.max(eh, 0.4)}%`, background: "linear-gradient(180deg, #ef4444 0%, #fca5a5 100%)", borderRadius: "4px 4px 0 0", transition: "height 0.4s ease, opacity 0.15s", opacity: hovered ? 1 : 0.9 }} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: period === "30d" ? 3 : 8, paddingTop: 8 }}>
                {chartData.map((bar, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", fontSize: period === "30d" ? 9 : 11, color: "#c0c0d0", overflow: "hidden" }}>
                    {bar.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Add / Edit Expense Form */}
        {showForm && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #7C3AED", boxShadow: "0 8px 32px rgba(124,58,237,0.15)", padding: "24px", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>{editId ? "Edit Expense" : "Add Expense"}</div>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#a0a0b8" }}><X size={18} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelSt}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))} style={inputSt}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Payment Method</label>
                <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} style={inputSt}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / 3" }}>
                <label style={labelSt}>Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Shampoo & conditioner restock" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Amount (PKR)</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min={0} style={inputSt} />
              </div>
              <div style={{ gridColumn: "1 / 4" }}>
                <label style={labelSt}>Notes (optional)</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes" style={inputSt} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid #e8e8f0", background: "#fff", fontSize: 13, color: "#6b6b8a", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 24px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #5B21B6, #9333EA)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(91,33,182,0.35)" }}>
                <Check size={14} /> {editId ? "Save Changes" : "Save Expense"}
              </button>
            </div>
          </div>
        )}

        {/* Category breakdown + Expense log */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>

          {/* Category breakdown */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", padding: "22px 24px", alignSelf: "start" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e", marginBottom: 4 }}>By Category</div>
            <div style={{ fontSize: 12, color: "#a0a0b8", marginBottom: 20 }}>Expense breakdown · {cfg.label}</div>
            {categoryBreakdown.length === 0 ? (
              <div style={{ textAlign: "center", fontSize: 13, color: "#c0c0d0", padding: "24px 0" }}>No expenses this period</div>
            ) : (
              <>
                {categoryBreakdown.map(c => (
                  <div key={c.key} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{c.label}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#a0a0b8" }}>{totalExpense > 0 ? ((c.amount / totalExpense) * 100).toFixed(0) : 0}%</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: c.color }}>{fmt(c.amount)}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: "#f0f0f8", borderRadius: 4 }}>
                      <div style={{ height: "100%", width: `${totalExpense > 0 ? (c.amount / totalExpense) * 100 : 0}%`, background: c.color, borderRadius: 4, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                ))}

                {/* Net summary */}
                <div style={{ marginTop: 20, padding: "14px 16px", borderRadius: 12, background: netCashFlow >= 0 ? "#f0fdf4" : "#fef2f2", border: `1px solid ${netCashFlow >= 0 ? "#bbf7d0" : "#fecaca"}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#a0a0b8", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Net Cash Flow</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: netCashFlow >= 0 ? "#059669" : "#ef4444" }}>
                    {netCashFlow < 0 ? "-" : "+"}{fmt(Math.abs(netCashFlow))}
                  </div>
                  <div style={{ fontSize: 11, color: "#a0a0b8", marginTop: 3 }}>{netCashFlow >= 0 ? "You are in surplus" : "Expenses exceed income"}</div>
                </div>
              </>
            )}
          </div>

          {/* Expense log table */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebf0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #f0f0f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>Expense Log</div>
                <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 3 }}>{periodExpenses.length} entries · {fmt(totalExpense)} total</div>
              </div>
              {!showForm && (
                <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "1.5px solid #7C3AED", background: "transparent", color: "#7C3AED", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  <Plus size={13} /> Add
                </button>
              )}
            </div>

            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "90px 110px 1.6fr 1fr 90px 44px 44px", padding: "9px 24px", background: "#fafafa", borderBottom: "1px solid #f0f0f8" }}>
              {["DATE", "CATEGORY", "DESCRIPTION", "PAYMENT", "AMOUNT", "", ""].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#b0b0c8", letterSpacing: "0.08em" }}>{h}</div>
              ))}
            </div>

            {periodExpenses.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>💸</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#a0a0b8", marginBottom: 6 }}>No expenses logged</div>
                <div style={{ fontSize: 12, color: "#c0c0d0" }}>Click &ldquo;Add Expense&rdquo; to start tracking your daily costs.</div>
              </div>
            ) : periodExpenses.map((exp, i) => {
              const cat = EXPENSE_CATEGORIES.find(c => c.key === exp.category);
              const payColor = PAYMENT_COLORS[exp.paymentMethod];
              return (
                <div key={exp.id} style={{ display: "grid", gridTemplateColumns: "90px 110px 1.6fr 1fr 90px 44px 44px", padding: "11px 24px", borderBottom: i === periodExpenses.length - 1 ? "none" : "1px solid #f8f8fc", alignItems: "center" }}>
                  <div style={{ fontSize: 12, color: "#6b6b8a" }}>{exp.date}</div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cat?.color ?? "#888", background: `${cat?.color ?? "#888"}18`, padding: "2px 8px", borderRadius: 20 }}>{cat?.label ?? exp.category}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{exp.description}</div>
                    {exp.notes && <div style={{ fontSize: 11, color: "#a0a0b8", marginTop: 1 }}>{exp.notes}</div>}
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: payColor ?? "#6b6b8a", background: payColor ? `${payColor}15` : "#f4f4f8", padding: "2px 8px", borderRadius: 20 }}>
                      {PAYMENT_LABELS[exp.paymentMethod] ?? exp.paymentMethod}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{fmt(exp.amount)}</div>
                  <button onClick={() => openEdit(exp)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d0d0e0", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#7C3AED")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#d0d0e0")}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(exp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d0d0e0", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#d0d0e0")}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            {/* Footer totals */}
            {periodExpenses.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "90px 110px 1.6fr 1fr 90px 44px 44px", padding: "11px 24px", background: "#fafafa", borderTop: "1px solid #f0f0f8" }}>
                <div style={{ gridColumn: "1 / 5", fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>Total · {periodExpenses.length} entries</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#ef4444" }}>{fmt(totalExpense)}</div>
                <div /><div />
              </div>
            )}
          </div>
        </div>

      </div>{/* /desktop-only */}
    </div>
  );
}
