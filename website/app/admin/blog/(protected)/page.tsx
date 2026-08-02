import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllPostsForAdmin } from "@/lib/blog";
import { analyzeSeo, type SeoAnalysis } from "@/lib/seo-analyzer";
import LogoutButton from "@/components/BlogLogoutButton";
import DeletePostButton from "@/components/DeletePostButton";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function seoFor(post: Awaited<ReturnType<typeof getAllPostsForAdmin>>[number]): SeoAnalysis {
  return analyzeSeo({
    title: post.seoTitle || post.title,
    slug: post.slug,
    description: post.seoDescription || post.excerpt,
    contentMd: post.contentMd,
    coverImage: post.coverImage,
    focusKeyword: post.seoKeywords[0] ?? "",
  });
}

function SeoScore({ score, grade }: { score: number; grade: SeoAnalysis["grade"] }) {
  const color = grade === "good" ? "#059669" : grade === "ok" ? "#d97706" : "#dc2626";
  const bg = grade === "good" ? "#ecfdf5" : grade === "ok" ? "#fffbeb" : "#fef2f2";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: bg, border: `1px solid ${color}33` }}>
      <span style={{ fontSize: 12, fontWeight: 800, color }}>{score}</span>
      <span style={{ fontSize: 9, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.8 }}>seo</span>
    </span>
  );
}

export default async function BlogAdminListPage() {
  const posts = await getAllPostsForAdmin();
  const analyses = new Map(posts.map((p) => [p.id, seoFor(p)]));
  const avgScore = posts.length
    ? Math.round(posts.reduce((s, p) => s + (analyses.get(p.id)?.score ?? 0), 0) / posts.length)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f5f7", fontFamily: "system-ui, sans-serif", padding: "32px 40px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>Blog Posts</div>
            <div style={{ fontSize: 13, color: "#8a8aa3", marginTop: 2 }}>
              {posts.length} post{posts.length === 1 ? "" : "s"} · avg SEO score{" "}
              <strong style={{ color: avgScore >= 80 ? "#059669" : avgScore >= 50 ? "#d97706" : "#dc2626" }}>{avgScore}</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/admin/blog/new" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#5B21B6,#9333EA)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              <Plus size={15} /> New Post
            </Link>
            <LogoutButton />
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e3e0eb", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 96px 120px 110px 140px", padding: "12px 20px", background: "#faf9fd", borderBottom: "1px solid #f0f0f5" }}>
            {["TITLE", "SEO", "STATUS", "UPDATED", "ACTIONS"].map((h) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 800, color: "#8e89a3", letterSpacing: "0.06em" }}>{h}</div>
            ))}
          </div>

          {posts.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "#a0a0b8", fontSize: 13 }}>
              No posts yet. Click &quot;New Post&quot; to write your first one.
            </div>
          ) : (
            posts.map((post) => {
              const analysis = analyses.get(post.id)!;
              return (
                <div key={post.id} style={{ display: "grid", gridTemplateColumns: "2fr 96px 120px 110px 140px", padding: "14px 20px", borderBottom: "1px solid #f8f8fc", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>{post.title}</div>
                    <div style={{ fontSize: 11, color: "#a0a0b8", marginTop: 2 }}>/blog/{post.slug}</div>
                  </div>
                  <div>
                    <Link href={`/admin/blog/${post.id}/edit`} title={`${analysis.focusKeyword ? `Focus keyphrase: ${analysis.focusKeyword}` : "No focus keyphrase"}`} style={{ textDecoration: "none" }}>
                      <SeoScore score={analysis.score} grade={analysis.grade} />
                    </Link>
                  </div>
                  <div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 20,
                      color: post.status === "published" ? "#059669" : "#d97706",
                      background: post.status === "published" ? "#ecfdf5" : "#fffbeb",
                    }}>
                      {post.status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b6b8a" }}>{fmtDate(post.updatedAt)}</div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {post.status === "published" && (
                      <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "#6b6b8a", textDecoration: "none" }}>View</a>
                    )}
                    <Link href={`/admin/blog/${post.id}/edit`} style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", textDecoration: "none" }}>Edit</Link>
                    <DeletePostButton id={post.id} title={post.title} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
