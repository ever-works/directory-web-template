import { sql, inArray, isNull, count, and, eq } from 'drizzle-orm';
import { db } from '../drizzle';
import { votes, comments, favorites, itemViews } from '../schema';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * Engagement metrics for popularity scoring
 */
export interface ItemEngagementMetrics {
	views: number;
	votes: number; // Net votes (upvotes - downvotes)
	favorites: number;
	comments: number;
	avgRating: number; // Average rating from comments (0-5)
}

/**
 * Get all engagement metrics for multiple items in a single query batch
 * This is optimized for bulk operations like sorting all items by popularity
 *
 * @param itemSlugs - Array of item slugs to get metrics for
 * @returns Map of itemSlug to engagement metrics
 */
export async function getEngagementMetricsPerItem(itemSlugs: string[]): Promise<Map<string, ItemEngagementMetrics>> {
	const tenantId = await getTenantId();
	if (!tenantId) return new Map();
	if (itemSlugs.length === 0) return new Map();

	// Run all queries in parallel for better performance
	const [viewsData, votesData, favoritesData, commentsData] = await Promise.all([
		// Views per item
		db
			.select({
				itemId: itemViews.itemId,
				count: count()
			})
			.from(itemViews)
			.where(and(inArray(itemViews.itemId, itemSlugs), eq(itemViews.tenantId, tenantId)))
			.groupBy(itemViews.itemId),

		// Net votes per item (upvotes - downvotes)
		db
			.select({
				itemId: votes.itemId,
				netScore: sql<number>`
          SUM(CASE
            WHEN vote_type = 'upvote' THEN 1
            WHEN vote_type = 'downvote' THEN -1
            ELSE 0
          END)
        `.as('netScore')
			})
			.from(votes)
			.where(and(inArray(votes.itemId, itemSlugs), eq(votes.tenantId, tenantId)))
			.groupBy(votes.itemId),

		// Favorites per item
		db
			.select({
				itemSlug: favorites.itemSlug,
				count: count()
			})
			.from(favorites)
			.where(and(inArray(favorites.itemSlug, itemSlugs), eq(favorites.tenantId, tenantId)))
			.groupBy(favorites.itemSlug),

		// Comments and average rating per item (exclude deleted comments)
		db
			.select({
				itemId: comments.itemId,
				count: count(),
				avgRating: sql<number>`COALESCE(AVG(${comments.rating}), 0)`.as('avgRating')
			})
			.from(comments)
			.where(
				and(inArray(comments.itemId, itemSlugs), isNull(comments.deletedAt), eq(comments.tenantId, tenantId))
			)
			.groupBy(comments.itemId)
	]);

	// Build lookup maps with proper typing
	const viewsMap = new Map<string, number>(viewsData.map((v) => [v.itemId, Number(v.count)]));
	const votesMap = new Map<string, number>(votesData.map((v) => [v.itemId, Number(v.netScore ?? 0)]));
	const favoritesMap = new Map<string, number>(favoritesData.map((f) => [f.itemSlug, Number(f.count)]));
	const commentsMap = new Map<string, { count: number; avgRating: number }>(
		commentsData.map((c) => [c.itemId, { count: Number(c.count), avgRating: Number(c.avgRating ?? 0) }])
	);

	// Combine into final metrics map
	const metricsMap = new Map<string, ItemEngagementMetrics>();

	for (const slug of itemSlugs) {
		const commentData = commentsMap.get(slug);
		metricsMap.set(slug, {
			views: viewsMap.get(slug) ?? 0,
			votes: votesMap.get(slug) ?? 0,
			favorites: favoritesMap.get(slug) ?? 0,
			comments: commentData?.count ?? 0,
			avgRating: commentData?.avgRating ?? 0
		});
	}

	return metricsMap;
}

/**
 * Get favorites count per item
 * @param itemSlugs - Array of item slugs
 * @returns Map of itemSlug to favorites count
 */
export async function getFavoritesPerItem(itemSlugs: string[]): Promise<Map<string, number>> {
	if (itemSlugs.length === 0) return new Map();
	const tenantId = await getTenantId();
	if (!tenantId) return new Map();

	const favoriteCounts = await db
		.select({
			itemSlug: favorites.itemSlug,
			count: count()
		})
		.from(favorites)
		.where(and(inArray(favorites.itemSlug, itemSlugs), eq(favorites.tenantId, tenantId)))
		.groupBy(favorites.itemSlug);

	return new Map<string, number>(favoriteCounts.map((f) => [f.itemSlug, Number(f.count)]));
}

/**
 * Get comments count and average rating per item
 * @param itemSlugs - Array of item slugs
 * @returns Map of itemSlug to { count, avgRating }
 */
export async function getCommentsPerItem(
	itemSlugs: string[]
): Promise<Map<string, { count: number; avgRating: number }>> {
	if (itemSlugs.length === 0) return new Map();
	const tenantId = await getTenantId();
	if (!tenantId) return new Map();

	const commentCounts = await db
		.select({
			itemId: comments.itemId,
			count: count(),
			avgRating: sql<number>`COALESCE(AVG(${comments.rating}), 0)`.as('avgRating')
		})
		.from(comments)
		.where(and(inArray(comments.itemId, itemSlugs), isNull(comments.deletedAt), eq(comments.tenantId, tenantId)))
		.groupBy(comments.itemId);

	return new Map<string, { count: number; avgRating: number }>(
		commentCounts.map((c) => [c.itemId, { count: Number(c.count), avgRating: Number(c.avgRating ?? 0) }])
	);
}

/**
 * Daily activity time-series for a single item.
 *
 * Returns one entry per day for the last `days` days (oldest first, inclusive
 * of today), each with view / net-vote / favorite / comment counts that
 * happened on that UTC day. Missing days are filled with zeros so the
 * frontend can render a sparkline without gap handling.
 */
export interface ItemActivityDay {
	date: string; // YYYY-MM-DD (UTC)
	views: number;
	votes: number; // net (upvotes − downvotes)
	favorites: number;
	comments: number;
}

export async function getItemActivityTimeSeries(
	itemSlug: string,
	days: number = 30
): Promise<ItemActivityDay[]> {
	const tenantId = await getTenantId();
	if (!tenantId) return [];

	const dayCount = Math.min(Math.max(Math.floor(days), 1), 90);

	// Anchor the window to today (UTC) and walk back `dayCount - 1` days.
	const today = new Date();
	const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
	const startUtc = new Date(todayUtc);
	startUtc.setUTCDate(startUtc.getUTCDate() - (dayCount - 1));
	const startIso = startUtc.toISOString();
	const startDateStr = startIso.slice(0, 10); // YYYY-MM-DD

	const [viewRows, voteRows, favoriteRows, commentRows] = await Promise.all([
		db
			.select({
				day: itemViews.viewedDateUtc,
				count: count()
			})
			.from(itemViews)
			.where(
				and(
					eq(itemViews.itemId, itemSlug),
					eq(itemViews.tenantId, tenantId),
					sql`${itemViews.viewedDateUtc} >= ${startDateStr}`
				)
			)
			.groupBy(itemViews.viewedDateUtc),

		db
			.select({
				day: sql<string>`to_char(date_trunc('day', ${votes.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`.as('day'),
				netScore: sql<number>`SUM(CASE WHEN ${votes.voteType} = 'upvote' THEN 1 WHEN ${votes.voteType} = 'downvote' THEN -1 ELSE 0 END)`.as(
					'netScore'
				)
			})
			.from(votes)
			.where(
				and(
					eq(votes.itemId, itemSlug),
					eq(votes.tenantId, tenantId),
					sql`${votes.createdAt} >= ${startIso}::timestamptz`
				)
			)
			.groupBy(sql`date_trunc('day', ${votes.createdAt} AT TIME ZONE 'UTC')`),

		db
			.select({
				day: sql<string>`to_char(date_trunc('day', ${favorites.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`.as('day'),
				count: count()
			})
			.from(favorites)
			.where(
				and(
					eq(favorites.itemSlug, itemSlug),
					eq(favorites.tenantId, tenantId),
					sql`${favorites.createdAt} >= ${startIso}::timestamptz`
				)
			)
			.groupBy(sql`date_trunc('day', ${favorites.createdAt} AT TIME ZONE 'UTC')`),

		db
			.select({
				day: sql<string>`to_char(date_trunc('day', ${comments.createdAt} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`.as('day'),
				count: count()
			})
			.from(comments)
			.where(
				and(
					eq(comments.itemId, itemSlug),
					isNull(comments.deletedAt),
					eq(comments.tenantId, tenantId),
					sql`${comments.createdAt} >= ${startIso}::timestamptz`
				)
			)
			.groupBy(sql`date_trunc('day', ${comments.createdAt} AT TIME ZONE 'UTC')`)
	]);

	const viewsByDay = new Map<string, number>(viewRows.map((r) => [r.day, Number(r.count)]));
	const votesByDay = new Map<string, number>(voteRows.map((r) => [r.day, Number(r.netScore ?? 0)]));
	const favoritesByDay = new Map<string, number>(favoriteRows.map((r) => [r.day, Number(r.count)]));
	const commentsByDay = new Map<string, number>(commentRows.map((r) => [r.day, Number(r.count)]));

	const out: ItemActivityDay[] = [];
	for (let i = 0; i < dayCount; i++) {
		const d = new Date(startUtc);
		d.setUTCDate(d.getUTCDate() + i);
		const key = d.toISOString().slice(0, 10);
		out.push({
			date: key,
			views: viewsByDay.get(key) ?? 0,
			votes: votesByDay.get(key) ?? 0,
			favorites: favoritesByDay.get(key) ?? 0,
			comments: commentsByDay.get(key) ?? 0
		});
	}

	return out;
}
