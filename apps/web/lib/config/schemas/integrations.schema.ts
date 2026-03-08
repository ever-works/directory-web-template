/**
 * Integrations configuration schema
 * Defines third-party integration settings (Trigger.dev, Twenty CRM, Cron)
 */

import { z } from 'zod';

/**
 * Trigger.dev environment type
 */
export const triggerDevEnvironmentSchema = z
	.enum(['development', 'staging', 'production'])
	.default('development')
	.catch('development');

/**
 * Trigger.dev configuration schema
 */
export const triggerDevConfigSchema = z
	.object({
		enabled: z.boolean().default(false),
		apiKey: z.string().optional(),
		apiUrl: z.string().url().optional().catch(undefined),
		environment: triggerDevEnvironmentSchema,
	})
	.transform((data) => ({
		...data,
		// Respect explicit enabled setting, otherwise auto-detect from apiKey
		enabled: data.enabled ?? Boolean(data.apiKey),
	}));

/**
 * Twenty CRM sync mode type
 * Matches TwentyCrmSyncMode from lib/types/twenty-crm-config.types.ts
 */
export const twentyCrmSyncModeSchema = z
	.enum(['disabled', 'platform', 'direct_crm'])
	.default('disabled')
	.catch('disabled');

/**
 * Twenty CRM configuration schema
 */
export const twentyCrmConfigSchema = z
	.object({
		baseUrl: z.string().url().optional().catch(undefined),
		apiKey: z.string().optional(),
		enabled: z.boolean().default(false),
		syncMode: twentyCrmSyncModeSchema,
	})
	.transform((data) => ({
		...data,
		// Respect explicit enabled setting, otherwise auto-detect from credentials
		enabled: data.enabled ?? Boolean(data.baseUrl && data.apiKey),
	}));

/**
 * Cron job configuration schema
 */
export const cronConfigSchema = z.object({
	secret: z.string().optional(),
});

/**
 * Integrations configuration schema
 */
export const integrationsConfigSchema = z.object({
	// Background jobs
	triggerDev: triggerDevConfigSchema.optional().default({ enabled: false, environment: 'development' }),

	// CRM
	twentyCrm: twentyCrmConfigSchema.optional().default({ enabled: false, syncMode: 'disabled' }),

	// Cron jobs
	cron: cronConfigSchema.optional().default({}),
});

/**
 * Type inference for integrations configuration
 */
export type IntegrationsConfig = z.infer<typeof integrationsConfigSchema>;

/**
 * Collects integrations configuration from environment variables
 */
export function collectIntegrationsConfig(): z.input<typeof integrationsConfigSchema> {
	return {
		triggerDev: {
			enabled: process.env.TRIGGER_DEV_ENABLED === 'true',
			apiKey: process.env.TRIGGER_DEV_API_KEY,
			apiUrl: process.env.TRIGGER_DEV_API_URL,
			environment: process.env.TRIGGER_DEV_ENVIRONMENT as
				| 'development'
				| 'staging'
				| 'production'
				| undefined,
		},
		twentyCrm: {
			baseUrl: process.env.TWENTY_CRM_BASE_URL,
			apiKey: process.env.TWENTY_CRM_API_KEY,
			enabled: process.env.TWENTY_CRM_ENABLED === 'true',
			syncMode: process.env.TWENTY_CRM_SYNC_MODE as 'disabled' | 'platform' | 'direct_crm' | undefined,
		},
		cron: {
			secret: process.env.CRON_SECRET,
		},
	};
}
