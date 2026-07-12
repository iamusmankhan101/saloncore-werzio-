import InventoryFeaturePage from "../../../components/InventoryFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Inventory Management",
  description: "Track stock levels, set low-stock alerts, auto-deduct products on POS sales, and manage retail pricing, all from your salon dashboard.",
  path: "/features/inventory-management",
});

export default function InventoryManagementPage() {
  return <InventoryFeaturePage />;
}
