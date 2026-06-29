import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salon Central — The All-in-One Salon Operating System",
  description:
    "Manage bookings, clients, staff, and revenue via WhatsApp. Built for Pakistan's beauty industry.",
  icons: {
    icon: [{ url: "/salon-central-favicon.png", type: "image/png", sizes: "1254x1254" }],
    apple: { url: "/salon-central-favicon.png", sizes: "1254x1254", type: "image/png" },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Inter — body copy */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Montserrat:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
