import type { Metadata } from "next";

export const siteConfig = {
  name: "Salon Central",
  url: "https://saloncentral.xyz",
  description:
    "Salon Central is salon management software Pakistan trusts, with a built-in salon POS system, CRM, and WhatsApp automation — built for beauty salons, spas, and parlours.",
  ogImage: "/calendar-hero.png",
  ogImageWidth: 2856,
  ogImageHeight: 1610,
};

export function pageMetadata({
  title,
  description,
  path = "",
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  const url = `${siteConfig.url}${path}`;
  const fullTitle = `${title} | ${siteConfig.name}`;

  return {
    title,
    description,
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
