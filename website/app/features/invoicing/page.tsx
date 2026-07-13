import InvoicingFeaturePage from "../../../components/InvoicingFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Accounting Software for Salon Pakistan",
  description:
    "Accounting software in Pakistan for salons with branded invoicing, payment tracking, discounts, PDF invoices, and financial reporting by Salon Central.",
  path: "/features/invoicing",
});

export default function InvoicingPage() {
  return <InvoicingFeaturePage />;
}
