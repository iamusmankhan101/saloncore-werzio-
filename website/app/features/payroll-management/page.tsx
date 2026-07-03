import type { Metadata } from "next";
import PayrollFeaturePage from "../../../components/PayrollFeaturePage";

export const metadata: Metadata = {
  title: "Payroll Management | Salon Central",
  description: "Pay commission or fixed salary, with amounts auto-calculated from real revenue, a full pending-to-paid payout history, and one-click mark as paid.",
};

export default function PayrollManagementPage() {
  return <PayrollFeaturePage />;
}
