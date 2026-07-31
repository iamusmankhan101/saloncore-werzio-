import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import type { BlogPost } from "@/lib/blog";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function flattenText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return flattenText((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

// Ranked-listicle headings ("## #1 Salon Central -- Best Overall...") read as a
// dense wall of bold display-font text at sentence length. Split them into a
// rank badge + bold product name + a lighter tagline instead of one run-on line.
const RANK_HEADING_RE = /^#(\d+)\s+(.+?)\s+(?:--|—)\s+(.+)$/;

function RankedHeading({ children }: { children?: ReactNode }) {
  const text = flattenText(children).trim();
  const match = text.match(RANK_HEADING_RE);
  if (!match) return <h2>{children}</h2>;
  const [, rank, name, tagline] = match;
  return (
    <h2 style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
      <span
        style={{
          flexShrink: 0, width: 52, height: 52, borderRadius: 14,
          background: "linear-gradient(135deg, var(--purple), var(--indigo))", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Clash Display', 'Inter', sans-serif", fontWeight: 600, fontSize: 22,
        }}
      >
        {rank}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
        <span style={{ fontFamily: "'Clash Display', 'Inter', sans-serif", fontWeight: 600, fontSize: "1.75rem", color: "var(--text)", lineHeight: 1.25 }}>
          {name}
        </span>
        <span style={{ fontFamily: "'Montserrat', 'Inter', sans-serif", fontWeight: 500, fontSize: "1.1rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          {tagline}
        </span>
      </span>
    </h2>
  );
}

function readingTime(md: string) {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {post.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)", background: "var(--purple-50)", padding: "4px 12px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.03em", border: "1px solid var(--purple-100)" }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.6rem)", fontWeight: 600, color: "var(--text)", letterSpacing: "-0.02em", lineHeight: 1.18, marginBottom: 18 }}>
          {post.title}
        </h1>

        {post.excerpt && (
          <p style={{ fontSize: 17, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 22 }}>
            {post.excerpt}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, fontSize: 13, color: "#9a94ad", paddingBottom: 28, marginBottom: 40, borderBottom: "1px solid var(--border)" }}>
          {post.author && <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>{post.author}</span>}
          {post.publishedAt && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Calendar size={13} /> {fmtDate(post.publishedAt)}
            </span>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Clock size={13} /> {readingTime(post.contentMd)} min read
          </span>
        </div>

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt={post.title} style={{ width: "100%", borderRadius: 16, marginBottom: 44, boxShadow: "0 16px 40px rgba(17,17,17,0.1)" }} />
        )}

        <div className="blog-markdown">
          {/* Some posts were authored with literal HTML tags (e.g. <h2>) instead of
              Markdown syntax — rehype-raw parses those back into real elements so they
              pick up the heading styles below instead of showing as escaped text.
              rehype-sanitize strips anything unsafe (scripts, event handlers, etc.)
              since this content is admin-authored but rendered on the public site. */}
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]} components={{ h2: RankedHeading }}>{post.contentMd}</ReactMarkdown>
        </div>
      </main>
      <Footer />
    </>
  );
}
