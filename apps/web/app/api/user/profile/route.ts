import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getClientProfileById, updateClientProfile } from '@/lib/db/queries/client.queries';
import { updateProfileSchema } from '@/lib/validations/user-profile';
import { Logger } from '@/lib/logger';
import type { NewClientProfile } from '@/lib/db/schema';

const logger = Logger.create('userProfile');

/** Shape returned to the client for both GET and PATCH responses. */
function serializeProfile(profile: NonNullable<Awaited<ReturnType<typeof getClientProfileById>>>) {
	return {
		id: profile.id,
		displayName: profile.displayName ?? '',
		username: profile.username ?? '',
		name: profile.name,
		email: profile.email,
		bio: profile.bio ?? '',
		jobTitle: profile.jobTitle ?? '',
		company: profile.company ?? '',
		location: profile.location ?? '',
		website: profile.website ?? '',
		interests: profile.interests ?? '',
		skills: (profile.skills as unknown as Array<{ name: string; category: string; proficiency: number }>) ?? [],
		avatar: profile.avatar ?? '',
		createdAt: profile.createdAt,
		updatedAt: profile.updatedAt
	};
}

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     tags: ["User - Profile"]
 *     summary: "Get current user's editable profile"
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: "Profile retrieved" }
 *       401: { description: "Unauthorized" }
 *       404: { description: "Profile not found" }
 */
export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.clientProfileId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const profile = await getClientProfileById(session.user.clientProfileId);
		if (!profile) {
			return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
		}

		return NextResponse.json(serializeProfile(profile));
	} catch (error) {
		logger.error('Error fetching user profile:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/user/profile:
 *   patch:
 *     tags: ["User - Profile"]
 *     summary: "Update current user's profile"
 *     description: "Partial update for the authenticated user's basic-info profile (displayName, username, bio, jobTitle, company, location, website, interests, skills, avatar)."
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200: { description: "Profile updated" }
 *       400: { description: "Validation error" }
 *       401: { description: "Unauthorized" }
 *       500: { description: "Internal server error" }
 */
export async function PATCH(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.clientProfileId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		let body: unknown;
		try {
			body = await request.json();
		} catch {
			return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
		}

		const parsed = updateProfileSchema.safeParse(body);
		if (!parsed.success) {
			const issue = parsed.error.issues[0];
			return NextResponse.json(
				{
					error: issue?.message || 'Validation failed',
					path: issue?.path
				},
				{ status: 400 }
			);
		}

		// Map validated input to NewClientProfile shape.
		const data: Partial<NewClientProfile> = {};
		const input = parsed.data;
		if (input.displayName !== undefined) data.displayName = input.displayName;
		if (input.username !== undefined) data.username = input.username.toLowerCase();
		if (input.bio !== undefined) data.bio = input.bio ?? null;
		if (input.jobTitle !== undefined) data.jobTitle = input.jobTitle ?? null;
		if (input.company !== undefined) data.company = input.company ?? null;
		if (input.location !== undefined) data.location = input.location ?? null;
		if (input.website !== undefined) data.website = (input.website ?? null) as string | null;
		if (input.interests !== undefined) data.interests = input.interests ?? null;
		if (input.skills !== undefined) data.skills = input.skills ?? null;
		if (input.avatar !== undefined) data.avatar = input.avatar || null;

		const updated = await updateClientProfile(session.user.clientProfileId, data);
		if (!updated) {
			return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
		}

		return NextResponse.json(serializeProfile(updated));
	} catch (error) {
		logger.error('Error updating user profile:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
