import PayrollFeaturePage from "../../../components/PayrollFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Payroll Management",
  description: "Pay commission or fixed salary, with amounts auto-calculated from real revenue, a full pending-to-paid payout history, and one-click mark as paid.",
  path: "/features/payroll-management",
});

export default function PayrollManagementPage() {
  return <PayrollFeaturePage />;
}
