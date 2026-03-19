/**
 * Analytics configuration schema
 * Defines analytics and tracking settings (PostHog, Sentry, Recaptcha)
 */

import { z } from 'zod';

/**
 * PostHog configuration schema
 */
export const posthogConfigSchema = z
	.object({
		key: z.string().optional(),
		host: z.string().url().default('https://us.i.posthog.com').catch('https://us.i.posthog.com'),
		debug: z.boolean().default(false),
		sessionRecordingEnabled: z.boolean().default(true),
		autoCapture: z.boolean().default(false),
		exceptionTracking: z.boolean().default(true),
		// Server-side API (for admin dashboard)
		personalApiKey: z.string().optional(),
		projectId: z.string().optional(),
	})
	.transform((data) => ({
		...data,
		enabled: Boolean(data.key),
	}));

/**
 * Sentry configuration schema
 */
export const sentryConfigSchema = z
	.object({
		dsn: z.string().optional(),
		org: z.string().optional(),
		project: z.string().optional(),
		authToken: z.string().optional(),
		enableDev: z.boolean().default(false),
		debug: z.boolean().default(false),
		exceptionTracking: z.boolean().default(true),
	})
	.transform((data) => ({
		...data,
		enabled: Boolean(data.dsn),
	}));

/**
 * Recaptcha configuration schema
 */
export const recaptchaConfigSchema = z
	.object({
		siteKey: z.string().optional(),
		secretKey: z.string().optional(),
	})
	.transform((data) => ({
		...data,
		enabled: Boolean(data.siteKey && data.secretKey),
	}));

/**
 * Exception tracking provider type
 */
export const exceptionTrackingProviderSchema = z.enum(['posthog', 'sentry', 'none']).default('posthog').catch('posthog');

/**
 * Vercel analytics configuration
 */
export const vercelAnalyticsSchema = z.object({
	speedInsightsEnabled: z.boolean().default(false),
	speedInsightsSampleRate: z.number().min(0).max(1).default(0.5),
});

/**
 * Analytics configuration schema
 */
export const analyticsConfigSchema = z.object({
	// Exception tracking provider selection
	exceptionTrackingProvider: exceptionTrackingProviderSchema,

	// Bundle analyzer
	analyze: z.boolean().default(false),

	// Analytics providers
	posthog: posthogConfigSchema.optional().default({
		enabled: false,
		host: 'https://us.i.posthog.com',
		debug: false,
		sessionRecordingEnabled: true,
		autoCapture: false,
		exceptionTracking: true,
	}),
	sentry: sentryConfigSchema.optional().default({
		enabled: false,
		enableDev: false,
		debug: false,
		exceptionTracking: true,
	}),
	recaptcha: recaptchaConfigSchema.optional().default({ enabled: false }),
	vercel: vercelAnalyticsSchema.optional().default({ speedInsightsEnabled: false, speedInsightsSampleRate: 0.5 }),
});

/**
 * Type inference for analytics configuration
 */
export type AnalyticsConfig = z.infer<typeof analyticsConfigSchema>;

/**
 * Collects analytics configuration from environment variables
 */
export function collectAnalyticsConfig(): z.input<typeof analyticsConfigSchema> {
	return {
		exceptionTrackingProvider: process.env.EXCEPTION_TRACKING_PROVIDER as
			| 'posthog'
			| 'sentry'
			| 'none'
			| undefined,
		analyze: process.env.ANALYZE === 'true',
		posthog: {
			key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
			host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
			debug: process.env.POSTHOG_DEBUG === 'true',
			sessionRecordingEnabled: process.env.POSTHOG_SESSION_RECORDING_ENABLED !== 'false',
			autoCapture: process.env.POSTHOG_AUTO_CAPTURE === 'true',
			exceptionTracking: process.env.POSTHOG_EXCEPTION_TRACKING !== 'false',
			personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
			projectId: process.env.POSTHOG_PROJECT_ID,
		},
		sentry: {
			dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
			org: process.env.SENTRY_ORG,
			project: process.env.SENTRY_PROJECT,
			authToken: process.env.SENTRY_AUTH_TOKEN,
			enableDev: process.env.SENTRY_ENABLE_DEV === 'true',
			debug: process.env.SENTRY_DEBUG === 'true',
			exceptionTracking: process.env.SENTRY_EXCEPTION_TRACKING !== 'false',
		},
		recaptcha: {
			siteKey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
			secretKey: process.env.RECAPTCHA_SECRET_KEY,
		},
		vercel: {
			speedInsightsEnabled: process.env.NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED === 'true',
			speedInsightsSampleRate: process.env.NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE
				? parseFloat(process.env.NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE)
				: undefined,
		},
	};
}
