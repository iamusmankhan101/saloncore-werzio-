import ClientFeaturePage from "../../../components/ClientFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Client Management Software & CRM",
  description:
    "Client management software for salons with CRM, customer profiles, visit history, invoices, loyalty programs, and appointment tracking.",
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
