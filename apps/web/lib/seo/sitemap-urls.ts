/**
 * URL helpers for app/sitemap.ts.
 *
 * A sitemap may only advertise URLs that answer 200 and declare themselves
 * canonical. These helpers keep the sitemap on the same URL shapes the routes
 * actually serve and every internal link uses.
 */

/**
 * Whether a slug can appear in a sitemap URL as-is: non-empty, shorter than
 * 200 characters, and made only of `[A-Za-z0-9_-]`, so it needs no encoding.
 */
export function validateSlug(slug: string | null | undefined): slug is string {
	return Boolean(slug && slug.length > 0 && slug.length < 200 && /^[a-zA-Z0-9\-_]+$/.test(slug));
}

/**
 * The path segment the sitemap advertises for a directory record (item,
 * category, tag, collection or comparison): its stored slug VERBATIM, or null
 * when that slug is not URL-safe as-is (the record is then left out).
 *
 * Verbatim because every one of those routes looks its record up by an exact
 * match on the stored slug or id, and every internal link, breadcrumb and
 * markdown mirror uses the stored value. Rewriting it — as `sanitizeSlug()`
 * does (lowercase, `--` collapsed to `-`) — advertised URLs the site never
 * links to and that 404: comparison slugs join two item slugs with `--`
 * (`alpha--beta`), so every comparison <loc> was a 404.
 */
export function sitemapSlug(slug: string | null | undefined): string | null {
	return validateSlug(slug) ? slug : null;
}

/**
 * Lowercase `[a-z0-9_-]` token for a slug, with runs of `-` collapsed.
 *
 * NOT for sitemap route segments (see `sitemapSlug()`): the routes match the
 * stored slug exactly, so a rewritten slug is a different URL. Kept for
 * callers that want a normalised token.
 */
export function sanitizeSlug(slug: string): string {
	return slug
		.replace(/[^a-zA-Z0-9\-_]/g, '-')
		.replace(/--+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
}

/** Directory sections a site can switch off in its settings. */
export interface SitemapSections {
	/** `settings.categories_enabled` (lib/utils/settings.ts getCategoriesEnabled). */
	categories: boolean;
	/** `settings.tags_enabled` (lib/utils/settings.ts getTagsEnabled). */
	tags: boolean;
	/**
	 * Whether the site has at least one active collection. False drops
	 * `/collections`, which is then an empty listing. Left out = listed, as
	 * before this flag existed.
	 */
	collections?: boolean;
}

function isUnder(path: string, section: string): boolean {
	return path === section || path.startsWith(`${section}/`);
}

/**
 * Whether a locale-less path (`/categories`, `/tags/<id>`, ...) may be
 * advertised given which sections the site has enabled. A disabled section's
 * pages answer 404 (the routes call `notFound()`), so the sitemap must not
 * list them; nor the collections listing of a site that has no collection.
 */
export function isSitemapPathEnabled(path: string, sections: SitemapSections): boolean {
	if (!sections.categories && isUnder(path, '/categories')) return false;
	if (!sections.tags && isUnder(path, '/tags')) return false;
	if (sections.collections === false && isUnder(path, '/collections')) return false;
	return true;
}

/**
 * `lastModified` for a sitemap entry from an optional date string. An
 * unparseable value would be an Invalid Date, which fails the whole sitemap
 * when it is serialised, so it falls back to `fallback`.
 */
export function sitemapDate(value: string | number | Date | null | undefined, fallback: Date = new Date()): Date {
	if (value === null || value === undefined || value === '') return fallback;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? fallback : date;
}
