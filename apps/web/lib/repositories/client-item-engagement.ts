import type { ItemData } from '@/lib/types/item';
import type { ClientSubmissionData } from '@/lib/types/client-item';

/**
 * Batched per-item counter keyed by item slug, e.g. `getViewsPerItem` or
 * `getVotesPerItem`. Slugs with no rows are simply absent from the map.
 */
export type PerItemCountLookup = (itemSlugs: string[]) => Promise<Map<string, number>>;

export interface ClientEngagementSources {
	views: PerItemCountLookup;
	likes: PerItemCountLookup;
}

/**
 * Attach the engagement numbers shown on a client's submissions (`views` and
 * `likes`) to a page of items, with one batched lookup per metric.
 *
 * `likes` is the item's vote score — the same number the public item page and
 * `GET /api/items/:slug/votes/count` report — so the submitter sees what their
 * visitors see. Items with no recorded views or votes get `0`.
 *
 * Kept free of runtime imports so it can be unit-tested without a database.
 */
export async function withClientEngagement(
	items: ItemData[],
	sources: ClientEngagementSources
): Promise<ClientSubmissionData[]> {
	if (items.length === 0) return [];

	const itemSlugs = items.map((item) => item.slug);
	const [viewsMap, likesMap] = await Promise.all([sources.views(itemSlugs), sources.likes(itemSlugs)]);

	return items.map((item) => ({
		...item,
		views: viewsMap.get(item.slug) ?? 0,
		likes: likesMap.get(item.slug) ?? 0
	}));
}
