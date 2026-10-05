import { getCachedItems } from '@/lib/content';
import { resolveListingPage } from '@/lib/seo/paging';
import { getTagsEnabled } from '@/lib/utils/settings';

// Set per page to 12 for tags (default from config)
export const TAGS_PER_PAGE = 12; // This matches the default in LayoutThemeContext

/**
 * The tags and the page `/tags/paging/<rawPage>` names, or null when it is not
 * a page of the tag listing: tags switched off, a malformed segment, or a page
 * past the last one. The segment's layout.tsx turns null into a real 404
 * before the response starts streaming; page.tsx and its metadata use the same
 * answer.
 */
export async function resolveTagsPage(rawPage: string | undefined, locale: string) {
	if (!getTagsEnabled()) return null;
	const { tags } = await getCachedItems({ lang: locale, sortTags: true });
	const page = resolveListingPage(rawPage, tags.length, TAGS_PER_PAGE);
	return page === null ? null : { tags, page };
}
