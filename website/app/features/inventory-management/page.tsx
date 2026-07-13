import InventoryFeaturePage from "../../../components/InventoryFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Inventory Management Software in Pakistan",
  description: "Inventory management software for small business, salons to track stock, automate inventory, manage products, monitor low-stock alerts.",
  path: "/features/inventory-management",
});

export default function InventoryManagementPage() {
  return <InventoryFeaturePage />;
}
