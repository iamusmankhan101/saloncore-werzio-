import ClientFeaturePage from "../../../components/ClientFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Client Management Software & CRM",
  description:
    "Salon Central's client management software helps salons manage customer profiles, visit history, appointments, invoices, loyalty, and CRM from one powerful platform.",
  path: "/features/client-management",
  keywords: [
    "client management software",
    "client management system software",
    "client relationship management software",
    "client management software crm",
    "best client management software",
    "salon crm software",
    "beauty salon crm software",
    "salon customer management software",
    "salon invoice and customer management software",
  ],
});

export default function ClientManagementPage() {
  return <ClientFeaturePage />;
}
