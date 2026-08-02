/**
 * lib/seo-analyzer.ts
 * Client-side on-page SEO analysis for blog posts — inspired by the Yoast SEO
 * and Rank Math keyphrase checkers in WordPress. Analyzes a post draft against
 * the author's focus keyphrase (the first keyword in the Keywords field) and
 * common on-page factors, producing a 0–100 score plus a checklist of checks.
 *
 * Pure functions only (no React/DOM), so it's trivially testable and safe to
 * run in the browser on every keystroke.
 */

export type CheckStatus = "pass" | "warn" | "fail";
export type CheckGroup = "keyphrase" | "content" | "meta";

export interface SeoCheck {
  id: string;
  group: CheckGroup;
  label: string;
  hint: string;
  status: CheckStatus;
  weight: number;
}

export interface SeoAnalysis {
  score: number;
  grade: "good" | "ok" | "bad";
  focusKeyword: string;
  checks: SeoCheck[];
  wordCount: number;
  keywordCount: number;
  keywordDensity: number;
}

// ─── Markdown helpers ────────────────────────────────────────────────────────

function stripMarkdown(md: string): string {
  let s = md.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`[^`]*`/g, " ");
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, " $1 ");
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, " $1 ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/(\*\*|__)(.*?)\1/g, "$2");
  s = s.replace(/(\*|_)(.*?)\1/g, "$2");
  s = s.replace(/^\s*>\s?/gm, "");
  return s;
}

function stripInline(md: string): string {
  return stripMarkdown(md).trim();
}

function wordCount(text: string): number {
  return stripMarkdown(text).split(/\s+/).filter(Boolean).length;
}

function countOccurrences(text: string, keyword: string): number {
  const t = text.toLowerCase();
  const k = keyword.toLowerCase().trim();
  if (!k) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = t.indexOf(k, idx)) !== -1) {
    count++;
    idx += k.length;
  }
  return count;
}

function has(text: string, keyword: string): boolean {
  return !!keyword && text.toLowerCase().includes(keyword.toLowerCase().trim());
}

function headings(md: string): { level: number; text: string }[] {
  return md
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^#{1,6}\s+/.test(l))
    .map((l) => {
      const m = l.match(/^(#{1,6})\s+(.*)$/)!;
      return { level: m[1].length, text: stripInline(m[2]) };
    });
}

interface ExtractedImage {
  alt: string;
  src: string;
}

function images(md: string, coverImage: string | null, coverAlt: string): ExtractedImage[] {
  const out: ExtractedImage[] = [];
  const mdRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdRe.exec(md))) out.push({ alt: m[1].trim(), src: m[2] });
  const htmlRe = /<img\s+[^>]*>/gi;
  while ((m = htmlRe.exec(md))) {
    const tag = m[0];
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1] ?? "";
    const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1] ?? "";
    out.push({ alt, src });
  }
  if (coverImage) out.push({ alt: coverAlt, src: coverImage });
  return out;
}

interface ExtractedLink {
  text: string;
  href: string;
}

function links(md: string): ExtractedLink[] {
  const out: ExtractedLink[] = [];
  const re = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]*)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    if (m[1] !== undefined || m[3] === undefined) continue;
    const href = m[4].trim();
    if (/^(https?:)?\/\//i.test(href) || href.startsWith("/")) out.push({ text: m[3], href });
  }
  const htmlRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = htmlRe.exec(md))) {
    const href = m[1].trim();
    if (/^(https?:)?\/\//i.test(href) || href.startsWith("/")) {
      out.push({ text: stripInline(m[2]), href });
    }
  }
  return out;
}

function paragraphs(md: string): string[] {
  return stripMarkdown(md)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter((p) => wordCount(p) > 0);
}

function firstParagraph(md: string): string {
  const body = stripMarkdown(md);
  const blocks = body.split(/\n\s*\n/).map((p) => p.replace(/\n/g, " ").trim());
  return blocks.find((p) => wordCount(p) >= 10) ?? blocks[0] ?? "";
}

function avgSentenceWords(md: string): number {
  const body = stripMarkdown(md).trim();
  if (!body) return 0;
  const sentences = body.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) return wordCount(body);
  return Math.round(sentences.reduce((s, x) => s + wordCount(x), 0) / sentences.length);
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export function analyzeSeo(input: {
  title: string;
  slug: string;
  description: string;
  contentMd: string;
  coverImage: string | null;
  focusKeyword: string;
}): SeoAnalysis {
  const kw = input.focusKeyword.trim();
  const contentWords = wordCount(input.contentMd);
  const allText = `${input.title} ${input.description} ${input.contentMd}`;
  const kwCount = countOccurrences(allText, kw);
  const kwInContent = countOccurrences(input.contentMd, kw);
  const density = contentWords > 0 ? (kwCount / contentWords) * 100 : 0;

  const headingsList = headings(input.contentMd);
  const imagesList = images(input.contentMd, input.coverImage, input.title);
  const linksList = links(input.contentMd);
  const paragraphsList = paragraphs(input.contentMd);
  const firstPara = firstParagraph(input.contentMd);
  const avgSentence = avgSentenceWords(input.contentMd);
  const longParagraphs = paragraphsList.filter((p) => wordCount(p) >= 150).length;

  const title = input.title.trim();
  const description = input.description.trim();

  const checks: SeoCheck[] = [];

  const addCheck = (
    id: string,
    group: CheckGroup,
    label: string,
    status: CheckStatus,
    weight: number,
    hint: string,
  ) => checks.push({ id, group, label, hint, status, weight });

  // ── Keyphrase ──────────────────────────────────────────────────────────────
  const noKwHint = `Set a focus keyphrase — type it first in the Keywords field — to analyze keyphrase usage.`;

  addCheck(
    "kwTitle", "keyphrase",
    "Keyphrase in SEO title",
    kw ? (has(title, kw) ? "pass" : "fail") : "fail",
    10,
    kw ? (has(title, kw) ? `"${kw}" appears in the title.` : `Add "${kw}" to the SEO title.`) : noKwHint,
  );

  addCheck(
    "kwSlug", "keyphrase",
    "Keyphrase in slug (URL)",
    kw ? (has(input.slug, kw) ? "pass" : "fail") : "fail",
    5,
    kw ? (has(input.slug, kw) ? "Keyphrase is in the URL slug." : `Include "${kw}" in the slug (e.g. /blog/${kw.toLowerCase().replace(/[^a-z0-9]+/g, "-")}).`) : noKwHint,
  );

  addCheck(
    "kwDescription", "keyphrase",
    "Keyphrase in meta description",
    kw ? (has(description, kw) ? "pass" : "fail") : "fail",
    6,
    kw ? (has(description, kw) ? `"${kw}" appears in the meta description.` : `Add "${kw}" to the meta description.`) : noKwHint,
  );

  addCheck(
    "kwFirstParagraph", "keyphrase",
    "Keyphrase in first paragraph",
    kw ? (has(firstPara, kw) ? "pass" : "fail") : "fail",
    8,
    kw ? (has(firstPara, kw) ? "Keyphrase is in the opening paragraph." : `Mention "${kw}" in the first paragraph — ideally in the first sentence.`) : noKwHint,
  );

  const headingWithKw = headingsList.some((h) => h.text.toLowerCase().includes(kw.toLowerCase()));
  addCheck(
    "kwHeadings", "keyphrase",
    "Keyphrase in subheadings",
    kw ? (headingWithKw ? "pass" : "fail") : "fail",
    6,
    kw ? (headingWithKw ? "Keyphrase appears in at least one heading." : `Use "${kw}" in an H2 or H3 heading.`) : noKwHint,
  );

  const kwContentStatus: CheckStatus = !kw ? "fail" : kwInContent >= 3 ? "pass" : kwInContent >= 1 ? "warn" : "fail";
  addCheck(
    "kwContent", "keyphrase",
    "Keyphrase in content",
    kwContentStatus,
    8,
    !kw ? noKwHint : kwInContent >= 3
      ? `Used ${kwInContent} time${kwInContent === 1 ? "" : "s"} in the post (density ~${density.toFixed(1)}%).`
      : kwInContent >= 1
        ? `Used ${kwInContent} time${kwInContent === 1 ? "" : "s"}. Aim for at least 3 uses.`
        : `"${kw}" isn't used anywhere in the body. Mention it naturally a few times.`,
  );

  const altWithKw = imagesList.some((img) => img.alt.toLowerCase().includes(kw.toLowerCase()));
  addCheck(
    "kwAlt", "keyphrase",
    "Keyphrase in image alt text",
    kw ? (altWithKw ? "pass" : "warn") : "fail",
    4,
    kw ? (altWithKw ? "Keyphrase appears in an image's alt text." : `Add "${kw}" to an image alt text where it fits naturally.`) : noKwHint,
  );

  // ── Content & readability ───────────────────────────────────────────────────
  const lenStatus: CheckStatus = contentWords >= 300 ? "pass" : contentWords >= 150 ? "warn" : "fail";
  addCheck(
    "contentLength", "content",
    "Content length",
    lenStatus,
    10,
    contentWords >= 300
      ? `${contentWords} words — plenty for search engines.`
      : contentWords >= 150
        ? `${contentWords} words. Aim for 300+ to rank.`
        : `Only ${contentWords} words. Expand to at least 300.`,
  );

  addCheck(
    "hasImages", "content",
    "Includes images",
    imagesList.length > 0 ? "pass" : "fail",
    4,
    imagesList.length > 0 ? `${imagesList.length} image${imagesList.length === 1 ? "" : "s"} in the post.` : "Add images — posts with visuals rank better.",
  );

  const allAlt = imagesList.length > 0 && imagesList.every((img) => img.alt.length > 0);
  const someAlt = imagesList.some((img) => img.alt.length > 0);
  addCheck(
    "imageAlt", "content",
    "Images have alt text",
    imagesList.length === 0 ? "fail" : allAlt ? "pass" : someAlt ? "warn" : "fail",
    5,
    imagesList.length === 0
      ? "No images to describe yet."
      : allAlt
        ? "Every image has descriptive alt text."
        : someAlt
          ? "Some images are missing alt text."
          : "Add descriptive alt text to every image.",
  );

  addCheck(
    "outboundLink", "content",
    "Includes a link",
    linksList.length > 0 ? "pass" : "fail",
    4,
    linksList.length > 0 ? `${linksList.length} link${linksList.length === 1 ? "" : "s"} in the post.` : "Add at least one outbound or internal link to build authority.",
  );

  addCheck(
    "subheadings", "content",
    "Uses subheadings",
    headingsList.length > 0 ? "pass" : "fail",
    6,
    headingsList.length > 0 ? `${headingsList.length} H2/H3 heading${headingsList.length === 1 ? "" : "s"} found.` : "Break the post into sections with H2/H3 subheadings.",
  );

  const readStatus: CheckStatus = avgSentence === 0 ? "fail" : avgSentence <= 17 && longParagraphs === 0 ? "pass" : avgSentence <= 22 && longParagraphs <= 1 ? "warn" : "fail";
  addCheck(
    "readability", "content",
    "Readability",
    readStatus,
    8,
    avgSentence === 0
      ? "Write some content first."
      : readStatus === "pass"
        ? `Average sentence is ${avgSentence} words with no oversized paragraphs.`
        : readStatus === "warn"
          ? `Average sentence is ${avgSentence} words — keep sentences under ~18 and paragraphs short.`
          : `Average sentence is ${avgSentence} words with ${longParagraphs} very long paragraph${longParagraphs === 1 ? "" : "s"}. Shorten for readability.`,
  );

  // ── Meta lengths ────────────────────────────────────────────────────────────
  const titleLen = title.length;
  const titleStatus: CheckStatus = titleLen >= 30 && titleLen <= 60 ? "pass" : titleLen >= 25 && titleLen <= 65 ? "warn" : "fail";
  addCheck(
    "titleLength", "meta",
    "SEO title length",
    titleStatus,
    8,
    titleLen === 0
      ? "Add an SEO title."
      : titleStatus === "pass"
        ? `${titleLen} characters — within the ideal 30–60.`
        : `${titleLen} characters. Aim for 30–60 so the title doesn't get cut off in search results.`,
  );

  const descLen = description.length;
  const descStatus: CheckStatus = descLen >= 50 && descLen <= 160 ? "pass" : descLen >= 40 && descLen <= 170 ? "warn" : "fail";
  addCheck(
    "descLength", "meta",
    "Meta description length",
    descStatus,
    8,
    descLen === 0
      ? "Add a meta description."
      : descStatus === "pass"
        ? `${descLen} characters — within the ideal 50–160.`
        : `${descLen} characters. Aim for 50–160 so it doesn't get truncated in search results.`,
  );

  // ── Score ───────────────────────────────────────────────────────────────────
  let earned = 0;
  let total = 0;
  for (const c of checks) {
    total += c.weight;
    earned += c.status === "pass" ? c.weight : c.status === "warn" ? c.weight * 0.5 : 0;
  }
  const score = Math.round((earned / total) * 100);

  return {
    score,
    grade: score >= 80 ? "good" : score >= 50 ? "ok" : "bad",
    focusKeyword: kw,
    checks,
    wordCount: contentWords,
    keywordCount: kwCount,
    keywordDensity: density,
  };
}
