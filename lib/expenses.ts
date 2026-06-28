export type ExpenseCategory =
  | "rent"
  | "salaries"
  | "utilities"
  | "supplies"
  | "equipment"
  | "marketing"
  | "food"
  | "miscellaneous";

export interface Expense {
  id: string;
  date: string;        // YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;   // ISO timestamp
}

const KEY = "werzio_expenses";

export function getExpenses(): Expense[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}

export function saveExpenses(list: Expense[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addExpense(data: Omit<Expense, "id" | "createdAt">): Expense {
  const entry: Expense = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  const list = getExpenses();
  list.push(entry);
  saveExpenses(list);
  return entry;
}

export function deleteExpense(id: string): void {
  saveExpenses(getExpenses().filter(e => e.id !== id));
}

export function updateExpense(id: string, patch: Partial<Omit<Expense, "id" | "createdAt">>): void {
  saveExpenses(getExpenses().map(e => e.id === id ? { ...e, ...patch } : e));
}
