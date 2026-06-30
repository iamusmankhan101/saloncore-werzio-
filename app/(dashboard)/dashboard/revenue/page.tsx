"use client";

import { useState, useEffect, useMemo } from "react";
import { getStoredAppointments } from "@/lib/storage";
import { getSalonInvoices } from "@/lib/salon-invoices";
import type { Appointment } from "@/lib/types";
import DashboardHeader from "@/components/dashboard-header";
import MobilePageHeader from "@/components/mobile-page-header";
import {
  Download, ArrowUpRight, ArrowDownRight,
  TrendingUp, CalendarDays, CreditCard, Wallet, ChevronLeft,
  ChevronDown, ChevronUp, Receipt, Clock,
} from "lucide-react";

import { fmtCurrency as fmt } from "@/lib/format";
const fmtK = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${Math.round(n / 1_000)}K`
  : String(Math.round(n));

type Period = "today" | "7d" | "14d" | "30d" | "1y" | "custom";

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: "today",  label: "Today",   days: 1   },
  { key: "7d",     label: "7 Days",  days: 7   },
  { key: "14d",    label: "14 Days", days: 14  },
  { key: "30d",    label: "Month",   days: 30  },
  { key: "1y",     label: "1 Year",  days: 365 },
  { key: "custom", label: "Custom",  days: 0   },
];

const METHOD_COLORS: Record<string, string> = {
  cash: "#22c55e", jazzcash: "#f97316", easypaisa: "#10b981",
  raast: "#3b82f6", card: "#6366f1", bank: "#9333EA",
};
const METHOD_LABELS: Record<string, string> = {
  cash: "Cash", jazzcash: "JazzCash", easypaisa: "EasyPaisa",
  raast: "Raast", card: "Card", bank: "Bank Transfer",
};

function toDateStr(d: Date) { return d.toLocaleDateString("en-CA"); }

function getDaysArray(count: number): string[] {
  const arr: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    arr.push(toDateStr(d));
  }
  return arr;
}

function getDaysInRange(start: string, end: string): string[] {
  const arr: string[] = [];
  const cur = new Date(start + "T12:00:00");
  const endDate = new Date(end + "T12:00:00");
  while (cur <= endDate && arr.length < 366) {
    arr.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return arr;
}


interface ChartBar {
  label: string;
  value: number;
  isCurrentPeriod: boolean;
  monthKey: string; // "YYYY-MM" for 1y, "YYYY-MM-DD" for daily views
}

export default function RevenuePage() {
  const [period, setPeriod]             = useState<Period>("today");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [posInvoices, setPosInvoices]   = useState<ReturnType<typeof getSalonInvoices>>([]);
  const [today, setToday]               = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar]     = useState<number | null>(null);
  const [dailyReportOpen, setDailyReportOpen] = useState(true);
  const [customStart, setCustomStart]   = useState(() => toDateStr(new Date()));
  const [customEnd, setCustomEnd]       = useState(() => toDateStr(new Date()));

  useEffect(() => {
    setToday(toDateStr(new Date()));
    setAppointments(getStoredAppointments());
    // POS invoices that are paid and not linked to an appointment (avoid double-counting)
    setPosInvoices(getSalonInvoices().filter(inv => inv.status === "paid" && !inv.appointmentId));
  }, []);

  // Reset drill-down when period changes
  useEffect(() => { setSelectedMonth(null); }, [period]);

  const cfg = PERIODS.find(p => p.key === period)!;

  const filterEnd = period === "custom" ? customEnd : today;

  const rangeStart = useMemo(() => {
    if (!today) return "";
    if (period === "custom") return customStart;
    const d = new Date(today); d.setDate(d.getDate() - (cfg.days - 1));
    return toDateStr(d);
  }, [period, today, customStart]);

  const prevEnd = useMemo(() => {
    if (!today || period === "custom") return "";
    const d = new Date(today); d.setDate(d.getDate() - cfg.days);
    return toDateStr(d);
  }, [period, today]);

  const prevStart = useMemo(() => {
    if (!today || period === "custom") return "";
    const d = new Date(today); d.setDate(d.getDate() - cfg.days * 2 + 1);
    return toDateStr(d);
  }, [period, today]);

  const currentAppts = useMemo(() =>
    appointments.filter(a => a.status === "completed" && a.date >= rangeStart && a.date <= filterEnd),
    [appointments, rangeStart, filterEnd]);

  const prevAppts = useMemo(() =>
    appointments.filter(a => a.status === "completed" && a.date >= prevStart && a.date <= prevEnd),
    [appointments, prevStart, prevEnd]);

  // POS invoices in current / previous range
  const currentPos = useMemo(() =>
    posInvoices.filter(inv => inv.date >= rangeStart && inv.date <= filterEnd),
    [posInvoices, rangeStart, filterEnd]);

  const prevPos = useMemo(() =>
    posInvoices.filter(inv => inv.date >= prevStart && inv.date <= prevEnd),
    [posInvoices, prevStart, prevEnd]);

  const totalRevenue = useMemo(() =>
    currentAppts.reduce((s, a) => s + a.totalAmount, 0) + currentPos.reduce((s, inv) => s + inv.total, 0),
    [currentAppts, currentPos]);

  const prevRevenue = useMemo(() =>
    prevAppts.reduce((s, a) => s + a.totalAmount, 0) + prevPos.reduce((s, inv) => s + inv.total, 0),
    [prevAppts, prevPos]);

  const totalCount = currentAppts.length + currentPos.length;
  const prevCount  = prevAppts.length  + prevPos.length;
  const avgTicket  = totalCount ? totalRevenue / totalCount : 0;
  const prevAvg    = prevCount  ? prevRevenue  / prevCount  : 0;
  const tipsTotal    = Math.round(totalRevenue * 0.08);

  const revChange = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const cntChange = prevCount   ? ((totalCount   - prevCount)   / prevCount)   * 100 : 0;
  const avgChange = prevAvg     ? ((avgTicket    - prevAvg)     / prevAvg)     * 100 : 0;

  // ── Chart data (1y / custom-long = monthly bars, else daily) ────────────────
  const chartData = useMemo((): ChartBar[] => {
    if (!today) return [];

    // Helper: build monthly bars from a set of dates
    const monthlyBars = (start: string, end: string): ChartBar[] => {
      const monthMap: Record<string, number> = {};
      const cur = new Date(start + "T12:00:00");
      const endDate = new Date(end + "T12:00:00");
      while (cur <= endDate) {
        monthMap[toDateStr(cur).substring(0, 7)] = 0;
        cur.setMonth(cur.getMonth() + 1); cur.setDate(1);
      }
      appointments.forEach(a => {
        if (a.status === "completed") { const k = a.date.substring(0, 7); if (k in monthMap) monthMap[k] += a.totalAmount; }
      });
      posInvoices.forEach(inv => { const k = inv.date.substring(0, 7); if (k in monthMap) monthMap[k] += inv.total; });
      const keys = Object.keys(monthMap).sort();
      return keys.map((key, idx) => {
        const d = new Date(key + "-01T12:00:00");
        return { label: d.toLocaleDateString("en-PK", { month: "short" }), value: monthMap[key], isCurrentPeriod: idx === keys.length - 1, monthKey: key };
      });
    };

    if (period === "1y") return monthlyBars(rangeStart, today);

    if (period === "custom") {
      if (!customStart || !customEnd || customStart > customEnd) return [];
      const days = getDaysInRange(customStart, customEnd);
      if (days.length > 62) return monthlyBars(customStart, customEnd);
      const byDay: Record<string, number> = {};
      days.forEach(d => { byDay[d] = 0; });
      appointments.forEach(a => { if (a.status === "completed" && a.date in byDay) byDay[a.date] += a.totalAmount; });
      posInvoices.forEach(inv => { if (inv.date in byDay) byDay[inv.date] += inv.total; });
      return days.map((date, idx) => {
        const d = new Date(date + "T12:00:00");
        const label = days.length > 14 ? String(d.getDate()) : d.toLocaleDateString("en-PK", { weekday: "short" });
        return { label, value: byDay[date], isCurrentPeriod: idx === days.length - 1, monthKey: date };
      });
    }

    const days = getDaysArray(cfg.days);
    const byDay: Record<string, number> = {};
    days.forEach(d => { byDay[d] = 0; });
    appointments.forEach(a => { if (a.status === "completed" && a.date in byDay) byDay[a.date] += a.totalAmount; });
    posInvoices.forEach(inv => { if (inv.date in byDay) byDay[inv.date] += inv.total; });
    return days.map((date, idx) => {
      const d = new Date(date + "T12:00:00");
      const label = period === "30d" ? String(d.getDate()) : d.toLocaleDateString("en-PK", { weekday: "short" });
      return { label, value: byDay[date], isCurrentPeriod: idx === days.length - 1, monthKey: date };
    });
  }, [appointments, posInvoices, period, today, rangeStart, customStart, customEnd]);

  // ── Drill-down: daily rows for the selected month ─────────────────────────
  const drillRows = useMemo(() => {
    if (!selectedMonth) return null;
    const [y, m] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const rows: { date: string; dow: string; count: number; revenue: number }[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const appts = appointments.filter(a => a.status === "completed" && a.date === date);
      const pos   = posInvoices.filter(inv => inv.date === date);
      const dow   = new Date(date + "T12:00:00").toLocaleDateString("en-PK", { weekday: "short" });
      rows.push({
        date, dow,
        count:   appts.length + pos.length,
        revenue: appts.reduce((s, a) => s + a.totalAmount, 0) + pos.reduce((s, inv) => s + inv.total, 0),
      });
    }
    return rows.reverse();
  }, [selectedMonth, appointments, posInvoices]);

  // Drill-down totals
  const drillTotal   = drillRows ? drillRows.reduce((s, r) => s + r.revenue, 0) : 0;
  const drillCount   = drillRows ? drillRows.reduce((s, r) => s + r.count, 0) : 0;
  const drillAvg     = drillCount ? drillTotal / drillCount : 0;

  // ── Default daily rows (no drill-down) ────────────────────────────────────
  const dailyRows = useMemo(() => {
    if (!today) return [] as { date: string; dow: string; count: number; revenue: number }[];
    const days = period === "custom" && customStart && customEnd && customStart <= customEnd
      ? getDaysInRange(customStart, customEnd)
      : getDaysArray(Math.min(cfg.days, 31));
    const byDay: Record<string, { count: number; revenue: number }> = {};
    days.forEach(d => { byDay[d] = { count: 0, revenue: 0 }; });
    currentAppts.forEach(a => {
      if (a.date in byDay) { byDay[a.date].count++; byDay[a.date].revenue += a.totalAmount; }
    });
    currentPos.forEach(inv => {
      if (inv.date in byDay) { byDay[inv.date].count++; byDay[inv.date].revenue += inv.total; }
    });
    return days.map(date => ({
      date,
      dow: new Date(date + "T12:00:00").toLocaleDateString("en-PK", { weekday: "short" }),
      ...byDay[date],
    })).reverse();
  }, [currentAppts, currentPos, period, today, customStart, customEnd]);

  const methodBreakdown = useMemo(() => {
    const invoices = getSalonInvoices().filter(
      inv => inv.status === "paid" && inv.date >= rangeStart && inv.date <= filterEnd
    );
    const totals: Record<string, number> = {};
    invoices.forEach(inv => {
      if (!inv.paymentMethod) return;
      totals[inv.paymentMethod] = (totals[inv.paymentMethod] ?? 0) + inv.total;
    });
    const grand = Object.values(totals).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(totals)
      .map(([method, amount]) => ({ method, amount, pct: (amount / grand) * 100 }))
      .sort((a, b) => b.amount - a.amount);
  }, [rangeStart, filterEnd]);

  // ── Today's data for Daily Report ────────────────────────────────────────
  const todayAppts = useMemo(() =>
    appointments.filter(a => a.status === "completed" && a.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [appointments, today]);

  const todayPos = useMemo(() =>
    posInvoices.filter(inv => inv.date === today),
    [posInvoices, today]);

  const todayRevenue = todayAppts.reduce((s, a) => s + a.totalAmount, 0) + todayPos.reduce((s, inv) => s + inv.total, 0);
  const todayCount   = todayAppts.length + todayPos.length;
  const todayAvg     = todayCount ? todayRevenue / todayCount : 0;

  const todayMethodBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    todayPos.forEach(inv => {
      if (!inv.paymentMethod) return;
      totals[inv.paymentMethod] = (totals[inv.paymentMethod] ?? 0) + inv.total;
    });
    return Object.entries(totals)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [todayPos]);

  const topServices = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    currentAppts.forEach(a => {
      const k = a.serviceNames[0] ?? "Other";
      if (!map[k]) map[k] = { name: k, count: 0, revenue: 0 };
      map[k].count++; map[k].revenue += a.totalAmount;
    });
    currentPos.forEach(inv => {
      inv.items.forEach(item => {
        const k = item.description || "POS Sale";
        if (!map[k]) map[k] = { name: k, count: 0, revenue: 0 };
        map[k].count += item.qty; map[k].revenue += item.total;
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [currentAppts, currentPos]);

  const maxChart = Math.max(...chartData.map(d => d.value), 1);

  const yLabels = useMemo(() => {
    const step = maxChart <= 10_000 ? 2_500 : maxChart <= 50_000 ? 10_000 : maxChart <= 200_000 ? 50_000 : maxChart <= 1_000_000 ? 250_000 : 500_000;
    const top = Math.ceil(maxChart / step) * step || step;
    return [top, top * 0.75, top * 0.5, top * 0.25, 0].map(v => fmtK(v));
  }, [maxChart]);

  // Selected month label e.g. "November 2025"
  const selectedMonthLabel = selectedMonth
    ? new Date(selectedMonth + "-01T12:00:00").toLocaleDateString("en-PK", { month: "long", year: "numeric" })
    : "";

  function Trend({ change }: { change: number }) {
    const up = change >= 0;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 600, color: up ? "#22c55e" : "#ef4444" }}>
        {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
        {Math.abs(change).toFixed(1)}% vs prev period
      </div>
    );
  }

  // ── PDF Export ─────────────────────────────────────────────────────────────
  function exportPDF() {
    const now = new Date();
    const isYearDrill = !!selectedMonth;
    const tableRows  = isYearDrill ? (drillRows ?? []) : dailyRows.slice(0, 60);
    const pdfTotal   = isYearDrill ? drillTotal   : totalRevenue;
    const pdfCount   = isYearDrill ? drillCount   : totalCount;
    const pdfAvg     = isYearDrill ? drillAvg     : avgTicket;
    const pdfTitle   = isYearDrill ? `${selectedMonthLabel} — Daily Detail` : `Revenue Report — ${cfg.label}`;
    const pdfRange   = isYearDrill ? selectedMonthLabel : `${rangeStart} to ${filterEnd}`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Salon Central ${pdfTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Montserrat', sans-serif; background: #fff; color: #1a1a2e; font-size: 13px; }
    .page { max-width: 820px; margin: 0 auto; padding: 40px 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #f0f0f8; }
    .logo-img { height: 42px; width: auto; display: block; filter: brightness(0); }
    .logo-sub  { font-size: 12px; color: #a0a0b8; margin-top: 6px; }
    .report-meta { text-align: right; }
    .report-title { font-size: 16px; font-weight: 800; color: #7C3AED; }
    .report-sub   { font-size: 12px; color: #6b6b8a; margin-top: 4px; }
    .report-gen   { font-size: 11px; color: #c0c0d0; margin-top: 2px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
    .stat-card  { background: #F5F3FF; border-radius: 12px; padding: 16px; border: 1px solid #EDE9FE; }
    .stat-label { font-size: 10px; font-weight: 700; color: #a0a0b8; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }
    .stat-value { font-size: 20px; font-weight: 800; color: #7C3AED; }
    .stat-sub   { font-size: 10px; color: #a0a0b8; margin-top: 4px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 14px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .section-sub   { font-size: 11px; color: #a0a0b8; margin-bottom: 16px; }
    .chart-area   { display: flex; align-items: flex-end; gap: 5px; height: 130px; border-bottom: 2px solid #f0f0f8; padding: 0 2px; }
    .bar-wrap     { flex: 1; display: flex; align-items: flex-end; height: 100%; }
    .bar          { width: 100%; border-radius: 4px 4px 0 0; min-height: 2px; }
    .bar-labels   { display: flex; gap: 5px; padding-top: 6px; }
    .bar-lbl      { flex: 1; text-align: center; font-size: 9px; color: #c0c0d0; overflow: hidden; }
    .methods-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .method-row   { border: 1px solid #f0f0f8; border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
    .method-dot   { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; flex-shrink: 0; }
    .method-name  { font-weight: 600; font-size: 13px; display: flex; align-items: center; }
    .method-pct   { font-size: 11px; color: #a0a0b8; margin-top: 2px; }
    .method-amount{ font-weight: 700; color: #7C3AED; font-size: 13px; }
    .svc-grid     { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .svc-card     { border: 1px solid #f0f0f8; border-radius: 10px; padding: 12px 14px; }
    .svc-name     { font-weight: 600; font-size: 12px; color: #1a1a2e; margin-bottom: 4px; }
    .svc-count    { font-size: 10px; color: #a0a0b8; }
    .svc-rev      { font-weight: 700; color: #7C3AED; font-size: 13px; margin-top: 6px; }
    table         { width: 100%; border-collapse: collapse; }
    thead tr      { background: #F5F3FF; }
    th { font-size: 10px; font-weight: 700; color: #a0a0b8; letter-spacing: 0.07em; text-transform: uppercase; padding: 10px 14px; text-align: left; border-bottom: 1px solid #f0f0f8; }
    td { padding: 10px 14px; font-size: 12px; border-bottom: 1px solid #f8f8fc; }
    tr:last-child td { border-bottom: none; }
    .total-row td { font-weight: 700; background: #F5F3FF; color: #7C3AED; border-top: 1px solid #f0f0f8; }
    .amount { font-weight: 700; color: #7C3AED; }
    .muted  { color: #a0a0b8; }
    .footer { margin-top: 36px; padding-top: 20px; border-top: 1px solid #f0f0f8; display: flex; justify-content: space-between; }
    .footer-txt { font-size: 11px; color: #c0c0d0; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 24px 32px; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <img src="/salon-central-logo.png" alt="Salon Central" class="logo-img" />
      <div class="logo-sub">Salon Management Platform</div>
    </div>
    <div class="report-meta">
      <div class="report-title">${pdfTitle}</div>
      <div class="report-sub">${pdfRange}</div>
      <div class="report-gen">Generated ${now.toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · ${now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value">${fmt(pdfTotal)}</div>
      <div class="stat-sub">${!isYearDrill ? (revChange >= 0 ? "▲" : "▼") + " " + Math.abs(revChange).toFixed(1) + "% vs prev" : pdfRange}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Appointments</div>
      <div class="stat-value">${pdfCount}</div>
      <div class="stat-sub">Completed services</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Ticket</div>
      <div class="stat-value">${fmt(pdfAvg)}</div>
      <div class="stat-sub">Per appointment</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Est. Tips</div>
      <div class="stat-value">${fmt(Math.round(pdfTotal * 0.08))}</div>
      <div class="stat-sub">~8% of revenue</div>
    </div>
  </div>

  ${!isYearDrill ? `
  <div class="section">
    <div class="section-title">Revenue Trend</div>
    <div class="section-sub">${period === "1y" ? "Monthly" : "Daily"} breakdown · ${pdfRange}</div>
    <div class="chart-area">
      ${chartData.map(d => {
        const h = maxChart > 0 ? Math.max(2, Math.round((d.value / maxChart) * 100)) : 2;
        return `<div class="bar-wrap"><div class="bar" style="height:${h}%;background:${d.isCurrentPeriod ? "#7C3AED" : "#DDD6FE"}"></div></div>`;
      }).join("")}
    </div>
    <div class="bar-labels">${chartData.map(d => `<div class="bar-lbl">${d.label}</div>`).join("")}</div>
  </div>
  <div class="section">
    <div class="section-title">Payment Methods</div>
    <div class="section-sub">Revenue by channel</div>
    <div class="methods-grid">
      ${methodBreakdown.map(m => `
      <div class="method-row">
        <div>
          <div class="method-name"><span class="method-dot" style="background:${METHOD_COLORS[m.method] ?? "#888"}"></span>${METHOD_LABELS[m.method] ?? m.method}</div>
          <div class="method-pct">${m.pct.toFixed(0)}% of total</div>
        </div>
        <div class="method-amount">${fmt(m.amount)}</div>
      </div>`).join("")}
    </div>
  </div>
  ${topServices.length > 0 ? `
  <div class="section">
    <div class="section-title">Top Services by Revenue</div>
    <div class="section-sub">Most profitable this period</div>
    <div class="svc-grid">
      ${topServices.map(s => `
      <div class="svc-card">
        <div class="svc-name">${s.name}</div>
        <div class="svc-count">${s.count} appointment${s.count !== 1 ? "s" : ""}</div>
        <div class="svc-rev">${fmt(s.revenue)}</div>
      </div>`).join("")}
    </div>
  </div>` : ""}` : ""}

  <div class="section">
    <div class="section-title">${isYearDrill ? selectedMonthLabel + " — Daily Breakdown" : (period === "1y" ? "Monthly Breakdown" : "Daily Breakdown")}</div>
    <div class="section-sub">${tableRows.length < (isYearDrill ? (drillRows?.length ?? 0) : dailyRows.length) ? "Most recent rows shown" : "Complete breakdown"}</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th style="text-align:center">Appts</th>
          <th style="text-align:right">Revenue</th>
          <th style="text-align:right">Avg Ticket</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows.map(row => {
          const avg = row.count ? row.revenue / row.count : 0;
          return `
          <tr>
            <td>${row.date}</td>
            <td class="muted">${row.dow ?? ""}</td>
            <td style="text-align:center">${row.count}</td>
            <td class="amount" style="text-align:right">${fmt(row.revenue)}</td>
            <td style="text-align:right" class="muted">${avg ? fmt(avg) : "—"}</td>
          </tr>`;
        }).join("")}
        <tr class="total-row">
          <td colspan="2"><strong>Total</strong></td>
          <td style="text-align:center"><strong>${pdfCount}</strong></td>
          <td style="text-align:right"><strong>${fmt(pdfTotal)}</strong></td>
          <td style="text-align:right"><strong>${fmt(pdfAvg)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div class="footer-txt">Salon Central · Salon Management Platform</div>
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

  // ── Table rows to display ──────────────────────────────────────────────────
  const tableRows    = selectedMonth ? (drillRows ?? []) : dailyRows;
  const tableTotal   = selectedMonth ? drillTotal   : totalRevenue;
  const tableCount   = selectedMonth ? drillCount   : totalCount;
  const tableAvg     = selectedMonth ? drillAvg     : avgTicket;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-polish" style={{ background: "#ffffff", minHeight: "100vh" }}>
      <DashboardHeader title="Revenue" subtitle="Earnings & financial overview" />

      {/* ── Native mobile app bar ── */}
      <MobilePageHeader
        title="Revenue"
        subtitle={cfg.label}
        action={{ label: "Export PDF", onClick: exportPDF }}
      />

      {/* ── Mobile period tabs ── */}
      <div className="mobile-tab-bar mobile-only">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" className={`mobile-tab-btn ${period === p.key ? "active" : ""}`} onClick={() => setPeriod(p.key)}>{p.label}</button>
        ))}
      </div>

      {/* ── Mobile hero revenue card ── */}
      <div className="mobile-only">
        <div className="mobile-hero-card">
          <div className="mobile-hero-label">Total Revenue · {cfg.label}</div>
          <div className="mobile-hero-value">{fmt(totalRevenue)}</div>
          <div className="mobile-hero-sub" style={{ color: revChange >= 0 ? "#4ade80" : "#f87171" }}>
            {revChange >= 0 ? "▲" : "▼"} {Math.abs(revChange).toFixed(1)}% vs previous {cfg.label.toLowerCase()}
          </div>
        </div>

        {/* Mobile stats scroll */}
        <div className="mobile-stat-scroll">
          {[
            { label: "Appointments", value: String(totalCount), color: "#3b82f6", change: cntChange },
            { label: "Avg Ticket",   value: fmtK(avgTicket),   color: "#059669", change: avgChange },
            { label: "Tips est.",    value: fmtK(totalRevenue * 0.08), color: "#d97706", change: 0 },
          ].map((s) => (
            <div key={s.label} className="mobile-stat-card">
              <div className="mobile-stat-card-label">{s.label}</div>
              <div className="mobile-stat-card-value" style={{ color: s.color }}>{s.value}</div>
              {s.change !== 0 && <div className="mobile-stat-card-sub" style={{ color: s.change >= 0 ? "#059669" : "#dc2626" }}>{s.change >= 0 ? "▲" : "▼"} {Math.abs(s.change).toFixed(1)}%</div>}
            </div>
          ))}
        </div>

        {/* Mobile payment methods */}
        {methodBreakdown.length > 0 && (
          <>
            <div className="mobile-section-header">By Payment Method</div>
            <div style={{ padding: "0 16px" }}>
              {methodBreakdown.slice(0, 4).map((m) => (
                <div key={m.method} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: METHOD_COLORS[m.method] ?? "#888", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", flex: 1 }}>{METHOD_LABELS[m.method]}</span>
                  <span style={{ fontSize: 12, color: "#9898b0" }}>{m.pct.toFixed(0)}%</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED", minWidth: 80, textAlign: "right" }}>{fmt(m.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Mobile daily table */}
        {dailyRows.length > 0 && (
          <>
            <div className="mobile-section-header">Daily Breakdown</div>
            <div className="mobile-list">
              {dailyRows.slice(0, 10).map((row) => (
                <div key={row.date} className="mobile-list-card">
                  <div className="mobile-list-icon" style={{ background: row.date === today ? "#ede9fe" : "#f4f4fb" }}>
                    <CalendarDays size={16} color={row.date === today ? "#7C3AED" : "#9898b0"} />
                  </div>
                  <div className="mobile-list-body">
                    <div className="mobile-list-title">{row.date === today ? "Today" : row.date}</div>
                    <div className="mobile-list-sub">{row.count} appointment{row.count !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="mobile-list-right">
                    <div className="mobile-list-amount" style={{ color: "#7C3AED" }}>{fmt(row.revenue)}</div>
                    <div style={{ fontSize: 11, color: "#9898b0" }}>{row.count ? fmt(row.revenue / row.count) : "—"} avg</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Desktop layout ── */}
      <div className="dash-page dashboard-polish desktop-only" style={{ background: "#ffffff", padding: "28px 32px 48px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Title + controls */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 850, color: "#1a1a2e", margin: 0, letterSpacing: "-0.025em" }}>Revenue</h1>
          <p style={{ fontSize: 13, color: "#6b6b8a", margin: "4px 0 0", fontWeight: 500 }}>Track your salon&apos;s financial performance</p>
        </div>
        <div className="rev-header-controls" style={{ display: "flex", gap: 12 }}>
          <div className="rev-period-selector segment-control">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`segment-btn ${period === p.key ? "active" : ""}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportPDF}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12, border: "1px solid #e3e0eb", cursor: "pointer", background: "#fff", color: "#6b6b8a", fontSize: 13, fontWeight: 750, transition: "all 0.15s" }}
            className="hover-bg-light"
          >
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Custom date range picker */}
      {period === "custom" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1.5px solid #7C3AED", borderRadius: 12, padding: "10px 18px", marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED" }}>Date Range</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 600 }}>From</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
          </div>
          <span style={{ color: "#c0c0d0", fontSize: 16 }}>→</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: "#6b6b8a", fontWeight: 600 }}>To</label>
            <input type="date" value={customEnd} min={customStart} onChange={e => setCustomEnd(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", outline: "none" }} />
          </div>
          {customStart && customEnd && customStart <= customEnd && (
            <span style={{ fontSize: 12, color: "#a0a0b8", marginLeft: 4 }}>
              {getDaysInRange(customStart, customEnd).length} days
            </span>
          )}
        </div>
      )}

      {/* Empty state banner */}
      {appointments.filter(a => a.status === "completed").length === 0 && posInvoices.length === 0 && (
        <div style={{ background: "#f8f9ff", border: "1px solid #e0e0f8", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#6b6b8a", display: "flex", alignItems: "center", gap: 10 }}>
          <TrendingUp size={16} color="#a0a0c8" />
          No completed appointments yet — revenue figures will appear here once you complete your first appointment.
        </div>
      )}

      {/* Stat cards */}
      <div className="stats-grid-4">
        {[
          { label: "Total Revenue", value: fmt(totalRevenue), change: revChange, icon: TrendingUp,   color: "var(--accent)", bg: "rgba(124, 58, 237, 0.08)", showTrend: true  },
          { label: "Appointments",  value: String(totalCount), change: cntChange, icon: CalendarDays, color: "#3b82f6", bg: "#eff6ff", showTrend: true  },
          { label: "Avg Ticket",    value: fmt(avgTicket),     change: avgChange, icon: CreditCard,   color: "#059669", bg: "#f0fdf4", showTrend: true  },
          { label: "Est. Tips",     value: fmt(tipsTotal),     change: 0,         icon: Wallet,       color: "#d97706", bg: "#fffbeb", showTrend: false },
        ].map(({ label, value, change, icon: Icon, color, bg, showTrend }) => (
          <div key={label} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(226,223,235,0.8)", padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.02)", flex: 1 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color }}>
              <Icon size={24} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 850, color, lineHeight: 1.1 }}>{value}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9898b0", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
              {showTrend && <div style={{ marginTop: 2 }}><Trend change={change} /></div>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Daily Report ── */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(226,223,235,.95)", boxShadow: "0 8px 28px rgba(38,25,75,.04)", overflow: "hidden" }}>
        {/* Header */}
        <div
          style={{ padding: "18px 24px", borderBottom: dailyReportOpen ? "1px solid #f0f0f8" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          onClick={() => setDailyReportOpen(o => !o)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Receipt size={17} color="#7C3AED" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>Daily Report</div>
              <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 2 }}>{today} · Today&apos;s activity</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a0a0b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>Revenue</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#7C3AED" }}>{fmt(todayRevenue)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a0a0b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>Appts</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#3b82f6" }}>{todayCount}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#a0a0b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>Avg Ticket</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#059669" }}>{todayCount ? fmt(todayAvg) : "—"}</div>
            </div>
            <div style={{ color: "#c0c0d0" }}>
              {dailyReportOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </div>

        {dailyReportOpen && (
          <>
            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "90px 1.4fr 1.4fr 1fr 1fr 110px", padding: "9px 24px", background: "#fafafa", borderBottom: "1px solid #f0f0f8" }}>
              {["TIME", "CLIENT", "SERVICE / ITEM", "STAFF", "PAYMENT", "AMOUNT"].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#b0b0c8", letterSpacing: "0.08em" }}>{h}</div>
              ))}
            </div>

            {/* Appointment rows */}
            {todayAppts.length === 0 && todayPos.length === 0 ? (
              <div style={{ padding: "32px 24px", textAlign: "center", fontSize: 13, color: "#c0c0d0" }}>
                No completed transactions today yet
              </div>
            ) : (
              <>
                {todayAppts.map((a, i) => (
                  <div key={a.id} style={{ display: "grid", gridTemplateColumns: "90px 1.4fr 1.4fr 1fr 1fr 110px", padding: "11px 24px", borderBottom: "1px solid #f8f8fc", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b6b8a" }}>
                      <Clock size={12} color="#c0c0d0" />
                      {a.startTime}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{a.clientName}</div>
                    <div style={{ fontSize: 12, color: "#6b6b8a" }}>{a.serviceNames.join(", ") || "—"}</div>
                    <div style={{ fontSize: 12, color: "#6b6b8a" }}>{a.staffName}</div>
                    <div>
                      <span style={{ fontSize: 11, background: "#f0f0f8", color: "#6b6b8a", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>Appointment</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{fmt(a.totalAmount)}</div>
                  </div>
                ))}

                {todayPos.map((inv, i) => (
                  <div key={inv.id} style={{ display: "grid", gridTemplateColumns: "90px 1.4fr 1.4fr 1fr 1fr 110px", padding: "11px 24px", borderBottom: "1px solid #f8f8fc", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b6b8a" }}>
                      <Clock size={12} color="#c0c0d0" />
                      {inv.createdAt ? new Date(inv.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{inv.clientName || "Walk-in"}</div>
                    <div style={{ fontSize: 12, color: "#6b6b8a" }}>{inv.items.map(it => it.description).join(", ") || "POS Sale"}</div>
                    <div style={{ fontSize: 12, color: "#6b6b8a" }}>{inv.staffName || "—"}</div>
                    <div>
                      <span style={{
                        fontSize: 11,
                        background: METHOD_COLORS[inv.paymentMethod] ? `${METHOD_COLORS[inv.paymentMethod]}18` : "#f0f0f8",
                        color: METHOD_COLORS[inv.paymentMethod] ?? "#6b6b8a",
                        padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                      }}>
                        {METHOD_LABELS[inv.paymentMethod] ?? inv.paymentMethod ?? "—"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{fmt(inv.total)}</div>
                  </div>
                ))}

                {/* Footer totals */}
                <div style={{ display: "grid", gridTemplateColumns: "90px 1.4fr 1.4fr 1fr 1fr 110px", padding: "11px 24px", background: "#fafafa", borderTop: "1px solid #f0f0f8", alignItems: "center" }}>
                  <div />
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>Total · {todayCount} transactions</div>
                  <div />
                  <div />
                  {/* Payment method pills */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {todayMethodBreakdown.map(m => (
                      <span key={m.method} style={{ fontSize: 10, background: `${METHOD_COLORS[m.method] ?? "#888"}18`, color: METHOD_COLORS[m.method] ?? "#888", padding: "2px 7px", borderRadius: 20, fontWeight: 700 }}>
                        {METHOD_LABELS[m.method] ?? m.method} {fmt(m.amount)}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#7C3AED" }}>{fmt(todayRevenue)}</div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Revenue bar chart */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(226,223,235,.95)", boxShadow: "0 8px 28px rgba(38,25,75,.04)", padding: "26px 30px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a2e" }}>Revenue Trend</div>
            <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 3 }}>
              {period === "1y" ? "Monthly breakdown" : "Daily breakdown"} · {rangeStart} → {filterEnd}
              {period === "1y" && (
                <span style={{ marginLeft: 8, fontSize: 11, color: "#9333EA", fontWeight: 600 }}>
                  Click a bar to drill into that month
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#7C3AED" }}>{fmt(totalRevenue)}</div>
            <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 2 }}>{cfg.label} total</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {/* Y-axis */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", paddingBottom: 26, minWidth: 40 }}>
            {yLabels.map(l => (
              <div key={l} style={{ fontSize: 10, color: "#c0c0d0", textAlign: "right" }}>{l}</div>
            ))}
          </div>

          {/* Bars */}
          <div style={{ flex: 1 }}>
            <div style={{ position: "relative", height: 230 }}>
              {[0, 25, 50, 75, 100].map(pct => (
                <div key={pct} style={{ position: "absolute", bottom: `${pct}%`, left: 0, right: 0, height: 1, background: "#f0f0f8" }} />
              ))}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: period === "30d" ? 4 : period === "1y" ? 7 : 10 }}>
                {chartData.map((bar, i) => {
                  const h = maxChart > 0 ? (bar.value / maxChart) * 100 : 0;
                  const isHovered = hoveredBar === i;
                  const isSelected = period === "1y" && selectedMonth === bar.monthKey;
                  const isClickable = period === "1y";
                  const barBg = isSelected
                    ? "linear-gradient(135deg, #5B21B6 0%, #350e7a 100%)"
                    : bar.isCurrentPeriod
                    ? "#7C3AED"
                    : isHovered
                    ? "#8B5CF6"
                    : "linear-gradient(180deg, #A78BFA 0%, #DDD6FE 100%)";

                  return (
                    <div
                      key={i}
                      style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", cursor: isClickable ? "pointer" : "default", position: "relative" }}
                      onClick={() => { if (isClickable) setSelectedMonth(isSelected ? null : bar.monthKey); }}
                      onMouseEnter={() => setHoveredBar(i)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div style={{
                          position: "absolute", bottom: `${h + 2}%`, left: "50%", transform: "translateX(-50%)",
                          background: "#1a1a2e", color: "#fff", fontSize: 11, fontWeight: 700,
                          padding: "5px 9px", borderRadius: 7, whiteSpace: "nowrap", zIndex: 10,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                          pointerEvents: "none",
                        }}>
                          {fmt(bar.value)}
                          {isClickable && (
                            <div style={{ fontSize: 9, fontWeight: 500, color: "#8B5CF6", textAlign: "center", marginTop: 1 }}>
                              {isSelected ? "Click to close" : "Click to expand"}
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{
                        width: "100%",
                        height: `${Math.max(h, 0.4)}%`,
                        background: barBg,
                        borderRadius: "5px 5px 0 0",
                        transition: "height 0.4s ease, background 0.15s",
                        outline: isSelected ? "2px solid #5B21B6" : "none",
                        outlineOffset: 1,
                      }} />
                    </div>
                  );
                })}
              </div>
            </div>
            {/* X-axis labels */}
            <div style={{ display: "flex", gap: period === "30d" ? 4 : period === "1y" ? 7 : 10, paddingTop: 8 }}>
              {chartData.map((bar, i) => {
                const isSelected = period === "1y" && selectedMonth === bar.monthKey;
                return (
                  <div
                    key={i}
                    onClick={() => { if (period === "1y") setSelectedMonth(isSelected ? null : bar.monthKey); }}
                    style={{
                      flex: 1, textAlign: "center",
                      fontSize: period === "30d" ? 9 : 11,
                      color: isSelected ? "#5B21B6" : bar.isCurrentPeriod ? "#7C3AED" : "#c0c0d0",
                      fontWeight: (isSelected || bar.isCurrentPeriod) ? 700 : 400,
                      overflow: "hidden",
                      cursor: period === "1y" ? "pointer" : "default",
                    }}
                  >
                    {bar.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Payment methods + Top services */}
      <div className="dash-grid-bottom">
        {/* Payment Methods */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(226,223,235,.95)", boxShadow: "0 8px 28px rgba(38,25,75,.04)", padding: "26px 30px" }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 4 }}>Payment Methods</div>
          <div style={{ fontSize: 12, color: "#a0a0b8", marginBottom: 22 }}>Revenue by channel</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {methodBreakdown.map(m => (
              <div key={m.method}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: METHOD_COLORS[m.method] ?? "#888", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{METHOD_LABELS[m.method]}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, color: "#a0a0b8", fontWeight: 500 }}>{m.pct.toFixed(0)}%</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{fmt(m.amount)}</span>
                  </div>
                </div>
                <div style={{ height: 6, background: "#f0f0f8", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${m.pct}%`, background: METHOD_COLORS[m.method] ?? "#888", borderRadius: 4, transition: "width 0.6s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Services */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(226,223,235,.95)", boxShadow: "0 8px 28px rgba(38,25,75,.04)", padding: "26px 30px" }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e", marginBottom: 4 }}>Top Services</div>
          <div style={{ fontSize: 12, color: "#a0a0b8", marginBottom: 22 }}>Most profitable this period</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {topServices.length === 0 ? (
              <div style={{ fontSize: 13, color: "#c0c0d0", textAlign: "center", padding: "24px 0" }}>No data for this period</div>
            ) : topServices.map((s, i) => {
              const pct = topServices[0].revenue > 0 ? (s.revenue / topServices[0].revenue) * 100 : 0;
              const barColors = ["#7C3AED", "#9333EA", "#A78BFA", "#d8b4fe", "#EDE9FE", "#F5F3FF"];
              return (
                <div key={s.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#c0c0d0", width: 16, textAlign: "center" }}>{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{s.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, color: "#a0a0b8" }}>{s.count}×</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{fmt(s.revenue)}</span>
                    </div>
                  </div>
                  <div style={{ height: 5, background: "#f0f0f8", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: barColors[i] ?? "#DDD6FE", borderRadius: 3, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily / Monthly breakdown table */}
      <div className="table-scroll-wrap" style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(226,223,235,.95)", boxShadow: "0 8px 28px rgba(38,25,75,.04)", overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #f0f0f8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {selectedMonth ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => setSelectedMonth(null)}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: "#f0f0f8", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6b6b8a" }}
                >
                  <ChevronLeft size={14} /> All months
                </button>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>{selectedMonthLabel}</div>
                <span style={{ fontSize: 11, background: "#F5F3FF", border: "1px solid #EDE9FE", color: "#5B21B6", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>
                  Daily detail
                </span>
              </div>
            ) : (
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a2e" }}>
                {period === "1y" ? "Daily Breakdown" : "Daily Breakdown"}
              </div>
            )}
            <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 4 }}>
              {selectedMonth
                ? `${drillRows?.length ?? 0} days · ${fmt(drillTotal)} total`
                : period === "1y" ? "Last 31 days shown — click a chart bar to drill into a month" : `Last ${Math.min(cfg.days, 31)} days`}
            </div>
          </div>

          {/* Drill mini stats */}
          {selectedMonth && drillRows && (
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#a0a0b8", fontWeight: 600 }}>APPOINTMENTS</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#3b82f6" }}>{drillCount}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#a0a0b8", fontWeight: 600 }}>AVG TICKET</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#059669" }}>{fmt(drillAvg)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#a0a0b8", fontWeight: 600 }}>TOTAL</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#7C3AED" }}>{fmt(drillTotal)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="table-scroll-inner"><div className="rev-table-inner">
        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 100px 1.2fr 1.2fr", padding: "10px 24px", background: "#fafafa", borderBottom: "1px solid #f0f0f8" }}>
          {["DATE", "DAY", "APPTS", "REVENUE", "AVG TICKET"].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "#b0b0c8", letterSpacing: "0.08em" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {tableRows.length === 0 ? (
          <div style={{ padding: "32px 24px", textAlign: "center", fontSize: 13, color: "#c0c0d0" }}>
            No data for this period
          </div>
        ) : tableRows.map((row, i) => {
          const isToday = row.date === today;
          const avg = row.count ? row.revenue / row.count : 0;
          return (
            <div
              key={row.date}
              style={{
                display: "grid", gridTemplateColumns: "1.6fr 1fr 100px 1.2fr 1.2fr",
                padding: "11px 24px",
                borderBottom: i === tableRows.length - 1 ? "none" : "1px solid #f8f8fc",
                alignItems: "center",
                background: isToday ? "#fdf8ff" : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? "#7C3AED" : "#1a1a2e" }}>{row.date}</span>
                {isToday && <span style={{ fontSize: 10, background: "linear-gradient(135deg, #5B21B6, #9333EA)", color: "#fff", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>Today</span>}
              </div>
              <div style={{ fontSize: 13, color: "#6b6b8a" }}>{row.dow}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a2e" }}>{row.count}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: row.revenue > 0 ? "#7C3AED" : "#c0c0d0" }}>{fmt(row.revenue)}</div>
              <div style={{ fontSize: 13, color: "#6b6b8a" }}>{avg ? fmt(avg) : "—"}</div>
            </div>
          );
        })}

        {/* Footer totals */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 100px 1.2fr 1.2fr", padding: "13px 24px", background: "#fafafa", borderTop: "1px solid #f0f0f8" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
            {selectedMonth ? selectedMonthLabel : `Total (${cfg.label})`}
          </div>
          <div />
          <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{tableCount}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>{fmt(tableTotal)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6b6b8a" }}>{tableAvg ? fmt(tableAvg) : "—"}</div>
        </div>
        </div></div>{/* /rev-table-inner /table-scroll-inner */}
      </div>{/* /table-scroll-wrap */}
      </div>{/* /desktop-only */}
    </div>
  );
}
