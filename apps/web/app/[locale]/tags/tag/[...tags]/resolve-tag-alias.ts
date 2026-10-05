import { getCachedItemsByTag } from '@/lib/content';
import { PER_PAGE } from '@/lib/paginate';
import { resolveAliasPage } from '@/lib/seo/paging';
import { decodeSegment, findTagBySegment } from '@/lib/seo/route-segment';
import { getTagsEnabled } from '@/lib/utils/settings';

/**
 * What `/tags/tag/<segments>` names, or null when it is not a page of this
 * site: tags switched off, an unknown tag, a malformed page segment, a page
 * past the tag's last page, or any segment after the page. The segment's
 * layout.tsx turns null into a real 404 before the response starts streaming;
 * page.tsx and its metadata use the same answer.
 */
export async function resolveTagAlias(segments: readonly string[], locale: string) {
	if (!getTagsEnabled()) return null;

	const [rawTag, ...pageSegments] = segments;
	const tag = decodeSegment(rawTag);
	if (tag === null) return null;

	const bySegment = await getCachedItemsByTag(tag, { lang: locale });
	const matchedTag = findTagBySegment(bySegment.tags, tag);
	if (!matchedTag) return null;

	// fetchByTag matches items on the tag ID, so a URL naming the tag by its
	// display name (`/tags/tag/Open%20Source`) found none of them: read the
	// items by the matched id, as (listing)/tags/[...tag] does.
	const result =
		matchedTag.id === tag ? bySegment : await getCachedItemsByTag(matchedTag.id, { lang: locale });

	// The pages <ListingTags> offers for this tag: 12 per page over the TAG's
	// items. NOT `result.total`, which fetchByTag returns as the whole
	// catalogue's count, so /tags/tag/<id>/14 .. /273 answered for a tag with 13
	// pages. page.tsx hands the same `total` to the pager, so every page it
	// links answers.
	const total = result.items.length;
	const page = resolveAliasPage(pageSegments, total, PER_PAGE);
	if (page === null) return null;

	return { ...result, total, tag, matchedTag, page };
}
