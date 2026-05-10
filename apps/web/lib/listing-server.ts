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

export function sortItems(items: ItemData[], sort?: string): ItemData[] {
  if (!sort) return items;
  const copy = items.slice();
  switch (sort) {
    case 'name':
    case 'name-asc':
      return copy.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    case 'name-desc':
      return copy.sort((a, b) => (b.name ?? '').localeCompare(a.name ?? ''));
    case 'recent':
    case 'updated':
    case 'date-desc':
      return copy.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
    case 'oldest':
    case 'date-asc':
      return copy.sort((a, b) => (a.updatedAt?.getTime() ?? 0) - (b.updatedAt?.getTime() ?? 0));
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
