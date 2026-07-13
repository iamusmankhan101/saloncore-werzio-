import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Salon Central account to manage bookings, staff, and revenue.",
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
