import { NextResponse } from 'next/server';
import { getDistinctCountries } from '@/lib/db/queries/location-index.queries';
import { getLocationEnabled } from '@/lib/utils/settings';

/**
 * @swagger
 * /api/location/countries:
 *   get:
 *     tags: ["Location"]
 *     summary: "Get distinct countries from the location index"
 *     responses:
 *       200:
 *         description: "List of distinct country names"
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
		const countries = await getDistinctCountries();
		return NextResponse.json({ success: true, data: countries });
	} catch (error) {
		console.error('[API] Failed to fetch distinct countries:', error);
		return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 500 });
	}
}
