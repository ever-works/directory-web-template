import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getClientProfileByUsername } from '@/lib/db/queries/client.queries';
import {
	followUser,
	getFollowerCount,
	getFollowingCount,
	isFollowing,
	unfollowUser
} from '@/lib/db/queries/follows.queries';
import { Logger } from '@/lib/logger';

const logger = Logger.create('userProfileFollow');

async function resolveTargetUserId(username: string): Promise<{ userId: string; status: number; error?: string } | null> {
	const profile = await getClientProfileByUsername(username);
	if (!profile) return { userId: '', status: 404, error: 'Profile not found' };
	return { userId: profile.userId, status: 200 };
}

/**
 * @swagger
 * /api/user/profile/follow/{username}:
 *   get:
 *     tags: ["User - Profile Follow"]
 *     summary: "Get follow state + counts for a profile"
 *     description: "Returns isFollowing (whether the authenticated user follows this profile) plus public follower/following counts. isFollowing is null for unauthenticated viewers."
 */
export async function GET(_request: NextRequest, ctx: { params: Promise<{ username: string }> }) {
	try {
		const { username } = await ctx.params;
		const target = await resolveTargetUserId(username);
		if (!target || target.status !== 200) {
			return NextResponse.json({ error: target?.error ?? 'Profile not found' }, { status: target?.status ?? 404 });
		}

		const session = await auth();
		const viewerUserId = session?.user?.id ?? null;
		const isSelf = viewerUserId === target.userId;

		const [followers, following, viewerFollows] = await Promise.all([
			getFollowerCount(target.userId),
			getFollowingCount(target.userId),
			viewerUserId && !isSelf ? isFollowing(viewerUserId, target.userId) : Promise.resolve(false)
		]);

		return NextResponse.json({
			isFollowing: viewerUserId ? viewerFollows : null,
			isSelf,
			followers,
			following
		});
	} catch (error) {
		logger.error('Error reading follow state:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/user/profile/follow/{username}:
 *   post:
 *     tags: ["User - Profile Follow"]
 *     summary: "Follow a profile"
 *     description: "Idempotent — following an already-followed profile returns 200."
 */
export async function POST(_request: NextRequest, ctx: { params: Promise<{ username: string }> }) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { username } = await ctx.params;
		const target = await resolveTargetUserId(username);
		if (!target || target.status !== 200) {
			return NextResponse.json({ error: target?.error ?? 'Profile not found' }, { status: target?.status ?? 404 });
		}

		if (target.userId === session.user.id) {
			return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
		}

		await followUser(session.user.id, target.userId);
		const [followers, following] = await Promise.all([
			getFollowerCount(target.userId),
			getFollowingCount(target.userId)
		]);

		return NextResponse.json({ isFollowing: true, followers, following });
	} catch (error) {
		logger.error('Error following profile:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/user/profile/follow/{username}:
 *   delete:
 *     tags: ["User - Profile Follow"]
 *     summary: "Unfollow a profile"
 */
export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ username: string }> }) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { username } = await ctx.params;
		const target = await resolveTargetUserId(username);
		if (!target || target.status !== 200) {
			return NextResponse.json({ error: target?.error ?? 'Profile not found' }, { status: target?.status ?? 404 });
		}

		await unfollowUser(session.user.id, target.userId);
		const [followers, following] = await Promise.all([
			getFollowerCount(target.userId),
			getFollowingCount(target.userId)
		]);

		return NextResponse.json({ isFollowing: false, followers, following });
	} catch (error) {
		logger.error('Error unfollowing profile:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
