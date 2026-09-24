/**
 * /api/wa/birthday-settings
 *
 * GET               — fetch the signed-in salon's birthday reminder settings
 * POST { settings }  — upsert them (the salon always comes from the session)
 *
 * Stored in Turso so the server-side cron can read them without
 * needing access to the salon's localStorage.
 */

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveActor } from "@/lib/api-auth";

export interface BirthdaySettings {
  enabled: boolean;
  templateName: string;
  discount: string;
}

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wa_birthday_settings (
      user_id       TEXT PRIMARY KEY,
      enabled       INTEGER NOT NULL DEFAULT 1,
      template_name TEXT NOT NULL DEFAULT '',
      discount      TEXT NOT NULL DEFAULT '',
      updated_at    TEXT NOT NULL
    )
  `);
}

export async function GET(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  const userId = actor.userId;

  try {
    await ensureTable();
    const result = await db.execute({
      sql: "SELECT enabled, template_name, discount FROM wa_birthday_settings WHERE user_id = ?",
      args: [userId],
    });

    if (result.rows.length === 0) {
      return Response.json({ ok: true, settings: { enabled: true, templateName: "", discount: "" } });
    }

    const row = result.rows[0];
    return Response.json({
      ok: true,
      settings: {
        enabled:      (row.enabled as number) === 1,
        templateName: row.template_name as string,
        discount:     row.discount as string,
      } satisfies BirthdaySettings,
    });
  } catch (err) {
    console.error("[birthday-settings] GET error:", err);
    return Response.json({ ok: false, error: "DB error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await resolveActor(req);
  if (!actor) return Response.json({ ok: false, error: "Not authenticated." }, { status: 401 });

  let body: { settings: BirthdaySettings };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  const { settings } = body;
  const userId = actor.userId;
  if (!settings) {
    return Response.json({ ok: false, error: "Missing settings." }, { status: 400 });
  }

  try {
    await ensureTable();
    await db.execute({
      sql: `INSERT OR REPLACE INTO wa_birthday_settings
              (user_id, enabled, template_name, discount, updated_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        userId,
        settings.enabled ? 1 : 0,
        settings.templateName ?? "",
        settings.discount ?? "",
        new Date().toISOString(),
      ],
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[birthday-settings] POST error:", err);
    return Response.json({ ok: false, error: "DB write failed." }, { status: 500 });
  }
}
