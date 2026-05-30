/**
 * Generic CRUD API for all resources
 * GET    /api/data/[resource]?userId=xxx          - List all
 * POST   /api/data/[resource]                     - Create
 * PUT    /api/data/[resource]                     - Update
 * DELETE /api/data/[resource]?id=xxx&userId=xxx   - Delete
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureAllTables } from "@/lib/db-schema";

const VALID_RESOURCES = [
  "appointments",
  "clients", 
  "staff",
  "services",
  "products",
  "invoices",
  "settings",
  "payment_requests",
  "user_plans",
];

// ─── GET - List all records ───────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { resource: string } }
) {
  const resource = params.resource;
  
  if (!VALID_RESOURCES.includes(resource)) {
    return Response.json({ ok: false, error: "Invalid resource" }, { status: 400 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  
  if (!userId) {
    return Response.json({ ok: false, error: "Missing userId" }, { status: 400 });
  }

  try {
    await ensureAllTables();
    
    const result = await db.execute({
      sql: `SELECT * FROM ${resource} WHERE user_id = ? ORDER BY created_at DESC`,
      args: [userId],
    });

    return Response.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error(`[api/data/${resource}] GET error:`, err);
    return Response.json({ ok: false, error: "Failed to fetch data" }, { status: 500 });
  }
}

// ─── POST - Create new record ─────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { resource: string } }
) {
  const resource = params.resource;
  
  if (!VALID_RESOURCES.includes(resource)) {
    return Response.json({ ok: false, error: "Invalid resource" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  if (!body.user_id) {
    return Response.json({ ok: false, error: "Missing user_id" }, { status: 400 });
  }

  try {
    await ensureAllTables();

    // Generate ID if not provided
    if (!body.id) {
      body.id = `${resource.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    // Add timestamps
    if (!body.created_at) {
      body.created_at = new Date().toISOString();
    }

    // Build INSERT query
    const columns = Object.keys(body);
    const placeholders = columns.map(() => "?").join(", ");
    const values = columns.map(col => body[col]);

    await db.execute({
      sql: `INSERT INTO ${resource} (${columns.join(", ")}) VALUES (${placeholders})`,
      args: values,
    });

    return Response.json({ ok: true, data: body });
  } catch (err: any) {
    console.error(`[api/data/${resource}] POST error:`, err);
    return Response.json({ 
      ok: false, 
      error: err.message || "Failed to create record" 
    }, { status: 500 });
  }
}

// ─── PUT - Update record ──────────────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: { resource: string } }
) {
  const resource = params.resource;
  
  if (!VALID_RESOURCES.includes(resource)) {
    return Response.json({ ok: false, error: "Invalid resource" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  if (!body.id || !body.user_id) {
    return Response.json({ ok: false, error: "Missing id or user_id" }, { status: 400 });
  }

  try {
    await ensureAllTables();

    // Build UPDATE query
    const { id, user_id, created_at, ...updates } = body;
    const setClause = Object.keys(updates).map(col => `${col} = ?`).join(", ");
    const values = [...Object.values(updates), id, user_id];

    await db.execute({
      sql: `UPDATE ${resource} SET ${setClause} WHERE id = ? AND user_id = ?`,
      args: values,
    });

    return Response.json({ ok: true, data: body });
  } catch (err: any) {
    console.error(`[api/data/${resource}] PUT error:`, err);
    return Response.json({ 
      ok: false, 
      error: err.message || "Failed to update record" 
    }, { status: 500 });
  }
}

// ─── DELETE - Delete record ───────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { resource: string } }
) {
  const resource = params.resource;
  
  if (!VALID_RESOURCES.includes(resource)) {
    return Response.json({ ok: false, error: "Invalid resource" }, { status: 400 });
  }

  const id = req.nextUrl.searchParams.get("id");
  const userId = req.nextUrl.searchParams.get("userId");
  
  if (!id || !userId) {
    return Response.json({ ok: false, error: "Missing id or userId" }, { status: 400 });
  }

  try {
    await ensureAllTables();

    await db.execute({
      sql: `DELETE FROM ${resource} WHERE id = ? AND user_id = ?`,
      args: [id, userId],
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error(`[api/data/${resource}] DELETE error:`, err);
    return Response.json({ ok: false, error: "Failed to delete record" }, { status: 500 });
  }
}
