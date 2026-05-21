import type { ItemData } from '@/lib/content';

/**
 * Server-side helpers for the listing surface.
 *
 * Centralised so the SSR route (`app/[locale]/(listing)/discover/[page]/page.tsx`)
 * and the JSON listing API (`app/api/items/listing/route.ts`) produce identical
 * filter/sort/slice output for the same query. The JSON API powers infinite-scroll
 * pagination on top of Spec 020's server-side slice — without a shared helper the
 * two surfaces would silently drift.
 */

// Defensive coercion — items loaded via the git-CMS path can have
// `updatedAt` as a string instead of a Date, and calling `.getTime()`
// on a string throws TypeError which manifests as a 500 on
// `/discover/1?sort=…`. See e2e `listing-sort-options-tolerance.spec.ts`.
function toEpochMs(v: Date | string | null | undefined): number {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

// Stable name key — fall back to slug when `name` is missing OR empty
// so items without an explicit display name still sort
// deterministically. The git-CMS path leaves `name` as an empty string
// on seed fixtures, and `?? slug` doesn't catch that ('' is a defined
// value), so the sort comparator was returning 0 for every pair and
// the page kept its source-array order regardless of asc/desc.
function nameKey(it: ItemData): string {
  const name = (it.name || '').trim();
  if (name) return name.toLowerCase();
  return (it.slug || '').toLowerCase();
}

export function sortItems(items: ItemData[], sort?: string): ItemData[] {
  if (!sort) return items;
  const copy = items.slice();
  switch (sort) {
    case 'name':
    case 'name-asc':
    case 'alphabetical':
      return copy.sort((a, b) => nameKey(a).localeCompare(nameKey(b)));
    case 'name-desc':
      return copy.sort((a, b) => nameKey(b).localeCompare(nameKey(a)));
    case 'recent':
    case 'newest':
    case 'updated':
    case 'date-desc':
      return copy.sort((a, b) => toEpochMs(b.updatedAt) - toEpochMs(a.updatedAt));
    case 'oldest':
    case 'date-asc':
      return copy.sort((a, b) => toEpochMs(a.updatedAt) - toEpochMs(b.updatedAt));
    default:
      return items;
  }
}

export function parseCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
