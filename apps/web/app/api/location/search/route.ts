import { NextRequest, NextResponse } from 'next/server';
import { getLocationIndexService } from '@/lib/services/location/location-index.service';
import { getLocationEnabled } from '@/lib/utils/settings';

interface LocationSearchResponse {
	success: boolean;
	data: {
		slugs: string[];
		distances: Record<string, number>;
	};
}

/**
 * @swagger
 * /api/location/search:
 *   get:
 *     tags: ["Location"]
 *     summary: "Search items by location (radius, city, or country)"
 *     parameters:
 *       - name: near_lat
 *         in: query
 *         schema: { type: number }
 *         description: "Latitude for radius search"
 *       - name: near_lng
 *         in: query
 *         schema: { type: number }
 *         description: "Longitude for radius search"
 *       - name: radius
 *         in: query
 *         schema: { type: number }
 *         description: "Radius in km (default 50)"
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
 *         description: "Matching item slugs with optional distances"
 */
export async function GET(request: NextRequest) {
	if (!getLocationEnabled()) {
		return NextResponse.json({ success: false, error: 'Location features are disabled' }, { status: 404 });
	}

	try {
		const { searchParams } = new URL(request.url);
		const nearLat = searchParams.get('near_lat');
		const nearLng = searchParams.get('near_lng');
		const radiusParam = searchParams.get('radius');
		const city = searchParams.get('city');
		const country = searchParams.get('country');

		const locationIndexService = getLocationIndexService();

		// Radius-based search
		if (nearLat && nearLng) {
			const latitude = parseFloat(nearLat);
			const longitude = parseFloat(nearLng);

			if (isNaN(latitude) || isNaN(longitude)) {
				return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
			}

			const radiusKm = radiusParam ? parseInt(radiusParam, 10) : 50;
			if (isNaN(radiusKm) || radiusKm <= 0) {
				return NextResponse.json({ error: 'Invalid radius' }, { status: 400 });
			}

			const results = await locationIndexService.queryByRadius({
				latitude,
				longitude,
				radiusKm,
				includeRemote: false,
			});

			const slugs = results.map((r) => r.itemSlug);
			const distances: Record<string, number> = {};
			for (const result of results) {
				if (result.distanceKm !== undefined) {
					distances[result.itemSlug] = result.distanceKm;
				}
			}

			const response: LocationSearchResponse = {
				success: true,
				data: { slugs, distances },
			};
			return NextResponse.json(response);
		}

		// City-based search
		if (city) {
			const slugs = await locationIndexService.queryByCity(city);
			const response: LocationSearchResponse = {
				success: true,
				data: { slugs, distances: {} },
			};
			return NextResponse.json(response);
		}

		// Country-based search
		if (country) {
			const slugs = await locationIndexService.queryByCountry(country);
			const response: LocationSearchResponse = {
				success: true,
				data: { slugs, distances: {} },
			};
			return NextResponse.json(response);
		}

		return NextResponse.json(
			{ error: 'At least one search parameter is required (near_lat+near_lng, city, or country)' },
			{ status: 400 }
		);
	} catch (error) {
		console.error('[API] Location search failed:', error);
		return NextResponse.json({ error: 'Failed to search locations' }, { status: 500 });
	}
}
