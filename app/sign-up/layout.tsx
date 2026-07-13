import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your Salon Central account and start managing bookings, staff, and revenue in one dashboard.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
