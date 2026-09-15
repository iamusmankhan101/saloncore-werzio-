/**
 * The outbox: which of this browser's data still has to reach Turso.
 *
 * Every write in lib/turso-sync.ts is a whole-list replacement built from
 * localStorage — saveToDB pushes the entire entity list, saveSettingsToDB the
 * whole settings object. That shape makes a conventional request queue the
 * wrong tool: replaying forty queued bodies would push forty stale snapshots
 * in sequence, and the last one to land would win regardless of what the
 * browser actually holds now.
 *
 * So this records only *which* data is dirty, never the payload. On flush,
 * turso-sync re-reads localStorage and pushes what is there at that moment.
 * Forty offline edits collapse into one push of the current truth, a queue
 * entry can never go stale, and the stored queue stays a few hundred bytes
 * however long the salon is offline — which matters, because localStorage is
 * also where the data itself lives.
 *
 * Scoped per user: a shared reception PC must not flush one account's edits
 * under the next person's session.
 */

import { userKey } from "./auth";

const QUEUE_KEY = "werzio_pending_writes";

/** Fired on `window` whenever the queue changes, so the UI can show a count. */
export const PENDING_CHANGED_EVENT = "werzio_pending_changed";

/**
 * A unit of dirty data. `kind` says which save function can flush it; the rest
 * is what that function needs to find the current data in localStorage.
 */
export type PendingWrite =
  | { kind: "entity"; entity: string; locationId: string }
  | { kind: "loyalty"; locationId: string }
  | { kind: "settings" };

/** Collapses writes that target the same row, so re-editing stays one entry. */
export function pendingKey(write: PendingWrite): string {
  switch (write.kind) {
    case "entity":   return `entity:${write.entity}:${write.locationId}`;
    case "loyalty":  return `loyalty:${write.locationId}`;
    case "settings": return "settings";
  }
}

interface StoredEntry {
  write: PendingWrite;
  /** First failure for this key — surfaced as "queued since" in the UI. */
  queuedAt: string;
}

function read(): Record<string, StoredEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(userKey(QUEUE_KEY));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoredEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(entries: Record<string, StoredEntry>): void {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(entries).length === 0) localStorage.removeItem(userKey(QUEUE_KEY));
    else localStorage.setItem(userKey(QUEUE_KEY), JSON.stringify(entries));
  } catch {
    // Out of quota, private mode, or storage blocked. The unsynced data itself
    // is still in localStorage, and the next syncFromDB() merge pushes
    // local-only records anyway — the queue only makes that faster and visible.
  }
  window.dispatchEvent(new Event(PENDING_CHANGED_EVENT));
}

/** Records that `w`'s data failed to reach Turso and needs re-pushing. */
export function markPending(w: PendingWrite): void {
  const entries = read();
  const key = pendingKey(w);
  // Keep the original queuedAt: "offline since 2pm" is more use than a
  // timestamp that resets on every further edit.
  if (!entries[key]) entries[key] = { write: w, queuedAt: new Date().toISOString() };
  write(entries);
}

/** Drops `w` from the queue after its data has successfully landed. */
export function clearPending(w: PendingWrite): void {
  const entries = read();
  const key = pendingKey(w);
  if (!(key in entries)) return;
  delete entries[key];
  write(entries);
}

export function listPending(): PendingWrite[] {
  return Object.values(read()).map((e) => e.write);
}

export function pendingCount(): number {
  return Object.keys(read()).length;
}

/** ISO timestamp of the oldest unsynced change, or null when nothing is queued. */
export function oldestPendingAt(): string | null {
  const times = Object.values(read()).map((e) => e.queuedAt).sort();
  return times[0] ?? null;
}

/**
 * Whether a write is worth attempting.
 *
 * navigator.onLine only proves the machine has *a* network — captive portals
 * and dead uplinks still report true — so this is a fast "definitely offline"
 * check, not a guarantee. It exists to stop a known-offline save burning three
 * retries and seven seconds before queueing, which on the POS screen is seven
 * seconds of a cashier staring at a spinner.
 */
export function isDefinitelyOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
