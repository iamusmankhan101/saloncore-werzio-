import LoyaltyFeaturePage from "../../../components/LoyaltyFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Loyalty Points",
  description: "Reward every visit automatically — points earned at POS, Bronze-to-Platinum membership tiers, redeemable discounts, and digital Google Wallet cards.",
  path: "/features/loyalty-points",
});

export default function LoyaltyPointsPage() {
  return <LoyaltyFeaturePage />;
}
