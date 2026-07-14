import BridalSalonPage from "../../../components/BridalSalonPage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Bridal Salon Software | Lahore's Best Bridal Salon Solution",
  description:
    "Bridal salon software helping bridal salons in Lahore become the best bridal salon in Lahore, with trial scheduling, AI try-on, and WhatsApp automation.",
  path: "/solutions/bridal-salon",
  keywords: [
    "best bridal salon in lahore",
    "bridal salons in lahore",
    "lahore best bridal salon",
    "bridal salon software",
    "bridal salon booking software",
    "bridal salon management software",
  ],
});

export default function BridalSalonSolutionPage() {
  return <BridalSalonPage />;
}
