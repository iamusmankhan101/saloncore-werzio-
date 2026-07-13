import RevenueFeaturePage from "../../../components/RevenueFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Salon Revenue Management Software Pakistan",
  description:
    "Salon revenue management software with revenue tracking, financial reports, payment insights, and business analytics for beauty salons by Salon Central.",
  path: "/features/revenue-management",
});

export default function RevenueManagementPage() {
  return <RevenueFeaturePage />;
}
