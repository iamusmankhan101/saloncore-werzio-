import RevenueFeaturePage from "../../../components/RevenueFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Accounting Software in Pakistan for Salon Revenue Management",
  description:
    "Accounting software in Pakistan for salon revenue management: track daily revenue, average ticket, payment method breakdown, top services, and one-click PDF reports with Salon Central.",
  path: "/features/revenue-management",
});

export default function RevenueManagementPage() {
  return <RevenueFeaturePage />;
}
