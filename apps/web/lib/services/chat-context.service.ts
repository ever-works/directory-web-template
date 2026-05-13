import 'server-only';
import type {
	AiChatToolContext,
	CategorySummary,
	ChatSession,
	ItemDetail,
	ItemSummary,
	TagSummary,
	UserProfileSummary
} from '@ever-works/plugin-ai-chat/tools';
import { getCachedItem, getCachedItems, type ItemData } from '@/lib/content';
import { countUserFavorites, listUserFavorites } from '@/lib/repositories/favorite.repository';
import { getClientItemRepository } from '@/lib/repositories/client-item.repository';

/**
 * Adapter layer between the AI-chat plugin's `AiChatToolContext`
 * interface and this app's repositories / cached Git-CMS readers.
 *
 * Per Constitution Article I, the plugin must not import from
 * `apps/web`; per the inverse direction, this is where the wiring
 * happens. The `/api/chat` route (T-007) calls
 * `buildAiChatToolContext(...)` once per request and hands the result
 * to `runAgent`.
 *
 * Every method here is read-only — the chat is read-only + navigate
 * in v1 (Q-023b default). Mutations remain on the existing form /
 * REST surfaces.
 */

export interface BuildContextInput {
	locale: string;
	session: ChatSession | null;
	directoryBaseUrl?: string;
}

const DEFAULT_SEARCH_LIMIT = 5;
const DEFAULT_LIST_LIMIT = 25;
const DEFAULT_MY_LIMIT = 20;

// ---------------------------------------------------------------------------
// Mappers — collapse ItemData (Git-CMS row) to the plugin's minimal shape.
// ---------------------------------------------------------------------------

function categoryToSlug(category: ItemData['category']): string | null {
	if (!category) return null;
	if (typeof category === 'string') return category;
	if (Array.isArray(category)) {
		const first = category[0];
		if (!first) return null;
		return typeof first === 'string' ? first : (first.id ?? null);
	}
	return category.id ?? null;
}

function tagsToSlugs(tags: ItemData['tags']): string[] {
	if (!tags || !Array.isArray(tags)) return [];
	return tags
		.map((t) => (typeof t === 'string' ? t : t?.id))
		.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

function toItemSummary(item: ItemData): ItemSummary {
	const description = item.description ?? '';
	return {
		slug: item.slug,
		name: item.name,
		tagline: description ? description.slice(0, 180) : null,
		categorySlug: categoryToSlug(item.category),
		tagSlugs: tagsToSlugs(item.tags),
		iconUrl: item.icon_url ?? null,
		url: item.source_url ?? null
	};
}

function toItemDetail(item: ItemData): ItemDetail {
	return {
		...toItemSummary(item),
		description: item.description ?? null,
		websiteUrl: item.source_url ?? null,
		priceModel: null,
		createdAt: null,
		updatedAt: item.updated_at ?? null
	};
}

// ---------------------------------------------------------------------------
// Search helpers — kept simple. Directory templates typically index < 10k
// items; an in-memory contains-match over name + description is more than
// adequate. Swap to a real search backend once Spec 002's `search` capability
// lands.
// ---------------------------------------------------------------------------

function matchScore(item: ItemData, normalisedQuery: string): number {
	const name = item.name.toLowerCase();
	if (name === normalisedQuery) return 100;
	if (name.startsWith(normalisedQuery)) return 80;
	if (name.includes(normalisedQuery)) return 60;
	const description = (item.description ?? '').toLowerCase();
	if (description.includes(normalisedQuery)) return 30;
	const tagSlugs = tagsToSlugs(item.tags).map((s) => s.toLowerCase());
	if (tagSlugs.some((t) => t.includes(normalisedQuery))) return 20;
	const categorySlug = (categoryToSlug(item.category) ?? '').toLowerCase();
	if (categorySlug.includes(normalisedQuery)) return 15;
	return 0;
}

async function searchItems(query: string, limit: number): Promise<ItemSummary[]> {
	const normalised = query.trim().toLowerCase();
	if (!normalised) return [];
	const { items } = await getCachedItems();
	const scored: Array<{ item: ItemData; score: number }> = [];
	for (const item of items) {
		const score = matchScore(item, normalised);
		if (score > 0) scored.push({ item, score });
	}
	scored.sort((a, b) => b.score - a.score);
	return scored.slice(0, limit).map(({ item }) => toItemSummary(item));
}

async function getItem(slug: string): Promise<ItemDetail | null> {
	try {
		const result = await getCachedItem(slug);
		if (!result?.meta) return null;
		return toItemDetail(result.meta);
	} catch {
		return null;
	}
}

// Derive categories / tags from the cached items rather than reaching for
// the Git-API-backed repositories — those require a GH token and are
// heavier than necessary for a chat-tool round-trip.
async function listCategoriesFromItems(limit: number): Promise<CategorySummary[]> {
	const { items } = await getCachedItems();
	const counts = new Map<string, number>();
	for (const item of items) {
		const slug = categoryToSlug(item.category);
		if (!slug) continue;
		counts.set(slug, (counts.get(slug) ?? 0) + 1);
	}
	const entries = Array.from(counts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit);
	return entries.map(([slug, itemCount]) => ({
		slug,
		name: slug,
		itemCount,
		description: null
	}));
}

async function listTagsFromItems(limit: number): Promise<TagSummary[]> {
	const { items } = await getCachedItems();
	const counts = new Map<string, number>();
	for (const item of items) {
		for (const slug of tagsToSlugs(item.tags)) {
			counts.set(slug, (counts.get(slug) ?? 0) + 1);
		}
	}
	const entries = Array.from(counts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit);
	return entries.map(([slug, itemCount]) => ({ slug, name: slug, itemCount }));
}

// ---------------------------------------------------------------------------
// Authenticated tools — these assume `userId` is real because the plugin's
// tool layer already checks `ctx.session !== null` before calling.
// ---------------------------------------------------------------------------

async function getMySubmissions(userId: string, limit: number): Promise<ItemSummary[]> {
	const repo = getClientItemRepository();
	const result = await repo.findByUserPaginated(userId, {
		page: 1,
		limit,
		sortBy: 'submitted_at',
		sortOrder: 'desc'
	});
	return result.items.map((row) => toItemSummary(row as unknown as ItemData));
}

async function getMyFavourites(userId: string, limit: number): Promise<ItemSummary[]> {
	const rows = await listUserFavorites(userId, { limit });
	return rows.map((row) => ({
		slug: row.itemSlug,
		name: row.itemName,
		tagline: null,
		categorySlug: row.itemCategory,
		tagSlugs: [],
		iconUrl: row.itemIconUrl,
		url: null
	}));
}

async function getMyProfile(session: ChatSession): Promise<UserProfileSummary | null> {
	const [favoriteCount, submissions] = await Promise.all([
		countUserFavorites(session.userId).catch(() => 0),
		getClientItemRepository()
			.getStatsByUser(session.userId)
			.catch(() => null)
	]);
	return {
		userId: session.userId,
		displayName: session.displayName ?? null,
		email: session.email ?? null,
		avatarUrl: null,
		submissionCount: submissions?.total ?? 0,
		favoriteCount,
		profileCompleteness: undefined
	};
}

// ---------------------------------------------------------------------------
// Public builder
// ---------------------------------------------------------------------------

export function buildAiChatToolContext(input: BuildContextInput): AiChatToolContext {
	return {
		locale: input.locale,
		directoryBaseUrl: input.directoryBaseUrl,
		session: input.session,

		searchItems: ({ query, limit }) => searchItems(query, limit ?? DEFAULT_SEARCH_LIMIT),
		getItem: (slug) => getItem(slug),
		listCategories: (params) => listCategoriesFromItems(params?.limit ?? DEFAULT_LIST_LIMIT),
		listTags: (params) => listTagsFromItems(params?.limit ?? DEFAULT_LIST_LIMIT),

		getMySubmissions: (userId, params) => getMySubmissions(userId, params?.limit ?? DEFAULT_MY_LIMIT),
		getMyFavourites: (userId, params) => getMyFavourites(userId, params?.limit ?? DEFAULT_MY_LIMIT),
		getMyProfile: async (userId) => {
			if (!input.session || input.session.userId !== userId) return null;
			return getMyProfile(input.session);
		}
	};
}
