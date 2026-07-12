import SchedulingFeaturePage from "../../../components/SchedulingFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Salon Appointment Scheduling & Booking Software",
  description:
    "Salon Central's salon appointment software lets beauty salons manage bookings, scheduling, online appointments, staff calendars, and client reminders from one platform.",
  path: "/features/appointment-scheduling",
  keywords: [
    "salon appointment software pakistan",
    "salon scheduling software",
    "salon booking software",
    "beauty salon appointment software",
    "beauty salon scheduling software",
    "hair salon booking software",
    "online salon software",
    "best salon booking software",
  ],
});

export default function AppointmentSchedulingPage() {
  return <SchedulingFeaturePage />;
}
