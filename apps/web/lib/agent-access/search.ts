/**
 * Search, filters and sorting over `ItemSummary[]` — the shared ranking of
 * Agent Access Contract v1, identical to the minimal template
 * (`packages/agent-api/src/search.ts` there):
 *
 * - The query is normalised (lowercase, accents stripped) and split on
 *   non-alphanumerics into unique tokens.
 * - Per token: +8 when the whole name equals the token, else +5 when a word of
 *   the name starts with it, else +3 when the name contains it; +2 when a
 *   category or tag name contains it; +1 when the description contains it.
 * - Every token must match somewhere, or the item is not a result.
 * - A query equal to the whole name adds +10; featured items add +0.5.
 * - Ties sort by name. A query with no token returns every item.
 */

import type { ItemSummary, TagEntry } from './types';
import { normalizeText, taxonomySlug } from './text';
import { dateMs } from './dataset';

export { normalizeText, taxonomySlug };

/** Unique normalised query tokens (letters and digits of any script). */
export function tokenize(query: string): string[] {
	const tokens = normalizeText(String(query ?? ''))
		.split(/[^\p{L}\p{N}]+/u)
		.filter((token) => token.length > 0);
	return [...new Set(tokens)];
}

/** The text fields the ranking looks at. */
export interface SearchableText {
	name: string;
	description: string;
	/** Category and tag display names. */
	taxonomy: readonly string[];
	featured?: boolean;
}

/** Relevance of one item for pre-tokenised tokens; 0 when a token matches nothing. */
export function scoreItem(tokens: readonly string[], item: SearchableText, fullQuery?: string): number {
	if (tokens.length === 0) return 0;
	const name = normalizeText(item.name);
	const words = name.split(/[^\p{L}\p{N}]+/u);
	const description = normalizeText(item.description ?? '');
	const taxonomy = item.taxonomy.map(normalizeText);
	let total = 0;
	for (const token of tokens) {
		let tokenScore = 0;
		if (name === token) tokenScore += 8;
		else if (words.some((word) => word.startsWith(token))) tokenScore += 5;
		else if (name.includes(token)) tokenScore += 3;
		if (taxonomy.some((value) => value.includes(token))) tokenScore += 2;
		if (description.includes(token)) tokenScore += 1;
		if (tokenScore === 0) return 0;
		total += tokenScore;
	}
	if (fullQuery && name === fullQuery.trim()) total += 10;
	if (item.featured) total += 0.5;
	return total;
}

function searchableText(item: ItemSummary): SearchableText {
	return {
		name: item.name,
		description: item.description,
		taxonomy: [...item.categories, ...item.tags],
		featured: item.featured
	};
}

/** Items matching every token, best first (ties by name); every item when the query has no token. */
export function searchSummaries(items: readonly ItemSummary[], query: string): ItemSummary[] {
	const tokens = tokenize(query);
	if (tokens.length === 0) return [...items];
	const fullQuery = normalizeText(query);
	const scored: Array<{ item: ItemSummary; score: number }> = [];
	for (const item of items) {
		const score = scoreItem(tokens, searchableText(item), fullQuery);
		if (score > 0) scored.push({ item, score });
	}
	scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
	return scored.map((entry) => entry.item);
}

/**
 * Whether an id or name equals the wanted filter: as normalised text, or by
 * slug. The slug only counts when it is not empty: a name with no [a-z0-9]
 * (`東京`, `大阪`) slugifies to '', and two such names must not match each other.
 */
function matchesTaxonomy(ids: readonly string[], names: readonly string[], wanted: string): boolean {
	const exact = normalizeText(wanted.trim());
	const key = taxonomySlug(wanted);
	const same = (value: string) => normalizeText(value.trim()) === exact || (key !== '' && taxonomySlug(value) === key);
	return ids.some(same) || names.some(same);
}

export interface ItemFilters {
	/** Category id, display name or slug (case- and accent-insensitive). */
	category?: string;
	/** Tag id, display name or slug. */
	tag?: string;
	/** `true`: featured items only (`false` does not filter). */
	featured?: boolean;
}

export function filterSummaries(items: readonly ItemSummary[], filters: ItemFilters): ItemSummary[] {
	return items.filter(
		(item) =>
			(!filters.category || matchesTaxonomy(item.category_ids, item.categories, filters.category)) &&
			(!filters.tag || matchesTaxonomy(item.tag_ids, item.tags, filters.tag)) &&
			(filters.featured !== true || item.featured)
	);
}

/** Sort orders of `list_items`. `featured` = featured first, then name A-Z. */
export const ITEM_SORTS = ['featured', 'name-asc', 'name-desc', 'date-desc', 'date-asc'] as const;
export type ItemSort = (typeof ITEM_SORTS)[number];

/**
 * A sorted copy of `items`. Date sorts compare `updated_at` as instants
 * (raw values keep their timezone offsets and formats); items whose date is
 * missing or does not parse come last in both directions, by name.
 */
export function sortSummaries(items: readonly ItemSummary[], sort: ItemSort): ItemSummary[] {
	const byName = (a: ItemSummary, b: ItemSummary) => a.name.localeCompare(b.name);
	const byDate = (a: ItemSummary, b: ItemSummary, direction: 1 | -1) => {
		const left = dateMs(a.updated_at);
		const right = dateMs(b.updated_at);
		if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
		return (left - right) * direction;
	};
	return [...items].sort((a, b) => {
		switch (sort) {
			case 'name-asc':
				return byName(a, b);
			case 'name-desc':
				return byName(b, a);
			case 'date-desc':
				return byDate(a, b, -1) || byName(a, b);
			case 'date-asc':
				return byDate(a, b, 1) || byName(a, b);
			default:
				return Number(b.featured) - Number(a.featured) || byName(a, b);
		}
	});
}

/** Tags sorted by count (desc), then name; already the order of `/data/tags.json`. */
export function sortTagsByCount(tags: ReadonlyArray<TagEntry>): TagEntry[] {
	return [...tags].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
