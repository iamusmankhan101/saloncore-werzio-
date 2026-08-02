import NailSalonPage from "../../../components/NailSalonPage";
import { pageMetadata, webPageJsonLd } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Nail Salon POS Software",
  description:
    "Salon Central POS software for nail salons: appointment booking, scheduling, and management. Salon Central is the best nail salon POS system and nail salon POS for your business.",
  path: "/solutions/nail-salon",
  keywords: [
    "nail salon software",
    "nail salon management system",
    "nail salon booking software",
    "nail salon appointment software",
    "nail salon scheduling software",
    "nail salon pos software",
    "nail salon pos system",
    "nail salon pos",
    "best pos system for nail salon",
  ],
});

const webPageSchema = webPageJsonLd({
  name: "Nail Salon POS Software | Salon Central",
  description: "Salon Central POS software for nail salons: appointment booking, scheduling, and management. Salon Central is the best nail salon POS system and nail salon POS for your business.",
  path: "/solutions/nail-salon",
});

export default function NailSalonSolutionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <NailSalonPage />
    </>
  );
}
