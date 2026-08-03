/**
 * PATCH /api/user/profile
 * Updates owner_name, salon_name, and/or phone in billing_users (Turso) for
 * the authenticated caller's own account.
 * Called from the Account → My Profile section when the user saves changes.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureBillingTables } from "@/lib/billing-db";
import { resolveActor } from "@/lib/api-auth";
import { updateUser } from "@/lib/auth-db";

export async function PATCH(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: { ownerName?: string; salonName?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  try {
    // Persist to the caller's own login record (users table) so the changes
    // survive logout / re-login / new devices — this is the account's source
    // of truth for the Auth pages, sidebar, and profile.
    if (body.ownerName !== undefined || body.salonName !== undefined || body.phone !== undefined) {
      await updateUser(actor.actorId, {
        ownerName: body.ownerName,
        salonName: body.salonName,
        phone: body.phone,
      });
    }

    await ensureBillingTables();

    const fields: string[] = [];
    const args: (string | number)[] = [];

    if (body.ownerName !== undefined) { fields.push("owner_name = ?"); args.push(body.ownerName.trim()); }
    if (body.salonName !== undefined) { fields.push("salon_name = ?"); args.push(body.salonName.trim()); }
    if (body.phone     !== undefined) { fields.push("phone = ?");      args.push(body.phone.trim()); }

    if (fields.length === 0) return Response.json({ ok: true }); // nothing to update

    args.push(actor.userId);
    await db.execute({
      sql: `UPDATE billing_users SET ${fields.join(", ")} WHERE id = ?`,
      args,
    });

    console.log(`[user/profile] ✓ Updated profile for userId=${actor.userId}`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[user/profile] DB error:", err);
    return Response.json({ ok: false, error: "Failed to update profile." }, { status: 500 });
  }
}