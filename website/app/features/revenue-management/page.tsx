import type { Metadata } from "next";
import RevenueFeaturePage from "../../../components/RevenueFeaturePage";

export const metadata: Metadata = {
  title: "Revenue Management | Salon Central",
  description:
    "Track daily revenue, average ticket, payment method breakdown, and top services — with period comparisons and one-click PDF export.",
};

export default function RevenueManagementPage() {
  return <RevenueFeaturePage />;
}
