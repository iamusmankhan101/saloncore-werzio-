import type { Metadata } from "next";
import StaffFeaturePage from "../../../components/StaffFeaturePage";

export const metadata: Metadata = {
  title: "Staff Management | Werzio",
  description: "Manage your salon team — roles, specialties, service assignments, performance stats, and revenue tracking for every team member.",
};

export default function StaffManagementPage() {
  return <StaffFeaturePage />;
}
