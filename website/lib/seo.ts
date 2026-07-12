import type { Metadata } from "next";

export const siteConfig = {
  name: "Salon Central",
  url: "https://www.saloncentral.xyz",
  description:
    "Salon Central is an all-in-one hair and beauty salon management software in Pakistan with POS, appointment booking, CRM, invoicing, inventory, payroll, and WhatsApp automation.",
  ogImage: "/calendar-hero.png",
  ogImageWidth: 2856,
  ogImageHeight: 1610,
};

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
