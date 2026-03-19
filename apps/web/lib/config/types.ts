/**
 * Configuration types
 * Centralized type definitions for the configuration system
 */

import type { z } from 'zod';
import type {
	coreConfigSchema,
	authConfigSchema,
	emailConfigSchema,
	paymentConfigSchema,
	analyticsConfigSchema,
	integrationsConfigSchema,
} from './schemas';

/**
 * Combined application configuration schema type
 */
export interface AppConfigSchema {
	core: z.infer<typeof coreConfigSchema>;
	auth: z.infer<typeof authConfigSchema>;
	email: z.infer<typeof emailConfigSchema>;
	payment: z.infer<typeof paymentConfigSchema>;
	analytics: z.infer<typeof analyticsConfigSchema>;
	integrations: z.infer<typeof integrationsConfigSchema>;
}

/**
 * Re-export individual config types for convenience
 */
export type {
	CoreConfig,
	AuthConfig,
	OAuthProvider,
	EmailConfig,
	PaymentConfig,
	AnalyticsConfig,
	IntegrationsConfig,
} from './schemas';

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
	success: boolean;
	config: AppConfigSchema | null;
	errors: ConfigValidationError[];
	warnings: ConfigValidationWarning[];
}

/**
 * Configuration validation error
 */
export interface ConfigValidationError {
	path: string;
	message: string;
	code: string;
}

/**
 * Configuration validation warning
 */
export interface ConfigValidationWarning {
	path: string;
	message: string;
}

/**
 * Configuration section names
 */
export type ConfigSection = keyof AppConfigSchema;

/**
 * Helper type to get a specific config section type
 */
export type ConfigSectionType<T extends ConfigSection> = AppConfigSchema[T];

/**
 * Environment type
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
	return process.env.NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
	return process.env.NODE_ENV === 'production';
}

/**
 * Check if we're in test mode
 */
export function isTest(): boolean {
	return process.env.NODE_ENV === 'test';
}

/**
 * Get the current environment
 */
export function getEnvironment(): Environment {
	const env = process.env.NODE_ENV;
	if (env === 'production' || env === 'test') {
		return env;
	}
	return 'development';
}
