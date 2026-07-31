import InventoryFeaturePage from "../../../components/InventoryFeaturePage";
import { pageMetadata, webPageJsonLd } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Inventory Management Software in Pakistan",
  description: "Inventory management software for small business, salons to track stock, automate inventory, manage products, monitor low-stock alerts.",
  path: "/features/inventory-management",
});

const webPageSchema = webPageJsonLd({
  name: "Inventory Management Software in Pakistan | Salon Central",
  description: "Inventory management software for small business, salons to track stock, automate inventory, manage products, monitor low-stock alerts.",
  path: "/features/inventory-management",
});

export default function InventoryManagementPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <InventoryFeaturePage />
    </>
  );
}
