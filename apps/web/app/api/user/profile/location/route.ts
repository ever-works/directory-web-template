import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getClientProfileById, updateClientProfile } from '@/lib/db/queries/client.queries';
import { updateLocationSchema } from '@/lib/validations/user-location';
import { Logger } from '@/lib/logger';

const logger = Logger.create('userProfileLocation');

/**
 * @swagger
 * /api/user/profile/location:
 *   get:
 *     tags: ["User - Profile Location"]
 *     summary: "Get user's saved location settings"
 *     description: "Returns the authenticated user's saved default location and privacy preference."
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: "Location settings retrieved successfully"
 *       401:
 *         description: "Unauthorized"
 *       404:
 *         description: "Profile not found"
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

		return NextResponse.json({
			defaultLatitude: profile.defaultLatitude,
			defaultLongitude: profile.defaultLongitude,
			defaultCity: profile.defaultCity,
			defaultCountry: profile.defaultCountry,
			locationPrivacy: profile.locationPrivacy ?? 'private',
		});
	} catch (error) {
		logger.error('Error fetching user location:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}

/**
 * @swagger
 * /api/user/profile/location:
 *   patch:
 *     tags: ["User - Profile Location"]
 *     summary: "Update user's location settings"
 *     description: "Updates the authenticated user's default location and privacy preference. Both latitude and longitude must be provided together."
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               defaultLatitude:
 *                 type: number
 *                 nullable: true
 *               defaultLongitude:
 *                 type: number
 *                 nullable: true
 *               defaultCity:
 *                 type: string
 *                 nullable: true
 *               defaultCountry:
 *                 type: string
 *                 nullable: true
 *               locationPrivacy:
 *                 type: string
 *                 enum: ["private", "city", "exact"]
 *     responses:
 *       200:
 *         description: "Location updated successfully"
 *       400:
 *         description: "Validation error"
 *       401:
 *         description: "Unauthorized"
 *       500:
 *         description: "Internal server error"
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

		const validationResult = updateLocationSchema.safeParse(body);

		if (!validationResult.success) {
			const errorMessage = validationResult.error.issues[0]?.message || 'Validation failed';
			return NextResponse.json({ error: errorMessage }, { status: 400 });
		}

		const updated = await updateClientProfile(session.user.clientProfileId, validationResult.data);

		if (!updated) {
			return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
		}

		return NextResponse.json({
			defaultLatitude: updated.defaultLatitude,
			defaultLongitude: updated.defaultLongitude,
			defaultCity: updated.defaultCity,
			defaultCountry: updated.defaultCountry,
			locationPrivacy: updated.locationPrivacy ?? 'private',
		});
	} catch (error) {
		logger.error('Error updating user location:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
