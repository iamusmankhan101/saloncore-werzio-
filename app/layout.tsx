import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Salon Central — Salon Management",
  description: "WhatsApp-native salon booking & client management platform",
  icons: {
    icon: [{ url: "/salon-central-favicon.png", type: "image/png", sizes: "1254x1254" }],
    apple: { url: "/salon-central-favicon.png", sizes: "1254x1254", type: "image/png" },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the nonce injected by middleware so Next.js can apply it to its
  // internal inline hydration scripts, satisfying the nonce-based CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en">
      <head>
        {/* Propagate nonce so any manually-added scripts can use it */}
        {nonce && <meta name="csp-nonce" content={nonce} />}
      </head>
      <body className={montserrat.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
