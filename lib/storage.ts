import { APPOINTMENTS as mockAppointments, CLIENTS as mockClients, STAFF as mockStaff, SERVICES as mockServices, INVENTORY as mockInventory } from "./mock-data";
import type { Appointment, Client, Staff, Service, InventoryItem } from "./types";
import { saveToDB } from "./turso-sync";
import { userKey } from "./auth";

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
  const vk = userKey(K.schemaVersion);
  const ver = localStorage.getItem(vk);
  if (ver !== SCHEMA_VERSION) {
    localStorage.removeItem(userKey(K.appointments));
    localStorage.removeItem(userKey(K.clients));
    localStorage.removeItem(userKey(K.staff));
    localStorage.removeItem(userKey(K.services));
    localStorage.removeItem(userKey(K.inventory));
    localStorage.setItem(vk, SCHEMA_VERSION);
  }
}

export function getStoredAppointments(): Appointment[] {
  if (typeof window === "undefined") return mockAppointments;
  checkSchema();
  const saved = localStorage.getItem(userKey(K.appointments));
  if (!saved) {
    localStorage.setItem(userKey(K.appointments), JSON.stringify(mockAppointments));
    return mockAppointments;
  }
  return JSON.parse(saved);
}

export function saveAppointments(appts: Appointment[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem(userKey(K.appointments), JSON.stringify(appts));
    saveToDB("appointments", appts);
  }
}

export function getStoredClients(): Client[] {
  if (typeof window === "undefined") return mockClients;
  checkSchema();
  const saved = localStorage.getItem(userKey(K.clients));
  if (!saved) {
    localStorage.setItem(userKey(K.clients), JSON.stringify(mockClients));
    return mockClients;
  }
  return JSON.parse(saved);
}

export function saveClients(clients: Client[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem(userKey(K.clients), JSON.stringify(clients));
    saveToDB("clients", clients);
  }
}

export function getStoredStaff(): Staff[] {
  if (typeof window === "undefined") return mockStaff;
  checkSchema();
  const saved = localStorage.getItem(userKey(K.staff));
  if (!saved) {
    localStorage.setItem(userKey(K.staff), JSON.stringify(mockStaff));
    return mockStaff;
  }
  return JSON.parse(saved);
}

export function saveStaff(staffList: Staff[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem(userKey(K.staff), JSON.stringify(staffList));
    saveToDB("staff", staffList);
  }
}

export function getStoredServices(): Service[] {
  if (typeof window === "undefined") return mockServices;
  checkSchema();
  const saved = localStorage.getItem(userKey(K.services));
  if (!saved) {
    localStorage.setItem(userKey(K.services), JSON.stringify(mockServices));
    return mockServices;
  }
  return JSON.parse(saved);
}

export function saveServices(servicesList: Service[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem(userKey(K.services), JSON.stringify(servicesList));
    saveToDB("services", servicesList);
  }
}

export function getStoredInventory(): InventoryItem[] {
  if (typeof window === "undefined") return mockInventory;
  checkSchema();
  const saved = localStorage.getItem(userKey(K.inventory));
  if (!saved) {
    localStorage.setItem(userKey(K.inventory), JSON.stringify(mockInventory));
    return mockInventory;
  }
  return JSON.parse(saved);
}

export function saveInventory(items: InventoryItem[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem(userKey(K.inventory), JSON.stringify(items));
    saveToDB("inventory", items);
  }
}