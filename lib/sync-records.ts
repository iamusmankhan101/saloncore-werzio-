// ─── Cross-device record reconciliation ───────────────────────────────────────
// Every entity in this app is stored as one JSON array per user/branch: in each
// browser's localStorage, and as a single row in Turso. That made "save" a
// whole-array write, so two PCs signed into the same salon quietly clobbered
// each other — whichever pushed last won, and any record the other machine had
// added since its own last sync vanished from the shared DB. That is how the
// same Cash Flow date range could show a different income total on each PC.
//
// Three rules make the two copies converge instead:
//
//   1. Absence is not a delete. POST /api/db unions the incoming array with
//      what is already stored; a record only disappears once it is tombstoned
//      (lib/deleted-records.ts).
//   2. Every real delete leaves a tombstone. reconcileSave() diffs the list
//      being saved against the one already in localStorage and reports whatever
//      the caller dropped, so no delete path has to remember to do it by hand.
//   3. Edits carry a timestamp. reconcileSave() stamps `_updatedAt` on records
//      whose content actually changed, and both merge points (syncFromDB here
//      and the POST handler on the server) keep the newer side instead of
//      always preferring whatever the local machine happens to hold.
//
// The stamp is deliberately named with a leading underscore: it is sync
// bookkeeping, not part of any entity's own schema (lib/attendance.ts already
// has its own `updatedAt` field, which this must not collide with).

import { locationUserKey } from "./locations";

export const SYNC_STAMP = "_updatedAt";

type Rec = Record<string, unknown>;

/**
 * A record that just arrived from another device is held "unseen" until a save
 * proves the caller knows about it. A page reads its state once, after its own
 * syncFromDB() resolves — but the dashboard layout runs a second sync of its
 * own, so a record from another PC can land in localStorage moments after the
 * page snapshotted it. Saving that stale snapshot must not tombstone the new
 * arrival; it is merged back in instead.
 *
 * The moment a saved list *does* contain the record, it stops being unseen —
 * otherwise deleting something that had just synced in would silently undo
 * itself. This cap only bounds arrivals that no save ever mentions.
 */
const UNSEEN_ARRIVAL_MS = 30 * 60 * 1000;

function recentKey(entity: string): string {
  return `werzio_sync_arrived_${entity}`;
}

export function entityStorageKey(entity: string, locationId?: string): string {
  return locationUserKey(`werzio_${entity}`, locationId);
}

export function recordId(record: unknown): string {
  if (!record || typeof record !== "object") return "";
  const id = (record as Rec).id;
  return id === undefined || id === null ? "" : String(id);
}

/** The record's sync stamp, or "" for records written before stamping existed. */
export function syncStamp(record: unknown): string {
  if (!record || typeof record !== "object") return "";
  const value = (record as Rec)[SYNC_STAMP];
  return typeof value === "string" ? value : "";
}

/** Key-order-independent JSON of a record, ignoring the sync stamp itself. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.keys(value as Rec)
      .filter((k) => k !== SYNC_STAMP)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson((value as Rec)[k])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** True when two copies of a record differ only by their sync stamp (or not at all). */
export function sameRecordContent(a: unknown, b: unknown): boolean {
  return stableJson(a) === stableJson(b);
}

/**
 * The newer of two copies of the same record. Ties — including a pair of
 * legacy records that predate stamping and so carry no stamp at all — go to
 * `local`, which keeps the pre-existing "this browser wins" behaviour for data
 * that has not been touched since the upgrade.
 */
export function pickNewer<T>(local: T, remote: T): T {
  return syncStamp(local) >= syncStamp(remote) ? local : remote;
}

/** Records ids this sync pulled in from another device — see UNSEEN_ARRIVAL_MS. */
export function noteSyncedArrivals(entity: string, ids: string[], locationId?: string): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  const existing = readArrivals(entity, locationId);
  writeArrivals(entity, [...new Set([...existing.ids, ...ids.map(String)])], Date.now(), locationId);
}

function readArrivals(entity: string, locationId?: string): { at: number; ids: string[] } {
  const empty = { at: 0, ids: [] as string[] };
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(locationUserKey(recentKey(entity), locationId));
    if (!raw) return empty;
    const { at, ids } = JSON.parse(raw) as { at?: number; ids?: string[] };
    if (typeof at !== "number" || !Array.isArray(ids)) return empty;
    if (Date.now() - at > UNSEEN_ARRIVAL_MS) return empty;
    return { at, ids: ids.map(String) };
  } catch {
    return empty;
  }
}

function writeArrivals(entity: string, ids: string[], at: number, locationId?: string): void {
  try {
    const key = locationUserKey(recentKey(entity), locationId);
    if (ids.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify({ at, ids }));
  } catch { /* quota — protection is best-effort */ }
}

function storedList(entity: string, locationId?: string): Rec[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(entityStorageKey(entity, locationId)) ?? "[]");
    return Array.isArray(parsed) ? parsed as Rec[] : [];
  } catch {
    return [];
  }
}

export interface ReconciledSave {
  /** The list to actually write — stamped, plus any protected new arrival put back. */
  records: Rec[];
  /** Ids the caller genuinely dropped, to be tombstoned. */
  removedIds: string[];
}

/**
 * Prepares `next` for saving: stamps the records whose content changed, keeps
 * the existing stamp on the ones that did not, puts back any record that
 * arrived from another device and that this caller has never held, and reports
 * every other disappearance as a deletion to tombstone.
 */
export function reconcileSave(entity: string, next: unknown[], locationId?: string): ReconciledSave {
  const list = Array.isArray(next) ? next as Rec[] : [];
  if (typeof window === "undefined") return { records: list, removedIds: [] };

  const previous = storedList(entity, locationId);
  const previousById = new Map<string, Rec>();
  for (const record of previous) {
    const id = recordId(record);
    if (id) previousById.set(id, record);
  }

  const nextIds = new Set(list.map(recordId).filter(Boolean));
  const now = new Date().toISOString();

  const records = list.map((record) => {
    const id = recordId(record);
    const before = id ? previousById.get(id) : undefined;
    if (before && sameRecordContent(before, record)) {
      const stamp = syncStamp(before);
      return stamp ? { ...record, [SYNC_STAMP]: stamp } : record;
    }
    return { ...record, [SYNC_STAMP]: now };
  });

  const arrivals = readArrivals(entity, locationId);
  const unseen = new Set(arrivals.ids);
  const restored: Rec[] = [];
  const removedIds: string[] = [];
  for (const record of previous) {
    const id = recordId(record);
    if (!id || nextIds.has(id)) continue;
    if (unseen.has(id)) restored.push(record);
    else removedIds.push(id);
  }

  // Anything the caller did include, it has plainly seen — so a later save that
  // drops it is a deliberate delete, not a stale snapshot.
  if (unseen.size > 0) {
    writeArrivals(entity, [...unseen].filter((id) => !nextIds.has(id)), arrivals.at, locationId);
  }

  return { records: [...records, ...restored], removedIds };
}
