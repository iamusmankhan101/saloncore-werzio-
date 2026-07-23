/**
 * POST /api/billing/register
 * Called immediately after a user signs up.
 * Registers them in the Turso billing_users table so the cron can process them.
 */

import { NextRequest } from "next/server";
import { ensureBillingTables, upsertBillingUser } from "@/lib/billing-db";
import { PLAN_CONFIGS } from "@/lib/plan-limits";

function normalizePlanId(planId: string): string {
  if (planId === "demo") return "starter";
  return planId;
}

function getPlanPrice(planId: string): number {
  if (planId === "basic") return PLAN_CONFIGS.pro.price; // legacy alias
  return PLAN_CONFIGS[planId as keyof typeof PLAN_CONFIGS]?.price ?? 0;
}

function getPlanName(planId: string): string {
  if (planId === "basic") return PLAN_CONFIGS.pro.name; // legacy alias
  return PLAN_CONFIGS[planId as keyof typeof PLAN_CONFIGS]?.name ?? planId;
}

export async function POST(req: NextRequest) {
  let body: {
    userId: string;
    email: string;
    ownerName: string;
    salonName: string;
    phone: string;
    planId: string;
    trialStart: string; // YYYY-MM-DD
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const { userId, email, ownerName, salonName, phone, trialStart } = body;
  const planId = normalizePlanId(body.planId);
  if (!userId || !email || !planId) {
    return Response.json({ ok: false, error: "Missing required fields." }, { status: 400 });
  }

  const planPrice = getPlanPrice(planId);
  const planName  = getPlanName(planId);
  if (!PLAN_CONFIGS[planId as keyof typeof PLAN_CONFIGS] && planId !== "basic") {
    return Response.json({ ok: false, error: `Unknown plan: ${planId}` }, { status: 400 });
  }

  try {
    await ensureBillingTables();
    await upsertBillingUser({
      id: userId,
      email: email.toLowerCase().trim(),
      ownerName: ownerName.trim(),
      salonName: salonName?.trim() || ownerName.trim(),
      phone: phone?.trim() || "",
      planId,
      planName,
      planPrice,
      trialStart: trialStart || new Date().toISOString().slice(0, 10),
    });
    console.log(`[billing/register] registered user ${userId} (${email}) on ${planName} plan`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/register] DB error:", err);
    return Response.json({ ok: false, error: "Failed to register billing user." }, { status: 500 });
  }
}
