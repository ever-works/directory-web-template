import { MetadataRoute } from 'next';
import {
	getCachedAllPostSummaries,
	getCachedComparisons,
	getCachedItems,
	getCachedPostTaxonomies
} from '@/lib/content';
import type { PostSummary } from '@/types/post';
import { buildCategoryHref, buildPostHref, buildTagHref } from '@/lib/blog/urls';
import { getBaseUrl as getPublicBaseUrl } from '@/lib/utils/url-cleaner';
import {
	isSitemapPathEnabled,
	latestDate,
	newestByTerm,
	optionalDate,
	sitemapSlug,
	validateSlug,
	type SitemapSections
} from '@/lib/seo/sitemap-urls';
import { getCategoriesEnabled, getTagsEnabled } from '@/lib/utils/settings';
import { generateHreflangAlternates, getLocalizedUrl } from '@/lib/seo/hreflang';
import { DEFAULT_LOCALE, LOCALES } from '@/lib/constants';

// Rendered per request, never prerendered. The image is built without
// NEXT_PUBLIC_APP_URL (the deploy platform injects it at runtime), so the copy
// `next build` prerendered named the fallback origin, and it was served
// (x-nextjs-cache: STALE) to the first crawler after every deploy.
export const dynamic = 'force-dynamic';

// Types
interface RouteConfig {
	path: string;
	priority: number;
	changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

interface SitemapEntry {
	url: string;
	/**
	 * When the page's content last changed, from the data (item `updated_at`,
	 * comparison `generated_at`, post date). Omitted when the data has no
	 * date: "now" on every fetch made crawlers ignore every date (Spec 062).
	 */
	lastModified?: Date;
	changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
	priority: number;
	images?: string[];
	/** hreflang alternates (every locale + x-default), the same set each page declares in its <head>. */
	alternates?: { languages: Record<string, string> };
}

/**
 * A path's URL in the default locale: unprefixed in the `as-needed` style, `/<default>`-prefixed with
 * `LOCALE_URL_STYLE=always` (getLocalizedUrl), the same URL the page names as its canonical.
 */
const defaultLocaleUrl = (path: string): string => getLocalizedUrl(path, DEFAULT_LOCALE);

/** The page's hreflang alternates, as `generateHreflangAlternates` puts them in its <head>. */
const languagesFor = (path: string): SitemapEntry['alternates'] => ({ languages: generateHreflangAlternates(path) });

/** Pages whose content is the item listing: their lastModified is the newest item's. */
const ITEM_LISTING_PATHS = new Set(['', '/categories', '/tags']);

/** Newest dates of the records a listing page shows; a path with no known date gets no lastModified. */
interface ListingDates {
	newestItem: Date | null;
	newestComparison: Date | null;
}

const listingDate = (path: string, dates: ListingDates): Date | null =>
	ITEM_LISTING_PATHS.has(path) ? dates.newestItem : path === '/comparisons' ? dates.newestComparison : null;

// Constants
const DEFAULT_PRIORITIES = {
	HOME: 1.0,
	MAIN: 0.9,
	SECONDARY: 0.8,
	TERTIARY: 0.7,
	LOW: 0.5
} as const;

const DEFAULT_CHANGE_FREQUENCIES = {
	DAILY: 'daily',
	WEEKLY: 'weekly',
	MONTHLY: 'monthly'
} as const;

// The site's public origin: NEXT_PUBLIC_CANONICAL_URL when pinned, else the
// app URL — the same normalised value every canonical tag is built on, so a
// <loc> and the canonical of the page it names cannot disagree.
const appUrl = getPublicBaseUrl();

// Configuration
const STATIC_ROUTES: RouteConfig[] = [
	{
		path: '',
		priority: DEFAULT_PRIORITIES.HOME,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.DAILY
	},
	{
		path: '/about',
		priority: DEFAULT_PRIORITIES.SECONDARY,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/help',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/pricing',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/categories',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.DAILY
	},
	{
		path: '/tags',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.DAILY
	},
	{
		path: '/collections',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/comparisons',
		priority: DEFAULT_PRIORITIES.MAIN,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/submit',
		priority: DEFAULT_PRIORITIES.TERTIARY,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/faq',
		priority: DEFAULT_PRIORITIES.SECONDARY,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY
	},
	{
		path: '/privacy-policy',
		priority: DEFAULT_PRIORITIES.LOW,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.MONTHLY
	},
	{
		path: '/terms-of-service',
		priority: DEFAULT_PRIORITIES.LOW,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.MONTHLY
	},
	{
		path: '/cookies',
		priority: DEFAULT_PRIORITIES.LOW,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.MONTHLY
	}
];

const PAGINATION_ROUTES = ['/tags/paging', '/collections/paging'];

/**
 * Whether to advertise PAGINATION_ROUTES. Off: page 1 of /tags/paging and
 * /collections/paging renders the same listing as /tags and /collections
 * (already listed) and canonicalises there, and a sitemap lists canonical
 * URLs only. Kept as a switch rather than deleted.
 */
const ADVERTISE_PAGINATION_ROUTES = false;

// Helper functions
const getBaseUrl = (): string => {
	return appUrl.replace(/\/+$/, '');
};

// validateSlug / sanitizeSlug live in lib/seo/sitemap-urls.ts (unit-tested),
// next to sitemapSlug(), which is what the record URLs below use.

/**
 * Which optional sections are on; a switched-off section's pages 404. Never
 * throws: it also feeds the error fallback below, and an unreadable setting
 * falls back to the settings' own default (enabled).
 */
const getEnabledSections = (): SitemapSections => {
	try {
		return { categories: getCategoriesEnabled(), tags: getTagsEnabled() };
	} catch (error) {
		console.error('Failed to read the categories/tags settings for the sitemap:', error);
		return { categories: true, tags: true };
	}
};

/**
 * getEnabledSections() plus whether the site has any active collection: with
 * none, `/collections` is an empty listing and is not advertised. Never
 * throws; unreadable content keeps `/collections` listed (the old behaviour).
 * getCachedItems() is cached, so generateDynamicRoutes() reuses this read.
 */
const getSitemapSections = async (): Promise<SitemapSections> => {
	const sections = getEnabledSections();
	try {
		const { collections } = await getCachedItems();
		return { ...sections, collections: collections.some((collection) => collection.isActive !== false) };
	} catch (error) {
		console.error('Failed to read the collections for the sitemap:', error);
		return sections;
	}
};

/** Unicode control characters, which cannot appear in a real post filename. */
const CONTROL_CHARACTERS = /\p{Cc}/u;

/**
 * Whether a blog post slug may be advertised in the sitemap.
 *
 * Deliberately NOT `validateSlug()`. Post slugs are filenames from the data
 * repository, and a filename may legally hold a space, an accent or a `?` —
 * `buildPostHref()` exists to percent-encode exactly that into one safe path
 * segment. Rejecting anything outside `[a-zA-Z0-9-_]` therefore dropped those
 * posts from the sitemap while the listing still linked to them and the feed
 * still announced them, making the one surface whose whole job is
 * discoverability the only one that hid them. Encoding is what makes the URL
 * safe here, so this rejects only what could not be a post at all.
 */
const validatePostSlug = (slug: string): boolean => {
	return Boolean(slug) && slug.length < 200 && !CONTROL_CHARACTERS.test(slug);
};

/**
 * Converts an icon URL to an absolute URL for sitemap image entries.
 * Uses the URL constructor for robust resolution of relative paths,
 * protocol-relative URLs, and already-absolute URLs.
 * @param iconUrl - The icon URL from the item data
 * @param baseUrl - The base URL of the site
 * @returns Absolute URL string or null if the URL is invalid
 */
const toAbsoluteImageUrl = (iconUrl: string | undefined, baseUrl: string): string | null => {
	if (!iconUrl || typeof iconUrl !== 'string' || iconUrl.trim() === '') {
		return null;
	}

	try {
		const url = new URL(iconUrl.trim(), baseUrl);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return null;
		}
		return url.toString();
	} catch {
		return null;
	}
};

const generateStaticRoutes = (sections: SitemapSections, dates: ListingDates): SitemapEntry[] => {
	return STATIC_ROUTES.filter((route) => isSitemapPathEnabled(route.path, sections)).map((route) => ({
		url: defaultLocaleUrl(route.path),
		...(listingDate(route.path, dates) && { lastModified: listingDate(route.path, dates)! }),
		changeFrequency: route.changeFrequency,
		priority: route.priority,
		alternates: languagesFor(route.path)
	}));
};

/**
 * The blog listing route, in the default locale and every prefixed one.
 *
 * Deliberately NOT a `STATIC_ROUTES` entry: the blog only exists when the data
 * repository actually ships posts, and a sitemap that advertises `/blog` on a
 * directory with none sends crawlers to an empty-state page. Emitted only when
 * `generateDynamicRoutes()` found at least one post.
 */
const generateBlogListingRoutes = (baseUrl: string, newestPost: Date | null): SitemapEntry[] => [
	{
		url: defaultLocaleUrl('/blog'),
		...(newestPost && { lastModified: newestPost }),
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
		priority: DEFAULT_PRIORITIES.MAIN,
		alternates: languagesFor('/blog')
	},
	...PREFIXED_LOCALES.map((locale) => ({
		url: `${baseUrl}/${locale}/blog`,
		...(newestPost && { lastModified: newestPost }),
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
		priority: DEFAULT_PRIORITIES.MAIN,
		alternates: languagesFor('/blog')
	}))
];

const generatePaginationRoutes = (baseUrl: string): SitemapEntry[] => {
	return PAGINATION_ROUTES.map((route) => ({
		url: `${baseUrl}${route}`,
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
		priority: DEFAULT_PRIORITIES.LOW
	}));
};

/**
 * Locales that carry a URL prefix (the default locale is served unprefixed):
 * every supported locale, the same list the hreflang alternates use. It was a
 * hard-coded five while every page declared all of them (Spec 062).
 */
const PREFIXED_LOCALES = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

const generateLocaleRoutes = (baseUrl: string, sections: SitemapSections, dates: ListingDates): SitemapEntry[] => {
	const routes: SitemapEntry[] = [];

	PREFIXED_LOCALES.forEach((locale) => {
		STATIC_ROUTES.filter((route) => isSitemapPathEnabled(route.path, sections)).forEach((route) => {
			routes.push({
				url: `${baseUrl}/${locale}${route.path}`,
				...(listingDate(route.path, dates) && { lastModified: listingDate(route.path, dates)! }),
				changeFrequency: route.changeFrequency,
				priority: route.priority,
				alternates: languagesFor(route.path)
			});
		});
	});

	return routes;
};

/**
 * Every published post.
 *
 * Uses the unpaginated loader rather than walking `getCachedPosts()` page by
 * page: that loader re-reads and re-parses the entire posts directory on every
 * call, so paging through it would cost O(posts x pages) and would also need
 * an arbitrary page cap that silently truncates a large blog. One pass, no cap,
 * every post.
 */
const fetchAllPostsForSitemap = async (): Promise<PostSummary[]> => {
	try {
		return await getCachedAllPostSummaries();
	} catch {
		// A directory without a posts folder simply contributes no blog URLs.
		return [];
	}
};

/**
 * One entry per directory record (item, category, tag, collection or
 * comparison) at `<base>/<slug>`, using the record's stored slug VERBATIM
 * (sitemapSlug in lib/seo/sitemap-urls.ts): the routes look records up by an
 * exact match on it and every internal link uses it. A record whose slug is
 * not URL-safe as stored is left out rather than rewritten to a URL that 404s.
 */
const recordEntries = <T>(
	records: ReadonlyArray<T>,
	section: string,
	slugOf: (record: T) => string | null | undefined,
	entryOf: (record: T) => Omit<SitemapEntry, 'url'>
): SitemapEntry[] =>
	records.flatMap((record) => {
		const slug = sitemapSlug(slugOf(record));
		if (!slug) return [];
		const path = `${section}/${slug}`;
		return [{ url: defaultLocaleUrl(path), ...entryOf(record), alternates: languagesFor(path) }];
	});

const generateDynamicRoutes = async (
	baseUrl: string,
	sections: SitemapSections
): Promise<{ entries: SitemapEntry[]; hasPosts: boolean; dates: ListingDates }> => {
	try {
		const [{ items, categories, tags, collections }, { comparisons }, posts, postTaxonomies] = await Promise.all([
			getCachedItems(),
			getCachedComparisons(),
			// The blog is optional: a data repository without a posts folder
			// resolves to an empty list rather than failing the sitemap.
			fetchAllPostsForSitemap(),
			getCachedPostTaxonomies().catch(() => ({ categories: [], tags: [] }))
		]);

		// lastModified of a category / tag: its newest item (Spec 062).
		const itemDate = (item: (typeof items)[number]) => item.updatedAt ?? item.updated_at;
		const newestByCategory = newestByTerm(items, (item) => item.category, itemDate);
		const newestByTag = newestByTerm(items, (item) => item.tags, itemDate);
		const newestItem = latestDate(items.map((item) => optionalDate(itemDate(item))));

		const entries: SitemapEntry[] = [
			// Directory records, each under its stored slug VERBATIM (recordEntries).
			// Items - include images for items with icon_url
			...recordEntries(
				items,
				'/items',
				(item) => item.slug,
				(item) => {
					const absoluteImageUrl = toAbsoluteImageUrl(item.icon_url, baseUrl);
					const lastModified = optionalDate(itemDate(item));
					return {
						// updatedAt comes back from the content cache as a string, and an
						// unparseable updated_at is an Invalid Date; optionalDate() copes
						// (and an item without a date gets no lastModified).
						...(lastModified && { lastModified }),
						changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
						priority: item.featured ? DEFAULT_PRIORITIES.MAIN : DEFAULT_PRIORITIES.SECONDARY,
						...(absoluteImageUrl && { images: [absoluteImageUrl] })
					};
				}
			),
			// Categories as `/categories/<id>`: the shape every internal link,
			// breadcrumb, JSON-LD entry and markdown mirror uses, and it
			// self-canonicalises. The legacy `/categories/category/<id>` listed here
			// before answered HTTP 500 (DYNAMIC_SERVER_USAGE) for every category.
			// None when the site switches categories off (the pages 404).
			...recordEntries(
				sections.categories ? categories : [],
				'/categories',
				(category) => category.id,
				(category) => ({
					...(newestByCategory.get(category.id) && { lastModified: newestByCategory.get(category.id) }),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.SECONDARY
				})
			),
			// None when the site switches tags off (the pages 404).
			...recordEntries(
				sections.tags ? tags : [],
				'/tags',
				(tag) => tag.id,
				(tag) => ({
					...(newestByTag.get(tag.id) && { lastModified: newestByTag.get(tag.id) }),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.TERTIARY
				})
			),
			...recordEntries(
				collections.filter((collection) => collection.isActive !== false),
				'/collections',
				(collection) => collection.slug || collection.id,
				() => ({
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.SECONDARY
				})
			),
			// Comparison slugs join two item slugs with `--` (`alpha--beta`); the
			// sanitizeSlug() rewrite used here before collapsed that to `-`, and
			// every comparison <loc> was a 404.
			...recordEntries(
				comparisons,
				'/comparisons',
				(comparison) => comparison.slug,
				(comparison) => ({
					...(optionalDate(comparison.generated_at) && { lastModified: optionalDate(comparison.generated_at)! }),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.SECONDARY
				})
			),
			// Blog posts (Spec 050)
			...posts
				.filter((post) => validatePostSlug(post.slug))
				.map((post) => {
					const lastModified = optionalDate(post.date);
					const entry: SitemapEntry = {
						// NOT `sanitizeSlug()`: it lowercases, and the post loader looks
						// slugs up against filenames case-sensitively, so a post file with
						// an uppercase letter would be advertised at a URL that 404s.
						// `buildPostHref()` is the same builder the in-app links use, so
						// the sitemap can never advertise a different URL than the site
						// links to.
						url: defaultLocaleUrl(buildPostHref(post.slug)),
						...(lastModified && { lastModified }),
						changeFrequency: DEFAULT_CHANGE_FREQUENCIES.MONTHLY,
						priority: DEFAULT_PRIORITIES.SECONDARY,
						// Every locale renders the post (the loader falls back to the
						// English file), and the post page declares the same set.
						alternates: languagesFor(buildPostHref(post.slug))
					};

					const absoluteImageUrl = toAbsoluteImageUrl(post.image, baseUrl);
					if (absoluteImageUrl) {
						entry.images = [absoluteImageUrl];
					}

					return entry;
				}),
			// Blog taxonomy archives — only terms that actually have posts, so
			// the sitemap never advertises an empty archive. As with post slugs,
			// the validated term id is used verbatim: the archive routes match it
			// exactly, so any rewriting here would advertise a URL that 404s.
			...postTaxonomies.categories
				.filter((category) => category.count > 0 && validateSlug(category.id))
				.map((category) => ({
					url: defaultLocaleUrl(buildCategoryHref(category.id)),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.TERTIARY,
					alternates: languagesFor(buildCategoryHref(category.id))
				})),
			...postTaxonomies.tags
				.filter((tag) => tag.count > 0 && validateSlug(tag.id))
				.map((tag) => ({
					url: defaultLocaleUrl(buildTagHref(tag.id)),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.TERTIARY,
					alternates: languagesFor(buildTagHref(tag.id))
				}))
		];

		// The blog listing URL rides along here rather than in STATIC_ROUTES so
		// it is advertised only when the data repository actually ships posts.
		const hasPosts = posts.length > 0;
		const newestPost = latestDate(posts.map((post) => optionalDate(post.date)));
		return {
			entries: hasPosts ? [...entries, ...generateBlogListingRoutes(baseUrl, newestPost)] : entries,
			hasPosts,
			dates: {
				newestItem,
				newestComparison: latestDate(comparisons.map((comparison) => optionalDate(comparison.generated_at)))
			}
		};
	} catch (error) {
		console.error('Failed to generate dynamic routes:', error);
		return { entries: [], hasPosts: false, dates: { newestItem: null, newestComparison: null } };
	}
};

// Main sitemap generator
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	try {
		const baseUrl = getBaseUrl();
		const sections = await getSitemapSections();

		const dynamicRoutes = await generateDynamicRoutes(baseUrl, sections);
		const staticRoutes = generateStaticRoutes(sections, dynamicRoutes.dates);
		const paginationRoutes = ADVERTISE_PAGINATION_ROUTES ? generatePaginationRoutes(baseUrl) : [];
		const localeRoutes = generateLocaleRoutes(baseUrl, sections, dynamicRoutes.dates);

		return [...staticRoutes, ...dynamicRoutes.entries, ...paginationRoutes, ...localeRoutes];
	} catch (error) {
		console.error('Error generating sitemap:', error);
		// Return basic sitemap with static routes in case of error
		return generateStaticRoutes(getEnabledSections(), { newestItem: null, newestComparison: null });
	}
}
