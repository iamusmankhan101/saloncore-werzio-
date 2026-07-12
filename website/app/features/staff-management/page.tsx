import StaffFeaturePage from "../../../components/StaffFeaturePage";
import { pageMetadata } from "../../../lib/seo";

export const metadata = pageMetadata({
  title: "Staff Management Software for Salons",
  description: "Staff management system and staff management software for beauty salons, hair salons, and spas. Use Salon Central as staff managing software for roles, service assignments, performance stats, and team revenue tracking.",
  path: "/features/staff-management",
});

export default function StaffManagementPage() {
  return <StaffFeaturePage />;
}
