import { APPOINTMENTS as mockAppointments, CLIENTS as mockClients, STAFF as mockStaff, SERVICES as mockServices, INVENTORY as mockInventory } from "./mock-data";
import type { Appointment, Client, Staff, Service, InventoryItem } from "./types";
import { saveToDB } from "./turso-sync";

const SCHEMA_VERSION = "v6";

function checkSchema() {
  if (typeof window === "undefined") return;
  const ver = localStorage.getItem("glowbook_schema_version");
  if (ver !== SCHEMA_VERSION) {
    localStorage.removeItem("glowbook_appointments");
    localStorage.removeItem("glowbook_clients");
    localStorage.removeItem("glowbook_staff");
    localStorage.removeItem("glowbook_services");
    localStorage.removeItem("glowbook_inventory");
    localStorage.setItem("glowbook_schema_version", SCHEMA_VERSION);
  }
}

export function getStoredAppointments(): Appointment[] {
  if (typeof window === "undefined") return mockAppointments;
  checkSchema();
  const saved = localStorage.getItem("glowbook_appointments");
  if (!saved) {
    localStorage.setItem("glowbook_appointments", JSON.stringify(mockAppointments));
    return mockAppointments;
  }
  return JSON.parse(saved);
}

export function saveAppointments(appts: Appointment[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem("glowbook_appointments", JSON.stringify(appts));
    saveToDB("appointments", appts);
  }
}

export function getStoredClients(): Client[] {
  if (typeof window === "undefined") return mockClients;
  checkSchema();
  const saved = localStorage.getItem("glowbook_clients");
  if (!saved) {
    localStorage.setItem("glowbook_clients", JSON.stringify(mockClients));
    return mockClients;
  }
  return JSON.parse(saved);
}

export function saveClients(clients: Client[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem("glowbook_clients", JSON.stringify(clients));
    saveToDB("clients", clients);
  }
}

export function getStoredStaff(): Staff[] {
  if (typeof window === "undefined") return mockStaff;
  checkSchema();
  const saved = localStorage.getItem("glowbook_staff");
  if (!saved) {
    localStorage.setItem("glowbook_staff", JSON.stringify(mockStaff));
    return mockStaff;
  }
  return JSON.parse(saved);
}

export function saveStaff(staffList: Staff[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem("glowbook_staff", JSON.stringify(staffList));
    saveToDB("staff", staffList);
  }
}

export function getStoredServices(): Service[] {
  if (typeof window === "undefined") return mockServices;
  checkSchema();
  const saved = localStorage.getItem("glowbook_services");
  if (!saved) {
    localStorage.setItem("glowbook_services", JSON.stringify(mockServices));
    return mockServices;
  }
  return JSON.parse(saved);
}

export function saveServices(servicesList: Service[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem("glowbook_services", JSON.stringify(servicesList));
    saveToDB("services", servicesList);
  }
}

export function getStoredInventory(): InventoryItem[] {
  if (typeof window === "undefined") return mockInventory;
  checkSchema();
  const saved = localStorage.getItem("glowbook_inventory");
  if (!saved) {
    localStorage.setItem("glowbook_inventory", JSON.stringify(mockInventory));
    return mockInventory;
  }
  return JSON.parse(saved);
}

export function saveInventory(items: InventoryItem[]) {
  if (typeof window !== "undefined") {
    checkSchema();
    localStorage.setItem("glowbook_inventory", JSON.stringify(items));
    saveToDB("inventory", items);
  }
}