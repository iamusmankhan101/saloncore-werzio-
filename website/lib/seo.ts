import type { Metadata } from "next";

export const siteConfig = {
  name: "Salon Central",
  url: "https://www.saloncentral.xyz",
  description:
    "Salon Central is all-in-one salon management software in Pakistan: POS, appointment booking, CRM, invoicing, inventory, payroll, and WhatsApp automation.",
  ogImage: "/og-image.jpg",
  ogImageWidth: 1200,
  ogImageHeight: 676,
};

/** Builds a BreadcrumbList JSON-LD object. `items` is root-to-leaf order;
 * each `path` is relative (e.g. "/features/pos"), resolved against siteConfig.url. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteConfig.url}${item.path}`,
    })),
  };
}

export function pageMetadata({
  title,
  description,
  path = "",
  keywords,
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
}): Metadata {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = `${title} | ${siteConfig.name}`;

  return {
    title,
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
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
      title: fullTitle,
      description,
      images: [siteConfig.ogImage],
    },
  };
}

/** Builds a WebPage JSON-LD object for an inner page (feature/solution/compare). */
export function webPageJsonLd({ name, description, path }: { name: string; description: string; path: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: `${siteConfig.url}${path}`,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", name: siteConfig.name, url: siteConfig.url },
    // No "about" reference to SoftwareApplication here — a stub with just
    // name/url gets validated as an incomplete SoftwareApplication by
    // Google (fails the "2 of offers/aggregateRating/applicationCategory/
    // operatingSystem" rule) on every one of these pages. The one real,
    // fully-populated SoftwareApplication block lives on the homepage.
  };
}
