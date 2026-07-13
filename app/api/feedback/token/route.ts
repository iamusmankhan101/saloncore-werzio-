/**
 * POST /api/feedback/token
 *
 * Creates (or reuses) an opaque public feedback-collection token for one
 * appointment, called right before a follow-up WhatsApp message is queued
 * so the message can include a link to /feedback/[token]. Idempotent per
 * (user_id, appt_id) — re-invoking for the same appointment returns the
 * same token instead of creating a duplicate row.
 */

import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { resolveActor } from "@/lib/api-auth";

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS client_feedback (
      id           TEXT NOT NULL,
      user_id      TEXT NOT NULL,
      appt_id      TEXT NOT NULL,
      token        TEXT NOT NULL,
      client_id    TEXT,
      client_name  TEXT NOT NULL DEFAULT '',
      phone        TEXT,
      staff_name   TEXT,
      service      TEXT,
      appt_date    TEXT,
      rating       INTEGER,
      comment      TEXT,
      requested_at TEXT NOT NULL,
      submitted_at TEXT,
      created_at   TEXT NOT NULL,
      PRIMARY KEY (user_id, appt_id)
    )
  `);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS client_feedback_token_idx ON client_feedback(token)`);
}

interface TokenRequestBody {
  apptId: string;
  clientId?: string;
  clientName?: string;
  phone?: string;
  staffName?: string;
  service?: string;
  apptDate?: string;
}

export async function POST(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  let body: TokenRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }
  if (!body.apptId?.trim()) return Response.json({ ok: false, error: "Missing apptId." }, { status: 400 });

  try {
    await ensureTable();

    const existing = await db.execute({
      sql: "SELECT token FROM client_feedback WHERE user_id = ? AND appt_id = ?",
      args: [actor.userId, body.apptId],
    });

    let token: string;
    if (existing.rows.length > 0) {
      token = existing.rows[0].token as string;
    } else {
      token = randomBytes(24).toString("hex");
      const now = new Date().toISOString();
      await db.execute({
        sql: `INSERT INTO client_feedback
              (id, user_id, appt_id, token, client_id, client_name, phone, staff_name, service, appt_date, requested_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          actor.userId,
          body.apptId,
          token,
          body.clientId ?? null,
          body.clientName ?? "",
          body.phone ?? null,
          body.staffName ?? null,
          body.service ?? null,
          body.apptDate ?? null,
          now,
          now,
        ],
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
    return Response.json({ ok: true, token, url: `${baseUrl}/feedback/${token}` });
  } catch (err) {
    console.error("[feedback/token] DB error:", err);
    return Response.json({ ok: false, error: "Failed to create feedback token." }, { status: 500 });
  }
}
