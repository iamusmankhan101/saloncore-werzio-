import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import type { BlogPost } from "@/lib/blog";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function BlogPostPage({ post }: { post: BlogPost }) {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "140px 24px 100px" }}>
        <Link href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--purple)", textDecoration: "none", marginBottom: 28 }}>
          <ArrowLeft size={14} /> All posts
        </Link>

        {post.tags.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {post.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", background: "var(--purple-50)", padding: "3px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <h1 style={{ fontSize: "2.2rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 14 }}>
          {post.title}
        </h1>

        <div style={{ fontSize: 13, color: "#9a94ad", marginBottom: 32 }}>
          {post.publishedAt ? fmtDate(post.publishedAt) : ""}{post.author ? ` · ${post.author}` : ""}
        </div>

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt={post.title} style={{ width: "100%", borderRadius: 16, marginBottom: 40 }} />
        )}

        <div className="blog-markdown">
          <ReactMarkdown>{post.contentMd}</ReactMarkdown>
        </div>
      </main>
      <Footer />
    </>
  );
}
