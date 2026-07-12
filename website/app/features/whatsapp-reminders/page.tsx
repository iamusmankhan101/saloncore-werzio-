import WhatsAppFeaturePage from "../../../components/WhatsAppFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "WhatsApp Marketing for Salons & Automated Reminders",
  description:
    "WhatsApp marketing for salons with salon WhatsApp marketing, WhatsApp automated reminders, and salon WhatsApp automated messages. Send booking confirmations, appointment reminders, follow-ups, birthday messages, promotions, and low-stock alerts with Salon Central.",
  path: "/features/whatsapp-reminders",
});

export default function WhatsAppRemindersPage() {
  return <WhatsAppFeaturePage />;
}
