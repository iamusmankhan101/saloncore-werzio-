import type { Metadata } from "next";
import WhatsAppFeaturePage from "../../../components/WhatsAppFeaturePage";

export const metadata: Metadata = {
  title: "WhatsApp Reminders & Automation | Werzio",
  description:
    "Send booking confirmations, 24-hour reminders, post-visit follow-ups, and low-stock alerts via WhatsApp — fully automated, no manual effort.",
};

export default function WhatsAppRemindersPage() {
  return <WhatsAppFeaturePage />;
}
