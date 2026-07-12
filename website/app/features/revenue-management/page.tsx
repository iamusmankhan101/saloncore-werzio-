import RevenueFeaturePage from "../../../components/RevenueFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Accounting Software in Pakistan for Salon Revenue Management",
  description:
    "Accounting software in Pakistan for beauty salons and hair salons. Manage invoices, expenses, revenue, payroll, inventory, and business reports with Salon Central.",
  path: "/features/revenue-management",
});

export default function RevenueManagementPage() {
  return <RevenueFeaturePage />;
}
