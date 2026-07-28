import BlogListPage from "@/components/BlogListPage";
import { pageMetadata } from "@/lib/seo";
import { getPublishedPosts } from "@/lib/blog";

export const metadata = pageMetadata({
  title: "Blog",
  description: "Tips, guides, and product updates for running a smarter salon — from the Salon Central team.",
  path: "/blog",
});

export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  return <BlogListPage posts={posts} />;
}
