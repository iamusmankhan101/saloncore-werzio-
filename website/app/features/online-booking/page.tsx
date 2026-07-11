import OnlineBookingFeaturePage from "../../../components/OnlineBookingFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Online Booking Page",
  description:
    "Give your salon a branded booking page clients can access from Instagram, WhatsApp, or Google Maps. Appointments land straight in your dashboard.",
  path: "/features/online-booking",
});

export default function OnlineBookingPage() {
  return <OnlineBookingFeaturePage />;
}
