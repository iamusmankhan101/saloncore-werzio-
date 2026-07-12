import LoyaltyFeaturePage from "../../../components/LoyaltyFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Loyalty Points Program for Salons",
  description: "Loyalty points program for salons with a loyalty points calculator, client rewards, redeemable discounts, membership tiers, digital loyalty cards, and POS reward points from Salon Central.",
  path: "/features/loyalty-points",
});

export default function LoyaltyPointsPage() {
  return <LoyaltyFeaturePage />;
}
