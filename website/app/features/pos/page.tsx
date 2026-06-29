import type { Metadata } from "next";
import POSFeaturePage from "../../../components/POSFeaturePage";

export const metadata: Metadata = {
  title: "Point of Sale (POS) | Salon Central",
  description:
    "Checkout clients in seconds. Accept cash, JazzCash, EasyPaisa, Raast, card, and bank transfer. Auto-generate invoices and send receipts via WhatsApp.",
};

export default function POSPage() {
  return <POSFeaturePage />;
}
