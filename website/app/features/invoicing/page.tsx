import InvoicingFeaturePage from "../../../components/InvoicingFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Accounting Software in Pakistan for Salon Invoicing",
  description:
    "Accounting software in Pakistan for beauty salons and hair salons. Manage invoices, expenses, revenue, payroll, inventory, and business reports with Salon Central.",
  path: "/features/invoicing",
});

export default function InvoicingPage() {
  return <InvoicingFeaturePage />;
}
