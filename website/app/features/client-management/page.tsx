import type { Metadata } from "next";
import ClientFeaturePage from "../../../components/ClientFeaturePage";

export const metadata: Metadata = {
  title: "Client Management | Salon Central",
  description: "Full client profiles — hair formulas, skin type, allergy alerts, visit history, lifetime spend, tags, and beauty profiles for every client.",
};

export default function ClientManagementPage() {
  return <ClientFeaturePage />;
}
