import type { Metadata } from "next";
import InventoryFeaturePage from "../../../components/InventoryFeaturePage";

export const metadata: Metadata = {
  title: "Inventory Management | Salon Central",
  description: "Track stock levels, set low-stock alerts, auto-deduct products on POS sales, and manage retail pricing — all from your salon dashboard.",
};

export default function InventoryManagementPage() {
  return <InventoryFeaturePage />;
}
