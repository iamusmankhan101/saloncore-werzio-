import HairSalonPage from "../../../components/HairSalonPage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Hair Salon POS & Booking Software",
  description:
    "Hair salon POS software with appointment scheduling, hair formula tracking, AI virtual try-on, and WhatsApp automation, all in one hair salon point of sale system.",
  path: "/solutions/hair-salon",
  keywords: [
    "hair salon pos",
    "hair salon pos software",
    "hair salon pos systems",
    "hair salon point of sale",
    "hair salon point of sale systems",
    "point of sale software for hair salon",
    "point of sale software hair salon",
    "salon pos",
    "salon pos system",
    "salon pos software",
  ],
});

export default function HairSalonSolutionPage() {
  return <HairSalonPage />;
}
