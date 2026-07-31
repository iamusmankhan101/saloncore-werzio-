import LoyaltyFeaturePage from "../../../components/LoyaltyFeaturePage";
import { pageMetadata, webPageJsonLd } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Loyalty Points Program for Salons",
  description: "Loyalty points program for salons with customer rewards, redeemable points, membership tiers, digital loyalty cards, and POS reward tracking.",
  path: "/features/loyalty-points",
});

const webPageSchema = webPageJsonLd({
  name: "Loyalty Points Program for Salons | Salon Central",
  description: "Loyalty points program for salons with customer rewards, redeemable points, membership tiers, digital loyalty cards, and POS reward tracking.",
  path: "/features/loyalty-points",
});

export default function LoyaltyPointsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <LoyaltyFeaturePage />
    </>
  );
}
