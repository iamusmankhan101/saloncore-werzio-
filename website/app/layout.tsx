import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "../lib/seo";

const title = "Salon Software, POS & CRM for Beauty Salons | Salon Central";
const description = siteConfig.description;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: title,
    template: `%s | ${siteConfig.name}`,
  },
  description,
  keywords: [
    "salon software",
    "beauty salon software",
    "salon management software",
    "salon management software pakistan",
    "beauty parlour software",
    "beauty salon management software",
    "salon crm software",
    "salon pos system",
    "salon point of sale",
    "salon point of sale system",
    "salon point of sale systems",
    "salon point of sale software",
    "salon pos software",
    "hair salon point of sale",
    "hair salon point of sale systems",
    "hair salon pos",
    "hair salon pos software",
    "point of sale software for hair salon",
    "beauty salon point of sale",
    "beauty salon point of sale system",
    "beauty salon point of sale software",
    "beauty salon software point of sale",
    "beauty salon pos",
    "beauty salon pos software",
    "pos software for beauty salon",
    "pos system for beauty salon",
    "spa point of sale systems",
    "salon software for booth renters",
  ],
  alternates: { canonical: siteConfig.url },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: siteConfig.ogImageWidth,
        height: siteConfig.ogImageHeight,
        alt: siteConfig.name,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [siteConfig.ogImage],
  },
  icons: {
    icon: [{ url: "/salon-central-favicon.png", type: "image/png", sizes: "1254x1254" }],
    apple: { url: "/salon-central-favicon.png", sizes: "1254x1254", type: "image/png" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: siteConfig.name,
  url: siteConfig.url,
  description,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    priceCurrency: "PKR",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
