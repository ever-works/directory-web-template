import { ITEM_STATUSES } from '@/lib/types/item';

/** The two fields of an item's YAML that decide whether the public may see it. */
export interface ItemVisibilityFields {
	status?: unknown;
	deleted_at?: unknown;
}

/**
 * Whether an anonymous visitor may see an item: on the listings, the map, the item page, the
 * category, tag and collection pages, the sitemap, the feeds, `items.json` and `llms-full.txt`
 * (all of them read `fetchItems` or `fetchItem` in `lib/content.ts`).
 *
 * Public means approved and not soft-deleted. A YAML file with no status (hand-written content,
 * older data repositories) counts as approved, as `ItemGitService` reads it. A draft, pending
 * (client submission) or rejected item, an item with `deleted_at`, and any other status value
 * stay hidden. The admin and client dashboards read items through `ItemGitService` and still
 * see every item. The location index keeps the same items: `isLocationIndexable` (spec 063)
 * requires `approved` exactly, but reads items through `ItemGitService`, which turns a missing
 * status into `approved` (checked in `lib/__tests__/public-item-visibility.spec.ts`).
 */
export function isPubliclyVisibleItem(item: ItemVisibilityFields): boolean {
	const { status, deleted_at } = item;
	const approved = status === undefined || status === null || status === '' || status === ITEM_STATUSES.APPROVED;
	return approved && !deleted_at;
}
