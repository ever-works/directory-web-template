/**
 * Twenty CRM Config Database Service
 * Handles database operations for Twenty CRM configuration
 */

import { db } from '@/lib/db/drizzle';
import { twentyCrmConfig, type TwentyCrmConfigRow, type NewTwentyCrmConfigRow } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { TwentyCrmConfig, UpdateTwentyCrmConfigRequest } from '@/lib/types/twenty-crm-config.types';
import { getTenantId } from '@/lib/auth/tenant';

export class TwentyCrmConfigDbService {
	/**
	 * Maps database row to TwentyCrmConfig type
	 */
	private mapDbToConfig(dbRow: TwentyCrmConfigRow): TwentyCrmConfig {
		return {
			id: dbRow.id,
			baseUrl: dbRow.baseUrl,
			apiKey: dbRow.apiKey,
			enabled: dbRow.enabled,
			syncMode: dbRow.syncMode as TwentyCrmConfig['syncMode'],
			createdBy: dbRow.createdBy,
			updatedBy: dbRow.updatedBy,
			createdAt: dbRow.createdAt,
			updatedAt: dbRow.updatedAt
		};
	}

	/**
	 * Gets the Twenty CRM configuration (single row)
	 * Returns null if no configuration exists
	 */
	async getConfig(): Promise<TwentyCrmConfig | null> {
		try {
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

			const result = await db
				.select()
				.from(twentyCrmConfig)
				.where(eq(twentyCrmConfig.tenantId, tenantId))
				.limit(1);

			if (result.length === 0) {
				return null;
			}

			return this.mapDbToConfig(result[0]);
		} catch (error) {
			console.error('Error getting Twenty CRM config:', error);
			throw new Error('Failed to retrieve Twenty CRM configuration');
		}
	}

	/**
	 * Creates a new Twenty CRM configuration
	 * Should only be called when no config exists
	 */
	async createConfig(data: UpdateTwentyCrmConfigRequest, userId: string): Promise<TwentyCrmConfig> {
		try {
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

			const newConfig: NewTwentyCrmConfigRow = {
				baseUrl: data.baseUrl,
				apiKey: data.apiKey,
				enabled: data.enabled,
				syncMode: data.syncMode,
				createdBy: userId,
				updatedBy: userId,
				tenantId
			};

			const result = await db.insert(twentyCrmConfig).values(newConfig).returning();

			if (result.length === 0) {
				throw new Error('Failed to create Twenty CRM configuration');
			}

			return this.mapDbToConfig(result[0]);
		} catch (error) {
			console.error('Error creating Twenty CRM config:', error);
			throw new Error('Failed to create Twenty CRM configuration');
		}
	}

	/**
	 * Updates an existing Twenty CRM configuration
	 */
	async updateConfig(id: string, data: UpdateTwentyCrmConfigRequest, userId: string): Promise<TwentyCrmConfig> {
		try {
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

			const updateData = {
				baseUrl: data.baseUrl,
				apiKey: data.apiKey,
				enabled: data.enabled,
				syncMode: data.syncMode,
				updatedBy: userId,
				updatedAt: new Date()
			};

			const result = await db
				.update(twentyCrmConfig)
				.set(updateData)
				.where(and(eq(twentyCrmConfig.id, id), eq(twentyCrmConfig.tenantId, tenantId)))
				.returning();

			if (result.length === 0) {
				throw new Error('Twenty CRM configuration not found');
			}

			return this.mapDbToConfig(result[0]);
		} catch (error) {
			console.error('Error updating Twenty CRM config:', error);
			throw new Error('Failed to update Twenty CRM configuration');
		}
	}

	/**
	 * Checks if a configuration exists
	 */
	async exists(): Promise<boolean> {
		try {
			const tenantId = await getTenantId();
			if (!tenantId) throw new Error('Tenant ID not found');

			const result = await db
				.select({ id: twentyCrmConfig.id })
				.from(twentyCrmConfig)
				.where(eq(twentyCrmConfig.tenantId, tenantId))
				.limit(1);
			return result.length > 0;
		} catch (error) {
			console.error('Error checking Twenty CRM config existence:', error);
			return false;
		}
	}
}
