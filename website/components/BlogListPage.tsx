import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";
import type { BlogPost } from "@/lib/blog";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function BlogListPage({ posts }: { posts: BlogPost[] }) {
  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "140px 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h1 style={{ fontSize: "2.4rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 12 }}>
            Salon Central Blog
          </h1>
          <p style={{ fontSize: "1.05rem", color: "var(--text-muted)", maxWidth: 560, margin: "0 auto" }}>
            Tips, guides, and product updates for running a smarter salon.
          </p>
        </div>

        {posts.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "60px 0" }}>
            No posts published yet — check back soon.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 28 }}>
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                style={{ textDecoration: "none", color: "inherit", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", transition: "transform 0.15s, box-shadow 0.15s" }}
                className="blog-card"
              >
                <div style={{ aspectRatio: "16/9", background: "var(--purple-50)", overflow: "hidden" }}>
                  {post.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--purple-light)", fontSize: 13, fontWeight: 700 }}>
                      Salon Central
                    </div>
                  )}
                </div>
                <div style={{ padding: "20px 22px", flex: 1, display: "flex", flexDirection: "column" }}>
                  {post.tags.length > 0 && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                      {post.tags[0]}
                    </div>
                  )}
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text)", marginBottom: 8, lineHeight: 1.35 }}>{post.title}</h2>
                  {post.excerpt && <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 14, flex: 1 }}>{post.excerpt}</p>}
                  <div style={{ fontSize: 12, color: "#9a94ad" }}>
                    {post.publishedAt ? fmtDate(post.publishedAt) : ""}{post.author ? ` · ${post.author}` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
