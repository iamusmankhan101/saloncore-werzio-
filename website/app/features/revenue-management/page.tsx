import RevenueFeaturePage from "../../../components/RevenueFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Salon Revenue Management Software in Pakistan",
  description:
    "Accounting software in Pakistan for salon revenue management: track daily revenue, average ticket, payment method breakdown, top services, and one-click PDF reports with Salon Central.",
  path: "/features/revenue-management",
});

export default function RevenueManagementPage() {
  return <RevenueFeaturePage />;
}
