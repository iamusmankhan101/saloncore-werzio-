"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeletePostButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#dc2626" }}>Delete "{title}"?</span>
        <button type="button" onClick={handleDelete} disabled={deleting} style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "#dc2626", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>
          {deleting ? "…" : "Yes"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} style={{ fontSize: 11, fontWeight: 700, color: "#6b6b8a", background: "none", border: "none", cursor: "pointer" }}>
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button type="button" onClick={() => setConfirming(true)} aria-label={`Delete ${title}`} style={{ display: "flex", alignItems: "center", background: "none", border: "none", color: "#dc2626", cursor: "pointer", padding: 0 }}>
      <Trash2 size={14} />
    </button>
  );
}
