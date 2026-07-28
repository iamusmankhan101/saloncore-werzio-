import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata, siteConfig } from "@/lib/seo";
import { getPostBySlug } from "@/lib/blog";
import BlogPostPage from "@/components/BlogPostPage";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return pageMetadata({ title: "Post not found", description: "This blog post could not be found.", path: `/blog/${slug}` });

  return pageMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt || post.title,
    path: `/blog/${post.slug}`,
    keywords: post.seoKeywords.length > 0 ? post.seoKeywords : post.tags,
  });
}

export default async function BlogSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.coverImage || undefined,
    author: post.author ? { "@type": "Person", name: post.author } : { "@type": "Organization", name: siteConfig.name },
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: `${siteConfig.url}/blog/${post.slug}`,
    publisher: { "@type": "Organization", name: siteConfig.name },
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogPostPage post={post} />
    </>
  );
}
