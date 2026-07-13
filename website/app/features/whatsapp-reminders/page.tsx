import WhatsAppFeaturePage from "../../../components/WhatsAppFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "WhatsApp Marketing & Reminders for Salons",
  description:
    "WhatsApp marketing for salons: automated confirmations, reminders, follow-ups, birthday messages, promotions, and low-stock alerts from Salon Central.",
  path: "/features/whatsapp-reminders",
});

export default function WhatsAppRemindersPage() {
  return <WhatsAppFeaturePage />;
}
