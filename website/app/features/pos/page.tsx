import POSFeaturePage from "../../../components/POSFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Point of Sale (POS)",
  description:
    "Checkout clients in seconds. Accept cash, JazzCash, EasyPaisa, Raast, card, and bank transfer. Auto-generate invoices and send receipts via WhatsApp.",
  path: "/features/pos",
});

export default function POSPage() {
  return <POSFeaturePage />;
}
