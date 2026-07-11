import SchedulingFeaturePage from "../../../components/SchedulingFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Appointment Scheduling & Calendar",
  description:
    "Manage salon appointments, staff calendars, WhatsApp reminders, and online booking with Salon Central.",
  path: "/features/appointment-scheduling",
});

export default function AppointmentSchedulingPage() {
  return <SchedulingFeaturePage />;
}
