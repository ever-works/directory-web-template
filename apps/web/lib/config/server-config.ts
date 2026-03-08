/**
 * Server-side configuration utilities
 * For use in API routes and server components
 *
 * @deprecated This module is deprecated. Use `configService` from `@/lib/config` instead.
 * These functions are maintained for backward compatibility only.
 */

import { getCachedConfig, type Config } from '@/lib/content';
import { configService } from './config-service';

interface ServerConfig {
	supportEmail: string;
	companyName: string;
	appUrl: string;
	stripeSecretKey: string;
	stripeWebhookSecret: string;
	databaseUrl: string;
}

/**
 * Get server configuration from environment variables
 * Validates required variables and provides defaults where appropriate
 *
 * @deprecated Use `configService` from `@/lib/config` instead.
 * - `supportEmail` → `configService.email.EMAIL_SUPPORT`
 * - `companyName` → `configService.email.COMPANY_NAME`
 * - `appUrl` → `configService.core.APP_URL`
 * - `stripeSecretKey` → `configService.payment.stripe.secretKey`
 * - `stripeWebhookSecret` → `configService.payment.stripe.webhookSecret`
 * - `databaseUrl` → `configService.core.DATABASE_URL`
 */
export function getServerConfig(): ServerConfig {
	const supportEmail = configService.email.EMAIL_SUPPORT || 'support@ever.works';
	const companyName = configService.email.COMPANY_NAME || 'Ever Works';
	const appUrl = configService.core.APP_URL || 'https://demo.ever.works';
	const stripeSecretKey = configService.payment.stripe.secretKey;
	const stripeWebhookSecret = configService.payment.stripe.webhookSecret;
	const databaseUrl = configService.core.DATABASE_URL;

	// Validate required environment variables
	const requiredVars = {
		EMAIL_SUPPORT: supportEmail,
		NEXT_PUBLIC_APP_URL: appUrl,
		STRIPE_SECRET_KEY: stripeSecretKey,
		STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
		DATABASE_URL: databaseUrl,
	};

	const missingVars = Object.entries(requiredVars)
		.filter(([, value]) => !value)
		.map(([key]) => key);

	if (missingVars.length > 0) {
		throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
	}

	return {
		supportEmail: supportEmail!,
		companyName,
		appUrl: appUrl!,
		stripeSecretKey: stripeSecretKey!,
		stripeWebhookSecret: stripeWebhookSecret!,
		databaseUrl: databaseUrl!,
	};
}

/**
 * Get configuration from config.yml file (same as useConfig hook)
 * This is the server-side equivalent of useConfig()
 *
 * @deprecated This function reads from config.yml file. Consider using `configService` for env-based config.
 */
export async function getConfigFromFile(): Promise<Config> {
	try {
		// Import dynamically to avoid issues
		return await getCachedConfig();
	} catch (error) {
		console.error('Failed to load config from file:', error);
		return {};
	}
}

/**
 * Get email configuration from config file + environment variables
 * Used by email services and webhook handlers
 *
 * @deprecated Use `configService.email` and `configService.core` from `@/lib/config` instead.
 * - `supportEmail` → `configService.email.EMAIL_SUPPORT`
 * - `companyName` → `configService.email.COMPANY_NAME`
 * - `companyUrl` → `configService.core.SITE_URL` or `configService.core.APP_URL`
 */
export async function getEmailConfig() {
	const config = await getConfigFromFile();

	// Get values from config file first, then fallback to ConfigService
	let supportEmail =
		typeof config.mail === 'object' && 'from' in config.mail
			? config.mail.from
			: configService.email.EMAIL_SUPPORT;

	const companyName = config.company_name || configService.email.COMPANY_NAME || 'Ever Works';

	const appUrl =
		config.app_url ||
		configService.core.APP_URL ||
		'https://demo.ever.works';

	// Use default if supportEmail is not configured
	if (!supportEmail) {
		console.warn('[Config] EMAIL_SUPPORT not set, using default: support@ever.works');
		supportEmail = 'support@ever.works';
	}

	if (!appUrl) {
		console.error('app_url not found in config file or environment variables');
		throw new Error('App URL configuration is required');
	}

	return {
		supportEmail,
		companyName,
		companyUrl: appUrl,
	};
}

/**
 * Get Stripe configuration
 * Used by payment services
 *
 * @deprecated Use `configService.payment.stripe` from `@/lib/config` instead.
 * - `secretKey` → `configService.payment.stripe.secretKey`
 * - `webhookSecret` → `configService.payment.stripe.webhookSecret`
 */
export function getStripeConfig() {
	return {
		secretKey: configService.payment.stripe.secretKey,
		webhookSecret: configService.payment.stripe.webhookSecret,
	};
}

/**
 * Check if we're in development mode
 *
 * @deprecated Use `isDevelopment` from `@/lib/config` instead.
 */
export function isDevelopment(): boolean {
	return configService.core.NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 *
 * @deprecated Use `isProduction` from `@/lib/config` instead.
 */
export function isProduction(): boolean {
	return configService.core.NODE_ENV === 'production';
}

/**
 * Get the current environment
 *
 * @deprecated Use `getEnvironment` or `configService.core.NODE_ENV` from `@/lib/config` instead.
 */
export function getEnvironment(): string {
	return configService.core.NODE_ENV || 'development';
}
