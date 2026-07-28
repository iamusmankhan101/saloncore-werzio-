import { NextRequest, NextResponse } from "next/server";
import { requireBlogSession } from "@/lib/blog-auth";
import { getPostByIdForAdmin, updatePost, deletePost, isSlugTaken, slugify, type PostStatus } from "@/lib/blog";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireBlogSession(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const post = await getPostByIdForAdmin(id);
  if (!post) return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
  return NextResponse.json({ ok: true, post });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireBlogSession(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getPostByIdForAdmin(id);
  if (!existing) return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });

  const body = await req.json().catch(() => null) as {
    title?: string; slug?: string; excerpt?: string; contentMd?: string;
    coverImage?: string | null; author?: string; tags?: string[];
    status?: PostStatus; seoTitle?: string | null; seoDescription?: string | null; seoKeywords?: string[];
  } | null;

  if (!body?.title?.trim() || !body?.contentMd?.trim()) {
    return NextResponse.json({ ok: false, error: "Title and content are required." }, { status: 400 });
  }

  const slug = slugify(body.slug?.trim() || body.title);
  if (await isSlugTaken(slug, id)) {
    return NextResponse.json({ ok: false, error: `The slug "${slug}" is already in use by another post.` }, { status: 409 });
  }

  const post = await updatePost(id, {
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
    seoKeywords: Array.isArray(body.seoKeywords) ? body.seoKeywords : [],
  });
  return NextResponse.json({ ok: true, post });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireBlogSession(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await deletePost(id);
  return NextResponse.json({ ok: true });
}
