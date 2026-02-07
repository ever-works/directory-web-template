import 'server-only';
import { and, eq, desc, asc, count, like, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { sponsorAds, users, SponsorAdStatus, type SponsorAd, type NewSponsorAd } from '@/lib/db/schema';
import type { SponsorAdListOptions, SponsorAdStats, SponsorAdWithUser, SponsorWithItem } from '@/lib/types/sponsor-ad';
import { getCachedItems, type ItemData } from '@/lib/content';

// ######################### Read Operations #########################

/**
 * Get sponsor ad by ID
 */
export async function getSponsorAdById(id: string, tenantId: string): Promise<SponsorAd | null> {
	const result = await db
		.select()
		.from(sponsorAds)
		.where(and(eq(sponsorAds.id, id), eq(sponsorAds.tenantId, tenantId)))
		.limit(1);

	return result[0] || null;
}

/**
 * Get sponsor ad by ID with user details
 */
export async function getSponsorAdWithUser(id: string, tenantId: string): Promise<SponsorAdWithUser | null> {
	const result = await db
		.select({
			sponsorAd: sponsorAds,
			user: {
				id: users.id,
				email: users.email,
				image: users.image
			}
		})
		.from(sponsorAds)
		.leftJoin(users, eq(sponsorAds.userId, users.id))
		.where(and(eq(sponsorAds.id, id), eq(sponsorAds.tenantId, tenantId)))
		.limit(1);

	if (!result[0]) return null;

	// Get reviewer if exists
	let reviewer = null;
	if (result[0].sponsorAd.reviewedBy) {
		const reviewerResult = await db
			.select({ id: users.id, email: users.email })
			.from(users)
			.where(eq(users.id, result[0].sponsorAd.reviewedBy))
			.limit(1);
		reviewer = reviewerResult[0] || null;
	}

	return {
		...result[0].sponsorAd,
		user: result[0].user || undefined,
		reviewer
	};
}

/**
 * Get all sponsor ads for a user
 */
export async function getSponsorAdsByUserId(userId: string, tenantId: string): Promise<SponsorAd[]> {
	return await db
		.select()
		.from(sponsorAds)
		.where(and(eq(sponsorAds.userId, userId), eq(sponsorAds.tenantId, tenantId)))
		.orderBy(desc(sponsorAds.createdAt));
}

/**
 * Get active sponsor ads (for display)
 */
export async function getActiveSponsorAds(tenantId: string, limit?: number): Promise<SponsorAd[]> {
	const query = db
		.select()
		.from(sponsorAds)
		.where(and(eq(sponsorAds.status, SponsorAdStatus.ACTIVE), eq(sponsorAds.tenantId, tenantId)))
		.orderBy(desc(sponsorAds.createdAt));

	if (limit && limit > 0) {
		return await query.limit(limit);
	}

	return await query;
}

/**
 * Get active sponsor ads with their associated item data
 * This performs a server-side join between sponsor ads and items
 */
export async function getActiveSponsorAdsWithItems(tenantId: string, limit?: number): Promise<SponsorWithItem[]> {
	const sponsors = await getActiveSponsorAds(tenantId, limit);

	if (sponsors.length === 0) {
		return [];
	}

	// Fetch all items and create a lookup map
	const { items } = await getCachedItems();
	const itemsMap = new Map<string, ItemData>(items.map((item) => [item.slug, item]));

	return sponsors.map((sponsor) => ({
		sponsor,
		item: itemsMap.get(sponsor.itemSlug) || null
	}));
}

/**
 * Get pending sponsor ads (for admin review)
 */
export async function getPendingSponsorAds(tenantId: string): Promise<SponsorAd[]> {
	return await db
		.select()
		.from(sponsorAds)
		.where(and(eq(sponsorAds.status, SponsorAdStatus.PENDING), eq(sponsorAds.tenantId, tenantId)))
		.orderBy(asc(sponsorAds.createdAt));
}

/**
 * Get sponsor ads with pagination and filters
 */
export async function getSponsorAdsPaginated(
	tenantId: string,
	options: SponsorAdListOptions = {}
): Promise<{
	sponsorAds: SponsorAd[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}> {
	const {
		page = 1,
		limit = 10,
		status,
		interval,
		userId,
		search,
		sortBy = 'createdAt',
		sortOrder = 'desc'
	} = options;

	const offset = (page - 1) * limit;

	// Build where conditions
	const conditions = [eq(sponsorAds.tenantId, tenantId)];

	if (status) {
		conditions.push(eq(sponsorAds.status, status));
	}

	if (interval) {
		conditions.push(eq(sponsorAds.interval, interval));
	}

	if (userId) {
		conditions.push(eq(sponsorAds.userId, userId));
	}

	if (search) {
		conditions.push(like(sponsorAds.itemSlug, `%${search}%`));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	// Build order by
	const orderByColumn =
		{
			createdAt: sponsorAds.createdAt,
			updatedAt: sponsorAds.updatedAt,
			startDate: sponsorAds.startDate,
			endDate: sponsorAds.endDate,
			status: sponsorAds.status
		}[sortBy] || sponsorAds.createdAt;

	const orderByDirection = sortOrder === 'asc' ? asc : desc;

	// Get total count
	const totalResult = await db.select({ count: count() }).from(sponsorAds).where(whereClause);

	const total = totalResult[0].count;
	const totalPages = Math.ceil(total / limit);

	// Get paginated results
	const results = await db
		.select()
		.from(sponsorAds)
		.where(whereClause)
		.orderBy(orderByDirection(orderByColumn))
		.limit(limit)
		.offset(offset);

	return {
		sponsorAds: results,
		total,
		page,
		limit,
		totalPages
	};
}

// ######################### Write Operations #########################

/**
 * Create a new sponsor ad
 */
export async function createSponsorAd(data: NewSponsorAd, tenantId: string): Promise<SponsorAd> {
	const result = await db
		.insert(sponsorAds)
		.values({
			...data,
			tenantId,
			createdAt: new Date(),
			updatedAt: new Date()
		})
		.returning();

	return result[0];
}

/**
 * Update sponsor ad
 */
export async function updateSponsorAd(
	id: string,
	data: Partial<NewSponsorAd>,
	tenantId: string
): Promise<SponsorAd | null> {
	const result = await db
		.update(sponsorAds)
		.set({
			...data,
			updatedAt: new Date()
		})
		.where(and(eq(sponsorAds.id, id), eq(sponsorAds.tenantId, tenantId)))
		.returning();

	return result[0] || null;
}

/**
 * Reject sponsor ad
 */
export async function rejectSponsorAd(
	id: string,
	reviewedBy: string,
	rejectionReason: string,
	tenantId: string
): Promise<SponsorAd | null> {
	const result = await db
		.update(sponsorAds)
		.set({
			status: SponsorAdStatus.REJECTED,
			reviewedBy,
			reviewedAt: new Date(),
			rejectionReason,
			updatedAt: new Date()
		})
		.where(and(eq(sponsorAds.id, id), eq(sponsorAds.tenantId, tenantId)))
		.returning();

	return result[0] || null;
}

/**
 * Activate sponsor ad (after payment confirmed)
 */
export async function activateSponsorAd(
	id: string,
	startDate: Date,
	endDate: Date,
	tenantId: string
): Promise<SponsorAd | null> {
	const result = await db
		.update(sponsorAds)
		.set({
			status: SponsorAdStatus.ACTIVE,
			startDate,
			endDate,
			updatedAt: new Date()
		})
		.where(and(eq(sponsorAds.id, id), eq(sponsorAds.tenantId, tenantId)))
		.returning();

	return result[0] || null;
}

/**
 * Expire sponsor ad
 */
export async function expireSponsorAd(id: string, tenantId: string): Promise<SponsorAd | null> {
	const result = await db
		.update(sponsorAds)
		.set({
			status: SponsorAdStatus.EXPIRED,
			updatedAt: new Date()
		})
		.where(and(eq(sponsorAds.id, id), eq(sponsorAds.tenantId, tenantId)))
		.returning();

	return result[0] || null;
}

/**
 * Cancel sponsor ad
 */
export async function cancelSponsorAd(id: string, tenantId: string, cancelReason?: string): Promise<SponsorAd | null> {
	const result = await db
		.update(sponsorAds)
		.set({
			status: SponsorAdStatus.CANCELLED,
			cancelledAt: new Date(),
			cancelReason,
			updatedAt: new Date()
		})
		.where(and(eq(sponsorAds.id, id), eq(sponsorAds.tenantId, tenantId)))
		.returning();

	return result[0] || null;
}

/**
 * Delete sponsor ad (hard delete)
 */
export async function deleteSponsorAd(id: string, tenantId: string): Promise<void> {
	await db.delete(sponsorAds).where(and(eq(sponsorAds.id, id), eq(sponsorAds.tenantId, tenantId)));
}

// ######################### Statistics #########################

/**
 * Internal helper for building sponsor ad statistics
 * @param userId - Optional user ID to filter stats for a specific user
 */
async function buildSponsorAdStats(tenantId: string, userId?: string): Promise<SponsorAdStats> {
	// Build WHERE clause based on whether we're filtering by user
	const userFilter = userId
		? and(eq(sponsorAds.userId, userId), eq(sponsorAds.tenantId, tenantId))
		: eq(sponsorAds.tenantId, tenantId);
	const activeFilter = userId
		? and(
				eq(sponsorAds.userId, userId),
				eq(sponsorAds.status, SponsorAdStatus.ACTIVE),
				eq(sponsorAds.tenantId, tenantId)
			)
		: and(eq(sponsorAds.status, SponsorAdStatus.ACTIVE), eq(sponsorAds.tenantId, tenantId));

	// Get counts by status
	const statusCountsQuery = db
		.select({
			status: sponsorAds.status,
			count: count()
		})
		.from(sponsorAds)
		.groupBy(sponsorAds.status);

	const statusCounts = userFilter ? await statusCountsQuery.where(userFilter) : await statusCountsQuery;

	// Get counts by interval
	const intervalCountsQuery = db
		.select({
			interval: sponsorAds.interval,
			count: count()
		})
		.from(sponsorAds)
		.groupBy(sponsorAds.interval);

	const intervalCounts = userFilter ? await intervalCountsQuery.where(userFilter) : await intervalCountsQuery;

	// Get revenue from active sponsors
	const revenueResult = await db
		.select({
			totalRevenue: sql<number>`COALESCE(SUM(${sponsorAds.amount}), 0)`
		})
		.from(sponsorAds)
		.where(activeFilter);

	// Build overview object
	const overview = {
		total: 0,
		pendingPayment: 0,
		pending: 0,
		active: 0,
		rejected: 0,
		expired: 0,
		cancelled: 0
	};

	// Map DB status values to overview keys
	const statusMap: Record<string, keyof typeof overview> = {
		pending_payment: 'pendingPayment',
		pending: 'pending',
		active: 'active',
		rejected: 'rejected',
		expired: 'expired',
		cancelled: 'cancelled'
	};

	for (const row of statusCounts) {
		overview.total += row.count;
		if (row.status && statusMap[row.status]) {
			overview[statusMap[row.status]] = row.count;
		}
	}

	// Build interval counts
	const byInterval = {
		weekly: 0,
		monthly: 0
	};

	for (const row of intervalCounts) {
		if (row.interval === 'weekly') {
			byInterval.weekly = row.count;
		} else if (row.interval === 'monthly') {
			byInterval.monthly = row.count;
		}
	}

	return {
		overview,
		byInterval,
		revenue: {
			totalRevenue: Number(revenueResult[0]?.totalRevenue || 0),
			weeklyRevenue: 0,
			monthlyRevenue: 0
		}
	};
}

/**
 * Get sponsor ad statistics (all users)
 */
export async function getSponsorAdStats(tenantId: string): Promise<SponsorAdStats> {
	return buildSponsorAdStats(tenantId);
}

/**
 * Get sponsor ad statistics for a specific user
 */
export async function getSponsorAdStatsByUser(userId: string, tenantId: string): Promise<SponsorAdStats> {
	return buildSponsorAdStats(tenantId, userId);
}

/**
 * Check if user has pending sponsor ad for an item
 * Checks both PENDING_PAYMENT and PENDING statuses
 */
export async function hasPendingSponsorAdForItem(userId: string, itemSlug: string, tenantId: string): Promise<boolean> {
	const result = await db
		.select({ count: count() })
		.from(sponsorAds)
		.where(
			and(
				eq(sponsorAds.userId, userId),
				eq(sponsorAds.itemSlug, itemSlug),
				eq(sponsorAds.tenantId, tenantId),
				or(
					eq(sponsorAds.status, SponsorAdStatus.PENDING_PAYMENT),
					eq(sponsorAds.status, SponsorAdStatus.PENDING)
				)
			)
		);

	return result[0].count > 0;
}

/**
 * Check if user has active sponsor ad for an item
 */
export async function hasActiveSponsorAdForItem(userId: string, itemSlug: string, tenantId: string): Promise<boolean> {
	const result = await db
		.select({ count: count() })
		.from(sponsorAds)
		.where(
			and(
				eq(sponsorAds.userId, userId),
				eq(sponsorAds.itemSlug, itemSlug),
				eq(sponsorAds.tenantId, tenantId),
				eq(sponsorAds.status, SponsorAdStatus.ACTIVE)
			)
		);

	return result[0].count > 0;
}
