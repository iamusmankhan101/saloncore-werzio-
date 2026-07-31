import SpaPage from "../../../components/SpaPage";
import { pageMetadata, webPageJsonLd } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Spa POS & Booking Software",
  description:
    "Spa management software with appointment scheduling, POS, client management, payroll, inventory, and reports.",
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
    "salon and spa software",
    "salon spa software",
    "medical spa management software",
    "spa membership software",
  ],
});

const webPageSchema = webPageJsonLd({
  name: "Spa POS & Booking Software | Salon Central",
  description: "Spa management software with appointment scheduling, POS, client management, payroll, inventory, and reports.",
  path: "/solutions/spa",
});

export default function SpaSolutionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <SpaPage />
    </>
  );
}
