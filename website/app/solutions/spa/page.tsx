import SpaPage from "../../../components/SpaPage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Spa POS & Booking Software",
  description:
    "Spa POS software with appointment scheduling, multi-branch support, loyalty tiers, and WhatsApp automation, all in one spa point of sale system built for salons and spas.",
  path: "/solutions/spa",
  keywords: [
    "pos system for salon and spa",
    "salon spa pos system",
    "spa pos software",
    "spa point of sale",
    "spa point of sale system",
    "spa point of sale systems",
    "spa point of sale software",
    "pos software for spa",
  ],
});

export default function SpaSolutionPage() {
  return <SpaPage />;
}
