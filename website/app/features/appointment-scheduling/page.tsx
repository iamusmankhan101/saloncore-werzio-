import type { Metadata } from "next";
import SchedulingFeaturePage from "../../../components/SchedulingFeaturePage";

export const metadata: Metadata = {
  title: "Appointment Scheduling & Calendar | Werzio",
  description:
    "Manage salon appointments, staff calendars, WhatsApp reminders, and online booking with Werzio.",
};

export default function AppointmentSchedulingPage() {
  return <SchedulingFeaturePage />;
}
