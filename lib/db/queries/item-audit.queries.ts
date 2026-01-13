import { eq, desc, and, inArray, sql, count } from 'drizzle-orm';
import { db } from '../drizzle';
import {
	itemAuditLogs,
	users,
	type NewItemAuditLog,
	type ItemAuditLog,
	type ItemAuditActionValues,
	type ItemAuditChanges
} from '../schema';

// ===================== Types =====================

export type ItemAuditLogWithPerformer = ItemAuditLog & {
	performer: {
		id: string;
		email: string | null;
	} | null;
};

export interface CreateItemAuditLogParams {
	itemId: string;
	itemName: string;
	action: ItemAuditActionValues;
	previousStatus?: string | null;
	newStatus?: string | null;
	changes?: ItemAuditChanges | null;
	performedBy?: string | null;
	performedByName?: string | null;
	notes?: string | null;
	metadata?: Record<string, unknown> | null;
}

export interface GetItemHistoryParams {
	itemId: string;
	page?: number;
	limit?: number;
	actionFilter?: ItemAuditActionValues[];
}

export interface PaginatedItemHistory {
	logs: ItemAuditLogWithPerformer[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

// ===================== Create =====================

/**
 * Create a new item audit log entry
 * @param data - Audit log data
 * @returns Created audit log entry
 */
export async function createItemAuditLog(data: CreateItemAuditLogParams): Promise<ItemAuditLog> {
	const insertData: NewItemAuditLog = {
		itemId: data.itemId,
		itemName: data.itemName,
		action: data.action,
		previousStatus: data.previousStatus ?? null,
		newStatus: data.newStatus ?? null,
		changes: data.changes ?? null,
		performedBy: data.performedBy ?? null,
		performedByName: data.performedByName ?? null,
		notes: data.notes ?? null,
		metadata: data.metadata ?? null
	};

	const [record] = await db.insert(itemAuditLogs).values(insertData).returning();

	return record;
}

// ===================== Read =====================

/**
 * Get paginated audit history for an item
 * @param params - Query parameters
 * @returns Paginated audit logs with performer info
 */
export async function getItemHistory(params: GetItemHistoryParams): Promise<PaginatedItemHistory> {
	const { itemId, page = 1, limit = 20, actionFilter } = params;

	// Build where conditions
	const conditions = [eq(itemAuditLogs.itemId, itemId)];
	if (actionFilter && actionFilter.length > 0) {
		conditions.push(inArray(itemAuditLogs.action, actionFilter));
	}
	const whereClause = and(...conditions);

	// Get total count
	const [countResult] = await db
		.select({ count: count() })
		.from(itemAuditLogs)
		.where(whereClause);

	const total = countResult?.count ?? 0;
	const totalPages = Math.ceil(total / limit);

	// Get paginated logs
	const offset = (page - 1) * limit;
	const logs = await db
		.select({
			id: itemAuditLogs.id,
			itemId: itemAuditLogs.itemId,
			itemName: itemAuditLogs.itemName,
			action: itemAuditLogs.action,
			previousStatus: itemAuditLogs.previousStatus,
			newStatus: itemAuditLogs.newStatus,
			changes: itemAuditLogs.changes,
			performedBy: itemAuditLogs.performedBy,
			performedByName: itemAuditLogs.performedByName,
			notes: itemAuditLogs.notes,
			metadata: itemAuditLogs.metadata,
			createdAt: itemAuditLogs.createdAt,
			performer: {
				id: users.id,
				email: users.email
			}
		})
		.from(itemAuditLogs)
		.leftJoin(users, eq(itemAuditLogs.performedBy, users.id))
		.where(whereClause)
		.orderBy(desc(itemAuditLogs.createdAt))
		.limit(limit)
		.offset(offset);

	return {
		logs,
		total,
		page,
		limit,
		totalPages
	};
}

/**
 * Get the most recent audit log for an item
 * @param itemId - Item ID (slug)
 * @returns Most recent audit log or null
 */
export async function getLatestItemAuditLog(itemId: string): Promise<ItemAuditLog | null> {
	const [log] = await db
		.select()
		.from(itemAuditLogs)
		.where(eq(itemAuditLogs.itemId, itemId))
		.orderBy(desc(itemAuditLogs.createdAt))
		.limit(1);

	return log ?? null;
}

/**
 * Get audit logs by action type
 * @param action - Action type to filter by
 * @param limit - Maximum number of records
 * @returns Audit logs matching the action
 */
export async function getAuditLogsByAction(
	action: ItemAuditActionValues,
	limit = 50
): Promise<ItemAuditLog[]> {
	return db
		.select()
		.from(itemAuditLogs)
		.where(eq(itemAuditLogs.action, action))
		.orderBy(desc(itemAuditLogs.createdAt))
		.limit(limit);
}

/**
 * Get audit logs by performer
 * @param performedBy - User ID who performed the action
 * @param limit - Maximum number of records
 * @returns Audit logs by the performer
 */
export async function getAuditLogsByPerformer(
	performedBy: string,
	limit = 50
): Promise<ItemAuditLog[]> {
	return db
		.select()
		.from(itemAuditLogs)
		.where(eq(itemAuditLogs.performedBy, performedBy))
		.orderBy(desc(itemAuditLogs.createdAt))
		.limit(limit);
}

// ===================== Statistics =====================

/**
 * Get audit log statistics for an item
 * @param itemId - Item ID (slug)
 * @returns Count of logs by action type
 */
export async function getItemAuditStats(itemId: string): Promise<Record<string, number>> {
	const results = await db
		.select({
			action: itemAuditLogs.action,
			count: count()
		})
		.from(itemAuditLogs)
		.where(eq(itemAuditLogs.itemId, itemId))
		.groupBy(itemAuditLogs.action);

	const stats: Record<string, number> = {};
	for (const row of results) {
		stats[row.action] = row.count;
	}
	return stats;
}
