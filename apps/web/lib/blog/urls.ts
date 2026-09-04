/**
 * URL and formatting helpers shared by the blog surfaces (Spec 050).
 *
 * Kept free of `server-only` imports so both server components (listing,
 * detail) and client components (search box) can use them.
 */

/** Base path of the blog section. */
export const BLOG_BASE_PATH = '/blog';

/** Query-string keys the blog listing understands. */
export const BLOG_QUERY_KEYS = {
	page: 'page',
	query: 'q',
	category: 'category',
	tag: 'tag'
} as const;

export interface BlogListingQuery {
	page?: number;
	q?: string;
	category?: string;
	tag?: string;
}

/**
 * Build a listing URL with only the meaningful params set.
 *
 * `page=1` is omitted so the canonical first page has no query string, and
 * empty filters are dropped rather than serialized as `?q=`.
 */
export function buildBlogListingHref(basePath: string, query: BlogListingQuery = {}): string {
	const params = new URLSearchParams();

	if (query.q && query.q.trim()) params.set(BLOG_QUERY_KEYS.query, query.q.trim());
	if (query.category) params.set(BLOG_QUERY_KEYS.category, query.category);
	if (query.tag) params.set(BLOG_QUERY_KEYS.tag, query.tag);
	if (query.page && query.page > 1) params.set(BLOG_QUERY_KEYS.page, String(query.page));

	const search = params.toString();
	return search ? `${basePath}?${search}` : basePath;
}

/** Path of a single post. */
export function buildPostHref(slug: string): string {
	return `${BLOG_BASE_PATH}/${slug}`;
}

/** Path of a category archive. */
export function buildCategoryHref(id: string): string {
	return `${BLOG_BASE_PATH}/category/${id}`;
}

/** Path of a tag archive. */
export function buildTagHref(id: string): string {
	return `${BLOG_BASE_PATH}/tag/${id}`;
}

/**
 * Read a single value out of a Next.js `searchParams` entry, which may be a
 * string, an array (repeated param) or undefined.
 */
export function firstSearchParam(value: string | string[] | undefined): string | undefined {
	if (Array.isArray(value)) return value[0];
	return value;
}

/** Parse a `?page=` value into a positive integer, defaulting to 1. */
export function parsePageParam(value: string | string[] | undefined): number {
	const raw = Number(firstSearchParam(value));
	if (!Number.isFinite(raw) || raw < 1) return 1;
	return Math.floor(raw);
}

/**
 * Format a post's ISO date for display.
 * Returns an empty string for undated posts so callers can omit the element.
 */
export function formatPostDate(iso: string, locale: string): string {
	if (!iso) return '';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleDateString(locale || undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

/** `2026-02-14` — the machine-readable value for a `<time dateTime>` attribute. */
export function toDateTimeAttribute(iso: string): string | undefined {
	if (!iso) return undefined;
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return undefined;
	return date.toISOString();
}
