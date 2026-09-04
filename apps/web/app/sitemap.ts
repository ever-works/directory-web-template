import { MetadataRoute } from 'next';
import { getCachedComparisons, getCachedItems, getCachedPostTaxonomies, getCachedPosts } from '@/lib/content';
import { MAX_POSTS_PER_PAGE } from '@/lib/blog/constants';
import type { PostSummary } from '@/types/post';

// Types
interface RouteConfig {
	path: string;
	priority: number;
	changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

interface SitemapEntry {
	url: string;
	lastModified: Date;
	changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
	priority: number;
	images?: string[];
}

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

const appUrl =
	process.env.NEXT_PUBLIC_APP_URL ??
	(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://demo.ever.works');

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

// Helper functions
const getBaseUrl = (): string => {
	return appUrl.replace(/\/+$/, '');
};

const sanitizeSlug = (slug: string): string => {
	// Remove any potentially dangerous characters and ensure valid URL format
	return slug
		.replace(/[^a-zA-Z0-9\-_]/g, '-')
		.replace(/--+/g, '-')
		.replace(/^-|-$/g, '')
		.toLowerCase();
};

const validateSlug = (slug: string): boolean => {
	// Ensure slug is safe and not empty
	return Boolean(slug && slug.length > 0 && slug.length < 200 && /^[a-zA-Z0-9\-_]+$/.test(slug));
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

const generateStaticRoutes = (baseUrl: string): SitemapEntry[] => {
	return STATIC_ROUTES.map((route) => ({
		url: `${baseUrl}${route.path}`,
		lastModified: new Date(),
		changeFrequency: route.changeFrequency,
		priority: route.priority
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
const generateBlogListingRoutes = (baseUrl: string): SitemapEntry[] => [
	{
		url: `${baseUrl}/blog`,
		lastModified: new Date(),
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
		priority: DEFAULT_PRIORITIES.MAIN
	},
	...PREFIXED_LOCALES.map((locale) => ({
		url: `${baseUrl}/${locale}/blog`,
		lastModified: new Date(),
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
		priority: DEFAULT_PRIORITIES.MAIN
	}))
];

const generatePaginationRoutes = (baseUrl: string): SitemapEntry[] => {
	return PAGINATION_ROUTES.map((route) => ({
		url: `${baseUrl}${route}`,
		lastModified: new Date(),
		changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
		priority: DEFAULT_PRIORITIES.LOW
	}));
};

/** Locales that carry a URL prefix (the default locale is served unprefixed). */
const PREFIXED_LOCALES = ['fr', 'es', 'de', 'ar', 'zh'];

const generateLocaleRoutes = (baseUrl: string): SitemapEntry[] => {
	const locales = ['en', ...PREFIXED_LOCALES];
	const routes: SitemapEntry[] = [];

	locales.forEach((locale) => {
		STATIC_ROUTES.forEach((route) => {
			if (locale !== 'en') {
				// Skip default locale prefix
				routes.push({
					url: `${baseUrl}/${locale}${route.path}`,
					lastModified: new Date(),
					changeFrequency: route.changeFrequency,
					priority: route.priority
				});
			}
		});
	});

	return routes;
};

/**
 * Every published post, across all pages.
 *
 * `getCachedPosts()` is paginated and capped at `MAX_POSTS_PER_PAGE`, so a
 * single call silently truncates the sitemap for any blog with more posts than
 * that — the exact URLs a sitemap exists to advertise. Walk the pages instead,
 * with a hard iteration bound so a loader bug can never spin here.
 */
const SITEMAP_MAX_POST_PAGES = 200;

const fetchAllPostsForSitemap = async (): Promise<PostSummary[]> => {
	const all: PostSummary[] = [];

	try {
		let page = 1;
		let totalPages = 1;

		do {
			const result = await getCachedPosts({ page, perPage: MAX_POSTS_PER_PAGE });
			all.push(...result.posts);
			totalPages = result.totalPages;
			page += 1;
		} while (page <= totalPages && page <= SITEMAP_MAX_POST_PAGES);
	} catch {
		// A directory without a posts folder simply contributes no blog URLs.
		return all;
	}

	return all;
};

const generateDynamicRoutes = async (baseUrl: string): Promise<{ entries: SitemapEntry[]; hasPosts: boolean }> => {
	try {
		const [{ items, categories, tags, collections }, { comparisons }, posts, postTaxonomies] = await Promise.all([
			getCachedItems(),
			getCachedComparisons(),
			// The blog is optional: a data repository without a posts folder
			// resolves to an empty list rather than failing the sitemap.
			fetchAllPostsForSitemap(),
			getCachedPostTaxonomies().catch(() => ({ categories: [], tags: [] }))
		]);

		const entries: SitemapEntry[] = [
			// Items - validate and sanitize slugs, include images for items with icon_url
			...items
				.filter((item) => item.slug && validateSlug(item.slug))
				.map((item) => {
					const entry: SitemapEntry = {
						url: `${baseUrl}/items/${sanitizeSlug(item.slug)}`,
						lastModified: item.updatedAt,
						changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
						priority: item.featured ? DEFAULT_PRIORITIES.MAIN : DEFAULT_PRIORITIES.SECONDARY
					};

					const absoluteImageUrl = toAbsoluteImageUrl(item.icon_url, baseUrl);
					if (absoluteImageUrl) {
						entry.images = [absoluteImageUrl];
					}

					return entry;
				}),
			...categories
				.filter((category) => category.id && validateSlug(category.id))
				.map((category) => ({
					url: `${baseUrl}/categories/category/${sanitizeSlug(category.id)}`,
					lastModified: new Date(),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.SECONDARY
				})),
			...tags
				.filter((tag) => tag.id && validateSlug(tag.id))
				.map((tag) => ({
					url: `${baseUrl}/tags/${sanitizeSlug(tag.id)}`,
					lastModified: new Date(),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.TERTIARY
				})),
			...collections
				.filter((collection) => collection.isActive !== false && (collection.slug || collection.id))
				.map((collection) => ({
					url: `${baseUrl}/collections/${sanitizeSlug(collection.slug || collection.id)}`,
					lastModified: new Date(),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.SECONDARY
				})),
			...comparisons
				.filter((comparison) => comparison.slug && validateSlug(comparison.slug))
				.map((comparison) => ({
					url: `${baseUrl}/comparisons/${sanitizeSlug(comparison.slug)}`,
					lastModified: new Date(comparison.generated_at),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.SECONDARY
				})),
			// Blog posts (Spec 050)
			...posts
				.filter((post) => post.slug && validateSlug(post.slug))
				.map((post) => {
					const lastModified = post.date ? new Date(post.date) : new Date();
					const entry: SitemapEntry = {
						// NOT `sanitizeSlug()`: it lowercases, and the post loader looks
						// slugs up against filenames case-sensitively, so a post file with
						// an uppercase letter would be advertised at a URL that 404s.
						// `validateSlug()` above already proved the slug is URL-safe.
						url: `${baseUrl}/blog/${post.slug}`,
						lastModified: Number.isNaN(lastModified.getTime()) ? new Date() : lastModified,
						changeFrequency: DEFAULT_CHANGE_FREQUENCIES.MONTHLY,
						priority: DEFAULT_PRIORITIES.SECONDARY
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
					url: `${baseUrl}/blog/category/${category.id}`,
					lastModified: new Date(),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.TERTIARY
				})),
			...postTaxonomies.tags
				.filter((tag) => tag.count > 0 && validateSlug(tag.id))
				.map((tag) => ({
					url: `${baseUrl}/blog/tag/${tag.id}`,
					lastModified: new Date(),
					changeFrequency: DEFAULT_CHANGE_FREQUENCIES.WEEKLY,
					priority: DEFAULT_PRIORITIES.TERTIARY
				}))
		];

		// The blog listing URL rides along here rather than in STATIC_ROUTES so
		// it is advertised only when the data repository actually ships posts.
		const hasPosts = posts.length > 0;
		return {
			entries: hasPosts ? [...entries, ...generateBlogListingRoutes(baseUrl)] : entries,
			hasPosts
		};
	} catch (error) {
		console.error('Failed to generate dynamic routes:', error);
		return { entries: [], hasPosts: false };
	}
};

// Main sitemap generator
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	try {
		const baseUrl = getBaseUrl();

		const [staticRoutes, paginationRoutes, localeRoutes, dynamicRoutes] = await Promise.all([
			Promise.resolve(generateStaticRoutes(baseUrl)),
			Promise.resolve(generatePaginationRoutes(baseUrl)),
			Promise.resolve(generateLocaleRoutes(baseUrl)),
			generateDynamicRoutes(baseUrl)
		]);

		return [...staticRoutes, ...dynamicRoutes.entries, ...paginationRoutes, ...localeRoutes];
	} catch (error) {
		console.error('Error generating sitemap:', error);
		// Return basic sitemap with static routes in case of error
		const baseUrl = getBaseUrl();
		return generateStaticRoutes(baseUrl);
	}
}
