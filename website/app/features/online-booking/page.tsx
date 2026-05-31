import type { Metadata } from "next";
import OnlineBookingFeaturePage from "../../../components/OnlineBookingFeaturePage";

export const metadata: Metadata = {
  title: "Online Booking Page | Werzio",
  description:
    "Give your salon a branded booking page clients can access from Instagram, WhatsApp, or Google Maps. Appointments land straight in your dashboard.",
};

export default function OnlineBookingPage() {
  return <OnlineBookingFeaturePage />;
}
