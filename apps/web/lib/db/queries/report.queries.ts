import { and, eq, desc, sql, type SQL } from 'drizzle-orm';
import { db } from '../drizzle';
import {
	reports,
	clientProfiles,
	users,
	type NewReport,
	type Report,
	ReportStatus,
	ReportContentType,
	ReportReason,
	type ReportStatusValues,
	type ReportContentTypeValues,
	type ReportReasonValues,
	type ReportResolutionValues
} from '../schema';
import { getTenantId } from '@/lib/auth/tenant';

// ===================== Report Types =====================

export type ReportWithReporter = Report & {
	reporter: {
		id: string;
		name: string;
		email: string;
		avatar: string | null;
	} | null;
	reviewer: {
		id: string;
		email: string | null;
	} | null;
};

// ===================== Report CRUD =====================

/**
 * Create a new report
 * @param data - Report data
 * @returns Created report
 */
export async function createReport(data: {
	contentType: ReportContentTypeValues;
	contentId: string;
	reason: ReportReasonValues;
	details?: string;
	reportedBy: string;
}): Promise<Report> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const insertData: NewReport = {
		contentType: data.contentType,
		contentId: data.contentId,
		reason: data.reason,
		details: data.details || null,
		reportedBy: data.reportedBy,
		status: ReportStatus.PENDING,
		tenantId: tenantId
	};

	const [report] = await db.insert(reports).values(insertData).returning();

	return report;
}

/**
 * Get report by ID with reporter and reviewer information
 * @param id - Report ID
 * @returns Report with reporter info or null
 */
export async function getReportById(id: string): Promise<ReportWithReporter | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const result = await db
		.select({
			id: reports.id,
			contentType: reports.contentType,
			contentId: reports.contentId,
			reason: reports.reason,
			details: reports.details,
			status: reports.status,
			resolution: reports.resolution,
			reportedBy: reports.reportedBy,
			reviewedBy: reports.reviewedBy,
			reviewNote: reports.reviewNote,
			createdAt: reports.createdAt,
			updatedAt: reports.updatedAt,
			reviewedAt: reports.reviewedAt,
			resolvedAt: reports.resolvedAt,
			tenantId: reports.tenantId,
			reporter: {
				id: clientProfiles.id,
				name: clientProfiles.name,
				email: clientProfiles.email,
				avatar: clientProfiles.avatar
			}
		})
		.from(reports)
		.leftJoin(clientProfiles, eq(reports.reportedBy, clientProfiles.id))
		.where(and(eq(reports.id, id), eq(reports.tenantId, tenantId)))
		.limit(1);

	if (!result[0]) return null;

	// Get reviewer info if exists
	let reviewer: { id: string; email: string | null } | null = null;
	if (result[0].reviewedBy) {
		const [reviewerResult] = await db
			.select({ id: users.id, email: users.email })
			.from(users)
			.where(and(eq(users.id, result[0].reviewedBy), eq(users.tenantId, tenantId)))
			.limit(1);
		reviewer = reviewerResult || null;
	}

	return {
		...result[0],
		reporter: result[0].reporter?.id ? result[0].reporter : null,
		reviewer
	};
}

/**
 * Get all reports with pagination and filtering
 * @param params - Query parameters
 * @returns Paginated reports with metadata
 */
export async function getReports(params: {
	page?: number;
	limit?: number;
	search?: string;
	status?: ReportStatusValues;
	contentType?: ReportContentTypeValues;
	reason?: ReportReasonValues;
}): Promise<{
	reports: ReportWithReporter[];
	total: number;
	page: number;
	totalPages: number;
	limit: number;
}> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const { page = 1, limit = 10, search, status, contentType, reason } = params;
	const offset = (page - 1) * limit;

	const whereConditions: SQL[] = [];

	if (search) {
		const escapedSearch = search.replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&');
		whereConditions.push(
			sql`(${reports.contentId} ILIKE ${`%${escapedSearch}%`} OR
				 ${reports.details} ILIKE ${`%${escapedSearch}%`} OR
				 ${clientProfiles.name} ILIKE ${`%${escapedSearch}%`} OR
				 ${clientProfiles.email} ILIKE ${`%${escapedSearch}%`})`
		);
	}

	whereConditions.push(eq(reports.tenantId, tenantId));

	if (status) {
		whereConditions.push(eq(reports.status, status));
	}

	if (contentType) {
		whereConditions.push(eq(reports.contentType, contentType));
	}

	if (reason) {
		whereConditions.push(eq(reports.reason, reason));
	}

	const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

	// Get total count
	const countResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(reports)
		.leftJoin(clientProfiles, eq(reports.reportedBy, clientProfiles.id))
		.where(whereClause);

	const total = Number(countResult[0]?.count || 0);

	// Get reports with reporter info
	const result = await db
		.select({
			id: reports.id,
			contentType: reports.contentType,
			contentId: reports.contentId,
			reason: reports.reason,
			details: reports.details,
			status: reports.status,
			resolution: reports.resolution,
			reportedBy: reports.reportedBy,
			reviewedBy: reports.reviewedBy,
			reviewNote: reports.reviewNote,
			createdAt: reports.createdAt,
			updatedAt: reports.updatedAt,
			reviewedAt: reports.reviewedAt,
			resolvedAt: reports.resolvedAt,
			tenantId: reports.tenantId,
			reporter: {
				id: clientProfiles.id,
				name: clientProfiles.name,
				email: clientProfiles.email,
				avatar: clientProfiles.avatar
			}
		})
		.from(reports)
		.leftJoin(clientProfiles, eq(reports.reportedBy, clientProfiles.id))
		.where(whereClause)
		.orderBy(desc(reports.createdAt))
		.limit(limit)
		.offset(offset);

	const reportsWithReporter: ReportWithReporter[] = result.map((r) => ({
		...r,
		reporter: r.reporter?.id ? r.reporter : null,
		reviewer: null // Reviewer info not included in list for performance
	}));

	return {
		reports: reportsWithReporter,
		total,
		page,
		totalPages: Math.ceil(total / limit),
		limit
	};
}

/**
 * Update report status and resolution
 * @param id - Report ID
 * @param data - Update data
 * @returns Updated report or null
 */
export async function updateReport(
	id: string,
	data: {
		status?: ReportStatusValues;
		resolution?: ReportResolutionValues;
		reviewNote?: string;
		reviewedBy?: string;
	}
): Promise<Report | null> {
	const now = new Date();
	const updateData: Partial<Report> = {
		updatedAt: now
	};
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	if (data.status !== undefined) {
		updateData.status = data.status;

		// Set reviewedAt when status changes from pending
		if (data.status !== ReportStatus.PENDING && !data.reviewedBy) {
			updateData.reviewedAt = now;
		}

		// Set resolvedAt when resolved or dismissed
		if (data.status === ReportStatus.RESOLVED || data.status === ReportStatus.DISMISSED) {
			updateData.resolvedAt = now;
		}
	}

	if (data.resolution !== undefined) {
		updateData.resolution = data.resolution;
	}

	if (data.reviewNote !== undefined) {
		updateData.reviewNote = data.reviewNote;
	}

	if (data.reviewedBy !== undefined) {
		updateData.reviewedBy = data.reviewedBy;
		updateData.reviewedAt = now;
	}

	const [report] = await db
		.update(reports)
		.set(updateData)
		.where(and(eq(reports.id, id), eq(reports.tenantId, tenantId)))
		.returning();

	return report || null;
}

/**
 * Get report statistics
 * @returns Report statistics by status, content type, and reason
 */
export async function getReportStats(): Promise<{
	total: number;
	byStatus: Record<string, number>;
	byContentType: Record<string, number>;
	byReason: Record<string, number>;
	pendingCount: number;
	resolvedCount: number;
}> {
	// Get total
	const totalResult = await db.select({ count: sql<number>`count(*)` }).from(reports);
	const total = Number(totalResult[0]?.count || 0);
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	// Get counts by status
	const statusStats = await db
		.select({ status: reports.status, count: sql<number>`count(*)` })
		.from(reports)
		.where(eq(reports.tenantId, tenantId))
		.groupBy(reports.status);

	const byStatus: Record<string, number> = {
		[ReportStatus.PENDING]: 0,
		[ReportStatus.REVIEWED]: 0,
		[ReportStatus.RESOLVED]: 0,
		[ReportStatus.DISMISSED]: 0
	};
	statusStats.forEach((stat) => {
		if (stat.status) {
			byStatus[stat.status] = Number(stat.count);
		}
	});

	// Get counts by content type
	const contentTypeStats = await db
		.select({ contentType: reports.contentType, count: sql<number>`count(*)` })
		.from(reports)
		.where(eq(reports.tenantId, tenantId))
		.groupBy(reports.contentType);

	const byContentType: Record<string, number> = {
		[ReportContentType.ITEM]: 0,
		[ReportContentType.COMMENT]: 0
	};
	contentTypeStats.forEach((stat) => {
		if (stat.contentType) {
			byContentType[stat.contentType] = Number(stat.count);
		}
	});

	// Get counts by reason
	const reasonStats = await db
		.select({ reason: reports.reason, count: sql<number>`count(*)` })
		.from(reports)
		.where(eq(reports.tenantId, tenantId))
		.groupBy(reports.reason);

	const byReason: Record<string, number> = {
		[ReportReason.SPAM]: 0,
		[ReportReason.HARASSMENT]: 0,
		[ReportReason.INAPPROPRIATE]: 0,
		[ReportReason.OTHER]: 0
	};
	reasonStats.forEach((stat) => {
		if (stat.reason) {
			byReason[stat.reason] = Number(stat.count);
		}
	});

	return {
		total,
		byStatus,
		byContentType,
		byReason,
		pendingCount: byStatus[ReportStatus.PENDING],
		resolvedCount: byStatus[ReportStatus.RESOLVED] + byStatus[ReportStatus.DISMISSED]
	};
}

/**
 * Check if user has already reported specific content
 * @param reportedBy - Client profile ID
 * @param contentType - Content type
 * @param contentId - Content ID
 * @returns True if already reported
 */
export async function hasUserReportedContent(
	reportedBy: string,
	contentType: ReportContentTypeValues,
	contentId: string
): Promise<boolean> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const [existing] = await db
		.select({ id: reports.id })
		.from(reports)
		.where(
			and(
				eq(reports.reportedBy, reportedBy),
				eq(reports.contentType, contentType),
				eq(reports.contentId, contentId),
				eq(reports.tenantId, tenantId)
			)
		)
		.limit(1);

	return !!existing;
}
