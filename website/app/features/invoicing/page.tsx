import InvoicingFeaturePage from "../../../components/InvoicingFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Accounting Software in Pakistan for Salon Invoicing",
  description:
    "Accounting software in Pakistan for salon invoicing: create branded, auto-numbered invoices, apply discounts, mark payments, and export as PDF, all from Salon Central.",
  path: "/features/invoicing",
});

export default function InvoicingPage() {
  return <InvoicingFeaturePage />;
}
