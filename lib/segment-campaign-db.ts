import { db } from "@/lib/db";

export const SEGMENT_CAMPAIGN_SPREAD_WINDOW_MS = 4 * 60 * 60 * 1000;
export const SEGMENT_CAMPAIGN_MAX_ATTEMPTS = 5;

let tablesReady: Promise<void> | null = null;

export function ensureSegmentCampaignTables() {
  if (!tablesReady) {
    tablesReady = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS wa_segment_campaigns (
          id          TEXT PRIMARY KEY,
          user_id     TEXT NOT NULL,
          location_id TEXT NOT NULL DEFAULT 'main',
          mode        TEXT NOT NULL,
          total       INTEGER NOT NULL,
          created_at  TEXT NOT NULL
        )
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS wa_segment_campaign_queue (
          id            TEXT PRIMARY KEY,
          campaign_id   TEXT NOT NULL,
          user_id       TEXT NOT NULL,
          client_name   TEXT NOT NULL,
          phone         TEXT NOT NULL,
          text          TEXT NOT NULL,
          template_id   TEXT NOT NULL,
          scheduled_at  TEXT NOT NULL,
          status        TEXT NOT NULL DEFAULT 'pending',
          attempts      INTEGER NOT NULL DEFAULT 0,
          last_error    TEXT,
          processing_at TEXT,
          created_at    TEXT NOT NULL,
          sent_at       TEXT
        )
      `);
      try {
        await db.execute("ALTER TABLE wa_segment_campaign_queue ADD COLUMN processing_at TEXT");
      } catch {
        // The column already exists on new/current installations.
      }
      await db.execute("CREATE INDEX IF NOT EXISTS idx_wa_segment_due ON wa_segment_campaign_queue(status, scheduled_at)");
      await db.execute("CREATE INDEX IF NOT EXISTS idx_wa_segment_campaign ON wa_segment_campaign_queue(campaign_id)");
    })().catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  return tablesReady;
}

export function segmentScheduledAt(index: number, total: number, baseTime = Date.now()) {
  const slotMs = SEGMENT_CAMPAIGN_SPREAD_WINDOW_MS / Math.max(1, total);
  const offset = Math.floor(index * slotMs + Math.random() * slotMs);
  return new Date(baseTime + offset).toISOString();
}
