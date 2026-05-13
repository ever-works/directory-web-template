import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../drizzle';
import { comments, favorites, portfolioProjects, userFollows } from '../schema';
import { getTenantId } from '@/lib/auth/tenant';

export interface ProfileStats {
	comments: number;
	favorites: number;
	portfolio: number;
	followers: number;
	following: number;
}

/**
 * Aggregate counts displayed on the public profile.
 *
 * Note: `comments.userId` references `clientProfiles.id` (not `users.id`) — pass
 * the client profile id there. `favorites.userId` and the follow rows reference
 * `users.id`. Both ids are tenant-scoped.
 */
export async function getProfileStats(params: {
	userId: string;
	clientProfileId: string;
}): Promise<ProfileStats> {
	const { userId, clientProfileId } = params;
	const tenantId = await getTenantId();
	if (!tenantId) {
		return { comments: 0, favorites: 0, portfolio: 0, followers: 0, following: 0 };
	}

	const [commentsRow, favoritesRow, portfolioRow, followersRow, followingRow] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(comments)
			.where(
				and(
					eq(comments.userId, clientProfileId),
					eq(comments.tenantId, tenantId),
					sql`${comments.deletedAt} is null`
				)
			),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(favorites)
			.where(and(eq(favorites.userId, userId), eq(favorites.tenantId, tenantId))),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(portfolioProjects)
			.where(
				and(
					eq(portfolioProjects.clientProfileId, clientProfileId),
					eq(portfolioProjects.tenantId, tenantId)
				)
			),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(userFollows)
			.where(and(eq(userFollows.followingId, userId), eq(userFollows.tenantId, tenantId))),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(userFollows)
			.where(and(eq(userFollows.followerId, userId), eq(userFollows.tenantId, tenantId)))
	]);

	return {
		comments: commentsRow[0]?.count ?? 0,
		favorites: favoritesRow[0]?.count ?? 0,
		portfolio: portfolioRow[0]?.count ?? 0,
		followers: followersRow[0]?.count ?? 0,
		following: followingRow[0]?.count ?? 0
	};
}

/** Recent items liked/favorited by a user, for the public activity feed. */
export async function getRecentFavoritesByUser(
	userId: string,
	limit = 5
): Promise<Array<{ id: string; itemSlug: string; itemName: string; itemIconUrl: string | null; createdAt: Date }>> {
	const tenantId = await getTenantId();
	if (!tenantId) return [];

	return db
		.select({
			id: favorites.id,
			itemSlug: favorites.itemSlug,
			itemName: favorites.itemName,
			itemIconUrl: favorites.itemIconUrl,
			createdAt: favorites.createdAt
		})
		.from(favorites)
		.where(and(eq(favorites.userId, userId), eq(favorites.tenantId, tenantId)))
		.orderBy(desc(favorites.createdAt))
		.limit(limit);
}
