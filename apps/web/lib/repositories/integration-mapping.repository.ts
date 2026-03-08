/**
 * Integration Mapping Repository
 * Business logic layer for Ever ID ↔ CRM ID mappings with version tracking
 */

import crypto from 'crypto';
import type { IntegrationMapping } from '@/lib/db/schema';
import type { IntegrationObjectType } from '@/lib/db/queries/integration-mapping.queries';
import * as queries from '@/lib/db/queries/integration-mapping.queries';

/**
 * Input data for creating/updating a mapping
 */
export interface UpsertMappingInput {
  everId: string;
  crmId: string;
  objectType: IntegrationObjectType;
  dataForHash?: Record<string, unknown>; // Entity data for version hash generation
}

/**
 * Batch mapping input
 * Type alias that allows future extensions without breaking changes
 */
export type BatchMappingInput = UpsertMappingInput;

/**
 * Integration Mapping Repository
 * Handles CRUD operations with version hash generation
 */
export class IntegrationMappingRepository {
  /**
   * Finds a mapping by Ever ID and object type
   *
   * @param everId - Ever system ID
   * @param objectType - Type of object
   * @returns Mapping if found, null otherwise
   *
   * @example
   * ```typescript
   * const mapping = await repo.findByEverId('company_123', 'company');
   * if (mapping) {
   *   console.log('CRM ID:', mapping.crmId);
   * }
   * ```
   */
  async findByEverId(
    everId: string,
    objectType: IntegrationObjectType
  ): Promise<IntegrationMapping | null> {
    return queries.findMappingByEverId(everId, objectType);
  }

  /**
   * Finds a mapping by CRM ID (reverse lookup)
   *
   * @param crmId - CRM system ID (UUID)
   * @param objectType - Type of object
   * @returns Mapping if found, null otherwise
   */
  async findByCrmId(
    crmId: string,
    objectType: IntegrationObjectType
  ): Promise<IntegrationMapping | null> {
    return queries.findMappingByCrmId(crmId, objectType);
  }

  /**
   * Upserts a mapping with automatic version hash generation
   *
   * @param input - Mapping data to upsert
   * @returns The created/updated mapping
   *
   * @example
   * ```typescript
   * const mapping = await repo.upsertMapping({
   *   everId: 'company_123',
   *   crmId: 'uuid-abc-123',
   *   objectType: 'company',
   *   dataForHash: { name: 'Acme Corp', website: 'https://acme.com' },
   * });
   * ```
   */
  async upsertMapping(input: UpsertMappingInput): Promise<IntegrationMapping> {
    this.validateInput(input);

    const versionHash = input.dataForHash
      ? this.generateVersionHash(input.dataForHash)
      : null;

    return queries.upsertMapping({
      everId: input.everId,
      crmId: input.crmId,
      objectType: input.objectType,
      versionHash,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Upserts multiple mappings in a single transaction
   * Efficient for bulk sync operations
   *
   * @param inputs - Array of mapping data to upsert
   * @returns Array of created/updated mappings
   *
   * @example
   * ```typescript
   * const mappings = await repo.upsertManyMappings([
   *   { everId: 'company_1', crmId: 'uuid-1', objectType: 'company' },
   *   { everId: 'company_2', crmId: 'uuid-2', objectType: 'company' },
   * ]);
   * ```
   */
  async upsertManyMappings(
    inputs: BatchMappingInput[]
  ): Promise<IntegrationMapping[]> {
    if (inputs.length === 0) {
      return [];
    }

    // Validate all inputs
    inputs.forEach(input => this.validateInput(input));

    const now = new Date();

    const mappingsToUpsert = inputs.map(input => ({
      everId: input.everId,
      crmId: input.crmId,
      objectType: input.objectType,
      versionHash: input.dataForHash
        ? this.generateVersionHash(input.dataForHash)
        : null,
      lastSyncedAt: now,
      updatedAt: now,
    }));

    return queries.upsertManyMappings(mappingsToUpsert);
  }

  /**
   * Deletes a mapping by Ever ID and object type
   *
   * @param everId - Ever system ID
   * @param objectType - Type of object
   * @returns True if deleted, false if not found
   */
  async deleteMapping(
    everId: string,
    objectType: IntegrationObjectType
  ): Promise<boolean> {
    return queries.deleteMappingByEverId(everId, objectType);
  }

  /**
   * Finds all mappings for a specific object type
   *
   * @param objectType - Type of object
   * @param limit - Maximum number of results
   * @returns Array of mappings
   */
  async findByObjectType(
    objectType: IntegrationObjectType,
    limit?: number
  ): Promise<IntegrationMapping[]> {
    return queries.findMappingsByObjectType(objectType, limit);
  }

  /**
   * Finds stale mappings that haven't been synced recently
   *
   * @param olderThanDays - Number of days threshold
   * @param objectType - Optional: filter by object type
   * @param limit - Maximum number of results
   * @returns Array of stale mappings
   *
   * @example
   * ```typescript
   * // Find companies not synced in 7+ days
   * const stale = await repo.findStaleMappings(7, 'company');
   * ```
   */
  async findStaleMappings(
    olderThanDays: number,
    objectType?: IntegrationObjectType,
    limit?: number
  ): Promise<IntegrationMapping[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - olderThanDays);

    return queries.findStaleMappings(threshold, objectType, limit);
  }

  /**
   * Gets total count of mappings
   *
   * @param objectType - Optional: filter by object type
   * @returns Total count
   */
  async getCount(objectType?: IntegrationObjectType): Promise<number> {
    return queries.getMappingCount(objectType);
  }

  /**
   * Checks if data has changed by comparing version hashes
   *
   * @param everId - Ever system ID
   * @param objectType - Type of object
   * @param currentData - Current entity data
   * @returns True if data has changed (hash mismatch or no mapping), false otherwise
   *
   * @example
   * ```typescript
   * const hasChanged = await repo.hasDataChanged(
   *   'company_123',
   *   'company',
   *   { name: 'Acme Corp', website: 'https://acme.com' }
   * );
   * if (hasChanged) {
   *   // Re-sync the entity
   * }
   * ```
   */
  async hasDataChanged(
    everId: string,
    objectType: IntegrationObjectType,
    currentData: Record<string, unknown>
  ): Promise<boolean> {
    const mapping = await this.findByEverId(everId, objectType);

    if (!mapping || !mapping.versionHash) {
      return true; // No mapping or no hash = assume changed
    }

    const currentHash = this.generateVersionHash(currentData);
    return currentHash !== mapping.versionHash;
  }

  /**
   * Generates a version hash from entity data
   * Uses SHA-256 to create a stable hash of the entity's data
   *
   * @param data - Entity data (e.g., { name, email, website })
   * @returns SHA-256 hash of the data
   *
   * @private
   */
  private generateVersionHash(data: Record<string, unknown>): string {
    // Sort keys for consistent hashing
    const sortedData = Object.keys(data)
      .sort()
      .reduce((acc, key) => {
        acc[key] = data[key];
        return acc;
      }, {} as Record<string, unknown>);

    const dataString = JSON.stringify(sortedData);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Validates mapping input data
   *
   * @param input - Input data to validate
   * @throws Error if validation fails
   *
   * @private
   */
  private validateInput(input: UpsertMappingInput): void {
    if (!input.everId || typeof input.everId !== 'string') {
      throw new Error('Invalid everId: must be a non-empty string');
    }

    if (!input.crmId || typeof input.crmId !== 'string') {
      throw new Error('Invalid crmId: must be a non-empty string');
    }

    if (!input.objectType || !['company', 'person'].includes(input.objectType)) {
      throw new Error('Invalid objectType: must be "company" or "person"');
    }
  }
}

// Export singleton instance
export const integrationMappingRepository = new IntegrationMappingRepository();
