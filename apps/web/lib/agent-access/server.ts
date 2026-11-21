import 'server-only';

/**
 * Loads the Agent Access dataset from the same content the pages render:
 * `getCachedItems()` (items, categories, tags, collections from the Git CMS
 * checkout), `getCachedComparisons()` and the site config (`works.yml`).
 * Nothing here touches the database.
 *
 * Server-only: used by the `/data/*`, `/mcp`, `/.well-known/*` and `/llms.txt`
 * route handlers.
 */

import { getCachedComparisons, getCachedConfig, getCachedItem, getCachedItems } from '@/lib/content';
import { getSiteName } from '@/lib/seo/site-identity';
import { getBaseUrl } from '@/lib/utils/url-cleaner';
import { getHeaderSubmitEnabled } from '@/lib/utils/settings';
import { isItemSlug } from '@/lib/item-slug';
import { getLocalizedUrl } from '@/lib/seo/hreflang';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { buildCatalog, toDataset, type BuiltCatalog, type RawItem, type RawTaxonomy } from './dataset';
import type { AgentDataset } from './types';

/** Rebuilding the catalogue is cheap, but a burst of MCP calls should not each redo it. */
const MEMO_TTL_MS = 30_000;
let memo: { at: number; promise: Promise<BuiltCatalog> } | null = null;

function settingOr<T>(read: () => T, fallback: T): T {
	try {
		return read();
	} catch {
		return fallback;
	}
}

/**
 * `DATA_REPOSITORY`, but only when the site reads it without credentials: a
 * configured GitHub token (static or brokered, Spec 054) means the repository
 * may be private, and its URL is then not advertised.
 */
function publicDataRepository(): string | null {
	const tokenConfigured = Boolean(
		process.env.GH_TOKEN?.trim() ||
			process.env.GITHUB_TOKEN?.trim() ||
			process.env.EVER_WORKS_SITE_GIT_TOKEN_URL?.trim()
	);
	return tokenConfigured ? null : process.env.DATA_REPOSITORY?.trim() || null;
}

/**
 * The slug rule of the item page and `fetchItem` (`[A-Za-z0-9_-]`, at most 255
 * characters): an item the page cannot serve is not listed either, so every
 * listed item resolves at `/data/items/{slug}.json` (slugFromJsonSegment).
 */
function isServableSlug(slug: unknown): boolean {
	return typeof slug === 'string' && slug.length > 0 && slug.length <= 255 && isItemSlug(slug);
}

async function buildFromContent(): Promise<BuiltCatalog> {
	const baseUrl = getBaseUrl().replace(/\/+$/, '');
	// Page URLs follow the locale URL style (`/en/...` with LOCALE_URL_STYLE=always).
	const pagesBaseUrl = getLocalizedUrl('', DEFAULT_LOCALE);
	const [config, listing, comparisons] = await Promise.all([
		getCachedConfig(),
		getCachedItems(),
		getCachedComparisons().catch(() => ({ comparisons: [] as unknown[], total: 0 }))
	]);

	const homepage = (config.settings as { homepage?: { hero_description?: unknown } } | undefined)?.homepage;
	const description =
		process.env.NEXT_PUBLIC_SITE_DESCRIPTION?.trim() ||
		(typeof homepage?.hero_description === 'string' ? homepage.hero_description : '') ||
		(typeof (config as { description?: unknown }).description === 'string'
			? ((config as { description?: string }).description ?? '')
			: '');

	return buildCatalog({
		baseUrl,
		pagesBaseUrl,
		name: config.company_name?.trim() || (await getSiteName()),
		description,
		itemName: config.item_name,
		itemsName: config.items_name,
		items: listing.items.filter((item) => isServableSlug(item.slug)) as unknown as RawItem[],
		categories: listing.categories as unknown as RawTaxonomy[],
		tags: listing.tags as unknown as RawTaxonomy[],
		collectionsCount: (listing.collections ?? []).filter((collection) => collection.isActive !== false).length,
		comparisonsCount: comparisons.comparisons?.length ?? 0,
		dataRepository: publicDataRepository(),
		submitUrl: settingOr(getHeaderSubmitEnabled, true) ? `${pagesBaseUrl}/submit` : null,
		mcpEnabled: true
	});
}

async function loadMarkdown(slug: string): Promise<string | null> {
	if (!isItemSlug(slug)) return null;
	const item = await getCachedItem(slug);
	return item && typeof item.content === 'string' ? item.content : null;
}

/** The directory's Agent Access dataset (memoised for a few seconds per process). */
export async function loadAgentDataset(): Promise<AgentDataset> {
	const now = Date.now();
	if (!memo || now - memo.at > MEMO_TTL_MS) {
		const promise = buildFromContent();
		memo = { at: now, promise };
		promise.catch(() => {
			if (memo?.promise === promise) memo = null;
		});
	}
	return toDataset(await memo.promise, loadMarkdown);
}
