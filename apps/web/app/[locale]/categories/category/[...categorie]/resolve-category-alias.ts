import { getCachedItemsByCategory, type Category } from '@/lib/content';
import { PER_PAGE } from '@/lib/paginate';
import { resolveAliasPage } from '@/lib/seo/paging';
import { decodeSegment } from '@/lib/seo/route-segment';
import { slugify } from '@/lib/utils';
import { getCategoriesEnabled } from '@/lib/utils/settings';

/** The category a URL segment names: by id, by slugified id, or by name. */
export function findCategory(categories: Category[], category: string): Category | undefined {
	const slug = slugify(category);
	return categories.find(
		(c) => c.id === category || c.id === slug || c.name.toLowerCase() === category.toLowerCase()
	);
}

/**
 * What `/categories/category/<segments>` names, or null when it is not a page
 * of this site: categories switched off, an unknown category, a malformed page
 * segment, a page past the category's last page, or any segment after the
 * page. The segment's layout.tsx turns null into a real 404 before the
 * response starts streaming; page.tsx and its metadata use the same answer.
 */
export async function resolveCategoryAlias(segments: readonly string[], locale: string) {
	if (!getCategoriesEnabled()) return null;

	const [rawCategory, ...pageSegments] = segments;
	const category = decodeSegment(rawCategory);
	if (category === null) return null;

	const result = await getCachedItemsByCategory(category, { lang: locale });
	const matchedCategory = findCategory(result.categories, category);
	if (!matchedCategory) return null;

	// The pages <Listing> paginates this category into (12 per page).
	const page = resolveAliasPage(pageSegments, result.total, PER_PAGE);
	if (page === null) return null;

	return { ...result, category, matchedCategory, page };
}
