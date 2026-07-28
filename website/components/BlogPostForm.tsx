"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Upload, Loader2, ImageOff } from "lucide-react";
import type { BlogPost } from "@/lib/blog";

const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e3e0eb",
  fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
const label: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#6b6b8a",
  textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6,
};
const field: React.CSSProperties = { marginBottom: 16 };

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function BlogPostForm({ initial }: { initial?: BlogPost }) {
  const router = useRouter();
  const isEditing = !!initial;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [contentMd, setContentMd] = useState(initial?.contentMd ?? "");
  const [coverImage, setCoverImage] = useState<string | null>(initial?.coverImage ?? null);
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(", "));
  const [status, setStatus] = useState<"draft" | "published">(initial?.status ?? "draft");
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const sigRes = await fetch("/api/admin/blog/upload-image", { method: "POST" });
      const sig = await sigRes.json() as { ok: boolean; error?: string; apiKey?: string; timestamp?: number; signature?: string; cloudName?: string; folder?: string };
      if (!sig.ok) throw new Error(sig.error || "Could not authorize the upload.");

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sig.apiKey!);
      form.append("timestamp", String(sig.timestamp));
      form.append("signature", sig.signature!);
      form.append("folder", sig.folder!);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: form });
      const uploaded = await uploadRes.json() as { secure_url?: string; error?: { message?: string } };
      if (!uploaded.secure_url) throw new Error(uploaded.error?.message || "Image upload failed.");
      setCoverImage(uploaded.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(publishOverride?: "draft" | "published") {
    if (!title.trim() || !contentMd.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      title, slug, excerpt, contentMd, coverImage, author,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
      status: publishOverride ?? status,
      seoTitle: seoTitle.trim() || null,
      seoDescription: seoDescription.trim() || null,
    };
    try {
      const url = isEditing ? `/api/admin/blog/${initial!.id}` : "/api/admin/blog";
      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || "Could not save the post.");
      router.push("/admin/blog");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the post.");
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      {/* Left: form fields */}
      <div>
        <div style={field}>
          <label style={label}>Title</label>
          <input style={inp} value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="e.g. 5 Ways to Reduce No-Shows at Your Salon" />
        </div>

        <div style={field}>
          <label style={label}>Slug</label>
          <input style={inp} value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} placeholder="5-ways-to-reduce-no-shows" />
          <div style={{ fontSize: 11, color: "#a0a0b8", marginTop: 4 }}>salon central.xyz/blog/{slug || "…"}</div>
        </div>

        <div style={field}>
          <label style={label}>Excerpt</label>
          <textarea style={{ ...inp, resize: "vertical" }} rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="One or two sentences shown on the blog list page" />
        </div>

        <div style={field}>
          <label style={label}>Cover Image</label>
          {coverImage ? (
            <div style={{ position: "relative", marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage} alt="Cover" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8, border: "1px solid #e3e0eb" }} />
              <button type="button" onClick={() => setCoverImage(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 6, color: "#fff", padding: "4px 8px", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <ImageOff size={12} /> Remove
              </button>
            </div>
          ) : null}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, border: "1px solid #e3e0eb", background: "#fafafd", fontSize: 12, fontWeight: 700, color: "#6b46c1", cursor: uploading ? "wait" : "pointer" }}>
            {uploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
            {uploading ? "Uploading…" : coverImage ? "Replace image" : "Upload image"}
            <input type="file" accept="image/*" onChange={handleImageChange} disabled={uploading} style={{ display: "none" }} />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={field}>
            <label style={label}>Author</label>
            <input style={inp} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="e.g. Salon Central Team" />
          </div>
          <div style={field}>
            <label style={label}>Tags</label>
            <input style={inp} value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="pos, marketing, retention" />
          </div>
        </div>

        <div style={field}>
          <label style={label}>SEO Title <span style={{ fontWeight: 500, textTransform: "none" }}>(optional — falls back to Title)</span></label>
          <input style={inp} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
        </div>
        <div style={field}>
          <label style={label}>SEO Description <span style={{ fontWeight: 500, textTransform: "none" }}>(optional — falls back to Excerpt)</span></label>
          <textarea style={{ ...inp, resize: "vertical" }} rows={2} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
        </div>

        <div style={field}>
          <label style={label}>Content (Markdown)</label>
          <textarea style={{ ...inp, resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: 12.5, lineHeight: 1.6 }} rows={18} value={contentMd} onChange={(e) => setContentMd(e.target.value)} placeholder={"## A heading\n\nWrite your post in Markdown — **bold**, *italic*, [links](https://example.com), lists, images, etc."} />
        </div>

        {error && <div style={{ marginBottom: 12, fontSize: 12, color: "#dc2626", fontWeight: 600 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" disabled={saving} onClick={() => handleSave("draft")} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid #e3e0eb", background: "#fff", color: "#6b6b8a", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>
            Save Draft
          </button>
          <button type="button" disabled={saving} onClick={() => handleSave("published")} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#5B21B6,#9333EA)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>
            {saving ? "Saving…" : "Publish"}
          </button>
        </div>
        {isEditing && status === "published" && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#a0a0b8" }}>This post is live. Saving as draft will unpublish it from the site.</div>
        )}
      </div>

      {/* Right: live preview */}
      <div style={{ position: "sticky", top: 20, border: "1px solid #e3e0eb", borderRadius: 12, padding: 20, background: "#fff", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "#a0a0b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Preview</div>
        {coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImage} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, marginBottom: 14 }} />
        )}
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>{title || "Untitled post"}</h1>
        {excerpt && <p style={{ color: "#6b6b8a", fontSize: 14, marginBottom: 16 }}>{excerpt}</p>}
        <div className="blog-markdown">
          <ReactMarkdown>{contentMd || "*Start writing to see a preview…*"}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
