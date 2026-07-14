import AestheticClinicPage from "../../../components/AestheticClinicPage";
import { pageMetadata } from "../../../lib/seo";

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

export default function AestheticClinicSolutionPage() {
  return <AestheticClinicPage />;
}
