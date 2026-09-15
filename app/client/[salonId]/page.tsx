/**
 * /client/[salonId] — server wrapper around the client-facing app.
 *
 * Exists to attach a per-salon manifest and title, which a "use client"
 * component can't do (metadata export is server-only). The manifest link is
 * what makes "Add to Home Screen" install *this salon's* app rather than a
 * generic one whose start_url points at a page that doesn't exist.
 */

import type { Metadata } from "next";
import { db } from "@/lib/db";
import ClientApp from "./client-app";

async function getSalonName(salonId: string): Promise<string | null> {
  try {
    const row = await db.execute({
      sql: "SELECT data FROM salon_data WHERE entity = ?",
      args: [`${salonId}_settings`],
    });
    if (row.rows.length === 0) return null;
    const settings = JSON.parse(row.rows[0].data as string);
    const name = settings?.salon?.name;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ salonId: string }>;
}): Promise<Metadata> {
  const { salonId } = await params;
  const salonName = await getSalonName(salonId);

  return {
    title: salonName ? `${salonName} — Offers & Booking` : "Your Salon",
    description: salonName
      ? `Book services, view your loyalty card and get offers from ${salonName}.`
      : "Book services, view your loyalty card and get offers from your salon.",
    // Overrides the generic manifest set in the root layout.
    manifest: `/api/manifest/${encodeURIComponent(salonId)}`,
    appleWebApp: {
      capable: true,
      title: salonName ? salonName.slice(0, 12) : "Salon",
      statusBarStyle: "default",
    },
  };
}

export default async function ClientAppPage({
  params,
}: {
  params: Promise<{ salonId: string }>;
}) {
  const { salonId } = await params;
  return <ClientApp salonId={salonId} />;
}
