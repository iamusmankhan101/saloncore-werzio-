/**
 * lib/data-api.ts
 * Client-side data access layer using database API
 * Replaces localStorage with database storage
 */

import { getCurrentUser } from "@/lib/auth";

// ─── Generic CRUD operations ──────────────────────────────────────────────────

export async function fetchAll<T>(resource: string): Promise<T[]> {
  const user = getCurrentUser();
  if (!user) throw new Error("User not authenticated");

  const res = await fetch(`/api/data/${resource}?userId=${user.id}`);
  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.error || `Failed to fetch ${resource}`);
  }

  return data.data as T[];
}

export async function createRecord<T>(resource: string, record: Partial<T>): Promise<T> {
  const user = getCurrentUser();
  if (!user) throw new Error("User not authenticated");

  const res = await fetch(`/api/data/${resource}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...record, user_id: user.id }),
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.error || `Failed to create ${resource}`);
  }

  return data.data as T;
}

export async function updateRecord<T>(resource: string, record: T & { id: string }): Promise<T> {
  const user = getCurrentUser();
  if (!user) throw new Error("User not authenticated");

  const res = await fetch(`/api/data/${resource}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...record, user_id: user.id }),
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.error || `Failed to update ${resource}`);
  }

  return data.data as T;
}

export async function deleteRecord(resource: string, id: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) throw new Error("User not authenticated");

  const res = await fetch(`/api/data/${resource}?id=${id}&userId=${user.id}`, {
    method: "DELETE",
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.error || `Failed to delete ${resource}`);
  }
}

// ─── Type-safe wrappers for each resource ─────────────────────────────────────

export interface Appointment {
  id: string;
  user_id: string;
  client_id: string;
  staff_id?: string;
  service_id?: string;
  date: string;
  time: string;
  duration: number;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  notes?: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  total_visits: number;
  total_spent: number;
  last_visit?: string;
  created_at: string;
}

export interface Staff {
  id: string;
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  role: string;
  specialties?: string;
  active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  user_id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  description?: string;
  active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  category: string;
  brand?: string;
  sku?: string;
  quantity: number;
  low_stock_alert: number;
  cost_price: number;
  selling_price: number;
  supplier?: string;
  notes?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id?: string;
  invoice_number: string;
  date: string;
  due_date: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: "paid" | "unpaid" | "overdue";
  items: string; // JSON string
  notes?: string;
  created_at: string;
}

// ─── Resource-specific functions ──────────────────────────────────────────────

export const appointments = {
  getAll: () => fetchAll<Appointment>("appointments"),
  create: (data: Partial<Appointment>) => createRecord<Appointment>("appointments", data),
  update: (data: Appointment) => updateRecord<Appointment>("appointments", data),
  delete: (id: string) => deleteRecord("appointments", id),
};

export const clients = {
  getAll: () => fetchAll<Client>("clients"),
  create: (data: Partial<Client>) => createRecord<Client>("clients", data),
  update: (data: Client) => updateRecord<Client>("clients", data),
  delete: (id: string) => deleteRecord("clients", id),
};

export const staff = {
  getAll: () => fetchAll<Staff>("staff"),
  create: (data: Partial<Staff>) => createRecord<Staff>("staff", data),
  update: (data: Staff) => updateRecord<Staff>("staff", data),
  delete: (id: string) => deleteRecord("staff", id),
};

export const services = {
  getAll: () => fetchAll<Service>("services"),
  create: (data: Partial<Service>) => createRecord<Service>("services", data),
  update: (data: Service) => updateRecord<Service>("services", data),
  delete: (id: string) => deleteRecord("services", id),
};

export const products = {
  getAll: () => fetchAll<Product>("products"),
  create: (data: Partial<Product>) => createRecord<Product>("products", data),
  update: (data: Product) => updateRecord<Product>("products", data),
  delete: (id: string) => deleteRecord("products", id),
};

export const invoices = {
  getAll: () => fetchAll<Invoice>("invoices"),
  create: (data: Partial<Invoice>) => createRecord<Invoice>("invoices", data),
  update: (data: Invoice) => updateRecord<Invoice>("invoices", data),
  delete: (id: string) => deleteRecord("invoices", id),
};
