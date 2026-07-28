"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function BlogLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/blog/logout", { method: "POST" });
    router.push("/admin/blog/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10, border: "1px solid #e3e0eb", background: "#fff", color: "#6b6b8a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
    >
      <LogOut size={14} /> Log out
    </button>
  );
}
