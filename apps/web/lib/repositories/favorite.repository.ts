import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { favorites } from '@/lib/db/schema';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * Read-only repository over the existing `favorites` table.
 *
 * Added in support of Spec 023 — the AI chat plugin's `myFavourites`
 * tool needs a typed read entry-point so the chat route
 * (`/api/chat`, T-007) can satisfy `AiChatToolContext.getMyFavourites`
 * without hand-rolling SQL.
 *
 * Writes (favourite / unfavourite mutations) already live on the
 * existing favourites API routes — this module deliberately does
 * **not** expose mutations. Keeping the surface to reads keeps it
 * cheap to reason about and matches the chat plugin's "read-only +
 * navigate" policy (Q-023b, default).
 */

export interface UserFavoriteRow {
	id: string;
	userId: string;
	itemSlug: string;
	itemName: string;
	itemIconUrl: string | null;
	itemCategory: string | null;
	createdAt: Date;
	updatedAt: Date;
	tenantId: string | null;
}

export interface ListFavoritesOptions {
	limit?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function clampLimit(value?: number): number {
	if (!value || value <= 0) return DEFAULT_LIMIT;
	return Math.min(value, MAX_LIMIT);
}

/**
 * List the visitor's favourites (most recent first), scoped to the
 * active tenant when one is resolvable. When tenant resolution
 * returns null, the query intentionally still scopes by `userId`
 * alone — the chat surface should function in single-tenant /
 * self-hosted deployments where `tenantId` is unset.
 */
export async function listUserFavorites(
	userId: string,
	options: ListFavoritesOptions = {}
): Promise<UserFavoriteRow[]> {
	const tenantId = await getTenantId();
	const limit = clampLimit(options.limit);

	const where = tenantId
		? and(eq(favorites.userId, userId), eq(favorites.tenantId, tenantId))
		: eq(favorites.userId, userId);

	return db.select().from(favorites).where(where).orderBy(desc(favorites.createdAt)).limit(limit);
}

/**
 * Count favourites for a user (tenant-scoped when possible). Used by
 * the `myProfile` tool for its `favoriteCount` field.
 */
export async function countUserFavorites(userId: string): Promise<number> {
	const tenantId = await getTenantId();

	const where = tenantId
		? and(eq(favorites.userId, userId), eq(favorites.tenantId, tenantId))
		: eq(favorites.userId, userId);

	const rows = await db.select({ id: favorites.id }).from(favorites).where(where);
	return rows.length;
}
