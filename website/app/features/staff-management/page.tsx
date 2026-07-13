import StaffFeaturePage from "../../../components/StaffFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Staff Management Software for Salons",
  description: "Staff management software for beauty and hair salons. Salon Central manages roles, service assignments, performance stats, and revenue tracking.",
  path: "/features/staff-management",
});

export default function StaffManagementPage() {
  return <StaffFeaturePage />;
}
