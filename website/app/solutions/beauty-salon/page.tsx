import BeautySalonPage from "../../../components/BeautySalonPage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Beauty Salon POS & Management Software",
  description:
    "Beauty salon POS software with appointment scheduling, detailed beauty client profiles, loyalty tiers, and WhatsApp automation, all in one beauty salon point of sale system.",
  path: "/solutions/beauty-salon",
  keywords: [
    "beauty salon pos",
    "beauty salon pos software",
    "beauty salon pos system",
    "beauty salon point of sale",
    "beauty salon point of sale system",
    "beauty salon point of sale software",
    "beauty salon software point of sale",
    "pos beauty salon",
    "pos software for beauty salon",
    "pos system for beauty salon",
    "pos & booking system for beauty salon",
  ],
});

export default function BeautySalonSolutionPage() {
  return <BeautySalonPage />;
}
