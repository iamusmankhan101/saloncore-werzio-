import RevenueFeaturePage from "../../../components/RevenueFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Revenue Management",
  description:
    "Track daily revenue, average ticket, payment method breakdown, and top services — with period comparisons and one-click PDF export.",
  path: "/features/revenue-management",
});

export default function RevenueManagementPage() {
  return <RevenueFeaturePage />;
}
