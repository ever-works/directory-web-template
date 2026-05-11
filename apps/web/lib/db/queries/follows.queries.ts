import { and, eq, sql } from 'drizzle-orm';
import { db } from '../drizzle';
import { userFollows, type NewUserFollow, type UserFollow } from '../schema';
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
 * Create a follow row. Idempotent on the (follower, following, tenant) unique index — returns
 * the existing row if one is already present. Throws if follower === following (also enforced
 * by the table check constraint).
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

	if (row) return row;

	// Already followed — return the existing row.
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
