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

		// Aggregate distributions from index entries
		const countryMap = new Map<string, number>();
		const cityMap = new Map<string, number>();
		const serviceAreaMap = new Map<string, number>();

		for (const entry of allEntries) {
			if (entry.country) {
				countryMap.set(entry.country, (countryMap.get(entry.country) || 0) + 1);
			}
			if (entry.city) {
				cityMap.set(entry.city, (cityMap.get(entry.city) || 0) + 1);
			}
			if (entry.serviceArea) {
				serviceAreaMap.set(entry.serviceArea, (serviceAreaMap.get(entry.serviceArea) || 0) + 1);
			}
		}

		const byCountry = Array.from(countryMap.entries())
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count);

		const byCity = Array.from(cityMap.entries())
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 20);

		const byServiceArea = Array.from(serviceAreaMap.entries())
			.map(([area, count]) => ({ area, count }))
			.sort((a, b) => b.count - a.count);

		// Calculate item-level coverage from source data
		const totalItems = allItems.length;
		const itemsWithLocation = allItems.filter(
			(item) => item.location && (item.location.latitude !== undefined || item.location.is_remote)
		).length;
		const itemsRemote = allItems.filter((item) => item.location?.is_remote).length;
		const coveragePercent =
			totalItems > 0 ? Math.round((itemsWithLocation / totalItems) * 100 * 10) / 10 : 0;

		// Index health: compare actual index count to expected (all items with location data)
		const expectedCount = itemsWithLocation;
		const indexHealth = {
			synced: indexStats.totalIndexed === expectedCount,
			indexCount: indexStats.totalIndexed,
			expectedCount,
		};

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

		// Heatmap data: simple lat/lng for non-remote entries
		const heatmapData = allEntries
			.filter((e) => !e.isRemote)
			.map((e) => ({ lat: e.latitude, lng: e.longitude }));

		return NextResponse.json({
			success: true,
			data: {
				stats: {
					totalIndexed: indexStats.totalIndexed,
					totalItems,
					itemsWithLocation,
					itemsRemote,
					coveragePercent,
					indexHealth,
					citiesCount: indexStats.citiesCount,
					countriesCount: indexStats.countriesCount,
					remoteCount: indexStats.remoteCount,
					lastIndexedAt: indexStats.lastIndexedAt?.toISOString() ?? null,
					lastRebuildAt: indexStats.lastRebuildAt?.toISOString() ?? null,
				},
				distributions: { byCountry, byCity, byServiceArea },
				locations,
				heatmapData,
			},
		});
	} catch (error) {
		console.error('Error fetching geo analytics:', error);
		return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
	}
}
