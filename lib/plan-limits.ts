/**
 * lib/plan-limits.ts
 *
 * Single source of truth for Salon Central pricing tiers.
 * All feature gates and limit checks go through this file.
 *
 * Plans
 *  ┌──────────────┬─────────┬───────────────────────────────────────────────┐
 *  │ Salon Central Free  │ 0 PKR   │ Appts 30/mo, POS 5 products, staff 5,         │
 *  │              │         │ clients 5, invoicing ✓                        │
 *  ├──────────────┼─────────┼───────────────────────────────────────────────┤
 *  │ Salon Central Starter │ 7000  │ Everything unlimited, no WhatsApp automation  │
 *  ├──────────────┼─────────┼───────────────────────────────────────────────┤
 *  │ Salon Central Pro   │ 10000   │ Everything unlimited + WhatsApp               │
 *  ├──────────────┼─────────┼───────────────────────────────────────────────┤
 *  │ Salon Central Prem. │ 20000   │ Everything unlimited + WhatsApp + Try-On      │
 *  └──────────────┴─────────┴───────────────────────────────────────────────┘
 */

import { getActivePlan } from "./payment-requests";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanId = "free" | "starter" | "pro" | "premium";

export interface PlanConfig {
  id: PlanId;
  name: string;                   // "Free" | "Pro" | "Premium"
  label: string;                  // "Salon Central Free" etc.
  badge: string;                  // chip label shown in sidebar
  price: number;                  // PKR/month; 0 = free forever
  color: string;                  // brand accent
  bg: string;                     // soft background for the badge
  gradient: string;               // gradient string for card headers

  // Feature limits  (-1 = unlimited)
  appointmentsPerMonth: number;
  staffLimit: number;
  clientLimit: number;
  posProductLimit: number;        // max products visible in POS catalog

  // Feature flags
  whatsapp: boolean;
  tryOn: boolean;
  multiLocation: boolean;
  invoicing: boolean;

  // Human-readable feature list for the pricing card
  features: string[];
  lockedFeatures: string[];       // shown as ✗ on lower plans
}

// ─── Plan definitions ─────────────────────────────────────────────────────────

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    label: "Salon Central Free",
    badge: "FREE",
    price: 0,
    color: "#6b7280",
    bg: "#f9fafb",
    gradient: "linear-gradient(135deg,#4b5563,#6b7280)",

    appointmentsPerMonth: 30,
    staffLimit: 5,
    clientLimit: 5,
    posProductLimit: 5,

    whatsapp: false,
    tryOn: false,
    multiLocation: false,
    invoicing: true,

    features: [
      "30 appointments / month",
      "POS — up to 5 products",
      "Invoicing & receipts",
      "Staff management (up to 5)",
      "Client management (up to 5)",
      "Basic revenue reports",
      "Basic inventory",
      "Online booking page",
    ],
    lockedFeatures: [
      "WhatsApp reminders & alerts",
      "Virtual Try-On (AI)",
      "Multi-location branches",
      "Unlimited everything",
    ],
  },

  pro: {
    id: "pro",
    name: "Pro",
    label: "Pro",
    badge: "PRO",
    price: 10000,
    color: "#7C3AED",
    bg: "#f5f3ff",
    gradient: "linear-gradient(135deg,#5B21B6,#9333EA)",

    appointmentsPerMonth: -1,
    staffLimit: -1,
    clientLimit: -1,
    posProductLimit: -1,

    whatsapp: true,
    tryOn: false,
    multiLocation: false,
    invoicing: true,

    features: [
      "Unlimited appointments",
      "Unlimited POS products",
      "Full invoicing & POS",
      "Unlimited staff",
      "Unlimited clients",
      "Advanced revenue & analytics",
      "Full inventory management",
      "Online booking page",
      "Calendar & scheduling",
      "Services management",
      "WhatsApp booking confirmations",
      "WhatsApp appointment reminders",
      "WhatsApp follow-up messages",
      "WhatsApp low stock alerts",
    ],
    lockedFeatures: [
      "Virtual Try-On (AI)",
    ],
  },

  starter: {
    id: "starter",
    name: "Starter",
    label: "Starter",
    badge: "STARTER",
    price: 7000,
    color: "#0891b2",
    bg: "#ecfeff",
    gradient: "linear-gradient(135deg,#0E7490,#06B6D4)",

    appointmentsPerMonth: -1,
    staffLimit: -1,
    clientLimit: -1,
    posProductLimit: -1,

    whatsapp: false,
    tryOn: false,
    multiLocation: false,
    invoicing: true,

    features: [
      "Unlimited appointments",
      "Unlimited POS products",
      "Full invoicing & POS",
      "Unlimited staff",
      "Unlimited clients",
      "Advanced revenue & analytics",
      "Full inventory management",
      "Online booking page",
      "Calendar & scheduling",
      "Services management",
    ],
    lockedFeatures: [
      "WhatsApp automation",
      "Virtual Try-On (AI)",
      "Multi-location branches",
    ],
  },

  premium: {
    id: "premium",
    name: "Premium",
    label: "Premium",
    badge: "PREMIUM",
    price: 20000,
    color: "#9333EA",
    bg: "#faf5ff",
    gradient: "linear-gradient(135deg,#7C3AED,#A855F7)",

    appointmentsPerMonth: -1,
    staffLimit: -1,
    clientLimit: -1,
    posProductLimit: -1,

    whatsapp: true,
    tryOn: true,
    multiLocation: true,
    invoicing: true,

    features: [
      "Everything in Pro",
      "Virtual Try-On (AI hair & color)",
      "Multi-location branch management",
      "Priority support",
    ],
    lockedFeatures: [],
  },
};

export const ORDERED_PLANS = ["starter", "pro", "premium"] as const satisfies readonly PlanId[];

// ─── Active plan helpers ──────────────────────────────────────────────────────

/**
 * Get the user's current plan ID.
 * Maps legacy IDs ("basic") → "pro", anything unknown → "free".
 */
export function getCurrentPlanId(): PlanId {
  const raw = getActivePlan();
  if (raw === "premium") return "premium";
  if (raw === "starter") return "starter";
  if (raw === "pro" || raw === "basic") return "pro"; // "basic" was the old Pro name
  return "free";
}

export function getCurrentPlan(): PlanConfig {
  return PLAN_CONFIGS[getCurrentPlanId()];
}

// ─── Limit checks ─────────────────────────────────────────────────────────────

/** Returns true when `current` has reached or exceeded `limit` (ignores unlimited). */
export function isAtLimit(limit: number, current: number): boolean {
  return limit !== -1 && current >= limit;
}

/** How many can still be added (-1 if unlimited). */
export function remaining(limit: number, current: number): number {
  if (limit === -1) return -1;
  return Math.max(0, limit - current);
}

/** Count appointments booked in the current calendar month. */
export function thisMonthCount(appointments: { date: string; status?: string }[]): number {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return appointments.filter(
    (a) => a.date?.startsWith(prefix) && a.status !== "cancelled",
  ).length;
}

// ─── Upgrade prompt helpers ───────────────────────────────────────────────────

export function upgradeTarget(planId: PlanId): PlanId {
  if (planId === "free") return "starter";
  if (planId === "starter") return "pro";
  if (planId === "pro") return "premium";
  return "premium";
}
