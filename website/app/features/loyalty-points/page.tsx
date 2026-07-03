import type { Metadata } from "next";
import LoyaltyFeaturePage from "../../../components/LoyaltyFeaturePage";

export const metadata: Metadata = {
  title: "Loyalty Points | Salon Central",
  description: "Reward every visit automatically — points earned at POS, Bronze-to-Platinum membership tiers, redeemable discounts, and digital Google Wallet cards.",
};

export default function LoyaltyPointsPage() {
  return <LoyaltyFeaturePage />;
}
