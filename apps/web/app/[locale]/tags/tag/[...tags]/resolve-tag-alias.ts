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

	const result = await getCachedItemsByTag(tag, { lang: locale });
	const matchedTag = findTagBySegment(result.tags, tag);
	if (!matchedTag) return null;

	// The pages <ListingTags> offers for this tag (12 per page, over its items).
	const page = resolveAliasPage(pageSegments, result.total, PER_PAGE);
	if (page === null) return null;

	return { ...result, tag, matchedTag, page };
}
