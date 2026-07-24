/**
 * lib/api-auth.ts
 *
 * Shared server-side authorization helper for API routes that read/write
 * per-salon data. Resolves which salon's data the caller may access from
 * their own session cookie — never from a client-supplied userId/salonId —
 * so one tenant can't read or overwrite another tenant's data by passing a
 * different id in the query string or request body.
 */

import { NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "./session";
import { getUserById } from "./auth-db";

export interface ResolvedActor {
  /** The salon-owner id that scopes the data (staff resolve to their owner's id). */
  userId: string;
  locationId: string;
  role: "owner" | "manager" | "staff" | "admin";
}

/**
 * Verifies the session cookie and resolves the caller's data scope.
 * Staff are pinned to their salon owner's id and their assigned location.
 * Owners/managers are pinned to their own id; a client-requested location is
 * honored since it only scopes their own account's data.
 * Returns null when there's no valid session — callers must respond 401.
 */
export async function resolveActor(
  req: NextRequest,
  requestedLocationId = "main",
): Promise<ResolvedActor | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const actorId = token ? verifySessionToken(token) : null;
  const actor = actorId ? await getUserById(actorId) : null;
  if (!actor) return null;
  if (actor.role !== "admin" && actor.approvalStatus !== "approved") return null;

  if (actor.role === "staff") {
    return {
      userId: actor.salonOwnerId || actor.id,
      locationId: actor.locationId || "main",
      role: actor.role,
    };
  }
  return { userId: actor.id, locationId: requestedLocationId, role: actor.role };
}

/**
 * For platform-admin-only endpoints that act on an arbitrary target user
 * (e.g. approving another salon's payment, changing their plan) — verifies
 * the caller's own session has role "admin". Returns null otherwise, in
 * which case the route must respond 401/403. Unlike resolveActor, this does
 * NOT resolve a data-owner id — the target user id comes from the request
 * body/query as an explicit admin action, not the caller's own scope.
 */
export async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const actorId = token ? verifySessionToken(token) : null;
  const actor = actorId ? await getUserById(actorId) : null;
  return actor?.role === "admin";
}
