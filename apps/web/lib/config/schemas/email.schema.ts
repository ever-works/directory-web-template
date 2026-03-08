/**
 * Email configuration schema
 * Defines email provider settings (SMTP, Resend, Novu)
 */

import { z } from 'zod';

/**
 * SMTP configuration schema
 */
export const smtpConfigSchema = z
	.object({
		host: z.string().optional(),
		port: z.number().int().min(1).max(65535).default(587),
		user: z.string().optional(),
		password: z.string().optional(),
	})
	.transform((data) => ({
		...data,
		enabled: Boolean(data.host && data.user && data.password),
	}));

/**
 * Resend configuration schema
 */
export const resendConfigSchema = z
	.object({
		apiKey: z.string().optional(),
	})
	.transform((data) => ({
		...data,
		enabled: Boolean(data.apiKey),
	}));

/**
 * Novu configuration schema
 */
export const novuConfigSchema = z
	.object({
		apiKey: z.string().optional(),
	})
	.transform((data) => ({
		...data,
		enabled: Boolean(data.apiKey),
	}));

/**
 * Email configuration schema
 */
export const emailConfigSchema = z.object({
	// Company name for email templates
	COMPANY_NAME: z.string().default('Ever Works'),

	// Email provider selection (resend, novu)
	EMAIL_PROVIDER: z.string().default('resend'),

	// Email addresses
	EMAIL_FROM: z.string().email().optional().catch(undefined),
	EMAIL_SUPPORT: z.string().email().optional().catch(undefined),

	// Email providers
	smtp: smtpConfigSchema.optional().default({ enabled: false, port: 587 }),
	resend: resendConfigSchema.optional().default({ enabled: false }),
	novu: novuConfigSchema.optional().default({ enabled: false }),
});

/**
 * Type inference for email configuration
 */
export type EmailConfig = z.infer<typeof emailConfigSchema>;

/**
 * Safely parses an integer, returning undefined if NaN
 */
function parseIntOrUndefined(value: string | undefined): number | undefined {
	if (!value) return undefined;
	const parsed = parseInt(value, 10);
	return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Collects email configuration from environment variables
 */
export function collectEmailConfig(): z.input<typeof emailConfigSchema> {
	return {
		COMPANY_NAME: process.env.COMPANY_NAME,
		EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
		EMAIL_FROM: process.env.EMAIL_FROM,
		EMAIL_SUPPORT: process.env.EMAIL_SUPPORT,
		smtp: {
			host: process.env.SMTP_HOST,
			port: parseIntOrUndefined(process.env.SMTP_PORT),
			user: process.env.SMTP_USER,
			password: process.env.SMTP_PASSWORD,
		},
		resend: {
			apiKey: process.env.RESEND_API_KEY,
		},
		novu: {
			apiKey: process.env.NOVU_API_KEY,
		},
	};
}
