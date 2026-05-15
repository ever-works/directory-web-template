/**
 * Minimal entity shapes the tools return to the LLM.
 *
 * Kept deliberately small: the model sees only the fields it needs to
 * reason about items / categories / tags / users. Mapping from the
 * directory's full Drizzle / Git-CMS rows happens in
 * `apps/web/app/api/chat/route.ts` when it constructs the
 * `AiChatToolContext` — see Constitution Article I (this plugin
 * does not import from `apps/web`).
 */

export interface ItemSummary {
	slug: string;
	name: string;
	tagline?: string | null;
	categorySlug?: string | null;
	tagSlugs?: string[];
	iconUrl?: string | null;
	url?: string | null;
}

export interface ItemDetail extends ItemSummary {
	description?: string | null;
	websiteUrl?: string | null;
	priceModel?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
}

export interface CategorySummary {
	slug: string;
	name: string;
	itemCount?: number;
	description?: string | null;
}

export interface TagSummary {
	slug: string;
	name: string;
	itemCount?: number;
}

export interface UserProfileSummary {
	userId: string;
	displayName?: string | null;
	email?: string | null;
	avatarUrl?: string | null;
	submissionCount?: number;
	favoriteCount?: number;
	profileCompleteness?: number;
}

/**
 * The authenticated identity passed into every tool call. Mirrors the
 * minimal Auth.js session surface the plugin needs — the route
 * resolves the full session, this is what the tool sees.
 */
export interface ChatSession {
	userId: string;
	email?: string | null;
	displayName?: string | null;
	locale?: string | null;
	tenantId?: string | null;
}

/**
 * Discriminated result returned by authenticated tools when the
 * visitor isn't signed in. The model is instructed in the system
 * prompt to surface a sign-in CTA when it sees this shape.
 */
export type AuthRequiredResult = {
	error: 'authentication-required';
	scenario: string;
	message: string;
};

export function authRequired(scenario: string, message: string): AuthRequiredResult {
	return { error: 'authentication-required', scenario, message };
}
