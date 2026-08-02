"use client";

import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

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

// Step/sequence headings ("## Step 1: Wash the hair", "## 2. Apply the mask",
// "## 3) Style", "## 4 — Finish") get a numbered badge so instructions don't
// look like plain bold text.
const STEP_HEADING_RE = /^(?:step\s*)?#?\s*(\d{1,2})\s*[.):\-—–]+\s+(.+)$/i;

const DISPLAY_FONT = "'Clash Display', 'Inter', sans-serif";

function SectionHeading({ level, children }: { level: "h2" | "h3"; children?: ReactNode }) {
  const Tag = level;
  const text = flattenText(children).trim();

  const ranked = text.match(RANK_HEADING_RE);
  if (ranked) {
    const [, rank, name, tagline] = ranked;
    const isH2 = level === "h2";
    return (
      <Tag style={{ display: "flex", alignItems: "flex-start", gap: isH2 ? 18 : 14 }}>
        <span
          style={{
            flexShrink: 0, width: isH2 ? 52 : 42, height: isH2 ? 52 : 42, borderRadius: isH2 ? 14 : 12,
            background: "linear-gradient(135deg, var(--purple), var(--indigo))", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: isH2 ? 22 : 18,
          }}
        >
          {rank}
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
          <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: isH2 ? "1.75rem" : "1.4rem", color: "var(--text)", lineHeight: 1.25 }}>
            {name}
          </span>
          <span style={{ fontFamily: "'Montserrat', 'Inter', sans-serif", fontWeight: 500, fontSize: isH2 ? "1.1rem" : "0.95rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {tagline}
          </span>
        </span>
      </Tag>
    );
  }

  const step = text.match(STEP_HEADING_RE);
  if (step) {
    const [, num, title] = step;
    const isH2 = level === "h2";
    return (
      <Tag style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span
          style={{
            flexShrink: 0, width: isH2 ? 40 : 32, height: isH2 ? 40 : 32, borderRadius: 11,
            background: "linear-gradient(135deg, var(--purple), var(--indigo))", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: isH2 ? 19 : 16,
            boxShadow: "0 4px 12px rgba(91,33,182,0.22)",
          }}
        >
          {num}
        </span>
        <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: isH2 ? "1.4rem" : "1.15rem", color: "var(--text)", lineHeight: 1.3 }}>
          {title}
        </span>
      </Tag>
    );
  }

  return <Tag>{children}</Tag>;
}

const components: Components = {
  h2: (props) => <SectionHeading level="h2" {...props} />,
  h3: (props) => <SectionHeading level="h3" {...props} />,
};

// Some posts authored h3 sub-sections without numbers in the markdown, so they
// rendered as plain headings while "Step 1:" style h3s got a badge. Number any
// unnumbered h3 sequentially so every h3 gets the attractive badge treatment.
function autoNumberH3(md: string): string {
  let n = 0;
  return md
    .split("\n")
    .map((line) => {
      const match = line.match(/^(#{3})\s+(.*)$/);
      if (!match) return line;
      const text = match[2].trim();
      if (!text || RANK_HEADING_RE.test(text) || STEP_HEADING_RE.test(text)) return line;
      n += 1;
      return `### ${n}. ${text}`;
    })
    .join("\n");
}

/** Shared markdown renderer for blog posts — identical output in the CMS
 *  preview and on the public page, with attractive numbered headings. */
export default function BlogMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]} components={components}>
      {autoNumberH3(children)}
    </ReactMarkdown>
  );
}
