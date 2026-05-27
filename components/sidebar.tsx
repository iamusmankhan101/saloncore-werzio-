"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, CalendarDays, Users, ClipboardList, MessageSquare, UserCog, BarChart3, Package, Globe, Sparkles, Search, CreditCard, Scissors, CircleUserRound, LogOut, Shield, Wand2, ReceiptText } from "lucide-react";
import { AuthUser, getCurrentUser, signOut } from "@/lib/auth";
import { SETTINGS_CHANGED_EVENT, settingsStore } from "@/lib/settings-store";

const APP_NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/dashboard/appointments", icon: ClipboardList, label: "Appointments" },
  { href: "/dashboard/clients", icon: Users, label: "Clients" },
  { href: "/dashboard/services", icon: Scissors, label: "Services" },
  { href: "/dashboard/messages", icon: MessageSquare, label: "WhatsApp" },
  { href: "/dashboard/staff", icon: UserCog, label: "Staff" },
  { href: "/dashboard/revenue", icon: BarChart3, label: "Revenue" },
  { href: "/dashboard/inventory", icon: Package, label: "Inventory" },
  { href: "/dashboard/invoices", icon: ReceiptText, label: "Invoices" },
  { href: "/online-booking", icon: Globe, label: "Online Booking" },
  { href: "/dashboard/try-on", icon: Wand2, label: "Virtual Try-On" },
];

const SETTINGS_NAV = [
  { href: "/dashboard/account", icon: CircleUserRound, label: "Account" },
  { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [salonName, setSalonName] = useState("Werzio Salon");

  useEffect(() => {
    function syncAccountChrome() {
      setUser(getCurrentUser());
      setSalonName(settingsStore.salon.name || getCurrentUser()?.salonName || "Werzio Salon");
    }

    const timer = window.setTimeout(syncAccountChrome, 0);
    window.addEventListener(SETTINGS_CHANGED_EVENT, syncAccountChrome);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, syncAccountChrome);
    };
  }, [pathname]);

  function handleSignOut() {
    signOut();
    router.replace("/sign-in");
  }

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) => {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return (
      <Link href={href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 10, color: active ? "#ffffff" : "#6a6a8a", background: active ? "var(--accent-gradient)" : "transparent", fontWeight: active ? 600 : 400, fontSize: 13, transition: "all 0.15s", marginBottom: 2, boxShadow: active ? "0 2px 10px rgba(91, 33, 182, 0.35)" : "none" }}>
        <Icon size={16} />
        {label}
      </Link>
    );
  };

  // Compute initials from the signed-in owner's name
  const initials = (user?.ownerName || salonName || "W")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside style={{ width: "var(--sidebar-width)", height: "100vh", background: "#13131a", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 50, overflow: "hidden" }}>

      {/* ── Werzio logo badge ─────────────────────────────────────────── */}
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #1e1e2c", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img
          src="/werzio logo.png"
          alt="Werzio"
          style={{ height: 32, width: "auto", filter: "brightness(0) invert(1)", userSelect: "none", pointerEvents: "none" }}
        />
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(124,58,237,0.18)",
          border: "1px solid rgba(124,58,237,0.35)",
          borderRadius: 20, padding: "3px 10px 3px 7px",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 6px #7C3AED" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.05em" }}>LIVE</span>
        </div>
      </div>

      {/* ── Profile chip ─────────────────────────────────────────────── */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e1e2c", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #5B21B6, #9333EA)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: "#fff",
          boxShadow: "0 2px 8px rgba(91,33,182,0.45)",
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#f0f0f8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{salonName}</div>
          <div style={{ fontSize: 11, color: "#5a5a78", textTransform: "capitalize" }}>{user?.role || "owner"}</div>
        </div>
        <div style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid #2a2a3a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Sparkles size={12} color="#5a5a78" />
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #1e1e2a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1c1c28", border: "1px solid #2a2a3a", borderRadius: 8, padding: "7px 12px" }}>
          <Search size={13} color="#4a4a68" />
          <span style={{ fontSize: 12, color: "#4a4a68" }}>Search</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 10px 8px", overflowY: "auto" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#3a3a58", letterSpacing: "0.1em", padding: "0 14px 8px", textTransform: "uppercase" }}>Application</div>
        {APP_NAV.map((item) => <NavItem key={item.href} {...item} />)}

        <div style={{ fontSize: 10, fontWeight: 700, color: "#3a3a58", letterSpacing: "0.1em", padding: "16px 14px 8px", textTransform: "uppercase" }}>Settings</div>
        {SETTINGS_NAV.map((item) => <NavItem key={item.href} {...item} />)}

        {user?.role === "admin" && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#3a3a58", letterSpacing: "0.1em", padding: "16px 14px 8px", textTransform: "uppercase" }}>Admin</div>
            <NavItem href="/dashboard/admin" icon={Shield} label="Payment Requests" />
          </>
        )}
      </nav>

      {/* Upgrade card */}
      <div style={{ padding: "12px 14px 20px" }}>
        <div style={{ borderRadius: 12, background: "var(--accent-dim)", border: "1px solid var(--accent-glow)", padding: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={13} color="var(--accent-light)" />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-light)" }}>Upgrade to Premium</div>
          </div>
          <div style={{ fontSize: 11, color: "#5a5a78", marginBottom: 10, lineHeight: 1.5 }}>Unlock all features and grow your salon</div>
          <div style={{ background: "var(--accent-gradient)", borderRadius: 8, padding: "7px 0", textAlign: "center", fontSize: 11, fontWeight: 600, color: "#fff", cursor: "pointer", boxShadow: "0 2px 8px rgba(91, 33, 182, 0.35)" }}>Upgrade Now</div>
        </div>
        <button onClick={handleSignOut} style={{ width: "100%", marginTop: 10, border: "1px solid #2a2a3a", background: "#191922", color: "#8d8da8", borderRadius: 10, padding: "9px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}
