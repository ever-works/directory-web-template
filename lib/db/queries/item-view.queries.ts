import { and, gte, inArray, count, eq } from 'drizzle-orm';
import { db } from '../drizzle';
import { itemViews, type NewItemView } from '../schema';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * Record an item view with daily deduplication
 *
 * Attempts to insert a view record. If a view already exists for the same
 * item, viewer, and UTC date, the insert is silently ignored (ON CONFLICT DO NOTHING).
 *
 * @param view - View data containing itemId (slug), viewerId, and viewedDateUtc (YYYY-MM-DD)
 * @returns true if a new view was recorded, false if it was a duplicate
 */
export async function recordItemView(
	view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const result = await db
		.insert(itemViews)
		.values({ ...view, tenantId })
		.onConflictDoNothing()
		.returning({ id: itemViews.id });

	return result.length > 0;
}

// ===================== Helper Functions =====================

/**
 * Get UTC date string for N days ago
 * Uses UTC methods to avoid timezone-related off-by-one errors
 * @param daysAgo - Number of days to subtract from today
 * @returns Date string in YYYY-MM-DD format (UTC)
 */
function getUtcDateString(daysAgo: number = 0): string {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - daysAgo);
	return date.toISOString().split('T')[0];
}

// ===================== View Aggregation Queries =====================

/**
 * Get total view count for a set of items
 * @param itemSlugs - Array of item slugs to count views for
 * @returns Total view count
 */
export async function getTotalViewsCount(itemSlugs: string[]): Promise<number> {
	if (itemSlugs.length === 0) return 0;
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [result] = await db
		.select({ count: count() })
		.from(itemViews)
		.where(and(inArray(itemViews.itemId, itemSlugs), eq(itemViews.tenantId, tenantId)));

	return Number(result?.count ?? 0);
}

/**
 * Get view count for items in the last N days
 * @param itemSlugs - Array of item slugs
 * @param days - Number of days to look back (default 7)
 * @returns View count for the period
 */
export async function getRecentViewsCount(itemSlugs: string[], days: number = 7): Promise<number> {
	if (itemSlugs.length === 0) return 0;
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const startDateStr = getUtcDateString(days);

	const [result] = await db
		.select({ count: count() })
		.from(itemViews)
		.where(
			and(
				inArray(itemViews.itemId, itemSlugs),
				gte(itemViews.viewedDateUtc, startDateStr),
				eq(itemViews.tenantId, tenantId)
			)
		);

	return Number(result?.count ?? 0);
}

/**
 * Get daily view counts for the last N days
 * Returns a Map keyed by date string (YYYY-MM-DD) with view counts
 * @param itemSlugs - Array of item slugs
 * @param days - Number of days to look back (default 7)
 * @returns Map of date string to view count
 */
export async function getDailyViewsData(itemSlugs: string[], days: number = 7): Promise<Map<string, number>> {
	if (itemSlugs.length === 0) return new Map();
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const startDateStr = getUtcDateString(days);

	const dailyViews = await db
		.select({
			date: itemViews.viewedDateUtc,
			count: count()
		})
		.from(itemViews)
		.where(
			and(
				inArray(itemViews.itemId, itemSlugs),
				gte(itemViews.viewedDateUtc, startDateStr),
				eq(itemViews.tenantId, tenantId)
			)
		)
		.groupBy(itemViews.viewedDateUtc);

	return new Map(dailyViews.map((d) => [d.date, Number(d.count)]));
}

/**
 * Get view counts per item (for top items display)
 * @param itemSlugs - Array of item slugs
 * @returns Map of itemSlug to view count
 */
export async function getViewsPerItem(itemSlugs: string[]): Promise<Map<string, number>> {
	if (itemSlugs.length === 0) return new Map();
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const viewCounts = await db
		.select({
			itemId: itemViews.itemId,
			count: count()
		})
		.from(itemViews)
		.where(and(inArray(itemViews.itemId, itemSlugs), eq(itemViews.tenantId, tenantId)))
		.groupBy(itemViews.itemId);

	return new Map(viewCounts.map((v) => [v.itemId, Number(v.count)]));
}
