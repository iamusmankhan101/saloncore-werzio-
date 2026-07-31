import StaffFeaturePage from "../../../components/StaffFeaturePage";
import { pageMetadata, webPageJsonLd } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Staff Management Software for Salons",
  description: "Staff management software for beauty and hair salons. Salon Central manages roles, service assignments, performance stats, and revenue tracking.",
  path: "/features/staff-management",
});

const webPageSchema = webPageJsonLd({
  name: "Staff Management Software for Salons | Salon Central",
  description: "Staff management software for beauty and hair salons. Salon Central manages roles, service assignments, performance stats, and revenue tracking.",
  path: "/features/staff-management",
});

export default function StaffManagementPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <StaffFeaturePage />
    </>
  );
}
