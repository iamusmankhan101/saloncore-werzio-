/**
 * Server layout for the staff dashboard — metadata only.
 *
 * Exists so /dashboard can declare its own web app manifest. The root layout
 * points at /manifest.json, whose start_url is the *customer* app at /client;
 * installing from the dashboard with that manifest would put a customer-facing
 * icon on a staff member's home screen. A nested layout's metadata overrides
 * it, and metadata can only be exported from a server component, which the
 * shell below isn't.
 *
 * Deliberately renders no salon data. public/sw.js caches the dashboard's
 * server-rendered HTML for offline use, which is only safe while that HTML is
 * an empty shell — see the note there before adding anything to this file.
 */

import type { Metadata } from "next";
import DashboardShell from "./dashboard-shell";

export const metadata: Metadata = {
  manifest: "/manifest-dashboard.json",
  appleWebApp: {
    capable: true,
    title: "Salon Central",
    statusBarStyle: "default",
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
