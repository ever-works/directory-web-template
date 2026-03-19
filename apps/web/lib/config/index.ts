/**
 * Configuration module barrel export
 *
 * Provides centralized, typed access to all application configuration.
 *
 * @example
 * ```ts
 * // Import the service for full access
 * import { configService } from '@/lib/config';
 *
 * // Or import specific sections (tree-shakeable)
 * import { coreConfig, paymentConfig } from '@/lib/config';
 *
 * // Access typed configuration
 * const appUrl = coreConfig.APP_URL;
 * const stripeEnabled = paymentConfig.stripe.enabled;
 * ```
 */

// Main ConfigService and section exports
export {
	configService,
	coreConfig,
	authConfig,
	emailConfig,
	paymentConfig,
	analyticsConfig,
	integrationsConfig,
} from './config-service';

// Types
export type {
	AppConfigSchema,
	ConfigValidationResult,
	ConfigValidationError,
	ConfigValidationWarning,
	ConfigSection,
	ConfigSectionType,
	Environment,
	CoreConfig,
	AuthConfig,
	OAuthProvider,
	EmailConfig,
	PaymentConfig,
	AnalyticsConfig,
	IntegrationsConfig,
} from './types';

// Utility functions
export { isDevelopment, isProduction, isTest, getEnvironment } from './types';

// Schema exports (for advanced usage)
export * from './schemas';

// Client-safe exports - NOTE: Client components should import directly from '@/lib/config/client'
// because this barrel file is server-only (via config-service)
export { siteConfig, pricingConfig, clientEnv } from './client';
