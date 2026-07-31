import InvoicingFeaturePage from "../../../components/InvoicingFeaturePage";
import { pageMetadata, webPageJsonLd } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Accounting Software for Salon Pakistan",
  description:
    "Accounting software in Pakistan for salons with branded invoicing, payment tracking, discounts, PDF invoices, and financial reporting by Salon Central.",
  path: "/features/invoicing",
});

const webPageSchema = webPageJsonLd({
  name: "Accounting Software for Salon Pakistan | Salon Central",
  description: "Accounting software in Pakistan for salons with branded invoicing, payment tracking, discounts, PDF invoices, and financial reporting by Salon Central.",
  path: "/features/invoicing",
});

export default function InvoicingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <InvoicingFeaturePage />
    </>
  );
}
