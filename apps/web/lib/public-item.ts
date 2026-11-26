import { fetchItem, type ItemData } from '@/lib/content';
import { isItemSlug } from '@/lib/item-slug';
import { isPubliclyVisibleItem } from '@/lib/item-visibility';

/**
 * The item at `slug` that an anonymous visitor may see, or `null` when there is none: no item by
 * that slug, a draft, pending or rejected item, a soft-deleted one, or a slug that is not an item
 * slug at all.
 *
 * The per-item engagement routes key their rows by the slug in the URL, so they call this first
 * and answer for an unpublished item as for an unknown one (T-2853): `POST
 * /api/items/[slug]/views` and the comment and vote writes answer 404, and the comment, rating and
 * vote reads answer an empty list or zero.
 *
 * It reads the item as the item page does, through `fetchItem` (`lib/content.ts`), from the content
 * folder: no git sync and no database. `fetchItem` already returns `null` for an item that
 * `isPubliclyVisibleItem` rejects; the check is repeated so this answer does not depend on it. A
 * read error (EMFILE, EIO) is thrown, not turned into `null`, so the route's own error branch
 * answers.
 */
export async function findPublicItem(slug: string): Promise<ItemData | null> {
	// fetchItem keeps only the last path segment (`../x` reads item `x`) and throws for a slug with
	// any other character
	if (typeof slug !== 'string' || !isItemSlug(slug)) return null;
	const item = await fetchItem(slug);
	if (!item || !isPubliclyVisibleItem(item.meta)) return null;
	return item.meta;
}
