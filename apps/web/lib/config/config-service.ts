/**
 * ConfigService - Centralized configuration management
 *
 * Provides a typed, validated singleton for accessing application configuration.
 * All environment variables are validated at startup using Zod schemas.
 *
 * @example
 * ```ts
 * import { configService } from '@/lib/config';
 *
 * // Access configuration sections
 * const appUrl = configService.core.APP_URL;
 * const stripeEnabled = configService.payment.stripe.enabled;
 * ```
 */

import 'server-only';

import { z } from 'zod';
import {
	coreConfigSchema,
	authConfigSchema,
	emailConfigSchema,
	paymentConfigSchema,
	analyticsConfigSchema,
	integrationsConfigSchema,
	collectCoreConfig,
	collectAuthConfig,
	collectEmailConfig,
	collectPaymentConfig,
	collectAnalyticsConfig,
	collectIntegrationsConfig,
} from './schemas';
import {
	convertZodError,
	logValidationResults,
	logConfigSummary,
	type ValidationIssue,
} from './utils/validation-logger';
import type { AppConfigSchema } from './types';

/**
 * Combined configuration schema
 */
const appConfigSchema = z.object({
	core: coreConfigSchema,
	auth: authConfigSchema,
	email: emailConfigSchema,
	payment: paymentConfigSchema,
	analytics: analyticsConfigSchema,
	integrations: integrationsConfigSchema,
});

/**
 * ConfigService class
 * Singleton that loads and validates all configuration at startup
 */
class ConfigService {
	private static instance: ConfigService | null = null;
	private config: AppConfigSchema;
	private validationIssues: ValidationIssue[] = [];

	private constructor() {
		this.config = this.loadAndValidate();
	}

	/**
	 * Collects all environment variables into a raw config object
	 */
	private collectEnvVars(): z.input<typeof appConfigSchema> {
		return {
			core: collectCoreConfig(),
			auth: collectAuthConfig(),
			email: collectEmailConfig(),
			payment: collectPaymentConfig(),
			analytics: collectAnalyticsConfig(),
			integrations: collectIntegrationsConfig(),
		};
	}

	/**
	 * Loads and validates all configuration
	 *
	 * With .catch() handlers on URL/email/enum fields, most validation errors
	 * are auto-recovered with default values. Any remaining errors are truly
	 * unrecoverable and will cause startup failure.
	 */
	private loadAndValidate(): AppConfigSchema {
		const rawConfig = this.collectEnvVars();
		const result = appConfigSchema.safeParse(rawConfig);

		if (!result.success) {
			// With .catch() handlers, remaining errors are unrecoverable
			this.validationIssues = convertZodError(result.error);
			logValidationResults(this.validationIssues);
			throw new Error(
				`[ConfigService] Configuration errors:\n${this.validationIssues.map((i) => `  - ${i.path}: ${i.message}`).join('\n')}`
			);
		}

		logValidationResults([]);
		logConfigSummary(result.data as unknown as Record<string, unknown>);

		return result.data;
	}

	/**
	 * Gets the singleton instance
	 */
	public static getInstance(): ConfigService {
		if (!ConfigService.instance) {
			ConfigService.instance = new ConfigService();
		}
		return ConfigService.instance;
	}

	/**
	 * Resets the singleton instance (for testing purposes only)
	 */
	public static resetInstance(): void {
		ConfigService.instance = null;
	}

	/**
	 * Gets validation issues from the last load
	 */
	public getValidationIssues(): ValidationIssue[] {
		return [...this.validationIssues];
	}

	/**
	 * Checks if there are any validation warnings
	 */
	public hasWarnings(): boolean {
		return this.validationIssues.some((i) => i.severity === 'warning');
	}

	// ==========================================
	// Configuration section getters
	// ==========================================

	/**
	 * Core configuration (URLs, site info, database)
	 */
	get core() {
		return this.config.core;
	}

	/**
	 * Authentication configuration (secrets, OAuth providers)
	 */
	get auth() {
		return this.config.auth;
	}

	/**
	 * Email configuration (SMTP, Resend, Novu)
	 */
	get email() {
		return this.config.email;
	}

	/**
	 * Payment configuration (Stripe, LemonSqueezy, Polar)
	 */
	get payment() {
		return this.config.payment;
	}

	/**
	 * Analytics configuration (PostHog, Sentry, Recaptcha)
	 */
	get analytics() {
		return this.config.analytics;
	}

	/**
	 * Integrations configuration (Trigger.dev, Twenty CRM)
	 */
	get integrations() {
		return this.config.integrations;
	}

	/**
	 * Gets the full configuration object
	 * Use sparingly - prefer accessing specific sections
	 */
	get all(): AppConfigSchema {
		return this.config;
	}
}

/**
 * Singleton instance of ConfigService
 * Validates configuration on first import
 */
export const configService = ConfigService.getInstance();

// ==========================================
// Individual section exports (tree-shakeable)
// ==========================================

/**
 * Core configuration (URLs, site info, database)
 */
export const coreConfig = configService.core;

/**
 * Authentication configuration (secrets, OAuth providers)
 */
export const authConfig = configService.auth;

/**
 * Email configuration (SMTP, Resend, Novu)
 */
export const emailConfig = configService.email;

/**
 * Payment configuration (Stripe, LemonSqueezy, Polar)
 */
export const paymentConfig = configService.payment;

/**
 * Analytics configuration (PostHog, Sentry, Recaptcha)
 */
export const analyticsConfig = configService.analytics;

/**
 * Integrations configuration (Trigger.dev, Twenty CRM)
 */
export const integrationsConfig = configService.integrations;
