/**
 * Configuration schemas barrel export
 * Re-exports all configuration schemas and types
 */

// Core configuration
export {
	coreConfigSchema,
	nodeEnvSchema,
	socialLinksSchema,
	attributionSchema,
	ogThemeSchema,
	contentSchema,
	collectCoreConfig,
	type CoreConfig,
} from './core.schema';

// Authentication configuration
export {
	authConfigSchema,
	oauthProviderSchema,
	supabaseConfigSchema,
	jwtConfigSchema,
	cookieConfigSchema,
	seedUserSchema,
	collectAuthConfig,
	type AuthConfig,
	type OAuthProvider,
} from './auth.schema';

// Email configuration
export {
	emailConfigSchema,
	smtpConfigSchema,
	resendConfigSchema,
	novuConfigSchema,
	collectEmailConfig,
	type EmailConfig,
} from './email.schema';

// Payment configuration
export {
	paymentConfigSchema,
	productPricingSchema,
	trialAmountSchema,
	stripeConfigSchema,
	lemonSqueezyConfigSchema,
	polarConfigSchema,
	collectPaymentConfig,
	type PaymentConfig,
} from './payment.schema';

// Analytics configuration
export {
	analyticsConfigSchema,
	posthogConfigSchema,
	sentryConfigSchema,
	recaptchaConfigSchema,
	exceptionTrackingProviderSchema,
	vercelAnalyticsSchema,
	collectAnalyticsConfig,
	type AnalyticsConfig,
} from './analytics.schema';

// Integrations configuration
export {
	integrationsConfigSchema,
	triggerDevConfigSchema,
	triggerDevEnvironmentSchema,
	twentyCrmConfigSchema,
	twentyCrmSyncModeSchema,
	cronConfigSchema,
	collectIntegrationsConfig,
	type IntegrationsConfig,
} from './integrations.schema';
