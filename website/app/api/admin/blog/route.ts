import { NextRequest, NextResponse } from "next/server";
import { requireBlogSession } from "@/lib/blog-auth";
import { getAllPostsForAdmin, createPost, isSlugTaken, slugify, type PostStatus } from "@/lib/blog";

export async function GET(req: NextRequest) {
  if (!requireBlogSession(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const posts = await getAllPostsForAdmin();
  return NextResponse.json({ ok: true, posts });
}

export async function POST(req: NextRequest) {
  if (!requireBlogSession(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null) as {
    title?: string; slug?: string; excerpt?: string; contentMd?: string;
    coverImage?: string | null; author?: string; tags?: string[];
    status?: PostStatus; seoTitle?: string | null; seoDescription?: string | null;
  } | null;

  if (!body?.title?.trim() || !body?.contentMd?.trim()) {
    return NextResponse.json({ ok: false, error: "Title and content are required." }, { status: 400 });
  }

  const slug = slugify(body.slug?.trim() || body.title);
  if (await isSlugTaken(slug)) {
    return NextResponse.json({ ok: false, error: `The slug "${slug}" is already in use by another post.` }, { status: 409 });
  }

  const post = await createPost({
    slug,
    title: body.title.trim(),
    excerpt: body.excerpt?.trim() || "",
    contentMd: body.contentMd,
    coverImage: body.coverImage || null,
    author: body.author?.trim() || "",
    tags: Array.isArray(body.tags) ? body.tags : [],
    status: body.status === "published" ? "published" : "draft",
    seoTitle: body.seoTitle?.trim() || null,
    seoDescription: body.seoDescription?.trim() || null,
  });
  return NextResponse.json({ ok: true, post });
}
