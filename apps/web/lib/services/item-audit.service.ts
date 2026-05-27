import {
	createItemAuditLog,
	getItemHistory,
	type CreateItemAuditLogParams,
	type GetItemHistoryParams,
	type PaginatedItemHistory
} from '@/lib/db/queries/item-audit.queries';
import { ItemAuditAction, type ItemAuditActionValues, type ItemAuditChanges } from '@/lib/db/schema';
import type { ItemData } from '@/lib/types/item';

// ===================== Types =====================

export interface AuditUser {
	id: string;
	name?: string | null;
}

export interface LogActionParams {
	itemId: string;
	itemName: string;
	action: ItemAuditActionValues;
	previousStatus?: string | null;
	newStatus?: string | null;
	changes?: ItemAuditChanges | null;
	performedBy?: AuditUser | null;
	notes?: string | null;
	metadata?: Record<string, unknown> | null;
}

// ===================== Fields to Track =====================

/** Fields that are tracked for change detection */
const TRACKED_FIELDS = [
	'name',
	'description',
	'source_url',
	'category',
	'tags',
	'collections',
	'featured',
	'icon_url',
	'status'
] as const;

type _TrackedField = (typeof TRACKED_FIELDS)[number];

// ===================== Change Detection =====================

/**
 * Detect changes between two item states
 * @param previous - Previous item state
 * @param current - Current item state
 * @returns Object with field-level changes
 *
 * **Behaviour worth knowing:**
 *
 *   - **Only fields in {@link TRACKED_FIELDS} are diffed.** A new
 *     field added to `ItemData` is silently UNTRACKED until added
 *     here. Audit gaps from forgetting this are invisible — the
 *     update logs as "no changes" even when something changed.
 *
 *   - **Array equality is order-insensitive but element-strict.**
 *     `isEqual` sorts both arrays then strict-compares elements,
 *     so `['a','b']` == `['b','a']`. For arrays of **objects**
 *     (e.g. nested tag descriptors) this breaks — `Array#sort`
 *     coerces objects to strings (`[object Object]`) so any two
 *     non-empty object arrays compare equal regardless of content.
 *     Keep tracked fields primitive-only, or extend `isEqual`.
 *
 *   - **Returns `null`** when no tracked field changed —
 *     {@link logUpdate} uses that to skip the audit row entirely.
 *     Don't change the return shape without updating callers.
 */
export function detectChanges(
	previous: Partial<ItemData>,
	current: Partial<ItemData>
): ItemAuditChanges | null {
	const changes: ItemAuditChanges = {};

	for (const field of TRACKED_FIELDS) {
		const oldValue = previous[field as keyof ItemData];
		const newValue = current[field as keyof ItemData];

		// Compare values (handle arrays and primitives)
		if (!isEqual(oldValue, newValue)) {
			changes[field] = { old: oldValue, new: newValue };
		}
	}

	// Return null if no changes detected
	return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Deep equality check for values (handles arrays)
 */
function isEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (a == null || b == null) return a === b;
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		const sortedA = [...a].sort();
		const sortedB = [...b].sort();
		return sortedA.every((val, idx) => val === sortedB[idx]);
	}
	return false;
}

// ===================== Logging Methods =====================

/**
 * Base method to log an action
 * @param params - Action parameters
 *
 * **Failure is silent by design.** Audit logging must not block or
 * fail the underlying business operation, so DB errors are caught
 * and logged to `console.error` only. Operators monitoring audit
 * coverage need to watch `[ItemAuditService] Failed to log action`
 * lines — there is no other signal that a row went missing.
 */
async function logAction(params: LogActionParams): Promise<void> {
	try {
		const createParams: CreateItemAuditLogParams = {
			itemId: params.itemId,
			itemName: params.itemName,
			action: params.action,
			previousStatus: params.previousStatus,
			newStatus: params.newStatus,
			changes: params.changes,
			performedBy: params.performedBy?.id ?? null,
			performedByName: params.performedBy?.name ?? null,
			notes: params.notes,
			metadata: params.metadata
		};

		await createItemAuditLog(createParams);
	} catch (error) {
		// Log error but don't throw - audit logging should not block operations
		console.error('[ItemAuditService] Failed to log action:', error);
	}
}

/**
 * Log item creation
 * @param item - Created item
 * @param performedBy - User who performed the action
 */
export async function logCreation(item: ItemData, performedBy?: AuditUser | null): Promise<void> {
	await logAction({
		itemId: item.id,
		itemName: item.name,
		action: ItemAuditAction.CREATED,
		newStatus: item.status,
		performedBy,
		metadata: {
			slug: item.slug,
			category: item.category,
			tags: item.tags
		}
	});
}

/**
 * Log item update
 * @param previousItem - Item state before update
 * @param updatedItem - Item state after update
 * @param performedBy - User who performed the action
 */
export async function logUpdate(
	previousItem: ItemData,
	updatedItem: ItemData,
	performedBy?: AuditUser | null
): Promise<void> {
	const changes = detectChanges(previousItem, updatedItem);

	// Only log if there are actual changes
	if (!changes) {
		return;
	}

	// Check if status changed (for separate status_changed log)
	const statusChanged = previousItem.status !== updatedItem.status;

	// Log the update with all changes
	await logAction({
		itemId: updatedItem.id,
		itemName: updatedItem.name,
		action: statusChanged ? ItemAuditAction.STATUS_CHANGED : ItemAuditAction.UPDATED,
		previousStatus: statusChanged ? previousItem.status : undefined,
		newStatus: statusChanged ? updatedItem.status : undefined,
		changes,
		performedBy
	});
}

/**
 * Log item review (approve/reject)
 * @param item - Reviewed item
 * @param previousStatus - Status before review
 * @param notes - Review notes
 * @param performedBy - User who performed the review
 */
export async function logReview(
	item: ItemData,
	previousStatus: string,
	notes: string | undefined | null,
	performedBy?: AuditUser | null
): Promise<void> {
	await logAction({
		itemId: item.id,
		itemName: item.name,
		action: ItemAuditAction.REVIEWED,
		previousStatus,
		newStatus: item.status,
		notes,
		performedBy
	});
}

/**
 * Log item deletion
 * @param item - Deleted item
 * @param performedBy - User who performed the action
 * @param isSoftDelete - Whether this is a soft delete
 */
export async function logDeletion(
	item: ItemData,
	performedBy?: AuditUser | null,
	isSoftDelete = true
): Promise<void> {
	await logAction({
		itemId: item.id,
		itemName: item.name,
		action: ItemAuditAction.DELETED,
		previousStatus: item.status,
		performedBy,
		metadata: {
			slug: item.slug,
			isSoftDelete
		}
	});
}

/**
 * Log item restoration (from soft delete)
 * @param item - Restored item
 * @param performedBy - User who performed the action
 */
export async function logRestoration(item: ItemData, performedBy?: AuditUser | null): Promise<void> {
	await logAction({
		itemId: item.id,
		itemName: item.name,
		action: ItemAuditAction.RESTORED,
		newStatus: item.status,
		performedBy,
		metadata: {
			slug: item.slug
		}
	});
}

// ===================== Query Methods =====================

/**
 * Get paginated history for an item
 * @param params - Query parameters
 * @returns Paginated audit logs
 */
export async function getHistory(params: GetItemHistoryParams): Promise<PaginatedItemHistory> {
	return getItemHistory(params);
}

// ===================== Export Service Object =====================

export const itemAuditService = {
	logCreation,
	logUpdate,
	logReview,
	logDeletion,
	logRestoration,
	getHistory,
	detectChanges
};
