import { NextRequest, NextResponse } from 'next/server';
import { getLocationEnabled } from '@/lib/utils/settings';
import { getAllLocationEntries } from '@/lib/db/queries/location-index.queries';

interface CoordinateEntry {
	slug: string;
	latitude: number;
	longitude: number;
	city: string | null;
	country: string | null;
}

/**
 * @swagger
 * /api/location/coordinates:
 *   get:
 *     tags: ["Location"]
 *     summary: "Get coordinates for all indexed items"
 *     parameters:
 *       - name: city
 *         in: query
 *         schema: { type: string }
 *         description: "Filter by city name"
 *       - name: country
 *         in: query
 *         schema: { type: string }
 *         description: "Filter by country name"
 *     responses:
 *       200:
 *         description: "Array of item coordinates"
 */
export async function GET(request: NextRequest) {
	if (!getLocationEnabled()) {
		return NextResponse.json({ success: false, error: 'Location features are disabled' }, { status: 404 });
	}

	try {
		const { searchParams } = new URL(request.url);
		const city = searchParams.get('city');
		const country = searchParams.get('country');

		const entries = await getAllLocationEntries();

		let filtered = entries.filter((entry) => !entry.isRemote);

		if (city) {
			const normalizedCity = city.trim().toLowerCase();
			filtered = filtered.filter(
				(entry) => entry.cityNormalized === normalizedCity
			);
		}

		if (country) {
			const normalizedCountry = country.trim().toLowerCase();
			filtered = filtered.filter(
				(entry) => entry.countryNormalized === normalizedCountry
			);
		}

		const coordinates: CoordinateEntry[] = filtered.map((entry) => ({
			slug: entry.itemSlug,
			latitude: Number(entry.latitude),
			longitude: Number(entry.longitude),
			city: entry.city,
			country: entry.country,
		}));

		return NextResponse.json({ success: true, data: coordinates });
	} catch (error) {
		console.error('[API] Location coordinates fetch failed:', error);
		return NextResponse.json({ error: 'Failed to fetch coordinates' }, { status: 500 });
	}
}
