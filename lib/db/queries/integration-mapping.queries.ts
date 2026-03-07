/**
 * Integration Mapping Queries
 * Database operations for Ever ID ↔ CRM ID mappings
 */

import { getTenantId } from '@/lib/auth/tenant';
import { db } from '../drizzle';
import { integrationMappings, type IntegrationMapping, type NewIntegrationMapping } from '../schema';
import { eq, and, sql, lt } from 'drizzle-orm';

/**
 * Object type for integration mappings
 */
export type IntegrationObjectType = 'company' | 'person';

/**
 * Finds a mapping by Ever ID and object type
 *
 * @param everId - Ever system ID (e.g., company_123, user_456)
 * @param objectType - Type of object ('company' or 'person')
 * @returns Mapping if found, null otherwise
 */
export async function findMappingByEverId(
	everId: string,
	objectType: IntegrationObjectType
): Promise<IntegrationMapping | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const results = await db
		.select()
		.from(integrationMappings)
		.where(
			and(
				eq(integrationMappings.everId, everId),
				eq(integrationMappings.objectType, objectType),
				eq(integrationMappings.tenantId, tenantId)
			)
		)
		.limit(1);

	return results[0] ?? null;
}

/**
 * Finds a mapping by CRM ID and object type (reverse lookup)
 *
 * @param crmId - CRM system ID (UUID from Twenty CRM)
 * @param objectType - Type of object ('company' or 'person')
 * @returns Mapping if found, null otherwise
 */
export async function findMappingByCrmId(
	crmId: string,
	objectType: IntegrationObjectType
): Promise<IntegrationMapping | null> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const results = await db
		.select()
		.from(integrationMappings)
		.where(
			and(
				eq(integrationMappings.crmId, crmId),
				eq(integrationMappings.objectType, objectType),
				eq(integrationMappings.tenantId, tenantId)
			)
		)
		.limit(1);

	return results[0] ?? null;
}

/**
 * Upserts a mapping (insert if new, update if exists)
 *
 * @param data - Mapping data to upsert
 * @returns The created/updated mapping
 */
export async function upsertMapping(
	data: Omit<NewIntegrationMapping, 'id' | 'createdAt'>
): Promise<IntegrationMapping> {
	const now = new Date();
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const result = await db
		.insert(integrationMappings)
		.values({
			...data,
			tenantId,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: [integrationMappings.everId, integrationMappings.objectType],
			set: {
				crmId: data.crmId,
				versionHash: data.versionHash,
				lastSyncedAt: data.lastSyncedAt ?? now,
				updatedAt: now
			}
		})
		.returning();

	return result[0];
}

/**
 * Upserts multiple mappings in a single transaction (batch operation)
 *
 * @param mappings - Array of mapping data to upsert
 * @returns Array of created/updated mappings
 */
export async function upsertManyMappings(
	mappings: Array<Omit<NewIntegrationMapping, 'id' | 'createdAt'>>
): Promise<IntegrationMapping[]> {
	if (mappings.length === 0) {
		return [];
	}

	const now = new Date();
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const result = await db
		.insert(integrationMappings)
		.values(
			mappings.map((mapping) => ({
				...mapping,
				tenantId,
				updatedAt: now
			}))
		)
		.onConflictDoUpdate({
			target: [integrationMappings.everId, integrationMappings.objectType],
			set: {
				crmId: sql`EXCLUDED.crm_id`,
				versionHash: sql`EXCLUDED.version_hash`,
				lastSyncedAt: sql`EXCLUDED.last_synced_at`,
				updatedAt: now
			}
		})
		.returning();

	return result;
}

/**
 * Deletes a mapping by Ever ID and object type
 *
 * @param everId - Ever system ID
 * @param objectType - Type of object
 * @returns True if deleted, false if not found
 */
export async function deleteMappingByEverId(everId: string, objectType: IntegrationObjectType): Promise<boolean> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const result = await db
		.delete(integrationMappings)
		.where(
			and(
				eq(integrationMappings.everId, everId),
				eq(integrationMappings.objectType, objectType),
				eq(integrationMappings.tenantId, tenantId)
			)
		)
		.returning();

	return result.length > 0;
}

/**
 * Finds all mappings for a specific object type
 *
 * @param objectType - Type of object ('company' or 'person')
 * @param limit - Maximum number of results (default: 100)
 * @returns Array of mappings
 */
export async function findMappingsByObjectType(
	objectType: IntegrationObjectType,
	limit: number = 100
): Promise<IntegrationMapping[]> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	return db
		.select()
		.from(integrationMappings)
		.where(and(eq(integrationMappings.objectType, objectType), eq(integrationMappings.tenantId, tenantId)))
		.limit(limit);
}

/**
 * Finds stale mappings that haven't been synced recently
 * Useful for identifying mappings that need re-sync or cleanup
 *
 * @param olderThan - Date threshold (mappings older than this)
 * @param objectType - Optional: filter by object type
 * @param limit - Maximum number of results (default: 100)
 * @returns Array of stale mappings
 */
export async function findStaleMappings(
	olderThan: Date,
	objectType?: IntegrationObjectType,
	limit: number = 100
): Promise<IntegrationMapping[]> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const conditions = [lt(integrationMappings.lastSyncedAt, olderThan)];

	if (objectType) {
		conditions.push(eq(integrationMappings.objectType, objectType));
	}
	if (tenantId) {
		conditions.push(eq(integrationMappings.tenantId, tenantId));
	}

	return db
		.select()
		.from(integrationMappings)
		.where(and(...conditions))
		.limit(limit);
}

/**
 * Gets total count of mappings by object type
 *
 * @param objectType - Optional: filter by object type
 * @returns Total count
 */
export async function getMappingCount(objectType?: IntegrationObjectType): Promise<number> {
	const tenantId = await getTenantId();
	if (!tenantId) throw new Error('Tenant ID not found');

	const query = objectType
		? db
				.select({ count: sql<number>`count(*)` })
				.from(integrationMappings)
				.where(and(eq(integrationMappings.objectType, objectType), eq(integrationMappings.tenantId, tenantId)))
		: db
				.select({ count: sql<number>`count(*)` })
				.from(integrationMappings)
				.where(eq(integrationMappings.tenantId, tenantId));

	const result = await query;
	return Number(result[0]?.count ?? 0);
}
