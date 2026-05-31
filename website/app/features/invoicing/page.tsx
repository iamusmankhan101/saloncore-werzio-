import type { Metadata } from "next";
import InvoicingFeaturePage from "../../../components/InvoicingFeaturePage";

export const metadata: Metadata = {
  title: "Invoicing | Werzio",
  description:
    "Create branded, auto-numbered invoices for every sale. Mix services and products, apply discounts, mark paid, and print or save as PDF — all from the dashboard.",
};

export default function InvoicingPage() {
  return <InvoicingFeaturePage />;
}
