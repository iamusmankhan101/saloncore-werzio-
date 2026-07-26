// ─── Salon Sections (same-branch Men's/Women's split) ──────────────────────
// A lightweight, cosmetic-only tag — distinct from lib/locations.ts, which
// partitions storage across different physical branches. Section is just a
// free-text field (mirrors Service.category) filterable on each listing page;
// Revenue/Cash Flow/Dashboard intentionally never filter by it, so combined
// totals fall out of simply not touching those pages.

export const SECTION_SEED = ["Men's", "Women's"] as const;

/**
 * Seed values first, then any custom section strings already present in the
 * data (mirrors the Services page's PRESET_CATEGORIES + customCategories
 * pattern) — so pickers are never empty on a fresh account, but an owner can
 * still introduce a third section just by typing it once.
 */
export function getSectionOptions(records: { section?: string }[]): string[] {
  const custom = Array.from(
    new Set(records.map((r) => r.section).filter((s): s is string => !!s))
  ).filter((s) => !(SECTION_SEED as readonly string[]).includes(s));
  return [...SECTION_SEED, ...custom];
}
