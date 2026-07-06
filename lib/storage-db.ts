/**
 * lib/storage-db.ts
 * Drop-in replacement for storage.ts that uses database instead of localStorage
 * Same API, but stores data in database
 */

import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import type { Appointment, Client, Staff, Service, InventoryItem } from "@/lib/types";

// ─── Helper to fetch from database ────────────────────────────────────────────

async function fetchFromDB<T>(resource: string): Promise<T[]> {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    const res = await fetch(`/api/data/${resource}?userId=${user.id}`);
    const data = await res.json();
    return data.ok ? data.data : [];
  } catch (err) {
    console.error(`[storage-db] Failed to fetch ${resource}:`, err);
    return [];
  }
}

async function saveToDB<T>(resource: string, records: T[]): Promise<void> {
  const user = getCurrentUser();
  if (!user) return;

  try {
    // Delete all existing records
    const existing = await fetchFromDB<any>(resource);
    for (const record of existing) {
      await fetch(`/api/data/${resource}?id=${record.id}&userId=${user.id}`, {
        method: "DELETE",
      });
    }

    // Insert new records
    for (const record of records) {
      await fetch(`/api/data/${resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...record, user_id: user.id }),
      });
    }
  } catch (err) {
    console.error(`[storage-db] Failed to save ${resource}:`, err);
  }
}

function normalizeClientPhone(raw?: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("3")) return `92${digits}`;
  return digits;
}

function normalizeClients(clients: Client[]): Client[] {
  return clients.map((client) => ({ ...client, phone: normalizeClientPhone(client.phone) }));
}

// ─── Appointments ──────────────────────────────────────────────────────────────

export function getStoredAppointments(): Appointment[] {
  // Return empty array synchronously, will be populated by useEffect
  return [];
}

export async function getStoredAppointmentsAsync(): Promise<Appointment[]> {
  return fetchFromDB<Appointment>("appointments");
}

export function saveAppointments(appointments: Appointment[]): void {
  saveToDB("appointments", appointments);
}

// ─── Clients ───────────────────────────────────────────────────────────────────

export function getStoredClients(): Client[] {
  return [];
}

export async function getStoredClientsAsync(): Promise<Client[]> {
  return fetchFromDB<Client>("clients");
}

export function saveClients(clients: Client[]): void {
  saveToDB("clients", normalizeClients(clients));
}

// ─── Staff ─────────────────────────────────────────────────────────────────────

export function getStoredStaff(): Staff[] {
  return [];
}

export async function getStoredStaffAsync(): Promise<Staff[]> {
  return fetchFromDB<Staff>("staff");
}

export function saveStaff(staff: Staff[]): void {
  saveToDB("staff", staff);
}

// ─── Services ──────────────────────────────────────────────────────────────────

export function getStoredServices(): Service[] {
  return [];
}

export async function getStoredServicesAsync(): Promise<Service[]> {
  return fetchFromDB<Service>("services");
}

export function saveServices(services: Service[]): void {
  saveToDB("services", services);
}

// ─── Products/Inventory ────────────────────────────────────────────────────────

export function getStoredInventory(): InventoryItem[] {
  return [];
}

export async function getStoredInventoryAsync(): Promise<InventoryItem[]> {
  return fetchFromDB<InventoryItem>("products");
}

export function saveInventory(products: InventoryItem[]): void {
  saveToDB("products", products);
}

// ─── Hook for easy data loading ────────────────────────────────────────────────

export function useDBData() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStoredAppointmentsAsync(),
      getStoredClientsAsync(),
      getStoredStaffAsync(),
      getStoredServicesAsync(),
      getStoredInventoryAsync(),
    ]).then(([a, c, s, sv, p]) => {
      setAppointments(a);
      setClients(c);
      setStaff(s);
      setServices(sv);
      setProducts(p);
      setLoading(false);
    });
  }, []);

  return { appointments, clients, staff, services, products, loading };
}
