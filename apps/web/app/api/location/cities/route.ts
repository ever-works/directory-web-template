import { NextResponse } from 'next/server';
import { getDistinctCities } from '@/lib/db/queries/location-index.queries';
import { getLocationEnabled } from '@/lib/utils/settings';

/**
 * @swagger
 * /api/location/cities:
 *   get:
 *     tags: ["Location"]
 *     summary: "Get distinct cities from the location index"
 *     responses:
 *       200:
 *         description: "List of distinct city names"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
export async function GET() {
	if (!getLocationEnabled()) {
		return NextResponse.json({ success: false, error: 'Location features are disabled' }, { status: 404 });
	}

	try {
		const cities = await getDistinctCities();
		return NextResponse.json({ success: true, data: cities });
	} catch (error) {
		console.error('[API] Failed to fetch distinct cities:', error);
		return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
	}
}
