"use client";

import './onlineBooking.css';
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Clock, Calendar, User, Scissors, ChevronRight, ChevronLeft, MessageSquare, Check } from "lucide-react";
import {
  getStoredAppointments,
  saveAppointments,
  getStoredClients,
  saveClients,
  getStoredStaff,
  getStoredServices,
} from "@/lib/storage";
import type { Appointment, Client, Staff, Service } from "@/lib/types";
import { settingsStore } from "@/lib/settings-store";
import { fmtCurrency as fmt } from "@/lib/format";
import { enqueueWhatsAppConfirmation, normalizePhone } from "@/lib/whatsapp-scheduler";
import { getDefaultLocationId } from "@/lib/locations";

interface BusinessHour {
  day: string;
  open: boolean;
  from: string;
  to: string;
}

const DEFAULT_BUSINESS_HOURS: BusinessHour[] = [
  { day: "Monday",    open: true, from: "09:00", to: "20:00" },
  { day: "Tuesday",   open: true, from: "09:00", to: "20:00" },
  { day: "Wednesday", open: true, from: "09:00", to: "20:00" },
  { day: "Thursday",  open: true, from: "09:00", to: "20:00" },
  { day: "Friday",    open: true, from: "09:00", to: "20:00" },
  { day: "Saturday",  open: true, from: "10:00", to: "18:00" },
  { day: "Sunday",    open: false, from: "10:00", to: "18:00" },
];

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}`;
}


function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function generateTimeSlots(from: string, to: string, durationMin: number): string[] {
  const start = timeToMinutes(from);
  const end   = timeToMinutes(to);
  const slots: string[] = [];
  for (let t = start; t + Math.max(durationMin, 30) <= end; t += 30) {
    slots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return slots;
}

function fmtTime12(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDate(s: string) {
  const [y, mo, d] = s.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function OnlineBookingInner() {
  const searchParams = useSearchParams();
  const salonId = searchParams.get("salon"); // present when accessed by external customers

  const [appointments, setAppointments] = useState<Appointment[]>(() => salonId ? [] : getStoredAppointments());
  const [clients, setClients]           = useState<Client[]>(() => salonId ? [] : getStoredClients());
  const [staffList, setStaffList]       = useState<Staff[]>(() => salonId ? [] : getStoredStaff());
  const [services, setServices]         = useState<Service[]>(() => salonId ? [] : getStoredServices());
  const [remoteSettings, setRemoteSettings] = useState<Record<string, unknown> | null>(null);

  // When accessed with ?salon=xxx, load everything from the DB instead of localStorage
  useEffect(() => {
    if (!salonId) return;
    fetch(`/api/public/salon?salonId=${encodeURIComponent(salonId)}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; services: Service[]; staff: Staff[]; settings: Record<string, unknown>; appointments: Appointment[] }) => {
        if (!data.ok) return;
        setServices(data.services ?? []);
        setStaffList(data.staff ?? []);
        setAppointments(data.appointments ?? []);
        setRemoteSettings(data.settings ?? null);
      })
      .catch(() => {});
  }, [salonId]);

  const [step, setStep]                         = useState<1 | 2 | 3 | "success">(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId]   = useState("");
  const [selectedDate, setSelectedDate]         = useState("");
  const [selectedTime, setSelectedTime]         = useState("");
  const [name, setName]                         = useState("");
  const [phone, setPhone]                       = useState("");
  const [notes, setNotes]                       = useState("");
  const [booking, setBooking]                   = useState(false);

  // Use remote settings (when external customer) or local settingsStore (owner's device)
  const rawHoursSource = salonId
    ? ((remoteSettings?.hours ?? []) as BusinessHour[])
    : (settingsStore.hours as BusinessHour[]);
  const hoursSource = Array.isArray(rawHoursSource) && rawHoursSource.length > 0
    ? rawHoursSource
    : DEFAULT_BUSINESS_HOURS;

  function getHoursForDate(date: string): BusinessHour | undefined {
    if (!date) return undefined;
    const [y, m, d] = date.split("-").map(Number);
    const dayName = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
    return hoursSource.find((h) => h.day === dayName) ?? DEFAULT_BUSINESS_HOURS.find((h) => h.day === dayName);
  }

  const availableServices  = selectedStaffId
    ? services.filter((s) => s.assignedStaffIds.includes(selectedStaffId))
    : services;
  const selectedServices   = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalDuration      = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);
  const totalPrice         = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const selectedHours      = getHoursForDate(selectedDate);
  const dateIsOpen         = !selectedDate || !selectedHours || selectedHours.open;
  const today              = new Date().toISOString().split("T")[0];

  const timeSlots = useMemo(() => {
    if (!selectedDate || !selectedHours?.open || totalDuration <= 0) return [];
    return generateTimeSlots(selectedHours.from, selectedHours.to, totalDuration);
  }, [selectedDate, selectedHours, totalDuration]);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSelectedTime("");
  }

  function handleBook() {
    // Guards against a double-click/double-tap firing this twice before the step
    // changes to "success" on the next render — without this, each call generates
    // its own appointment (createId() has no random component, just Date.now(), so
    // two calls within the same millisecond can even collide on the same id) and
    // independently sends its own confirmation + group alert.
    if (booking) return;
    setBooking(true);

    const normalizedPhone = normalizePhone(phone);
    const existing = clients.find(
      (c) => normalizePhone(c.phone) === normalizedPhone
    );
    let finalClientId = existing ? existing.id : createId("c");
    const newClientObj: Client | undefined = existing ? undefined : {
      id: finalClientId, name, phone: normalizedPhone, gender: "female",
      locationId: getDefaultLocationId(),
      tags: ["New"], source: "web",
      createdAt: selectedDate || new Date().toISOString().split("T")[0],
      totalVisits: 1, totalSpend: totalPrice,
      lastVisitDate: selectedDate, averageRating: 5.0,
    };

    const startTime = selectedTime || selectedHours?.from || "10:00";
    const appt: Appointment = {
      id: createId("a"),
      clientId: finalClientId,
      clientName: name,
      staffId:   selectedStaffId || "any",
      staffName: selectedStaffId
        ? (staffList.find((s) => s.id === selectedStaffId)?.name ?? "Any Stylist")
        : "Any Stylist",
      serviceIds:   selectedServiceIds,
      serviceNames: selectedServices.map((s) => s.name),
      date:         selectedDate,
      startTime,
      endTime:      addMinutes(startTime, totalDuration || 60),
      status:       "booked",
      totalAmount:  totalPrice,
      source:       "web",
      notes:        notes || undefined,
    };

    if (salonId) {
      // External customer — save directly to DB under the salon's userId.
      // Server handles the WhatsApp confirmation to the client.
      fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, appointment: appt, client: newClientObj ?? undefined, clientPhone: normalizedPhone }),
      }).catch(() => {});
    } else {
      // On the salon's own device — use localStorage
      const updatedAppts = [appt, ...appointments];
      setAppointments(updatedAppts);
      saveAppointments(updatedAppts);

      if (newClientObj) {
        const updated = [newClientObj, ...clients];
        setClients(updated); saveClients(updated);
      } else {
        const updated = clients.map((c) =>
          c.id === finalClientId
            ? { ...c, totalVisits: c.totalVisits + 1, totalSpend: c.totalSpend + appt.totalAmount, lastVisitDate: appt.date }
            : c
        );
        setClients(updated); saveClients(updated);
      }

      // Queue confirmation message to client via the scheduler
      enqueueWhatsAppConfirmation(appt.id);
    }

    // Fire the dashboard popup notification (cross-tab via localStorage, same-tab via event)
    const alertPayload = {
      bookingId: appt.id,
      clientName: name,
      serviceNames: selectedServices.map((s) => s.name),
      date: selectedDate,
      startTime,
      totalAmount: totalPrice,
      ts: Date.now(),
    };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("werzio_new_booking_alert", { detail: alertPayload }));
      localStorage.setItem("werzio_new_booking_notify", JSON.stringify(alertPayload));
    }

    setStep("success");
  }

  function resetAll() {
    setSelectedServiceIds([]); setSelectedStaffId("");
    setSelectedDate(""); setSelectedTime("");
    setName(""); setPhone(""); setNotes("");
    setStep(1);
  }

  const salonName = salonId
    ? ((remoteSettings?.salon as { name?: string })?.name ?? "Salon")
    : (settingsStore.salon.name as string);

  return (
    <div className="pageWrapper">
      {/* Navbar */}
      <header className="topNavbar">
        <div className="brandLogoArea">
          <div className="brandLogoText" suppressHydrationWarning>{salonName}</div>
          <div className="brandPoweredBy">powered by <span className="brandPoweredByName">Salon Central</span></div>
        </div>
      </header>

      {/* Hero */}
      <section className="heroSection">
        <div className="heroOverlay" />
        <div className="heroCenterContent">
          <h1 className="heroBrandName">Online Booking</h1>
          <div className="heroRule"><span className="heroDiamond" /></div>
          <p className="heroBrandSubtitle">Beauty Bar</p>
        </div>
      </section>

      {/* Booking card */}
      <section className="bookingSection">
        <div className="bookingCard">

          {/* ── Progress bar ── */}
          {step !== "success" && (
            <div className="progressBar">
              {([
                { n: 1, label: "Services" },
                { n: 2, label: "Date & Time" },
                { n: 3, label: "Your Info" },
              ] as { n: 1|2|3; label: string }[]).map(({ n, label }, idx) => (
                <div key={n} className="progressTrack">
                  <div className={`progressStep ${(step as number) >= n ? "active" : ""}`}>
                    <div className="progressDot">
                      {(step as number) > n ? <Check size={11} /> : n}
                    </div>
                    <span className="progressLabel">{label}</span>
                  </div>
                  {idx < 2 && <div className={`progressLine ${(step as number) > n ? "filled" : ""}`} />}
                </div>
              ))}
            </div>
          )}

          {/* ══ STEP 1: Services ══ */}
          {step === 1 && (
            <div className="stepContent">
              <div className="stepHeader">
                <div className="stepIconWrap"><Scissors size={18} /></div>
                <div>
                  <h2 className="stepTitle">Choose Your Services</h2>
                  <p className="stepSubtitle">Select one or more services to book</p>
                </div>
              </div>

              {staffList.length > 0 && (
                <div className="staffRow">
                  <button className={`staffChip ${!selectedStaffId ? "active" : ""}`} onClick={() => setSelectedStaffId("")}>
                    Any Stylist
                  </button>
                  {staffList.map((st) => (
                    <button key={st.id} className={`staffChip ${selectedStaffId === st.id ? "active" : ""}`} onClick={() => setSelectedStaffId(st.id)}>
                      {st.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="serviceGrid">
                {availableServices.length === 0 ? (
                  <div className="emptyState">No services available.</div>
                ) : availableServices.map((sv) => {
                  const checked = selectedServiceIds.includes(sv.id);
                  return (
                    <div key={sv.id} className={`serviceCard ${checked ? "selected" : ""}`} onClick={() => toggleService(sv.id)}>
                      <div className={`serviceCardCheck ${checked ? "visible" : ""}`}><Check size={11} /></div>
                      <div className="serviceCardName">{sv.name}</div>
                      <div className="serviceCardMeta">
                        <span className="serviceCardDuration"><Clock size={11} /> {sv.durationMin} min</span>
                        <span className="serviceCardPrice">{fmt(sv.price)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedServiceIds.length > 0 && (
                <div className="selectionSummary">
                  <span>{selectedServiceIds.length} service{selectedServiceIds.length > 1 ? "s" : ""} · {totalDuration} min</span>
                  <span className="selectionTotal">{fmt(totalPrice)}</span>
                </div>
              )}

              <button className={`btnNext ${selectedServiceIds.length > 0 ? "active" : "disabled"}`} disabled={selectedServiceIds.length === 0} onClick={() => setStep(2)}>
                Continue <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* ══ STEP 2: Date & Time ══ */}
          {step === 2 && (
            <div className="stepContent">
              <div className="stepHeader">
                <div className="stepIconWrap"><Calendar size={18} /></div>
                <div>
                  <h2 className="stepTitle">Pick a Date & Time</h2>
                  <p className="stepSubtitle">Choose when you'd like to come in</p>
                </div>
              </div>

              <div className="formGroup">
                <label className="formLabel">Date</label>
                <input
                  type="date"
                  className="cleanInput"
                  value={selectedDate}
                  min={today}
                  onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); }}
                />
                {selectedDate && selectedHours && !selectedHours.open && (
                  <div className="dateWarning">We're closed on {selectedHours.day}. Please pick another date.</div>
                )}
              </div>

              {selectedDate && dateIsOpen && timeSlots.length > 0 && (
                <div className="formGroup">
                  <label className="formLabel">Available Times</label>
                  <div className="timeGrid">
                    {timeSlots.map((slot) => (
                      <button key={slot} className={`timeSlot ${selectedTime === slot ? "selected" : ""}`} onClick={() => setSelectedTime(slot)}>
                        {fmtTime12(slot)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedDate && dateIsOpen && timeSlots.length === 0 && (
                <div className="emptyState">No available time slots for this date.</div>
              )}

              <div className="stepNav">
                <button className="btnBack" onClick={() => setStep(1)}><ChevronLeft size={16} /> Back</button>
                <button
                  className={`btnNext ${selectedDate && dateIsOpen && selectedTime ? "active" : "disabled"}`}
                  disabled={!selectedDate || !dateIsOpen || !selectedTime}
                  onClick={() => setStep(3)}
                >
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 3: Contact info ══ */}
          {step === 3 && (
            <div className="stepContent">
              <div className="stepHeader">
                <div className="stepIconWrap"><User size={18} /></div>
                <div>
                  <h2 className="stepTitle">Your Information</h2>
                  <p className="stepSubtitle">We'll use this to confirm your booking</p>
                </div>
              </div>

              {/* Mini booking summary */}
              <div className="bookingSummaryStrip">
                <div className="summaryItem"><Calendar size={13} /><span>{fmtDate(selectedDate)}</span></div>
                <div className="summaryItem"><Clock size={13} /><span>{fmtTime12(selectedTime)} · {totalDuration} min</span></div>
                <div className="summaryItem"><Scissors size={13} /><span>{selectedServices.map((s) => s.name).join(", ")}</span></div>
              </div>

              <div className="formGroup">
                <label className="formLabel">Full Name *</label>
                <input type="text" className="cleanInput" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" />
              </div>

              <div className="formGroup">
                <label className="formLabel">Phone Number *</label>
                <input type="tel" className="cleanInput" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0300-1234567" />
              </div>

              <div className="formGroup">
                <label className="formLabel">Notes (optional)</label>
                <textarea className="cleanTextarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests…" rows={3} />
              </div>

              <div className="totalRow">
                <span>Total</span>
                <span className="totalAmount">{fmt(totalPrice)}</span>
              </div>

              <div className="stepNav">
                <button className="btnBack" onClick={() => setStep(2)}><ChevronLeft size={16} /> Back</button>
                <button
                  className={`btnNext ${name.trim() && phone.trim() && !booking ? "active" : "disabled"}`}
                  disabled={!name.trim() || !phone.trim() || booking}
                  onClick={handleBook}
                >
                  {booking ? "Booking…" : <>Confirm Booking <Check size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {/* ══ SUCCESS ══ */}
          {step === "success" && (
            <div className="successScreen">
              <div className="successIconWrap"><CheckCircle size={52} /></div>
              <h2 className="successTitle">Booking Confirmed!</h2>
              <p className="successSubtitle">Your appointment at <strong suppressHydrationWarning>{salonName}</strong> is all set.</p>

              <div className="successDetails">
                <div className="successRow"><span className="successLabel">Name</span><span className="successValue">{name}</span></div>
                <div className="successRow"><span className="successLabel">Services</span><span className="successValue">{selectedServices.map((s) => s.name).join(", ")}</span></div>
                <div className="successRow"><span className="successLabel">Date</span><span className="successValue">{fmtDate(selectedDate)}</span></div>
                <div className="successRow"><span className="successLabel">Time</span><span className="successValue">{fmtTime12(selectedTime)}</span></div>
                <div className="successRow"><span className="successLabel">Duration</span><span className="successValue">{totalDuration} min</span></div>
                <div className="successRow highlight"><span className="successLabel">Total</span><span className="successValue">{fmt(totalPrice)}</span></div>
              </div>

              <p className="successNote">💜 We'll send you a WhatsApp confirmation shortly. See you soon!</p>
              <button className="btnBookAnother" onClick={resetAll}>Book Another Appointment</button>
            </div>
          )}
        </div>
      </section>

      <div className="floatingChatBubble" onClick={() => alert("Live support coming soon!")}>
        <MessageSquare size={22} />
      </div>
    </div>
  );
}

export default function OnlineBookingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0a0a0f" }} />}>
      <OnlineBookingInner />
    </Suspense>
  );
}
