import NailSalonPage from "../../../components/NailSalonPage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Nail Salon POS & Booking Software",
  description:
    "Nail salon software with appointment scheduling, nail preference tracking, POS checkout, and WhatsApp automation, all in one nail salon POS system.",
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

export default function NailSalonSolutionPage() {
  return <NailSalonPage />;
}
