import { fetchItem, fetchItems, type ItemData } from '@/lib/content';
import { isItemSlug, MAX_ITEM_SLUG_LENGTH } from '@/lib/item-slug';
import { isPubliclyVisibleItem } from '@/lib/item-visibility';

/**
 * Longest slug that can name an item. An item is `data/<slug>/<slug>.yml`, and a file name is at
 * most 255 bytes (ext4, NTFS), so a longer slug names no item. Reading one fails with
 * `ENAMETOOLONG` on Linux, which `fetchItem` throws as a read error, and the routes would answer
 * 500 instead of 404.
 */
const MAX_PUBLIC_ITEM_SLUG_LENGTH = MAX_ITEM_SLUG_LENGTH - '.yml'.length;

/**
 * The item at `slug` that an anonymous visitor may see, or `null` when there is none: no item by
 * that slug, a draft, pending or rejected item, a soft-deleted one, or a slug that is not an item
 * slug at all.
 *
 * The per-item engagement routes key their rows by the slug in the URL, so they call this first
 * and answer for an unpublished item as for an unknown one (T-2853): `POST
 * /api/items/[slug]/views` and the comment and vote writes answer 404, and the comment, rating and
 * vote reads answer an empty list or zero. `GET .../activity` and `GET .../votes/count` answer
 * zero too (T-2857). `DELETE .../votes`, whose answer carries the net votes, answers 404 and
 * removes no vote (T-2864).
 *
 * It reads the item as the item page does, through `fetchItem` (`lib/content.ts`), from the content
 * folder: no git sync and no database. `fetchItem` already returns `null` for an item that
 * `isPubliclyVisibleItem` rejects; the check is repeated so this answer does not depend on it. A
 * read error (EMFILE, EIO) is thrown, not turned into `null`, so the route's own error branch
 * answers.
 */
export async function findPublicItem(slug: string): Promise<ItemData | null> {
	// fetchItem keeps only the last path segment (`../x` reads item `x`) and throws for a slug with
	// any other character, or one too long to be a file name
	if (typeof slug !== 'string' || slug.length > MAX_PUBLIC_ITEM_SLUG_LENGTH || !isItemSlug(slug)) return null;
	const item = await fetchItem(slug);
	if (!item || !isPubliclyVisibleItem(item.meta)) return null;
	return item.meta;
}

/**
 * The slugs of `slugs` that name a public item, for `GET /api/items/engagement`, which takes up
 * to 200 slugs per request (T-2857). Any other slug (unknown, draft, pending, rejected,
 * soft-deleted, or not an item slug at all) is left out, so the route answers zeros for it, as
 * for an unknown slug, without a database query.
 *
 * It reads the public listing, `fetchItems()` (`lib/content.ts`), which the listing pages read
 * too and keeps in memory, instead of one `fetchItem` per slug. So it answers for exactly the
 * items the listing cards show. The `isPubliclyVisibleItem` check is repeated, as in
 * `findPublicItem`. A read error is thrown, so the route's own error branch answers.
 */
export async function findPublicItemSlugs(slugs: readonly string[]): Promise<Set<string>> {
	if (slugs.length === 0) return new Set();
	const { items } = await fetchItems();
	const listed = new Set(items.filter((item) => isPubliclyVisibleItem(item)).map((item) => item.slug));
	return new Set(slugs.filter((slug) => listed.has(slug)));
}
