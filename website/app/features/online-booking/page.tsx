import OnlineBookingFeaturePage from "../../../components/OnlineBookingFeaturePage";
import { pageMetadata, webPageJsonLd } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Online Booking Page",
  description:
    "Give your salon a branded booking page clients can access from Instagram, WhatsApp, or Google Maps. Appointments land straight in your dashboard.",
  path: "/features/online-booking",
});

const webPageSchema = webPageJsonLd({
  name: "Online Booking Page | Salon Central",
  description: "Give your salon a branded booking page clients can access from Instagram, WhatsApp, or Google Maps. Appointments land straight in your dashboard.",
  path: "/features/online-booking",
});

export default function OnlineBookingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <OnlineBookingFeaturePage />
    </>
  );
}
