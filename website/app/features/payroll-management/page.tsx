import PayrollFeaturePage from "../../../components/PayrollFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Payroll Software in Pakistan for Salons",
  description: "Payroll software in Pakistan for salons. Salon Central manages staff salaries, commissions, payouts, attendance, and payroll reports.",
  path: "/features/payroll-management",
});

export default function PayrollManagementPage() {
  return <PayrollFeaturePage />;
}
