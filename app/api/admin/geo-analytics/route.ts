import { NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth/admin-guard';
import { getLocationIndexService } from '@/lib/services/location/location-index.service';
import { getAllLocationEntries } from '@/lib/db/queries/location-index.queries';
import { ItemRepository } from '@/lib/repositories/item.repository';

// Disable caching for authenticated dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const itemRepository = new ItemRepository();

/**
 * @swagger
 * /api/admin/geo-analytics:
 *   get:
 *     tags: ["Admin - Geographic"]
 *     summary: "Get geographic analytics data"
 *     description: "Returns geographic distribution analytics including coverage stats, country/service area distributions, and location coordinates for map visualization. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Geographic analytics retrieved successfully"
 *       401:
 *         description: "Unauthorized - Admin access required"
 *       500:
 *         description: "Internal server error"
 */
export async function GET() {
	try {
		const authError = await checkAdminAuth();
		if (authError) return authError;

		const service = getLocationIndexService();

		const [indexStats, allEntries, allItems] = await Promise.all([
			service.getIndexStats(),
			getAllLocationEntries(),
			itemRepository.findAll(),
		]);

		// Aggregate country distribution
		const countryMap = new Map<string, number>();
		const serviceAreaMap = new Map<string, number>();

		for (const entry of allEntries) {
			if (entry.country) {
				countryMap.set(entry.country, (countryMap.get(entry.country) || 0) + 1);
			}
			if (entry.serviceArea) {
				serviceAreaMap.set(entry.serviceArea, (serviceAreaMap.get(entry.serviceArea) || 0) + 1);
			}
		}

		const byCountry = Array.from(countryMap.entries())
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count);

		const byServiceArea = Array.from(serviceAreaMap.entries())
			.map(([area, count]) => ({ area, count }))
			.sort((a, b) => b.count - a.count);

		const totalItems = allItems.length;
		const coveragePercent =
			totalItems > 0 ? Math.round((indexStats.totalIndexed / totalItems) * 100 * 10) / 10 : 0;

		// Map locations for distribution map (filter remote items at 0,0)
		const locations = allEntries
			.filter((e) => !(e.isRemote && e.latitude === 0 && e.longitude === 0))
			.map((e) => ({
				itemSlug: e.itemSlug,
				latitude: e.latitude,
				longitude: e.longitude,
				city: e.city,
				country: e.country,
				isRemote: e.isRemote,
			}));

		return NextResponse.json({
			success: true,
			data: {
				stats: {
					totalIndexed: indexStats.totalIndexed,
					totalItems,
					coveragePercent,
					citiesCount: indexStats.citiesCount,
					countriesCount: indexStats.countriesCount,
					remoteCount: indexStats.remoteCount,
					lastIndexedAt: indexStats.lastIndexedAt?.toISOString() ?? null,
					lastRebuildAt: indexStats.lastRebuildAt?.toISOString() ?? null,
				},
				distributions: { byCountry, byServiceArea },
				locations,
			},
		});
	} catch (error) {
		console.error('Error fetching geo analytics:', error);
		return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
}
