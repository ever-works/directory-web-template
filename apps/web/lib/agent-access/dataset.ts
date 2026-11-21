/**
 * Pure builders for the Agent Access Contract v1 documents (see `types.ts`).
 *
 * They take the content the pages already render (items, categories, tags
 * from `getCachedItems()`, the site config) and shape it into the contract's
 * JSON. No I/O here: `server.ts` does the loading.
 */

import {
	AGENT_ACCESS_GENERATOR,
	AGENT_ACCESS_VERSION,
	type AgentDataset,
	type CategoriesDocument,
	type CategoryEntry,
	type DirectoryInfo,
	type ItemDetail,
	type ItemsDocument,
	type ItemSummary,
	type TagEntry,
	type TagsDocument
} from './types';
import { normalizeText, taxonomySlug } from './text';

/** A category / tag as an item carries it: an id string, a display name, or a populated `{ id, name }`. */
export type RawRef = string | { id?: unknown; name?: unknown } | null | undefined;

/** The fields of an item (lib/content.ts `ItemData`) the builders read. YAML is not validated, so all are loose. */
export interface RawItem {
	slug?: unknown;
	name?: unknown;
	description?: unknown;
	source_url?: unknown;
	category?: RawRef | RawRef[];
	tags?: RawRef[];
	featured?: unknown;
	icon_url?: unknown;
	brand_logo_url?: unknown;
	updated_at?: unknown;
	updatedAt?: unknown;
	brand?: unknown;
	publisher?: unknown;
	images?: unknown;
	[key: string]: unknown;
}

export interface RawTaxonomy {
	id?: unknown;
	name?: unknown;
	description?: unknown;
	[key: string]: unknown;
}

export interface DirectoryInput {
	/** Absolute public origin, no trailing slash (lib/utils/url-cleaner `getBaseUrl()`). */
	baseUrl: string;
	/**
	 * Base of the default locale's PAGE URLs (item, category, tag pages):
	 * `baseUrl` itself, or `baseUrl/en` with `LOCALE_URL_STYLE=always`.
	 * Defaults to `baseUrl`. Data endpoints and Markdown mirrors stay on `baseUrl`.
	 */
	pagesBaseUrl?: string;
	name: string;
	/** Already resolved; `buildDirectoryInfo` generates one when blank. */
	description?: string | null;
	itemName?: string | null;
	itemsName?: string | null;
	items: ReadonlyArray<RawItem>;
	categories: ReadonlyArray<RawTaxonomy>;
	tags: ReadonlyArray<RawTaxonomy>;
	collectionsCount: number;
	comparisonsCount: number;
	dataRepository?: string | null;
	submitUrl?: string | null;
	/** False on a deployment that serves no `/mcp` (the full template always does). */
	mcpEnabled?: boolean;
}

/** Maximum `related` slugs per item (same default as the minimal template's related-items plugin). */
export const MAX_RELATED_ITEMS = 5;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Text of a loose YAML scalar: strings trimmed, finite numbers stringified, anything else ''. */
export function text(value: unknown): string {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	return '';
}

function textOrNull(value: unknown): string | null {
	const result = text(value);
	return result ? result : null;
}

/**
 * Comparison key for ids / names / slugs: lowercase, accents stripped,
 * non `[a-z0-9]` runs collapsed to `-`. The minimal template's `taxonomySlug`,
 * so "Open Source", "open-source" and "Open-Source" match.
 */
export const relationKey = taxonomySlug;

function trimSlash(url: string): string {
	return url.replace(/\/+$/, '');
}

/** An absolute http(s) URL for `value` (resolved against the site), or null. */
export function absoluteUrl(value: unknown, baseUrl: string): string | null {
	const raw = text(value);
	if (!raw) return null;
	try {
		const url = new URL(raw, `${trimSlash(baseUrl)}/`);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
		// An absolute URL is published as written (no added trailing slash).
		return /^https?:\/\//i.test(raw) && !/\s/.test(raw) ? raw : url.toString();
	} catch {
		return null;
	}
}

/** ISO-8601 string for a Date or a date string; null when missing or unparseable. */
export function isoDate(...candidates: unknown[]): string | null {
	for (const value of candidates) {
		if (value instanceof Date) {
			if (!Number.isNaN(value.getTime())) return value.toISOString();
			continue;
		}
		const raw = text(value);
		if (!raw) continue;
		const parsed = new Date(raw);
		if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
	}
	return null;
}

/** Path segment for a record id, percent-encoded only where needed. */
function segment(id: string): string {
	return encodeURIComponent(id);
}

interface TaxonomyIndex {
	byId: Map<string, RawTaxonomy & { id: string; name: string }>;
	/** Normalised id and display name, exact: resolves names with no [a-z0-9] (`東京`), which have no slug key. */
	byText: Map<string, RawTaxonomy & { id: string; name: string }>;
	byKey: Map<string, RawTaxonomy & { id: string; name: string }>;
}

function indexTaxonomy(list: ReadonlyArray<RawTaxonomy>): TaxonomyIndex {
	const byId = new Map<string, RawTaxonomy & { id: string; name: string }>();
	const byText = new Map<string, RawTaxonomy & { id: string; name: string }>();
	const byKey = new Map<string, RawTaxonomy & { id: string; name: string }>();
	for (const entry of list) {
		const id = text(entry?.id);
		if (!id || byId.has(id)) continue;
		const normalized = { ...entry, id, name: text(entry.name) || id };
		byId.set(id, normalized);
		for (const value of [id, normalized.name]) {
			const exact = normalizeText(value);
			if (exact && !byText.has(exact)) byText.set(exact, normalized);
		}
		for (const key of [relationKey(id), relationKey(normalized.name)]) {
			if (key && !byKey.has(key)) byKey.set(key, normalized);
		}
	}
	return { byId, byText, byKey };
}

/** Resolve one item reference to `{ id, name }` against categories.yml / tags.yml (slugified id when unknown). */
function resolveRef(ref: RawRef, index: TaxonomyIndex): { id: string; name: string } | null {
	let id = '';
	let name = '';
	if (typeof ref === 'string') {
		id = ref.trim();
		name = id;
	} else if (ref && typeof ref === 'object') {
		id = text(ref.id);
		name = text(ref.name) || id;
		if (!id) id = name;
	}
	if (!id) return null;
	const known =
		index.byId.get(id) ??
		index.byText.get(normalizeText(id)) ??
		index.byText.get(normalizeText(name)) ??
		(relationKey(id) ? index.byKey.get(relationKey(id)) : undefined) ??
		(relationKey(name) ? index.byKey.get(relationKey(name)) : undefined);
	if (known) return { id: known.id, name: known.name };
	// Unknown to categories.yml / tags.yml: its slug, or the raw value when it has no [a-z0-9] (minimal template rule).
	return { id: relationKey(id) || id, name: name || id };
}

function resolveRefs(refs: RawRef | RawRef[] | undefined, index: TaxonomyIndex): Array<{ id: string; name: string }> {
	const list = Array.isArray(refs) ? refs : refs == null ? [] : [refs];
	const out: Array<{ id: string; name: string }> = [];
	const seen = new Set<string>();
	for (const ref of list) {
		const resolved = resolveRef(ref, index);
		if (!resolved || seen.has(resolved.id)) continue;
		seen.add(resolved.id);
		out.push(resolved);
	}
	return out;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export interface BuiltCatalog {
	info: DirectoryInfo;
	items: ItemSummary[];
	categories: CategoryEntry[];
	tags: TagEntry[];
	/** The raw item behind each summary, by slug (for `buildItemDetail`). */
	rawBySlug: Map<string, RawItem>;
}

export function buildItemSummary(
	item: RawItem,
	baseUrl: string,
	categoryIndex: TaxonomyIndex,
	tagIndex: TaxonomyIndex,
	pagesBaseUrl: string = baseUrl
): ItemSummary | null {
	const slug = text(item?.slug);
	const name = text(item?.name);
	if (!slug || !name) return null;
	const base = trimSlash(baseUrl);
	const pages = trimSlash(pagesBaseUrl);
	const categories = resolveRefs(item.category, categoryIndex);
	const tags = resolveRefs(item.tags, tagIndex);
	return {
		slug,
		name,
		description: text(item.description),
		url: `${pages}/items/${segment(slug)}`,
		website: absoluteUrl(item.source_url, base),
		categories: categories.map((c) => c.name),
		category_ids: categories.map((c) => c.id),
		tags: tags.map((t) => t.name),
		tag_ids: tags.map((t) => t.id),
		featured: item.featured === true,
		logo: absoluteUrl(item.icon_url, base) ?? absoluteUrl(item.brand_logo_url, base),
		// The YAML value as written (the minimal template publishes it raw too);
		// the parsed Date only when there is no string.
		updated_at: textOrNull(item.updated_at) ?? isoDate(item.updatedAt)
	};
}

/** Build the whole catalogue (directory info, item summaries, categories, tags). */
export function buildCatalog(input: DirectoryInput): BuiltCatalog {
	const base = trimSlash(input.baseUrl);
	const pages = trimSlash(input.pagesBaseUrl ?? input.baseUrl);
	const categoryIndex = indexTaxonomy(input.categories);
	const tagIndex = indexTaxonomy(input.tags);

	const items: ItemSummary[] = [];
	const rawBySlug = new Map<string, RawItem>();
	for (const raw of input.items) {
		const summary = buildItemSummary(raw, base, categoryIndex, tagIndex, pages);
		if (!summary || rawBySlug.has(summary.slug)) continue;
		rawBySlug.set(summary.slug, raw);
		items.push(summary);
	}

	const categoryCounts = new Map<string, number>();
	const tagCounts = new Map<string, number>();
	for (const item of items) {
		for (const id of item.category_ids) categoryCounts.set(id, (categoryCounts.get(id) ?? 0) + 1);
		for (const id of item.tag_ids) tagCounts.set(id, (tagCounts.get(id) ?? 0) + 1);
	}

	const categories: CategoryEntry[] = [...categoryIndex.byId.values()].map((category) => ({
		id: category.id,
		name: category.name,
		description: textOrNull(category.description),
		count: categoryCounts.get(category.id) ?? 0,
		url: `${pages}/categories/${segment(category.id)}`
	}));

	const tags: TagEntry[] = [...tagIndex.byId.values()]
		.map((tag) => ({
			id: tag.id,
			name: tag.name,
			count: tagCounts.get(tag.id) ?? 0,
			url: `${pages}/tags/${segment(tag.id)}`
		}))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

	const info = buildDirectoryInfo(input, {
		items: items.length,
		categories: categories.length,
		tags: tags.length,
		newest: newestDate(items)
	});

	return { info, items, categories, tags, rawBySlug };
}

/** Milliseconds of a raw date string, or null when it does not parse. */
export function dateMs(value: string | null | undefined): number | null {
	if (!value) return null;
	const ms = Date.parse(value);
	return Number.isNaN(ms) ? null : ms;
}

/**
 * The raw `updated_at` of the most recently updated item, compared as instants
 * (`2026-11-05T10:00:00+02:00` is earlier than `2026-11-05T09:00:00Z`), not as
 * text. Values that do not parse never win over one that does.
 */
export function newestDate(items: ReadonlyArray<Pick<ItemSummary, 'updated_at'>>): string | null {
	let newest: string | null = null;
	let newestMs = -Infinity;
	for (const item of items) {
		const ms = dateMs(item.updated_at);
		if (ms !== null && ms > newestMs) {
			newest = item.updated_at;
			newestMs = ms;
		}
	}
	return newest;
}

/**
 * Strip credentials and anything but an http(s) URL from a Git remote, so a
 * `DATA_REPOSITORY` with an embedded token is never published.
 */
export function publicRepositoryUrl(raw: string | null | undefined): string | null {
	const value = text(raw);
	if (!value) return null;
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
		if (url.username || url.password) return null;
		url.search = '';
		url.hash = '';
		return url.toString().replace(/\/+$/, '');
	} catch {
		return null;
	}
}

export function buildDirectoryInfo(
	input: DirectoryInput,
	totals: { items: number; categories: number; tags: number; newest: string | null }
): DirectoryInfo {
	const base = trimSlash(input.baseUrl);
	const itemName = text(input.itemName) || 'Item';
	const itemsName = text(input.itemsName) || 'Items';
	const description =
		text(input.description) ||
		`A curated directory of ${totals.items} ${(totals.items === 1 ? itemName : itemsName).toLowerCase()}.`;
	const mcpEnabled = input.mcpEnabled !== false;
	return {
		version: AGENT_ACCESS_VERSION,
		name: text(input.name) || 'Ever Works Directory',
		description,
		url: base,
		item_name: itemName,
		items_name: itemsName,
		counts: {
			items: totals.items,
			categories: totals.categories,
			tags: totals.tags,
			collections: Math.max(0, input.collectionsCount | 0),
			comparisons: Math.max(0, input.comparisonsCount | 0)
		},
		updated_at: totals.newest,
		data_repository: publicRepositoryUrl(input.dataRepository),
		submit_url: absoluteUrl(input.submitUrl, base),
		endpoints: {
			items: `${base}/data/items.json`,
			item: `${base}/data/items/{slug}.json`,
			categories: `${base}/data/categories.json`,
			tags: `${base}/data/tags.json`,
			openapi: `${base}/data/openapi.json`,
			llms: `${base}/llms.txt`,
			llms_full: `${base}/llms-full.txt`,
			sitemap: `${base}/sitemap.xml`,
			mcp: mcpEnabled ? `${base}/mcp` : null
		},
		generator: AGENT_ACCESS_GENERATOR
	};
}

/**
 * Slugs of similar items: one point per shared tag, two for a shared
 * category, +0.5 for a featured candidate. Only candidates sharing at least
 * one tag or category qualify. Ties keep catalogue order.
 */
export function relatedSlugs(
	item: ItemSummary,
	all: ReadonlyArray<ItemSummary>,
	max: number = MAX_RELATED_ITEMS
): string[] {
	const tags = new Set(item.tag_ids);
	const categories = new Set(item.category_ids);
	const scored: Array<{ slug: string; score: number; order: number }> = [];
	all.forEach((candidate, order) => {
		if (candidate.slug === item.slug) return;
		let score = 0;
		for (const tag of candidate.tag_ids) if (tags.has(tag)) score += 1;
		if (candidate.category_ids.some((id) => categories.has(id))) score += 2;
		if (score === 0) return;
		if (candidate.featured) score += 0.5;
		scored.push({ slug: candidate.slug, score, order });
	});
	scored.sort((a, b) => b.score - a.score || a.order - b.order);
	return scored.slice(0, Math.max(0, max)).map((entry) => entry.slug);
}

function imageList(value: unknown, baseUrl: string): string[] {
	const list = Array.isArray(value) ? value : value == null ? [] : [value];
	const out: string[] = [];
	for (const entry of list) {
		const candidate =
			entry && typeof entry === 'object' ? (entry as { url?: unknown; src?: unknown }).url ?? (entry as { src?: unknown }).src : entry;
		const url = absoluteUrl(candidate, baseUrl);
		if (url && !out.includes(url)) out.push(url);
	}
	return out;
}

function nameOf(value: unknown): string | null {
	if (value && typeof value === 'object') return textOrNull((value as { name?: unknown }).name);
	return textOrNull(value);
}

export function buildItemDetail(
	summary: ItemSummary,
	raw: RawItem,
	markdown: string | null | undefined,
	all: ReadonlyArray<ItemSummary>,
	baseUrl: string
): ItemDetail {
	const base = trimSlash(baseUrl);
	const body = typeof markdown === 'string' && markdown.trim() ? markdown : text(raw.markdown) || null;
	return {
		...summary,
		markdown: body,
		markdown_url: `${base}/items/${segment(summary.slug)}.md`,
		images: imageList(raw.images, base),
		brand: nameOf(raw.brand),
		publisher: nameOf(raw.publisher),
		related: relatedSlugs(summary, all)
	};
}

export function itemsDocument(items: ReadonlyArray<ItemSummary>): ItemsDocument {
	return { version: AGENT_ACCESS_VERSION, total: items.length, items: [...items] };
}

export function categoriesDocument(categories: ReadonlyArray<CategoryEntry>): CategoriesDocument {
	return { version: AGENT_ACCESS_VERSION, total: categories.length, categories: [...categories] };
}

export function tagsDocument(tags: ReadonlyArray<TagEntry>): TagsDocument {
	return { version: AGENT_ACCESS_VERSION, total: tags.length, tags: [...tags] };
}

/**
 * Wrap a built catalogue as the `AgentDataset` the MCP handler and routes use.
 * `loadMarkdown` reads one item's Markdown body (null when it has none).
 */
export function toDataset(
	catalog: BuiltCatalog,
	loadMarkdown: (slug: string) => Promise<string | null | undefined>
): AgentDataset {
	const bySlug = new Map(catalog.items.map((item) => [item.slug, item]));
	return {
		info: catalog.info,
		items: catalog.items,
		categories: catalog.categories,
		tags: catalog.tags,
		async getItem(slug: string) {
			const summary = bySlug.get(slug);
			const raw = catalog.rawBySlug.get(slug);
			if (!summary || !raw) return null;
			let markdown: string | null | undefined = null;
			try {
				markdown = await loadMarkdown(slug);
			} catch {
				markdown = null;
			}
			return buildItemDetail(summary, raw, markdown, catalog.items, catalog.info.url);
		}
	};
}
