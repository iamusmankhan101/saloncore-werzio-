import WhatsAppFeaturePage from "../../../components/WhatsAppFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "WhatsApp Reminders & Automation",
  description:
    "Send booking confirmations, 24-hour reminders, post-visit follow-ups, and low-stock alerts via WhatsApp: fully automated, no manual effort.",
  path: "/features/whatsapp-reminders",
});

export default function WhatsAppRemindersPage() {
  return <WhatsAppFeaturePage />;
}
