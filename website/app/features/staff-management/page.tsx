import StaffFeaturePage from "../../../components/StaffFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Staff Management",
  description: "Manage your salon team — roles, specialties, service assignments, performance stats, and revenue tracking for every team member.",
  path: "/features/staff-management",
});

export default function StaffManagementPage() {
  return <StaffFeaturePage />;
}
