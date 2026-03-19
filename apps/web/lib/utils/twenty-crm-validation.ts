/**
 * Twenty CRM Configuration Validation Utilities
 * Provides Zod schemas and helper functions for validating Twenty CRM config
 */

import { z } from 'zod';

/**
 * Sync mode enum for validation
 */
export const SYNC_MODE_VALUES = ['disabled', 'platform', 'direct_crm'] as const;

/**
 * Zod schema for sync mode
 */
export const syncModeSchema = z.enum(SYNC_MODE_VALUES);

/**
 * Zod schema for base URL validation
 */
export const baseUrlSchema = z
  .string()
  .min(1, 'Base URL is required')
  .url('Base URL must be a valid URL')
  .refine(
    (url) => {
      try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { message: 'Base URL must use http or https protocol' }
  );

/**
 * Zod schema for API key validation
 */
export const apiKeySchema = z
  .string()
  .min(1, 'API key is required')
  .min(10, 'API key must be at least 10 characters');

/**
 * Zod schema for Twenty CRM config update request
 */
export const updateTwentyCrmConfigSchema = z.object({
  baseUrl: baseUrlSchema,
  apiKey: apiKeySchema,
  enabled: z.boolean(),
  syncMode: syncModeSchema,
});

/**
 * Type for validated config update request
 */
export type ValidatedTwentyCrmConfigUpdate = z.infer<typeof updateTwentyCrmConfigSchema>;

/**
 * Masks an API key for safe display in responses and logs
 * Shows only the last 4 characters
 *
 * @param apiKey - The API key to mask
 * @returns Masked API key (e.g., "****key123")
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 4) {
    return '****';
  }

  const lastFourChars = apiKey.slice(-4);
  return `****${lastFourChars}`;
}

/**
 * Validates a Twenty CRM config update request
 *
 * @param data - The data to validate
 * @returns Validation result with parsed data or errors
 */
export function validateTwentyCrmConfig(data: unknown) {
  return updateTwentyCrmConfigSchema.safeParse(data);
}
