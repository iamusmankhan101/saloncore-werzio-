import { NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { getUserById, upsertStaffUser } from "@/lib/auth-db";

const STAFF_PERMISSIONS = ["dashboard", "calendar", "appointments", "clients", "pos", "invoices"];
const MANAGER_PERMISSIONS = ["*"];

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const actorId = token ? verifySessionToken(token) : null;
  if (!actorId) return Response.json({ ok: false, error: "Not authenticated." }, { status: 401 });

  const actor = await getUserById(actorId);
  if (!actor || !["owner", "manager"].includes(actor.role)) {
    return Response.json({ ok: false, error: "Only salon owners or managers can manage staff access." }, { status: 403 });
  }

  const body = await req.json() as {
    staffId?: string; name?: string; email?: string; phone?: string; password?: string; locationId?: string;
    role?: string;
  };
  if (!body.staffId || !body.name || !body.email || !body.locationId) {
    return Response.json({ ok: false, error: "Staff name, email, ID and assigned location are required." }, { status: 400 });
  }

  const isManager = body.role === "manager";
  try {
    const user = await upsertStaffUser({
      salonOwnerId: actor.salonOwnerId || actor.id,
      staffId: body.staffId,
      name: body.name,
      salonName: actor.salonName,
      email: body.email,
      phone: body.phone || "",
      password: body.password,
      role: isManager ? "manager" : "staff",
      permissions: isManager ? MANAGER_PERMISSIONS : STAFF_PERMISSIONS,
      locationId: body.locationId,
    });
    return Response.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save staff login.";
    const status = message.includes("already exists") ? 409 : 400;
    return Response.json({ ok: false, error: message }, { status });
  }
}
