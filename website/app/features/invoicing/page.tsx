import InvoicingFeaturePage from "../../../components/InvoicingFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Invoicing",
  description:
    "Create branded, auto-numbered invoices for every sale. Mix services and products, apply discounts, mark paid, and print or save as PDF, all from the dashboard.",
  path: "/features/invoicing",
});

export default function InvoicingPage() {
  return <InvoicingFeaturePage />;
}
