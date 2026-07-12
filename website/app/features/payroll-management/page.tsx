import PayrollFeaturePage from "../../../components/PayrollFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Payroll Software in Pakistan for Salons",
  description: "Payroll software in Pakistan for beauty salons and hair salons. Salon Central is HR and payroll software to manage staff salaries, commissions, payouts, attendance, revenue, and payroll reports.",
  path: "/features/payroll-management",
});

export default function PayrollManagementPage() {
  return <PayrollFeaturePage />;
}
