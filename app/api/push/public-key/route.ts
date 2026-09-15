/**
 * GET /api/push/public-key
 *
 * Hands the VAPID public key to the client-facing page. Serving it from an
 * endpoint instead of NEXT_PUBLIC_VAPID_PUBLIC_KEY keeps every push setting in
 * one place (server env only) and lets the key be rotated without a rebuild.
 * The public key is not a secret — it is transmitted to the push service on
 * every subscribe call.
 */

import { getVapidPublicKey } from "@/lib/push";

export const runtime = "nodejs";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return Response.json(
      { ok: false, error: "Push notifications are not configured on this server." },
      { status: 503 },
    );
  }
  return Response.json({ ok: true, publicKey });
}
