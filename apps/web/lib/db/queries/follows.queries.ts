import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../drizzle';
import { clientProfiles, notifications, userFollows, type NewUserFollow, type UserFollow } from '../schema';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * Count followers (users following the given userId) within the current tenant.
 */
export async function getFollowerCount(userId: string): Promise<number> {
	const tenantId = await getTenantId();
	if (!tenantId) return 0;

	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(userFollows)
		.where(and(eq(userFollows.followingId, userId), eq(userFollows.tenantId, tenantId)));

	return row?.count ?? 0;
}

/**
 * Count people the given userId is following within the current tenant.
 */
export async function getFollowingCount(userId: string): Promise<number> {
	const tenantId = await getTenantId();
	if (!tenantId) return 0;

	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(userFollows)
		.where(and(eq(userFollows.followerId, userId), eq(userFollows.tenantId, tenantId)));

	return row?.count ?? 0;
}

/**
 * Return true if follower currently follows following within the current tenant.
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
	if (followerId === followingId) return false;
	const tenantId = await getTenantId();
	if (!tenantId) return false;

	const [row] = await db
		.select({ id: userFollows.id })
		.from(userFollows)
		.where(
			and(
				eq(userFollows.followerId, followerId),
				eq(userFollows.followingId, followingId),
				eq(userFollows.tenantId, tenantId)
			)
		)
		.limit(1);

	return !!row;
}

/**
 * Best-effort notification when a follow is created. Looks up the follower's
 * profile for a friendly title (falls back to "Someone"). Silently swallows
 * errors — a failed notification must never block the follow itself.
 */
async function notifyFollowed(params: {
	tenantId: string;
	followerId: string;
	followingId: string;
}): Promise<void> {
	try {
		const [follower] = await db
			.select({
				displayName: clientProfiles.displayName,
				name: clientProfiles.name,
				username: clientProfiles.username
			})
			.from(clientProfiles)
			.where(and(eq(clientProfiles.userId, params.followerId), eq(clientProfiles.tenantId, params.tenantId)))
			.limit(1);

		const followerLabel = follower?.displayName || follower?.name || follower?.username || 'Someone';

		await db.insert(notifications).values({
			userId: params.followingId,
			tenantId: params.tenantId,
			type: 'user_followed',
			title: 'New follower',
			message: `${followerLabel} started following you.`,
			data: JSON.stringify({ followerUserId: params.followerId, followerUsername: follower?.username ?? null })
		});
	} catch (error) {
		console.error('Failed to enqueue user_followed notification:', error);
	}
}

/**
 * Create a follow row. Idempotent on the (follower, following, tenant) unique index — returns
 * the existing row if one is already present. Throws if follower === following (also enforced
 * by the table check constraint).
 *
 * Emits a best-effort `user_followed` notification to the target on first follow only (skipped
 * when the row already existed).
 */
export async function followUser(followerId: string, followingId: string): Promise<UserFollow | null> {
	if (followerId === followingId) {
		throw new Error('Cannot follow yourself');
	}
	const tenantId = await getTenantId();
	if (!tenantId) return null;

	const insertData: NewUserFollow = { followerId, followingId, tenantId };

	const [row] = await db
		.insert(userFollows)
		.values(insertData)
		.onConflictDoNothing({
			target: [userFollows.followerId, userFollows.followingId, userFollows.tenantId]
		})
		.returning();

	if (row) {
		// Only notify on first follow (when an actual insert happened).
		await notifyFollowed({ tenantId, followerId, followingId });
		return row;
	}

	// Already followed — return the existing row, no notification.
	const [existing] = await db
		.select()
		.from(userFollows)
		.where(
			and(
				eq(userFollows.followerId, followerId),
				eq(userFollows.followingId, followingId),
				eq(userFollows.tenantId, tenantId)
			)
		)
		.limit(1);

	return existing ?? null;
}

/**
 * Row returned by the followers/following list queries — enough to render a
 * profile row (avatar, displayName, username, jobTitle) and a follow toggle.
 */
export interface FollowListRow {
	userId: string;
	username: string | null;
	displayName: string | null;
	name: string;
	avatar: string | null;
	jobTitle: string | null;
	bio: string | null;
	followedAt: Date;
}

/**
 * List people who follow the given userId within the current tenant.
 * Ordered by most recent follow first. Caller passes limit + offset.
 */
export async function listFollowers(
	userId: string,
	limit = 30,
	offset = 0
): Promise<FollowListRow[]> {
	const tenantId = await getTenantId();
	if (!tenantId) return [];

	return await db
		.select({
			userId: userFollows.followerId,
			username: clientProfiles.username,
			displayName: clientProfiles.displayName,
			name: clientProfiles.name,
			avatar: clientProfiles.avatar,
			jobTitle: clientProfiles.jobTitle,
			bio: clientProfiles.bio,
			followedAt: userFollows.createdAt
		})
		.from(userFollows)
		.innerJoin(clientProfiles, eq(clientProfiles.userId, userFollows.followerId))
		.where(and(eq(userFollows.followingId, userId), eq(userFollows.tenantId, tenantId)))
		.orderBy(desc(userFollows.createdAt))
		.limit(limit)
		.offset(offset);
}

/**
 * List people the given userId follows within the current tenant.
 */
export async function listFollowing(userId: string, limit = 30, offset = 0): Promise<FollowListRow[]> {
	const tenantId = await getTenantId();
	if (!tenantId) return [];

	return await db
		.select({
			userId: userFollows.followingId,
			username: clientProfiles.username,
			displayName: clientProfiles.displayName,
			name: clientProfiles.name,
			avatar: clientProfiles.avatar,
			jobTitle: clientProfiles.jobTitle,
			bio: clientProfiles.bio,
			followedAt: userFollows.createdAt
		})
		.from(userFollows)
		.innerJoin(clientProfiles, eq(clientProfiles.userId, userFollows.followingId))
		.where(and(eq(userFollows.followerId, userId), eq(userFollows.tenantId, tenantId)))
		.orderBy(desc(userFollows.createdAt))
		.limit(limit)
		.offset(offset);
}

/**
 * Given a viewer userId and a set of target userIds, return the subset that
 * the viewer currently follows. Used to render the correct initial state for
 * follow buttons on a list.
 */
export async function getFollowingSubset(viewerUserId: string, targetUserIds: string[]): Promise<Set<string>> {
	if (targetUserIds.length === 0) return new Set();
	const tenantId = await getTenantId();
	if (!tenantId) return new Set();

	const rows = await db
		.select({ followingId: userFollows.followingId })
		.from(userFollows)
		.where(
			and(
				eq(userFollows.followerId, viewerUserId),
				eq(userFollows.tenantId, tenantId),
				sql`${userFollows.followingId} = ANY(${targetUserIds})`
			)
		);

	return new Set(rows.map((r) => r.followingId));
}

/**
 * Remove a follow row. Returns true if a row was deleted.
 */
export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
	const tenantId = await getTenantId();
	if (!tenantId) return false;

	const [row] = await db
		.delete(userFollows)
		.where(
			and(
				eq(userFollows.followerId, followerId),
				eq(userFollows.followingId, followingId),
				eq(userFollows.tenantId, tenantId)
			)
		)
		.returning();

	return !!row;
}
