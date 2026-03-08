import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../drizzle';
import {
	moderationHistory,
	clientProfiles,
	users,
	type NewModerationHistoryRecord,
	type ModerationHistoryRecord,
	type ModerationActionValues,
	type ReportContentTypeValues
} from '../schema';
import { getTenantId } from '@/lib/auth/tenant';

// ===================== Moderation History Types =====================

export type ModerationHistoryWithDetails = ModerationHistoryRecord & {
	user: {
		id: string;
		name: string;
		email: string;
	} | null;
	performedByUser: {
		id: string;
		email: string | null;
	} | null;
};

// ===================== Moderation History CRUD =====================

/**
 * Create a new moderation history entry
 * @param data - Moderation history data
 * @returns Created moderation history entry
 */
export async function createModerationHistory(data: {
	userId: string;
	action: ModerationActionValues;
	reason?: string;
	reportId?: string;
	performedBy?: string;
	contentType?: ReportContentTypeValues;
	contentId?: string;
	details?: Record<string, unknown>;
}): Promise<ModerationHistoryRecord> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const insertData: NewModerationHistoryRecord = {
		userId: data.userId,
		action: data.action,
		reason: data.reason || null,
		reportId: data.reportId || null,
		performedBy: data.performedBy || null,
		contentType: data.contentType || null,
		contentId: data.contentId || null,
		details: data.details || null,
		tenantId: tenantId
	};

	const [record] = await db.insert(moderationHistory).values(insertData).returning();

	return record;
}

/**
 * Get moderation history for a user
 * @param userId - Client profile ID
 * @param limit - Maximum number of records to return
 * @returns Moderation history entries
 */
export async function getModerationHistoryByUser(userId: string, limit = 50): Promise<ModerationHistoryWithDetails[]> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const results = await db
		.select({
			id: moderationHistory.id,
			userId: moderationHistory.userId,
			action: moderationHistory.action,
			reason: moderationHistory.reason,
			reportId: moderationHistory.reportId,
			performedBy: moderationHistory.performedBy,
			contentType: moderationHistory.contentType,
			contentId: moderationHistory.contentId,
			details: moderationHistory.details,
			createdAt: moderationHistory.createdAt,
			tenantId: moderationHistory.tenantId,
			user: {
				id: clientProfiles.id,
				name: clientProfiles.name,
				email: clientProfiles.email
			}
		})
		.from(moderationHistory)
		.leftJoin(clientProfiles, eq(moderationHistory.userId, clientProfiles.id))
		.where(and(eq(moderationHistory.userId, userId), eq(moderationHistory.tenantId, tenantId)))
		.orderBy(desc(moderationHistory.createdAt))
		.limit(limit);

	// Get performer info for each record
	const enrichedResults = await Promise.all(
		results.map(async (record) => {
			let performedByUser: { id: string; email: string | null } | null = null;
			if (record.performedBy) {
				const [performer] = await db
					.select({ id: users.id, email: users.email })
					.from(users)
					.where(and(eq(users.id, record.performedBy), eq(users.tenantId, tenantId)))
					.limit(1);
				performedByUser = performer || null;
			}
			return { ...record, performedByUser };
		})
	);

	return enrichedResults;
}

/**
 * Get moderation history for a report
 * @param reportId - Report ID
 * @returns Moderation history entries related to the report
 */
export async function getModerationHistoryByReport(reportId: string): Promise<ModerationHistoryWithDetails[]> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const results = await db
		.select({
			id: moderationHistory.id,
			userId: moderationHistory.userId,
			action: moderationHistory.action,
			reason: moderationHistory.reason,
			reportId: moderationHistory.reportId,
			performedBy: moderationHistory.performedBy,
			contentType: moderationHistory.contentType,
			contentId: moderationHistory.contentId,
			details: moderationHistory.details,
			createdAt: moderationHistory.createdAt,
			tenantId: moderationHistory.tenantId,
			user: {
				id: clientProfiles.id,
				name: clientProfiles.name,
				email: clientProfiles.email
			}
		})
		.from(moderationHistory)
		.leftJoin(clientProfiles, eq(moderationHistory.userId, clientProfiles.id))
		.where(and(eq(moderationHistory.reportId, reportId), eq(moderationHistory.tenantId, tenantId)))
		.orderBy(desc(moderationHistory.createdAt));

	// Get performer info for each record
	const enrichedResults = await Promise.all(
		results.map(async (record) => {
			let performedByUser: { id: string; email: string | null } | null = null;
			if (record.performedBy) {
				const [performer] = await db
					.select({ id: users.id, email: users.email })
					.from(users)
					.where(and(eq(users.id, record.performedBy), eq(users.tenantId, tenantId)))
					.limit(1);
				performedByUser = performer || null;
			}
			return { ...record, performedByUser };
		})
	);

	return enrichedResults;
}

// ===================== Client Profile Moderation Updates =====================

/**
 * Increment warning count for a user
 * @param userId - Client profile ID
 * @returns Updated client profile
 */
export async function incrementWarningCount(userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const [updated] = await db
		.update(clientProfiles)
		.set({
			warningCount: sql`COALESCE(${clientProfiles.warningCount}, 0) + 1`,
			updatedAt: new Date()
		})
		.where(and(eq(clientProfiles.id, userId), eq(clientProfiles.tenantId, tenantId)))
		.returning();

	return updated;
}

/**
 * Suspend a user
 * @param userId - Client profile ID
 * @returns Updated client profile
 */
export async function suspendUser(userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const [updated] = await db
		.update(clientProfiles)
		.set({
			status: 'suspended',
			suspendedAt: new Date(),
			updatedAt: new Date()
		})
		.where(and(eq(clientProfiles.id, userId), eq(clientProfiles.tenantId, tenantId)))
		.returning();

	return updated;
}

/**
 * Unsuspend a user (restore to active)
 * @param userId - Client profile ID
 * @returns Updated client profile
 */
export async function unsuspendUser(userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const [updated] = await db
		.update(clientProfiles)
		.set({
			status: 'active',
			suspendedAt: null,
			updatedAt: new Date()
		})
		.where(and(eq(clientProfiles.id, userId), eq(clientProfiles.tenantId, tenantId)))
		.returning();

	return updated;
}

/**
 * Ban a user
 * @param userId - Client profile ID
 * @returns Updated client profile
 */
export async function banUser(userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [updated] = await db
		.update(clientProfiles)
		.set({
			status: 'banned',
			bannedAt: new Date(),
			updatedAt: new Date()
		})
		.where(and(eq(clientProfiles.id, userId), eq(clientProfiles.tenantId, tenantId)))
		.returning();

	return updated;
}

/**
 * Unban a user (restore to active)
 * @param userId - Client profile ID
 * @returns Updated client profile
 */
export async function unbanUser(userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [updated] = await db
		.update(clientProfiles)
		.set({
			status: 'active',
			bannedAt: null,
			updatedAt: new Date()
		})
		.where(and(eq(clientProfiles.id, userId), eq(clientProfiles.tenantId, tenantId)))
		.returning();

	return updated;
}

/**
 * Get client profile by ID
 * @param id - Client profile ID
 * @returns Client profile or null
 */
export async function getClientProfileById(id: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [profile] = await db
		.select()
		.from(clientProfiles)
		.where(and(eq(clientProfiles.id, id), eq(clientProfiles.tenantId, tenantId)))
		.limit(1);

	return profile || null;
}

/**
 * Get client profile by user ID
 * @param userId - User ID (from auth)
 * @returns Client profile or null
 */
export async function getClientProfileByUserId(userId: string) {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [profile] = await db
		.select()
		.from(clientProfiles)
		.where(and(eq(clientProfiles.userId, userId), eq(clientProfiles.tenantId, tenantId)))
		.limit(1);

	return profile || null;
}

// ===================== User Status Helpers =====================

/**
 * Check if a user is blocked (suspended or banned)
 * @param status - User status
 * @returns True if user is blocked
 */
export function isUserBlocked(status: string | null): boolean {
	return status === 'suspended' || status === 'banned';
}

/**
 * Get block reason message based on status
 * @param status - User status
 * @returns Block reason message
 */
export function getBlockReasonMessage(status: string | null): string {
	if (status === 'suspended') {
		return 'Your account is currently suspended. You cannot perform this action.';
	}
	if (status === 'banned') {
		return 'Your account has been banned. You cannot perform this action.';
	}
	return 'Your account is restricted. You cannot perform this action.';
}
