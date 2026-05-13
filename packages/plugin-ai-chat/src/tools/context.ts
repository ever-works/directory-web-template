import type {
	CategorySummary,
	ChatSession,
	ItemDetail,
	ItemSummary,
	TagSummary,
	UserProfileSummary,
} from './types';

/**
 * Dependency-injection seam between the plugin and the host
 * application. Tools depend only on this interface; the app provides
 * a concrete implementation in `/api/chat/route.ts` (T-007) that
 * wires up the real repositories / Git-CMS / Drizzle calls.
 *
 * Per Constitution Article I, the plugin **must not import from
 * `apps/web`** — keep this interface stable and let the app adapt
 * its types to ours, not the other way around.
 */
export interface AiChatToolContext {
	/** The active locale of the current chat conversation (e.g. 'en', 'fr'). */
	readonly locale: string;

	/** The directory's primary URL (used by `navigate` to build absolute paths). */
	readonly directoryBaseUrl?: string;

	/**
	 * The authenticated visitor's session, or `null` for anonymous
	 * chats. Authenticated tools refuse to run when this is null.
	 */
	readonly session: ChatSession | null;

	// ---------------------------------------------------------------
	// Read-only — usable by anonymous and authenticated visitors
	// ---------------------------------------------------------------

	searchItems(params: { query: string; limit?: number }): Promise<ItemSummary[]>;

	getItem(slug: string): Promise<ItemDetail | null>;

	listCategories(params?: { limit?: number }): Promise<CategorySummary[]>;

	listTags(params?: { limit?: number }): Promise<TagSummary[]>;

	// ---------------------------------------------------------------
	// Authenticated-only — the tool layer enforces `session !== null`
	// before invoking these; the impl can assume the caller is signed
	// in but should still scope by `session.userId`.
	// ---------------------------------------------------------------

	getMySubmissions(userId: string, params?: { limit?: number }): Promise<ItemSummary[]>;

	getMyFavourites(userId: string, params?: { limit?: number }): Promise<ItemSummary[]>;

	getMyProfile(userId: string): Promise<UserProfileSummary | null>;
}
