"use client";

import { useState } from "react";
import { saveAppointments, saveClients } from "@/lib/storage";
import { enqueueWhatsAppFollowup, enqueueWhatsAppConfirmation, runWhatsAppScheduler, getWaLogs } from "@/lib/whatsapp-scheduler";
import { settingsStore, saveSettings } from "@/lib/settings-store";
import type { Appointment, Client } from "@/lib/types";

export default function VerifyPage() {
  const [log, setLog] = useState<string[]>([]);
  const append = (s: string) => setLog((l) => [...l, s]);

  function run() {
    const clientId = "c_test_1";
    const apptId = "a_test_1";

    const client: Client = {
      id: clientId,
      name: "Fatima Noor",
      phone: "03211234567",
      tags: [],
      source: "walk-in",
      createdAt: new Date().toISOString().slice(0, 10),
      totalVisits: 1,
      totalSpend: 3000,
    };
    saveClients([client]);

    const appt: Appointment = {
      id: apptId,
      clientId,
      clientName: "Fatima Noor",
      staffId: "s1",
      staffName: "Sara",
      serviceIds: ["sv1"],
      serviceNames: ["Haircut"],
      date: new Date().toISOString().slice(0, 10),
      startTime: "15:00",
      endTime: "16:00",
      status: "booked",
      totalAmount: 3000,
      source: "manual",
    };
    saveAppointments([appt]);

    (settingsStore.wasender as Record<string, unknown>).apiKey = "test-key";
    (settingsStore.wasender as Record<string, unknown>).provider = "wasender";
    saveSettings();

    // Enqueue confirmation + followup while the appointment still exists
    enqueueWhatsAppConfirmation(apptId);
    enqueueWhatsAppFollowup(apptId);

    const confirmQ = JSON.parse(localStorage.getItem("werzio_wa_confirm_queue") || "[]");
    const followupQ = JSON.parse(localStorage.getItem("werzio_wa_followup_queue") || "[]");
    append("CONFIRM_QUEUE_AFTER_ENQUEUE=" + JSON.stringify(confirmQ));
    append("FOLLOWUP_QUEUE_AFTER_ENQUEUE=" + JSON.stringify(followupQ));

    // Now simulate the appointment being deleted before the delay elapses
    saveAppointments([]);

    // Force both queue items to be due right now
    const now = Date.now();
    const forceDue = (arr: any[]) => arr.map((item) => ({ ...item, sendAfter: now - 1000 }));
    localStorage.setItem("werzio_wa_confirm_queue", JSON.stringify(forceDue(confirmQ)));
    localStorage.setItem("werzio_wa_followup_queue", JSON.stringify(forceDue(followupQ)));

    append("APPOINTMENT_DELETED=true");
    append("QUEUES_FORCED_DUE=true");
  }

  async function tick() {
    await runWhatsAppScheduler();
    const logs = getWaLogs();
    append("WA_LOGS=" + JSON.stringify(logs.slice(0, 5)));
  }

  return (
    <div style={{ padding: 24, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
      <button onClick={run} style={{ padding: 10, marginBottom: 16 }}>Run Setup</button>
      <button onClick={tick} style={{ padding: 10, marginBottom: 16, marginLeft: 10 }}>Run Scheduler Tick</button>
      <div id="log-output">{log.join("\n")}</div>
    </div>
  );
}
