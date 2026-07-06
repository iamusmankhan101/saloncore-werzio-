import { APPOINTMENTS as mockAppointments, CLIENTS as mockClients, STAFF as mockStaff, SERVICES as mockServices, INVENTORY as mockInventory } from "./mock-data";
import type { Appointment, Client, Staff, Service, InventoryItem } from "./types";
import { saveToDB } from "./turso-sync";
import { userKey } from "./auth";
import { getActiveLocationFilter, locationUserKey } from "./locations";

const SCHEMA_VERSION = "v6";

// All keys are scoped per user so different salon accounts never share data
const K = {
  appointments:  "werzio_appointments",
  clients:       "werzio_clients",
  staff:         "werzio_staff",
  services:      "werzio_services",
  inventory:     "werzio_inventory",
  schemaVersion: "werzio_schema_version",
};

function checkSchema() {
  if (typeof window === "undefined") return;
  const vk = locationUserKey(K.schemaVersion);
  const ver = localStorage.getItem(vk);
  if (ver !== SCHEMA_VERSION) {
    // Only the legacy Main Branch needs the old schema reset behavior.
    // New branches start with clean, empty stores.
    if (getActiveLocationFilter() === "main") {
      localStorage.removeItem(userKey(K.appointments));
      localStorage.removeItem(userKey(K.clients));
      localStorage.removeItem(userKey(K.staff));
      localStorage.removeItem(userKey(K.services));
      localStorage.removeItem(userKey(K.inventory));
    }
    localStorage.setItem(vk, SCHEMA_VERSION);
  }
}

function initialData<T>(mock: T[]): T[] {
  return getActiveLocationFilter() === "main" ? mock : [];
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

export function getStoredAppointments(): Appointment[] {
  if (typeof window === "undefined") return mockAppointments;
  checkSchema();
  const key = locationUserKey(K.appointments);
  const saved = localStorage.getItem(key);
  if (!saved) {
    const initial = initialData(mockAppointments);
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(saved);
}

export function saveAppointments(appts: Appointment[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem(locationUserKey(K.appointments), JSON.stringify(appts));
    saveToDB("appointments", appts);
  }
}

export function getStoredClients(): Client[] {
  if (typeof window === "undefined") return mockClients;
  checkSchema();
  const key = locationUserKey(K.clients);
  const saved = localStorage.getItem(key);
  if (!saved) {
    const initial = normalizeClients(initialData(mockClients));
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  const parsed = JSON.parse(saved) as Client[];
  const normalized = normalizeClients(parsed);
  if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
    localStorage.setItem(key, JSON.stringify(normalized));
  }
  return normalized;
}

export function saveClients(clients: Client[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    const normalized = normalizeClients(clients);
    localStorage.setItem(locationUserKey(K.clients), JSON.stringify(normalized));
    saveToDB("clients", normalized);
  }
}

export function getStoredStaff(): Staff[] {
  if (typeof window === "undefined") return mockStaff;
  checkSchema();
  const key = locationUserKey(K.staff);
  const saved = localStorage.getItem(key);
  if (!saved) {
    const initial = initialData(mockStaff);
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(saved);
}

export function saveStaff(staffList: Staff[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem(locationUserKey(K.staff), JSON.stringify(staffList));
    saveToDB("staff", staffList);
  }
}

export function getStoredServices(): Service[] {
  if (typeof window === "undefined") return mockServices;
  checkSchema();
  const key = locationUserKey(K.services);
  const saved = localStorage.getItem(key);
  if (!saved) {
    const initial = initialData(mockServices);
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(saved);
}

export function saveServices(servicesList: Service[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem(locationUserKey(K.services), JSON.stringify(servicesList));
    saveToDB("services", servicesList);
  }
}

export function getStoredInventory(): InventoryItem[] {
  if (typeof window === "undefined") return mockInventory;
  checkSchema();
  const key = locationUserKey(K.inventory);
  const saved = localStorage.getItem(key);
  if (!saved) {
    const initial = initialData(mockInventory);
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(saved);
}

export function saveInventory(items: InventoryItem[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem(locationUserKey(K.inventory), JSON.stringify(items));
    saveToDB("inventory", items);
  }
}
