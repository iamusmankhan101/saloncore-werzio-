import POSFeaturePage from "../../../components/POSFeaturePage";
import { pageMetadata, webPageJsonLd } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Salon POS Software & Point of Sale System",
  description:
    "Salon POS software for beauty salons, hair salons, and spas with point of sale, invoicing, inventory management, payments, and CRM by Salon Central.",
  path: "/features/pos",
  keywords: [
    "salon pos system",
    "salon pos software",
    "salon point of sale",
    "salon point of sale software",
    "salon point of sale system",
    "hair salon pos",
    "hair salon pos software",
    "hair salon point of sale",
    "beauty salon pos",
    "beauty salon pos software",
    "beauty salon point of sale software",
    "pos software for beauty salon",
    "pos system for beauty salon",
    "pos system for salons",
    "point of sale software for hair salon",
    "spa point of sale system",
    "pos software pakistan",
    "best pos software in pakistan",
    "point of sale pakistan",
    "pos pakistan",
    "pos software price in pakistan",
  ],
});

const webPageSchema = webPageJsonLd({
  name: "Salon POS Software & Point of Sale System | Salon Central",
  description: "Salon POS software for beauty salons, hair salons, and spas with point of sale, invoicing, inventory management, payments, and CRM by Salon Central.",
  path: "/features/pos",
});

export default function POSPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <POSFeaturePage />
    </>
  );
}
