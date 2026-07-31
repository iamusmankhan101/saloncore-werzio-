import SchedulingFeaturePage from "../../../components/SchedulingFeaturePage";
import { pageMetadata, webPageJsonLd } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Salon Appointment & Booking Software",
  description:
    "Salon appointment software for beauty salons with online booking, staff scheduling, calendars, and automated client reminders by Salon Central.",
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

const webPageSchema = webPageJsonLd({
  name: "Salon Appointment & Booking Software | Salon Central",
  description: "Salon appointment software for beauty salons with online booking, staff scheduling, calendars, and automated client reminders by Salon Central.",
  path: "/features/appointment-scheduling",
});

export default function AppointmentSchedulingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <SchedulingFeaturePage />
    </>
  );
}
