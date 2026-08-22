"use client";
import { Block } from "../(dashboard)/dashboard/calendar/page";
import type { Appointment, Staff } from "@/lib/types";

const staff: Staff[] = [{ id: "s1", name: "Hina Malik", phone: "", role: "stylist" as Staff["role"], specialties: [], color: "#7c3aed", isActive: true }];
const withStaff: Appointment = { id: "a1", clientId: "c1", clientName: "Bushra", staffId: "s1", staffName: "Hina Malik", serviceIds: ["v1"], serviceNames: ["Signature hair cut"], date: "2026-08-22", startTime: "17:00", endTime: "18:00", status: "confirmed", totalAmount: 100, source: "manual" };
const noStaff: Appointment  = { ...withStaff, id: "a2", staffId: "", staffName: "" };

export default function BlockTest() {
  return (
    <div style={{ position: "relative", height: 800 }}>
      <div id="withStaff" style={{ position: "relative", height: 200, width: 300 }}>
        <Block appt={withStaff} onClick={() => {}} staffList={staff} showStaff />
      </div>
      <div id="noStaff" style={{ position: "relative", height: 200, width: 300 }}>
        <Block appt={noStaff} onClick={() => {}} staffList={staff} showStaff />
      </div>
    </div>
  );
}
