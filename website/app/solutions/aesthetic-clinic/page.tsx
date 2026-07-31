import AestheticClinicPage from "../../../components/AestheticClinicPage";
import { pageMetadata, webPageJsonLd } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Aesthetic Clinic Software | Skin Clinic Management",
  description:
    "Aesthetic clinic software for an aesthetic clinic in Lahore or aesthetic clinic in Karachi. Built for any aesthetic skin clinic with scheduling and POS.",
  path: "/solutions/aesthetic-clinic",
  keywords: [
    "aesthetic clinic lahore",
    "aesthetic clinic in lahore",
    "aesthetic clinic karachi",
    "aesthetic clinic in karachi",
    "aesthetic skin clinic",
  ],
});

const webPageSchema = webPageJsonLd({
  name: "Aesthetic Clinic Software | Skin Clinic Management | Salon Central",
  description: "Aesthetic clinic software for an aesthetic clinic in Lahore or aesthetic clinic in Karachi. Built for any aesthetic skin clinic with scheduling and POS.",
  path: "/solutions/aesthetic-clinic",
});

export default function AestheticClinicSolutionPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <AestheticClinicPage />
    </>
  );
}
