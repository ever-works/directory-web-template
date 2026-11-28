import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getClientProfileByUsername, isUserAccountDeactivated } from '@/lib/db/queries/client.queries';
import {
	followUser,
	getFollowerCount,
	getFollowingCount,
	isFollowing,
	unfollowUser
} from '@/lib/db/queries/follows.queries';
import { Logger } from '@/lib/logger';

const logger = Logger.create('userProfileFollow');

type FollowTarget = {
	userId: string;
	status: number;
	error?: string;
	profileVisibility: 'public' | 'private';
	isDeactivated: boolean;
};

async function resolveTargetUserId(username: string): Promise<FollowTarget | null> {
	const profile = await getClientProfileByUsername(username);
	if (!profile) {
		return {
			userId: '',
			status: 404,
			error: 'Profile not found',
			profileVisibility: 'public',
			isDeactivated: false
		};
	}
	return {
		userId: profile.userId,
		status: 200,
		profileVisibility: profile.profileVisibility,
		isDeactivated: await isUserAccountDeactivated(profile.userId)
	};
}

/**
 * Follower / following counts of a target. A Private profile shows visitors only a
 * placeholder, and a deactivated one 404s, so their counts stay with the owner: anyone
 * else gets `null` for both.
 */
async function readFollowCounts(
	target: FollowTarget,
	viewerUserId: string | null
): Promise<{ followers: number | null; following: number | null }> {
	if (target.userId !== viewerUserId && (target.profileVisibility === 'private' || target.isDeactivated)) {
		return { followers: null, following: null };
	}
	const [followers, following] = await Promise.all([
		getFollowerCount(target.userId),
		getFollowingCount(target.userId)
	]);
	return { followers, following };
}

/**
 * @swagger
 * /api/user/profile/follow/{username}:
 *   get:
 *     tags: ["User - Profile Follow"]
 *     summary: "Get follow state + counts for a profile"
 *     description: "Returns isFollowing (whether the authenticated user follows this profile) plus follower/following counts. isFollowing is null for unauthenticated viewers. followers and following are null when the profile is Private and the viewer is not its owner. A deactivated account answers 404 to everyone but its owner."
 *     parameters:
 *       - name: "username"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Username of the profile"
 *     responses:
 *       200:
 *         description: "Follow state and counts"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isFollowing:
 *                   type: boolean
 *                   nullable: true
 *                   description: "Whether the caller follows this profile; null when not signed in, false on the caller's own profile"
 *                 isSelf:
 *                   type: boolean
 *                   description: "Whether the profile is the caller's own"
 *                 followers:
 *                   type: integer
 *                   nullable: true
 *                   description: "null when the profile is Private and the caller is not its owner"
 *                 following:
 *                   type: integer
 *                   nullable: true
 *                   description: "null when the profile is Private and the caller is not its owner"
 *               required: ["isFollowing", "isSelf", "followers", "following"]
 *             example:
 *               isFollowing: false
 *               isSelf: false
 *               followers: 12
 *               following: 3
 *       404:
 *         description: "No profile has this username, or its account is deactivated and the caller is not its owner"
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } }, required: ["error"] }
 *             example: { error: "Profile not found" }
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } }, required: ["error"] }
 *             example: { error: "Internal server error" }
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

		// A deactivated account is hidden from everyone but its owner, like its profile page.
		if (target.isDeactivated && !isSelf) {
			return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
		}

		const [counts, viewerFollows] = await Promise.all([
			readFollowCounts(target, viewerUserId),
			viewerUserId && !isSelf ? isFollowing(viewerUserId, target.userId) : Promise.resolve(false)
		]);

		return NextResponse.json({
			isFollowing: viewerUserId ? viewerFollows : null,
			isSelf,
			...counts
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
 *     parameters:
 *       - name: "username"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Username of the profile"
 *     responses:
 *       200:
 *         description: "Profile followed (also when it already was)"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isFollowing:
 *                   type: boolean
 *                   description: "Always true after this call"
 *                 followers:
 *                   type: integer
 *                   nullable: true
 *                   description: "null when the profile is Private or deactivated and the caller is not its owner"
 *                 following:
 *                   type: integer
 *                   nullable: true
 *                   description: "null when the profile is Private or deactivated and the caller is not its owner"
 *               required: ["isFollowing", "followers", "following"]
 *             example:
 *               isFollowing: true
 *               followers: 13
 *               following: 3
 *       400:
 *         description: "The caller tried to follow their own profile"
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } }, required: ["error"] }
 *             example: { error: "Cannot follow yourself" }
 *       401:
 *         description: "Not signed in"
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } }, required: ["error"] }
 *             example: { error: "Unauthorized" }
 *       404:
 *         description: "No profile has this username"
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } }, required: ["error"] }
 *             example: { error: "Profile not found" }
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } }, required: ["error"] }
 *             example: { error: "Internal server error" }
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
		const counts = await readFollowCounts(target, session.user.id);

		return NextResponse.json({ isFollowing: true, ...counts });
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
 *     parameters:
 *       - name: "username"
 *         in: "path"
 *         required: true
 *         schema:
 *           type: string
 *         description: "Username of the profile"
 *     responses:
 *       200:
 *         description: "Profile unfollowed (also when it was not followed)"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isFollowing:
 *                   type: boolean
 *                   description: "Always false after this call"
 *                 followers:
 *                   type: integer
 *                   nullable: true
 *                   description: "null when the profile is Private or deactivated and the caller is not its owner"
 *                 following:
 *                   type: integer
 *                   nullable: true
 *                   description: "null when the profile is Private or deactivated and the caller is not its owner"
 *               required: ["isFollowing", "followers", "following"]
 *             example:
 *               isFollowing: false
 *               followers: 13
 *               following: 3
 *       401:
 *         description: "Not signed in"
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } }, required: ["error"] }
 *             example: { error: "Unauthorized" }
 *       404:
 *         description: "No profile has this username"
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } }, required: ["error"] }
 *             example: { error: "Profile not found" }
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { error: { type: string } }, required: ["error"] }
 *             example: { error: "Internal server error" }
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
		const counts = await readFollowCounts(target, session.user.id);

		return NextResponse.json({ isFollowing: false, ...counts });
	} catch (error) {
		logger.error('Error unfollowing profile:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
