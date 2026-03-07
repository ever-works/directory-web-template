import { and, eq, desc } from 'drizzle-orm';
import { db } from '../drizzle';
import { activityLogs, ActivityType, type ActivityLog } from '../schema';
import { getTenantId } from '@/lib/auth/tenant';

/**
 * Log an activity to the activity logs table
 * @param type - The type of activity
 * @param id - User ID or Client Profile ID
 * @param entityType - Whether this is a 'user' or 'client' activity
 * @param ipAddress - Optional IP address
 */
export async function logActivity(
	type: ActivityType,
	id?: string,
	entityType: 'user' | 'client' = 'user',
	ipAddress?: string
): Promise<void> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const newActivity = {
		userId: entityType === 'user' ? id || null : null,
		clientId: entityType === 'client' ? id || null : null,
		action: type,
		ipAddress: ipAddress || '',
		tenantId: tenantId
	};

	await db.insert(activityLogs).values(newActivity);
}

/**
 * Get the last login activity for a user or client
 * @param id - User ID or Client Profile ID
 * @param entityType - Whether this is a 'user' or 'client' activity (defaults to 'client' for backward compatibility)
 * @returns Last login activity or null if not found
 */
export async function getLastLoginActivity(
	id: string,
	entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');
	const idCondition = entityType === 'user' ? eq(activityLogs.userId, id) : eq(activityLogs.clientId, id);

	const [lastLogin] = await db
		.select()
		.from(activityLogs)
		.where(and(idCondition, eq(activityLogs.action, ActivityType.SIGN_IN), eq(activityLogs.tenantId, tenantId)))
		.orderBy(desc(activityLogs.timestamp))
		.limit(1);

	return lastLogin || null;
}
