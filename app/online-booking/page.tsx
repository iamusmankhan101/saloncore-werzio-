"use client";

import './onlineBooking.css';
import { useState } from "react";
import { Plus, CalendarDays, X, User, Users, Gift, Layers, Award, ChevronRight, ArrowLeft, MessageSquare } from "lucide-react";
import {
  getStoredAppointments,
  saveAppointments,
  getStoredClients,
  saveClients,
  getStoredStaff,
  getStoredServices,
  saveServices,
} from "@/lib/storage";
import type { Appointment, Client, Staff, Service } from "@/lib/types";
import { settingsStore } from "@/lib/settings-store";

interface BusinessHour {
  day: string;
  open: boolean;
  from: string;
  to: string;
}

// Reuse styling from other pages
const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #e8e8f0",
  fontSize: 13,
  color: "#1a1a2e",
  outline: "none",
  background: "#fff",
};

function fmt(n: number) {
  return "PKR " + n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")}${ampm}`;
}

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}`;
}

function getBusinessHoursForDate(date: string) {
  if (!date) return undefined;
  const [y, m, d] = date.split("-").map(Number);
  const dayName = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
  return (settingsStore.hours as BusinessHour[]).find((hour) => hour.day === dayName);
}

export default function OnlineBookingPage() {

  // Load reference data
  const [appointments, setAppointments] = useState<Appointment[]>(
    getStoredAppointments()
  );
  const [clients, setClients] = useState<Client[]>(getStoredClients());
  const [staffList] = useState<Staff[]>(getStoredStaff());
  const [services] = useState<Service[]>(getStoredServices());

  // Form state
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    staffId: "",
    serviceIds: [] as string[],
    date: "",
    startTime: "",
    notes: "",
  });

  const set = (k: keyof typeof form, v: string | string[]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const availableServices = form.staffId
    ? services.filter((s) => s.assignedStaffIds.includes(form.staffId))
    : services;
  const selectedServices = services.filter((s) =>
    form.serviceIds.includes(s.id)
  );
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.durationMin,
    0
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const selectedHours = getBusinessHoursForDate(form.date);
  const selectedDateIsOpen = !form.date || !selectedHours || selectedHours.open;

  const canSubmit =
    form.customerName.trim() !== "" &&
    form.customerPhone.trim() !== "" &&
    form.serviceIds.length > 0 &&
    form.date &&
    selectedDateIsOpen;

  const handleBook = () => {
    if (!canSubmit) return;

    // Find or create client
    const existingClient = clients.find(
      (c) => c.phone.replace(/\D/g, "") === form.customerPhone.replace(/\D/g, "")
    );

    let finalClientId = "";
    const finalClientName = form.customerName;
    let newClientObj: Client | undefined = undefined;

    if (existingClient) {
      finalClientId = existingClient.id;
    } else {
      const newId = createId("c");
      newClientObj = {
        id: newId,
        name: form.customerName,
        phone: form.customerPhone,
        gender: "female",
        tags: ["New"],
        source: "web",
        createdAt: form.date || new Date().toISOString().split("T")[0],
        totalVisits: 1,
        totalSpend: totalPrice,
        lastVisitDate: form.date,
        averageRating: 5.0,
      };
      finalClientId = newId;
    }

    const appt: Appointment = {
      id: createId("a"),
      clientId: finalClientId,
      clientName: finalClientName,
      staffId: "any",
      staffName: "Any Stylist",
      serviceIds: form.serviceIds,
      serviceNames: selectedServices.map((s) => s.name),
      date: form.date,
      startTime: selectedHours?.from || "12:00",
      endTime: addMinutes(selectedHours?.from || "12:00", totalDuration),
      status: "booked",
      totalAmount: totalPrice,
      source: "web",
      notes: form.notes || undefined,
    };

    // Persist
    const updatedAppts = [appt, ...appointments];
    setAppointments(updatedAppts);
    saveAppointments(updatedAppts);

    if (newClientObj) {
      const updatedClients = [newClientObj, ...clients];
      setClients(updatedClients);
      saveClients(updatedClients);
    } else {
      const updatedClients = clients.map((c) =>
        c.id === finalClientId
          ? {
              ...c,
              totalVisits: c.totalVisits + 1,
              totalSpend: c.totalSpend + appt.totalAmount,
              lastVisitDate: appt.date,
            }
          : c
      );
      setClients(updatedClients);
      saveClients(updatedClients);
    }
    // Reset form
    setForm({
      customerName: "",
      customerPhone: "",
      staffId: "",
      serviceIds: [],
      date: "",
      startTime: "",
      notes: "",
    });
    alert("Appointment successfully booked!");
  };

  return (
    <div className="pageWrapper">
      {/* Top Navbar */}
      <header className="topNavbar">
        <div className="brandLogoArea">
          <div className="brandLogoText" suppressHydrationWarning>{settingsStore.salon.name}</div>
          <div className="brandPoweredBy">
            powered by <span className="brandPoweredByName">glowbook</span>
          </div>
        </div>
        <nav className="topNavLinks">
          <a className="topNavLink">About</a>
          <a className="topNavLink">Services</a>
          <a className="topNavLink">Gift Cards</a>
          <a className="topNavLink">Contact</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="heroSection">
        <div className="heroOverlay" />
        <div className="heroCenterContent">
          <h1 className="heroBrandName" suppressHydrationWarning>{settingsStore.salon.name}</h1>
          <h3 className="heroBrandSubtitle">BEAUTY BAR</h3>
        </div>
      </section>

      {/* Booking Form Section */}
      <section className="bookingSection">
        <div className="bookingCard">
              <div className="formHeaderGroup">
                <h2 className="formMainTitle">Single Person Booking</h2>
                <p className="formMainSubtitle">Fill the details below to complete your booking.</p>
              </div>

              {/* CUSTOMER NAME SECTION */}
              <div className="formGroup">
                <label className="formLabel">Customer Name *</label>
                <input
                  type="text"
                  className="cleanInput"
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              {/* PHONE NUMBER SECTION */}
              <div className="formGroup">
                <label className="formLabel">Phone Number *</label>
                <input
                  type="tel"
                  className="cleanInput"
                  value={form.customerPhone}
                  onChange={(e) => set("customerPhone", e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>



              {/* SERVICES CHECKLIST */}
              <div className="formGroup">
                <label className="formLabel">
                  Services{form.serviceIds.length > 0 ? ` (${form.serviceIds.length} selected)` : ""}
                </label>
                <div className="cleanServicesList">
                  {availableServices.length === 0 ? (
                    <div className="cleanEmptyServices">
                      No services available.
                    </div>
                  ) : (
                    availableServices.map((sv) => {
                      const checked = form.serviceIds.includes(sv.id);
                      return (
                        <div
                          key={sv.id}
                          className={`cleanServiceItem ${checked ? 'selected' : ''}`}
                          onClick={() => {
                            setForm((f) => ({
                              ...f,
                              serviceIds: checked
                                ? f.serviceIds.filter((id) => id !== sv.id)
                                : [...f.serviceIds, sv.id],
                            }));
                          }}
                        >
                          <div className="cleanServiceCheckboxGroup">
                            <input
                              type="checkbox"
                              className="cleanServiceCheckbox"
                              checked={checked}
                              readOnly
                            />
                            <div>
                              <div className="cleanServiceName">{sv.name}</div>
                              <div className="cleanServiceDuration">{sv.durationMin} min</div>
                            </div>
                          </div>
                          <span className="cleanServicePrice">{fmt(sv.price)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* DATE */}
              <div className="formGroup">
                <label className="formLabel">Date</label>
	                <input
	                  type="date"
	                  className="cleanInput"
	                  value={form.date}
	                  onChange={(e) => set("date", e.target.value)}
	                />
                  {form.date && selectedHours && !selectedHours.open && (
                    <div style={{ marginTop: 8, color: "#dc2626", fontSize: 12, fontWeight: 700 }}>
                      This salon is closed on {selectedHours.day}. Please choose another date.
                    </div>
                  )}
                  {form.date && selectedHours?.open && (
                    <div style={{ marginTop: 8, color: "#059669", fontSize: 12, fontWeight: 700 }}>
                      Open {selectedHours.from} to {selectedHours.to}.
                    </div>
                  )}
	              </div>

              {/* NOTES */}
              <div className="formGroup">
                <label className="formLabel">Notes (optional)</label>
                <textarea
                  className="cleanTextarea"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any special requests or notes…"
                  rows={3}
                />
              </div>

              {/* SUMMARY */}
              {form.serviceIds.length > 0 && (
                <div className="cleanSummaryCard">
                  <div className="cleanSummaryDuration">{totalDuration} min total</div>
                  <div className="cleanSummaryPrice">{fmt(totalPrice)}</div>
                </div>
              )}

              {/* FORM ACTIONS */}
              <div className="cleanFormActions">
                <button
                  className="cleanBtnCancel"
                  type="button"
                  onClick={() => {
                    setForm({
                      customerName: "",
                      customerPhone: "",
                      staffId: "",
                      serviceIds: [],
                      date: "",
                      startTime: "",
                      notes: "",
                    });
                  }}
                >
                  Cancel
                </button>
                <button
                  className={`cleanBtnSubmit ${canSubmit ? 'active' : 'disabled'}`}
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleBook}
                >
                  Book Appointment
                </button>
              </div>
        </div>
      </section>

      {/* Floating Chat Bubble widget */}
      <div className="floatingChatBubble" onClick={() => alert("Atelier chatbot service loading... Live representative support online.")}>
        <MessageSquare size={22} />
      </div>
    </div>
  );
}
