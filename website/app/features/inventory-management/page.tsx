import InventoryFeaturePage from "../../../components/InventoryFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Best Inventory Management Software in Pakistan",
  description: "Best inventory management software for small businesses, salons, and spas in Pakistan. Salon Central combines cloud based inventory management software, accounting and inventory management software, and the best software for billing and inventory management.",
  path: "/features/inventory-management",
});

export default function InventoryManagementPage() {
  return <InventoryFeaturePage />;
}
