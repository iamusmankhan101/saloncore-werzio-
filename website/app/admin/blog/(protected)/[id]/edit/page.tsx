import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPostByIdForAdmin } from "@/lib/blog";
import BlogPostForm from "@/components/BlogPostForm";

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostByIdForAdmin(id);
  if (!post) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5f7", fontFamily: "system-ui, sans-serif", padding: "32px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Link href="/admin/blog" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#6b6b8a", textDecoration: "none", marginBottom: 18 }}>
          <ArrowLeft size={14} /> Back to posts
        </Link>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", marginBottom: 20 }}>Edit Post</div>
        <BlogPostForm initial={post} />
      </div>
    </div>
  );
}
