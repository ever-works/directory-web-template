/**
 * RSS 2.0 / Atom 1.0 / JSON Feed 1.1 generators.
 *
 * Thin wrapper around the [`feed`](https://www.npmjs.com/package/feed)
 * library — a single mature, well-tested implementation that emits all
 * three formats from one in-memory `Feed` instance. We map our
 * directory items into the shape the library expects, then call its
 * `.rss2()`, `.atom1()`, or `.json1()` serializer.
 *
 * Each feed format is exposed at a stable URL via the route handlers
 * in `app/rss.xml/`, `app/atom.xml/`, and `app/feed.json/`.
 */

import { Feed } from 'feed';
import type { ItemData } from '@/lib/content';

/** A single feed entry, derived from an `ItemData`. */
export interface FeedEntry {
	title: string;
	/** Absolute URL to the canonical HTML page. */
	link: string;
	description: string;
	/** ISO-8601 publication / update date. */
	pubDate: string;
	/** Globally unique identifier (typically same as link). */
	guid: string;
	/** First category name, if any. */
	category?: string;
}

/** Resolved feed configuration shared by all three formats. */
export interface FeedConfig {
	title: string;
	description: string;
	siteUrl: string;
	limit: number;
	rssFilename: string;
	atomFilename: string;
	jsonFeedFilename: string;
}

const DEFAULTS = {
	limit: 50,
	rssFilename: 'rss.xml',
	atomFilename: 'atom.xml',
	jsonFeedFilename: 'feed.json'
} as const;

/** Produce a `FeedConfig` filled with defaults from a partial input. */
export function resolveFeedConfig(opts: {
	title: string;
	description: string;
	siteUrl: string;
	limit?: number;
}): FeedConfig {
	return {
		title: opts.title,
		description: opts.description,
		siteUrl: opts.siteUrl.replace(/\/+$/, ''),
		limit: opts.limit ?? DEFAULTS.limit,
		rssFilename: DEFAULTS.rssFilename,
		atomFilename: DEFAULTS.atomFilename,
		jsonFeedFilename: DEFAULTS.jsonFeedFilename
	};
}

function categoryName(cat: ItemData['category']): string | undefined {
	if (!cat) return undefined;
	if (Array.isArray(cat)) {
		const first = cat[0];
		if (!first) return undefined;
		return typeof first === 'string' ? first : (first.name ?? first.id);
	}
	return typeof cat === 'string' ? cat : (cat.name ?? cat.id);
}

/**
 * Convert items into normalized feed entries.
 *
 * Sorts by `updated_at` descending, caps at `config.limit`, and maps
 * each remaining item to a {@link FeedEntry} with absolute URLs.
 */
export function buildFeedEntries(items: ReadonlyArray<ItemData>, config: FeedConfig): FeedEntry[] {
	const sorted = [...items].sort(
		(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
	);
	const limited = sorted.slice(0, config.limit);
	const siteUrl = config.siteUrl.replace(/\/+$/, '');

	return limited.map((item) => ({
		title: item.name,
		link: `${siteUrl}/items/${item.slug}`,
		description: item.description ?? '',
		pubDate: item.updated_at,
		guid: `${siteUrl}/items/${item.slug}`,
		category: categoryName(item.category)
	}));
}

/** Parse an ISO-ish string into a `Date`, falling back to `now`. */
function safeDate(iso: string): Date {
	const d = new Date(iso);
	return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Build a populated `Feed` instance shared by all three serializers.
 *
 * Centralizing this avoids three slightly-different feed configs and
 * guarantees `.rss2()`, `.atom1()`, and `.json1()` describe the same
 * underlying content.
 */
function buildFeed(entries: ReadonlyArray<FeedEntry>, config: FeedConfig): Feed {
	const siteUrl = config.siteUrl.replace(/\/+$/, '');
	const updated = entries[0] ? safeDate(entries[0].pubDate) : new Date();

	const feed = new Feed({
		title: config.title,
		description: config.description,
		id: `${siteUrl}/`,
		link: siteUrl || undefined,
		language: 'en',
		updated,
		generator: 'Ever Works',
		feedLinks: {
			rss: `${siteUrl}/${config.rssFilename}`,
			atom: `${siteUrl}/${config.atomFilename}`,
			json: `${siteUrl}/${config.jsonFeedFilename}`
		}
	});

	for (const entry of entries) {
		const date = safeDate(entry.pubDate);
		feed.addItem({
			title: entry.title,
			id: entry.guid,
			link: entry.link,
			description: entry.description,
			// Set both `date` (→ JSON Feed `date_modified`) and `published`
			// (→ JSON Feed `date_published`) so consumers can read either.
			// Our items expose only `updated_at`, so we use it for both.
			date,
			published: date,
			...(entry.category ? { category: [{ name: entry.category }] } : {})
		});
	}

	return feed;
}

/** Generate an RSS 2.0 XML feed via the `feed` library. */
export function generateRss(entries: ReadonlyArray<FeedEntry>, config: FeedConfig): string {
	return buildFeed(entries, config).rss2();
}

/** Generate an Atom 1.0 XML feed via the `feed` library. */
export function generateAtom(entries: ReadonlyArray<FeedEntry>, config: FeedConfig): string {
	return buildFeed(entries, config).atom1();
}

/**
 * Generate a JSON Feed 1.1 document via the `feed` library.
 *
 * The `feed` library currently emits the JSON Feed 1.0 version URL;
 * we post-process to the 1.1 URL and add the 1.1-only `language`
 * field. For the fields we emit, JSON Feed 1.0 and 1.1 are otherwise
 * byte-compatible.
 */
export function generateJsonFeed(entries: ReadonlyArray<FeedEntry>, config: FeedConfig): string {
	const json = buildFeed(entries, config).json1();
	const parsed = JSON.parse(json) as Record<string, unknown>;
	parsed['version'] = 'https://jsonfeed.org/version/1.1';
	if (!parsed['language']) parsed['language'] = 'en';
	return JSON.stringify(parsed, null, 2);
}
