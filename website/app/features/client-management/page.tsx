import ClientFeaturePage from "../../../components/ClientFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Client Management",
  description: "Full client profiles: hair formulas, skin type, allergy alerts, visit history, lifetime spend, tags, and beauty profiles for every client.",
  path: "/features/client-management",
});

export default function ClientManagementPage() {
  return <ClientFeaturePage />;
}
