import type { Metadata } from "next";
import StaffFeaturePage from "../../../components/StaffFeaturePage";

export const metadata: Metadata = {
  title: "Staff Management | Salon Central",
  description: "Manage your salon team — roles, specialties, service assignments, performance stats, and revenue tracking for every team member.",
};

export default function StaffManagementPage() {
  return <StaffFeaturePage />;
}
