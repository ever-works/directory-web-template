import { NextResponse } from 'next/server';
import { requireClientAuth, serverErrorResponse } from '@/lib/utils/client-auth';
import { ItemRepository } from '@/lib/repositories/item.repository';

interface ServiceAreaBreakdown {
	local: number;
	regional: number;
	national: number;
	global: number;
}

type ServiceAreaKey = keyof ServiceAreaBreakdown;

/**
 * @swagger
 * /api/client/geo-stats:
 *   get:
 *     tags: ["Client - Dashboard"]
 *     summary: "Get geographic statistics for the client's items"
 *     description: "Returns geographic coverage statistics including items with location, remote items, service area breakdown, top cities, and top countries for the authenticated user."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Geographic statistics retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_items:
 *                       type: integer
 *                       example: 10
 *                     items_with_location:
 *                       type: integer
 *                       example: 7
 *                     items_remote:
 *                       type: integer
 *                       example: 2
 *                     service_area_breakdown:
 *                       type: object
 *                       properties:
 *                         local:
 *                           type: integer
 *                         regional:
 *                           type: integer
 *                         national:
 *                           type: integer
 *                         global:
 *                           type: integer
 *                     top_cities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           city:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     top_countries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           count:
 *                             type: integer
 *       401:
 *         description: "Unauthorized - Authentication required"
 *       500:
 *         description: "Internal server error"
 */
export async function GET() {
	try {
		const authResult = await requireClientAuth();
		if (!authResult.success) {
			return authResult.response;
		}
		const { userId } = authResult;

		const itemRepository = new ItemRepository();
		const items = await itemRepository.findAll({ submittedBy: userId });

		const totalItems = items.length;

		const itemsRemote = items.filter((item) => item.location?.is_remote).length;
		const itemsWithCoords = items.filter(
			(item) => item.location?.latitude != null && item.location?.longitude != null && !item.location?.is_remote
		).length;
		const itemsWithLocation = itemsWithCoords + itemsRemote;

		// Service area breakdown
		const serviceAreaBreakdown: ServiceAreaBreakdown = {
			local: 0,
			regional: 0,
			national: 0,
			global: 0,
		};

		for (const item of items) {
			const area = item.location?.service_area;
			if (area && area in serviceAreaBreakdown) {
				serviceAreaBreakdown[area as ServiceAreaKey]++;
			}
		}

		// Top cities
		const cityCounts: Record<string, number> = {};
		for (const item of items) {
			const city = item.location?.city;
			if (city) {
				cityCounts[city] = (cityCounts[city] || 0) + 1;
			}
		}
		const topCities = Object.entries(cityCounts)
			.map(([city, count]) => ({ city, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		// Top countries
		const countryCounts: Record<string, number> = {};
		for (const item of items) {
			const country = item.location?.country;
			if (country) {
				countryCounts[country] = (countryCounts[country] || 0) + 1;
			}
		}
		const topCountries = Object.entries(countryCounts)
			.map(([country, count]) => ({ country, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		return NextResponse.json({
			success: true,
			data: {
				total_items: totalItems,
				items_with_location: itemsWithLocation,
				items_remote: itemsRemote,
				service_area_breakdown: serviceAreaBreakdown,
				top_cities: topCities,
				top_countries: topCountries,
			},
		});
	} catch (error) {
		return serverErrorResponse(error, 'Failed to fetch geographic statistics');
	}
}
