/**
 * Twenty CRM Sync Service Factory
 * Creates and configures TwentyCrmSyncService instances with proper configuration
 */

import { TwentyCrmSyncService } from './twenty-crm-sync.service';
import { TwentyCrmRestClient } from './twenty-crm-rest-client.service';
import { integrationMappingRepository } from '@/lib/repositories/integration-mapping.repository';
import type { TwentyCrmClientConfig } from '@/lib/types/twenty-crm-config.types';
import { integrationsConfig } from '@/lib/config/config-service';

/**
 * Creates a configured TwentyCrmSyncService instance
 *
 * @param config - Twenty CRM client configuration (baseUrl, apiKey, timeout, etc.)
 * @param cacheTtlMs - Cache TTL in milliseconds (default: 5 minutes)
 * @returns Configured sync service instance
 *
 * @example
 * ```typescript
 * const syncService = createTwentyCrmSyncService({
 *   baseUrl: 'https://api.twenty.com',
 *   apiKey: 'your-api-key',
 *   timeout: 30000,
 * });
 *
 * const result = await syncService.upsertCompany({
 *   external_id: 'company_123',
 *   name: 'Acme Corp',
 *   website: 'https://acme.com',
 * });
 * ```
 */
export function createTwentyCrmSyncService(
  config: TwentyCrmClientConfig,
  cacheTtlMs?: number
): TwentyCrmSyncService {
  const restClient = new TwentyCrmRestClient(config);
  return new TwentyCrmSyncService(restClient, integrationMappingRepository, cacheTtlMs);
}

/**
 * Creates a TwentyCrmSyncService from environment variables
 * Reads TWENTY_CRM_BASE_URL and TWENTY_CRM_API_KEY from env
 *
 * @param cacheTtlMs - Cache TTL in milliseconds (default: 5 minutes)
 * @returns Configured sync service instance
 * @throws Error if environment variables are not set
 *
 * @example
 * ```typescript
 * // .env.local:
 * // TWENTY_CRM_BASE_URL=https://api.twenty.com
 * // TWENTY_CRM_API_KEY=your-api-key
 *
 * const syncService = createTwentyCrmSyncServiceFromEnv();
 * ```
 */
export function createTwentyCrmSyncServiceFromEnv(
  cacheTtlMs?: number
): TwentyCrmSyncService {
  const twentyCrm = integrationsConfig.twentyCrm;
  const baseUrl = twentyCrm.baseUrl;
  const apiKey = twentyCrm.apiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      'Missing Twenty CRM configuration. Set TWENTY_CRM_BASE_URL and TWENTY_CRM_API_KEY environment variables.'
    );
  }

  return createTwentyCrmSyncService(
    {
      baseUrl,
      apiKey,
    },
    cacheTtlMs
  );
}
