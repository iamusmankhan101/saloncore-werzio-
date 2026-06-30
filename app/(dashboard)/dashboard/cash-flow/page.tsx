"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { getStoredAppointments } from "@/lib/storage";
import { getSalonInvoices } from "@/lib/salon-invoices";
import { getExpenses, saveExpenses, addExpense, deleteExpense, updateExpense, type Expense, type ExpenseCategory } from "@/lib/expenses";
import { getManualCashIncome, saveManualCashIncome, type ManualCashIncome } from "@/lib/cash-flow-income";
import type { Appointment } from "@/lib/types";
import DashboardHeader from "@/components/dashboard-header";
import MobilePageHeader from "@/components/mobile-page-header";
import { fmtCurrency as fmt } from "@/lib/format";
import {
  Plus, Trash2, TrendingUp, TrendingDown,
  Wallet, X, Download, Pencil, Check, CalendarCheck, ShoppingBag, Upload, FileSpreadsheet,
} from "lucide-react";

type Period = "today" | "7d" | "30d" | "1y" | "custom";

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: "today",  label: "Today",   days: 1   },
  { key: "7d",     label: "7 Days",  days: 7   },
  { key: "30d",    label: "Month",   days: 30  },
  { key: "1y",     label: "1 Year",  days: 365 },
  { key: "custom", label: "Custom",  days: 0   },
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

function getDaysInRange(start: string, end: string): string[] {
  const arr: string[] = [];
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  let limit = 366;
  while (s <= e && limit-- > 0) { arr.push(toDateStr(s)); s.setDate(s.getDate() + 1); }
  return arr;
}

function monthlyBarsRange(start: string, end: string): { label: string; key: string }[] {
  const arr: { label: string; key: string }[] = [];
  const s = new Date(start + "T12:00:00"); s.setDate(1);
  const e = new Date(end + "T12:00:00"); e.setDate(1);
  let limit = 36;
  while (s <= e && limit-- > 0) {
    arr.push({ label: s.toLocaleDateString("en-PK", { month: "short" }), key: toDateStr(s).substring(0, 7) });
    s.setMonth(s.getMonth() + 1);
  }
  return arr;
}

const EMPTY_FORM = { date: "", category: "miscellaneous" as ExpenseCategory, description: "", amount: "", paymentMethod: "cash", notes: "" };

export default function CashFlowPage() {
  const [period, setPeriod]           = useState<Period>("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [posInvoices, setPosInvoices] = useState<ReturnType<typeof getSalonInvoices>>([]);
  const [manualIncome, setManualIncome] = useState<ManualCashIncome[]>([]);
  const [today, setToday]             = useState("");
  const [showForm, setShowForm]       = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [hoveredBar, setHoveredBar]   = useState<number | null>(null);
  const [fileMessage, setFileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const importInputRef                 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = toDateStr(new Date());
    setToday(t);
    setCustomEnd(t);
    setCustomStart(t);
    setForm(f => ({ ...f, date: t }));
    setExpenses(getExpenses());
    setAppointments(getStoredAppointments());
    setPosInvoices(getSalonInvoices().filter(inv => inv.status === "paid" && !inv.appointmentId));
    setManualIncome(getManualCashIncome());
  }, []);

  const cfg = PERIODS.find(p => p.key === period)!;

  const filterEnd = period === "custom" ? customEnd : today;

  const rangeStart = useMemo(() => {
    if (!today) return "";
    if (period === "custom") return customStart;
    if (period === "today") return today;
    const d = new Date(today); d.setDate(d.getDate() - (cfg.days - 1));
    return toDateStr(d);
  }, [period, today, customStart, cfg.days]);

  const periodExpenses = useMemo(() =>
    expenses
      .filter(e => e.date >= rangeStart && e.date <= filterEnd)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [expenses, rangeStart, filterEnd]);

  const periodIncome = useMemo(() => {
    if (period === "custom" && (!customStart || !customEnd || customStart > customEnd)) return 0;
    const appts = appointments.filter(a => a.status === "completed" && a.date >= rangeStart && a.date <= filterEnd);
    const pos   = posInvoices.filter(inv => inv.date >= rangeStart && inv.date <= filterEnd);
    const manual = manualIncome.filter(entry => entry.date >= rangeStart && entry.date <= filterEnd);
    return appts.reduce((s, a) => s + a.totalAmount, 0) + pos.reduce((s, inv) => s + inv.total, 0) + manual.reduce((s, entry) => s + entry.amount, 0);
  }, [appointments, posInvoices, manualIncome, rangeStart, filterEnd, period, customStart, customEnd]);

  const periodIncomeRows = useMemo(() => {
    if (period === "custom" && (!customStart || !customEnd || customStart > customEnd)) return [];
    const apptRows = appointments
      .filter(a => a.status === "completed" && a.date >= rangeStart && a.date <= filterEnd)
      .map(a => ({
        id: a.id,
        date: a.date,
        client: a.clientName,
        description: a.serviceNames.join(", ") || "Appointment",
        source: "appointment" as const,
        paymentMethod: "",
        amount: a.totalAmount,
        sortKey: a.date + "T" + (a.startTime || "00:00"),
      }));
    const posRows = posInvoices
      .filter(inv => inv.date >= rangeStart && inv.date <= filterEnd)
      .map(inv => ({
        id: inv.id,
        date: inv.date,
        client: inv.clientName,
        description: inv.items.map(it => it.description).join(", ") || "POS Sale",
        source: "pos" as const,
        paymentMethod: inv.paymentMethod,
        amount: inv.total,
        sortKey: inv.date + "T" + inv.createdAt.slice(11, 16),
      }));
    const manualRows = manualIncome
      .filter(entry => entry.date >= rangeStart && entry.date <= filterEnd)
      .map(entry => ({
        id: entry.id,
        date: entry.date,
        client: entry.category || "Imported Income",
        description: entry.description,
        source: "manual" as const,
        paymentMethod: "",
        amount: entry.amount,
        sortKey: entry.date + "T" + entry.createdAt.slice(11, 16),
      }));
    return [...apptRows, ...posRows, ...manualRows].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [appointments, posInvoices, manualIncome, rangeStart, filterEnd, period, customStart, customEnd]);

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

  // Chart: income vs expense per day (or month for 1y / long custom)
  const chartData = useMemo(() => {
    if (!today) return [] as { label: string; income: number; expense: number }[];
    if (period === "custom") {
      if (!customStart || !customEnd || customStart > customEnd) return [];
      const days = getDaysInRange(customStart, customEnd);
      if (days.length > 62) {
        return monthlyBarsRange(customStart, customEnd).map(({ label, key }) => {
          const income =
            appointments.filter(a => a.status === "completed" && a.date.startsWith(key)).reduce((s, a) => s + a.totalAmount, 0) +
            posInvoices.filter(inv => inv.date.startsWith(key)).reduce((s, inv) => s + inv.total, 0) +
            manualIncome.filter(entry => entry.date.startsWith(key)).reduce((s, entry) => s + entry.amount, 0);
          const expense = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0);
          return { label, income, expense };
        });
      }
      return days.map(date => {
        const d = new Date(date + "T12:00:00");
        const label = days.length > 14 ? String(d.getDate()) : d.toLocaleDateString("en-PK", { weekday: "short" });
        const income =
          appointments.filter(a => a.status === "completed" && a.date === date).reduce((s, a) => s + a.totalAmount, 0) +
          posInvoices.filter(inv => inv.date === date).reduce((s, inv) => s + inv.total, 0) +
          manualIncome.filter(entry => entry.date === date).reduce((s, entry) => s + entry.amount, 0);
        const expense = expenses.filter(e => e.date === date).reduce((s, e) => s + e.amount, 0);
        return { label, income, expense };
      });
    }
    if (period === "1y") {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(today); d.setDate(1); d.setMonth(d.getMonth() - (11 - i));
        const key = toDateStr(d).substring(0, 7);
        const income =
          appointments.filter(a => a.status === "completed" && a.date.startsWith(key)).reduce((s, a) => s + a.totalAmount, 0) +
          posInvoices.filter(inv => inv.date.startsWith(key)).reduce((s, inv) => s + inv.total, 0) +
          manualIncome.filter(entry => entry.date.startsWith(key)).reduce((s, entry) => s + entry.amount, 0);
        const expense = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0);
        return { label: d.toLocaleDateString("en-PK", { month: "short" }), income, expense };
      });
    }
    return getDaysArr(cfg.days, today).map(date => {
      const d = new Date(date + "T12:00:00");
      const label = period === "30d" ? String(d.getDate()) : d.toLocaleDateString("en-PK", { weekday: "short" });
      const income =
        appointments.filter(a => a.status === "completed" && a.date === date).reduce((s, a) => s + a.totalAmount, 0) +
        posInvoices.filter(inv => inv.date === date).reduce((s, inv) => s + inv.total, 0) +
        manualIncome.filter(entry => entry.date === date).reduce((s, entry) => s + entry.amount, 0);
      const expense = expenses.filter(e => e.date === date).reduce((s, e) => s + e.amount, 0);
      return { label, income, expense };
    });
  }, [period, today, customStart, customEnd, appointments, posInvoices, manualIncome, expenses, cfg.days]);

  const maxChart = Math.max(...chartData.flatMap(d => [d.income, d.expense]), 1);

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

  function expenseKey(expense: Pick<Expense, "date" | "category" | "description" | "amount" | "paymentMethod">) {
    return [
      expense.date,
      expense.category,
      expense.description.trim().toLowerCase(),
      expense.amount.toFixed(2),
      expense.paymentMethod,
    ].join("|");
  }

  function incomeKey(income: Pick<ManualCashIncome, "date" | "category" | "description" | "amount">) {
    return [income.date, income.category.trim().toLowerCase(), income.description.trim().toLowerCase(), income.amount.toFixed(2)].join("|");
  }

  async function importCashFlow(file: File) {
    setFileMessage(null);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error("The workbook does not contain a worksheet.");

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (rows.length === 0) throw new Error("The import file has no cash-flow rows.");

      const categoryMap = new Map<string, ExpenseCategory>();
      EXPENSE_CATEGORIES.forEach(category => {
        categoryMap.set(category.key, category.key);
        categoryMap.set(category.label.toLowerCase(), category.key);
      });
      function field(row: Record<string, unknown>, ...names: string[]) {
        const normalized = new Map(
          Object.entries(row).map(([key, value]) => [key.trim().toLowerCase().replace(/[_-]+/g, " "), value]),
        );
        for (const name of names) {
          const value = normalized.get(name);
          if (value !== undefined) return value;
        }
        return "";
      }

      function parseDate(value: unknown): string {
        if (value instanceof Date && !Number.isNaN(value.getTime())) return toDateStr(value);
        if (typeof value === "number") {
          const parsed = XLSX.SSF.parse_date_code(value);
          if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
        }
        const text = String(value).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
        const parsed = new Date(text);
        return Number.isNaN(parsed.getTime()) ? "" : toDateStr(parsed);
      }

      const importedExpenses: Expense[] = [];
      const importedIncome: ManualCashIncome[] = [];
      const errors: string[] = [];
      rows.forEach((row, index) => {
        const line = index + 2;
        const date = parseDate(field(row, "date"));
        const categoryRaw = String(field(row, "category")).trim().toLowerCase();
        const category = categoryMap.get(categoryRaw);
        const categoryLabel = String(field(row, "category")).trim();
        const description = String(field(row, "service description", "description")).trim();
        const parseAmount = (value: unknown) => {
          const text = String(value).replace(/[,₨\s]/g, "").trim();
          return text === "" ? 0 : Number(text);
        };
        const incomeAmount = parseAmount(field(row, "income intake amount", "income amount", "income"));
        const expenseAmount = parseAmount(field(row, "expense amount", "amount", "amount pkr"));

        const rowErrors: string[] = [];
        if (!date) rowErrors.push("invalid date");
        if (!categoryLabel) rowErrors.push("missing category");
        if (!description) rowErrors.push("missing service description");
        if (!Number.isFinite(incomeAmount) || incomeAmount < 0) rowErrors.push("invalid income amount");
        if (!Number.isFinite(expenseAmount) || expenseAmount < 0) rowErrors.push("invalid expense amount");
        if (incomeAmount <= 0 && expenseAmount <= 0) rowErrors.push("income or expense amount is required");
        if (expenseAmount > 0 && !category) rowErrors.push("invalid expense category");
        if (rowErrors.length > 0) {
          errors.push(`Row ${line}: ${rowErrors.join(", ")}`);
          return;
        }

        const createdAt = new Date().toISOString();
        if (incomeAmount > 0) {
          importedIncome.push({ id: crypto.randomUUID(), date, category: categoryLabel, description, amount: incomeAmount, createdAt });
        }
        if (expenseAmount > 0) {
          importedExpenses.push({
            id: crypto.randomUUID(), date, category: category!, description, amount: expenseAmount,
            paymentMethod: "cash", notes: "Imported from cash-flow workbook", createdAt,
          });
        }
      });

      if (errors.length > 0) {
        throw new Error(`${errors.slice(0, 4).join(" · ")}${errors.length > 4 ? ` · ${errors.length - 4} more error(s)` : ""}`);
      }

      const existingExpenseKeys = new Set(expenses.map(expenseKey));
      const uniqueExpenses = importedExpenses.filter(expense => {
        const key = expenseKey(expense);
        if (existingExpenseKeys.has(key)) return false;
        existingExpenseKeys.add(key);
        return true;
      });
      const existingIncomeKeys = new Set(manualIncome.map(incomeKey));
      const uniqueIncome = importedIncome.filter(income => {
        const key = incomeKey(income);
        if (existingIncomeKeys.has(key)) return false;
        existingIncomeKeys.add(key);
        return true;
      });
      const skipped = (importedExpenses.length - uniqueExpenses.length) + (importedIncome.length - uniqueIncome.length);
      if (uniqueExpenses.length === 0 && uniqueIncome.length === 0) {
        setFileMessage({ type: "error", text: skipped ? `No rows imported. ${skipped} duplicate row(s) were skipped.` : "No valid rows were found." });
        return;
      }

      const mergedExpenses = [...expenses, ...uniqueExpenses];
      const mergedIncome = [...manualIncome, ...uniqueIncome];
      saveExpenses(mergedExpenses);
      saveManualCashIncome(mergedIncome);
      setExpenses(mergedExpenses);
      setManualIncome(mergedIncome);
      setFileMessage({
        type: "success",
        text: `Imported ${uniqueIncome.length} income and ${uniqueExpenses.length} expense entr${uniqueIncome.length + uniqueExpenses.length === 1 ? "y" : "ies"}${skipped ? `; skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}` : ""}.`,
      });
    } catch (error) {
      setFileMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to import this file." });
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  async function exportExcel() {
    setFileMessage(null);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      const summaryRows = [
        ["Cash Flow Report"],
        ["Period", rangeStart === filterEnd ? rangeStart : `${rangeStart} to ${filterEnd}`],
        ["Total Income (PKR)", periodIncome],
        ["Total Expenses (PKR)", totalExpense],
        ["Net Cash Flow (PKR)", netCashFlow],
        ["Exported At", new Date().toISOString()],
      ];
      const incomeRows = periodIncomeRows.map(row => ({
        Date: row.date,
        Client: row.client,
        Description: row.description,
        Source: row.source === "pos" ? "POS Sale" : row.source === "manual" ? "Imported Income" : "Appointment",
        "Payment Method": PAYMENT_LABELS[row.paymentMethod] ?? row.paymentMethod,
        "Amount (PKR)": row.amount,
      }));
      const expenseRows = periodExpenses.map(expense => ({
        Date: expense.date,
        Category: EXPENSE_CATEGORIES.find(category => category.key === expense.category)?.label ?? expense.category,
        Description: expense.description,
        "Amount (PKR)": expense.amount,
        "Payment Method": PAYMENT_LABELS[expense.paymentMethod] ?? expense.paymentMethod,
        Notes: expense.notes ?? "",
      }));
      const cashFlowRows = [
        ...periodIncomeRows.map(row => ({
          Date: row.date,
          Category: row.client,
          "Service Description": row.description,
          "Income Intake Amount": row.amount,
          "Expense Amount": 0,
        })),
        ...periodExpenses.map(expense => ({
          Date: expense.date,
          Category: EXPENSE_CATEGORIES.find(category => category.key === expense.category)?.label ?? expense.category,
          "Service Description": expense.description,
          "Income Intake Amount": 0,
          "Expense Amount": expense.amount,
        })),
      ].sort((a, b) => a.Date.localeCompare(b.Date));
      const cashFlowSheet = XLSX.utils.json_to_sheet(cashFlowRows, {
        header: ["Date", "Category", "Service Description", "Income Intake Amount", "Expense Amount", "Closing"],
      });
      cashFlowRows.forEach((_, index) => {
        const row = index + 2;
        cashFlowSheet[`F${row}`] = { t: "n", f: `D${row}-E${row}` };
      });
      cashFlowSheet["!cols"] = [{ wch: 13 }, { wch: 24 }, { wch: 36 }, { wch: 22 }, { wch: 18 }, { wch: 16 }];

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");
      XLSX.utils.book_append_sheet(workbook, cashFlowSheet, "Cash Flow");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(incomeRows), "Income");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expenseRows), "Expenses");
      XLSX.writeFile(workbook, `salon-central-cash-flow-${rangeStart || "report"}-${filterEnd || "report"}.xlsx`);
      setFileMessage({ type: "success", text: "Excel report exported successfully." });
    } catch {
      setFileMessage({ type: "error", text: "Unable to export the Excel report." });
    }
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
    .income-total td{font-weight:700;background:#F5F3FF;color:#7C3AED;border-top:1px solid #f0f0f8}
    .src-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700}
    .footer{margin-top:36px;padding-top:20px;border-top:1px solid #f0f0f8;display:flex;justify-content:space-between}
    .footer-txt{font-size:11px;color:#c0c0d0}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{padding:24px 32px}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <img src="/salon-central-logo.png" alt="Salon Central" class="logo-img"/>
      <div style="font-size:12px;color:#a0a0b8;margin-top:6px">Salon Management Platform</div>
    </div>
    <div class="report-meta">
      <div class="report-title">Cash Flow Report — ${period === "custom" ? "Custom Range" : cfg.label}</div>
      <div class="report-sub">${rangeStart} to ${filterEnd}</div>
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

  ${periodIncomeRows.length > 0 ? `
  <div class="section">
    <div class="section-title">Income Log</div>
    <div class="section-sub">All income entries for this period</div>
    <table>
      <thead><tr><th>Date</th><th>Client</th><th>Description</th><th>Source</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        ${periodIncomeRows.map(row => `
        <tr>
          <td>${row.date}</td>
          <td style="font-weight:600">${row.client}</td>
          <td style="color:#6b6b8a">${row.description}</td>
          <td><span class="src-badge" style="background:${row.source === "pos" ? "#fffbeb" : "#F5F3FF"};color:${row.source === "pos" ? "#d97706" : "#7C3AED"}">${row.source === "pos" ? "POS Sale" : row.source === "manual" ? "Imported Income" : "Appointment"}</span></td>
          <td style="text-align:right;font-weight:700;color:#7C3AED">${fmt(row.amount)}</td>
        </tr>`).join("")}
        <tr class="income-total">
          <td colspan="4"><strong>Total Income</strong></td>
          <td style="text-align:right"><strong>${fmt(periodIncome)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>` : ""}

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

  // Input style shorthand
  const inputSt: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e8e8f0", fontSize: 13, color: "#1a1a2e", background: "#fafafa", outline: "none", boxSizing: "border-box" };
  const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#a0a0b8", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 };

  return (
    <div className="dashboard-polish" style={{ background: "#f8f8fc", minHeight: "100vh" }}>
      <DashboardHeader title="Cash Flow" subtitle="Daily expense & income tracking" />
      <MobilePageHeader title="Cash Flow" subtitle={cfg.label} action={{ label: "Add Expense", onClick: openAdd }} />

      <div className="dash-page desktop-only" style={{ background: "#f8f8fc" }}>

        {/* ── Header row ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", margin: 0 }}>Cash Flow</h1>
            <p style={{ fontSize: 12, color: "#a0a0b8", margin: "2px 0 0" }}>{rangeStart === filterEnd ? rangeStart : `${rangeStart} → ${filterEnd}`}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Period tabs */}
            <div style={{ display: "flex", background: "#fff", border: "1px solid #e8e8f0", borderRadius: 9, padding: 3, gap: 1 }}>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                  padding: "6px 13px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: period === p.key ? 700 : 500,
                  background: period === p.key ? "linear-gradient(135deg,#5B21B6,#9333EA)" : "transparent",
                  color: period === p.key ? "#fff" : "#6b6b8a", transition: "all 0.15s",
                }}>{p.label}</button>
              ))}
            </div>
            {/* Custom date range */}
            {period === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1.5px solid #7C3AED", borderRadius: 9, padding: "6px 12px", background: "#faf5ff" }}>
                <input type="date" value={customStart} max={customEnd || today} onChange={e => setCustomStart(e.target.value)}
                  style={{ border: "none", background: "transparent", fontSize: 12, color: "#1a1a2e", outline: "none", cursor: "pointer" }} />
                <span style={{ color: "#7C3AED", fontWeight: 700, fontSize: 12 }}>→</span>
                <input type="date" value={customEnd} min={customStart} max={today} onChange={e => setCustomEnd(e.target.value)}
                  style={{ border: "none", background: "transparent", fontSize: 12, color: "#1a1a2e", outline: "none", cursor: "pointer" }} />
              </div>
            )}
            <button onClick={exportPDF} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1px solid #e8e8f0", background: "#fff", color: "#6b6b8a", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Download size={13} /> PDF
            </button>
            <button onClick={exportExcel} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1px solid #e8e8f0", background: "#fff", color: "#059669", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <FileSpreadsheet size={13} /> Excel
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) void importCashFlow(file);
              }}
              style={{ display: "none" }}
            />
            <button onClick={() => importInputRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1px solid #e8e8f0", background: "#fff", color: "#7C3AED", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Upload size={13} /> Import
            </button>
            <a href="/templates/cash-flow-import-template.xlsx" download style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1px solid #e8e8f0", background: "#fff", color: "#6b6b8a", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
              <Download size={13} /> Template
            </a>
            <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#5B21B6,#9333EA)", color: "#fff", fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px rgba(91,33,182,0.28)" }}>
              <Plus size={14} /> Add Expense
            </button>
          </div>
        </div>

        {fileMessage && (
          <div style={{
            marginBottom: 14,
            padding: "10px 14px",
            borderRadius: 9,
            border: `1px solid ${fileMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`,
            background: fileMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: fileMessage.type === "success" ? "#047857" : "#b91c1c",
            fontSize: 12,
            fontWeight: 600,
          }}>
            {fileMessage.text}
          </div>
        )}

        {/* ── Summary strip ───────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Income",    value: fmt(periodIncome),  color: "#7C3AED", sub: "Appointments & POS",          icon: TrendingUp  },
            { label: "Expenses",  value: fmt(totalExpense),  color: "#ef4444", sub: `${periodExpenses.length} entries logged`, icon: TrendingDown },
            { label: "Net Flow",  value: (netCashFlow < 0 ? "−" : "+") + fmt(Math.abs(netCashFlow)), color: netCashFlow >= 0 ? "#059669" : "#ef4444", sub: netCashFlow >= 0 ? "Surplus" : "Deficit", icon: Wallet },
          ].map(({ label, value, color, sub, icon: Icon }) => (
            <div key={label} style={{ background: "#fff", borderRadius: 12, border: "1px solid #ebebf0", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "12", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#a0a0b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: "#b0b0c8", marginTop: 2 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Chart (compact) ─────────────────────────────────────────── */}
        {chartData.length > 1 && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #ebebf0", padding: "14px 18px 10px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6b6b8a" }}>Income vs Expenses</span>
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b6b8a" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#7C3AED", display: "inline-block" }} /> Income
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#6b6b8a" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#ef4444", display: "inline-block" }} /> Expenses
                </span>
              </div>
            </div>
            <div style={{ position: "relative", height: 120 }}>
              {[0, 50, 100].map(pct => (
                <div key={pct} style={{ position: "absolute", bottom: `${pct}%`, left: 0, right: 0, height: 1, background: "#f4f4f8" }} />
              ))}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: chartData.length > 20 ? 2 : 4 }}>
                {chartData.map((bar, i) => {
                  const ih = maxChart > 0 ? (bar.income / maxChart) * 100 : 0;
                  const eh = maxChart > 0 ? (bar.expense / maxChart) * 100 : 0;
                  const hov = hoveredBar === i;
                  return (
                    <div key={i} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", gap: 1, position: "relative" }}
                      onMouseEnter={() => setHoveredBar(i)} onMouseLeave={() => setHoveredBar(null)}>
                      {hov && (bar.income > 0 || bar.expense > 0) && (
                        <div style={{ position: "absolute", bottom: `${Math.max(ih, eh) + 6}%`, left: "50%", transform: "translateX(-50%)", background: "#1a1a2e", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 9px", borderRadius: 7, whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none" }}>
                          <div style={{ color: "#a78bfa" }}>In: {fmt(bar.income)}</div>
                          <div style={{ color: "#fca5a5" }}>Ex: {fmt(bar.expense)}</div>
                        </div>
                      )}
                      <div style={{ flex: 1, height: `${Math.max(ih, 0.5)}%`, background: "#7C3AED", borderRadius: "3px 3px 0 0", opacity: hov ? 1 : 0.75 }} />
                      <div style={{ flex: 1, height: `${Math.max(eh, 0.5)}%`, background: "#ef4444", borderRadius: "3px 3px 0 0", opacity: hov ? 1 : 0.75 }} />
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: chartData.length > 20 ? 2 : 4, paddingTop: 5 }}>
              {chartData.map((bar, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 9, color: "#c8c8d8", overflow: "hidden" }}>{bar.label}</div>
              ))}
            </div>
          </div>
        )}

        {/* ── Add / Edit form (slide-in) ───────────────────────────────── */}
        {showForm && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #7C3AED", padding: "18px 20px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{editId ? "Edit Expense" : "New Expense"}</span>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#b0b0c8" }}><X size={16} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
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
                <label style={labelSt}>Payment</label>
                <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} style={inputSt}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Amount (PKR)</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" min={0} style={inputSt} />
              </div>
              <div style={{ gridColumn: "1 / 4" }}>
                <label style={labelSt}>Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Shampoo & conditioner restock" style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" style={inputSt} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #e8e8f0", background: "#fff", fontSize: 12, color: "#6b6b8a", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#5B21B6,#9333EA)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                <Check size={13} /> {editId ? "Save Changes" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* ── Income + Expense tables side by side ────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

          {/* Income table */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #ebebf0", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <TrendingUp size={13} color="#7C3AED" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
                  Income
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#a0a0b8", marginLeft: 8 }}>{periodIncomeRows.length} entries · {fmt(periodIncome)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px", padding: "6px 18px", background: "#fafafa", borderBottom: "1px solid #f0f0f8" }}>
              {["DATE", "CLIENT / SERVICE", "AMOUNT"].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#c0c0d0", letterSpacing: "0.07em", textAlign: i === 2 ? "right" : "left" }}>{h}</div>
              ))}
            </div>

            {periodIncomeRows.length === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>💜</div>
                <div style={{ fontSize: 12, color: "#a0a0b8" }}>No income this period</div>
              </div>
            ) : periodIncomeRows.map((row, i) => (
              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px", padding: "9px 18px", borderBottom: i === periodIncomeRows.length - 1 ? "none" : "1px solid #f8f8fc", alignItems: "center" }}>
                <div style={{ fontSize: 11, color: "#9999b0" }}>{row.date}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: row.source === "pos" ? "#fffbeb" : "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {row.source === "pos"
                        ? <ShoppingBag size={10} color="#d97706" />
                        : row.source === "manual"
                          ? <Upload size={10} color="#7C3AED" />
                          : <CalendarCheck size={10} color="#7C3AED" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{row.client}</div>
                      <div style={{ fontSize: 11, color: "#b0b0c8" }} title={row.description}>
                        {row.description.length > 28 ? row.description.slice(0, 28) + "…" : row.description}
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED", textAlign: "right" }}>{fmt(row.amount)}</div>
              </div>
            ))}

            {periodIncomeRows.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px", padding: "8px 18px", background: "#fafafa", borderTop: "1px solid #f0f0f8" }}>
                <div style={{ gridColumn: "1 / 3", fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>Total</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#7C3AED", textAlign: "right" }}>{fmt(periodIncome)}</div>
              </div>
            )}
          </div>

          {/* Expense table */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #ebebf0", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TrendingDown size={13} color="#ef4444" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
                  Expenses
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#a0a0b8", marginLeft: 8 }}>{periodExpenses.length} entries · {fmt(totalExpense)}</span>
                </div>
              </div>
              {!showForm && (
                <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 7, border: "1.5px solid #ef4444", background: "transparent", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  <Plus size={11} /> Add
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "80px 110px 1fr 80px 32px 32px", padding: "6px 18px", background: "#fafafa", borderBottom: "1px solid #f0f0f8" }}>
              {["DATE", "CATEGORY", "DESCRIPTION", "AMOUNT", "", ""].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#c0c0d0", letterSpacing: "0.07em" }}>{h}</div>
              ))}
            </div>

            {periodExpenses.length === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>💸</div>
                <div style={{ fontSize: 12, color: "#a0a0b8" }}>No expenses logged</div>
                <div style={{ fontSize: 11, color: "#c0c0d0", marginTop: 3 }}>Click &ldquo;Add&rdquo; to start tracking.</div>
              </div>
            ) : periodExpenses.map((exp, i) => {
              const cat = EXPENSE_CATEGORIES.find(c => c.key === exp.category);
              const payColor = PAYMENT_COLORS[exp.paymentMethod];
              return (
                <div key={exp.id} style={{ display: "grid", gridTemplateColumns: "80px 110px 1fr 80px 32px 32px", padding: "9px 18px", borderBottom: i === periodExpenses.length - 1 ? "none" : "1px solid #f8f8fc", alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: "#9999b0" }}>{exp.date}</div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: cat?.color ?? "#888", background: `${cat?.color ?? "#888"}15`, padding: "2px 6px", borderRadius: 20 }}>{cat?.label ?? exp.category}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a2e" }}>{exp.description}</div>
                    {exp.notes && <div style={{ fontSize: 10, color: "#b0b0c8" }}>{exp.notes}</div>}
                    {exp.paymentMethod && <div style={{ fontSize: 10, color: payColor ?? "#9999b0" }}>{PAYMENT_LABELS[exp.paymentMethod] ?? exp.paymentMethod}</div>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{fmt(exp.amount)}</div>
                  <button onClick={() => openEdit(exp)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d0d0e0", padding: 3, display: "flex", alignItems: "center" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#7C3AED")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#d0d0e0")}>
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(exp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d0d0e0", padding: 3, display: "flex", alignItems: "center" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#d0d0e0")}>
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}

            {periodExpenses.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "80px 110px 1fr 80px 32px 32px", padding: "8px 18px", background: "#fafafa", borderTop: "1px solid #f0f0f8" }}>
                <div style={{ gridColumn: "1 / 4", fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>Total</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#ef4444" }}>{fmt(totalExpense)}</div>
                <div /><div />
              </div>
            )}
          </div>

        </div>{/* /2-col grid */}

      </div>{/* /desktop-only */}
    </div>
  );
}
