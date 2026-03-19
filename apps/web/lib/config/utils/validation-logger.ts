/**
 * Validation logging utilities for ConfigService
 * Handles startup logging with secret masking
 */

import type { ZodError, ZodIssue } from 'zod';

/**
 * Patterns that indicate a value is a secret and should be masked
 */
const SECRET_PATTERNS = [
	/secret/i,
	/password/i,
	/key/i,
	/token/i,
	/api_key/i,
	/apikey/i,
	/credential/i,
	/dsn/i,
	/connection/i,
	/webhook/i,
];

/**
 * Config keys that are explicitly NOT secrets (override patterns above)
 */
const NON_SECRET_KEYS = [
	'NEXT_PUBLIC_POSTHOG_KEY',
	'NEXT_PUBLIC_RECAPTCHA_SITE_KEY',
	'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
];

/**
 * Determines if a key represents a secret value
 * @param key - The configuration key to check
 */
export function isSecretKey(key: string): boolean {
	if (NON_SECRET_KEYS.includes(key)) {
		return false;
	}
	return SECRET_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Masks a secret value for safe logging
 * @param value - The value to mask
 */
export function maskSecret(value: string | undefined): string {
	if (!value) {
		return '[not set]';
	}
	if (value.length <= 8) {
		return '****';
	}
	return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Formats a value for logging, masking secrets
 * @param key - The configuration key
 * @param value - The value to format
 */
export function formatValueForLog(key: string, value: unknown): string {
	if (value === undefined || value === null || value === '') {
		return '[not set]';
	}
	if (typeof value === 'boolean') {
		return value ? 'enabled' : 'disabled';
	}
	if (typeof value === 'object') {
		return '[object]';
	}
	if (isSecretKey(key)) {
		return maskSecret(String(value));
	}
	return String(value);
}

/**
 * Criticality levels for configuration issues
 */
export type IssueSeverity = 'critical' | 'warning' | 'info';

/**
 * Configuration validation issue
 */
export interface ValidationIssue {
	path: string;
	message: string;
	severity: IssueSeverity;
}

/**
 * Paths that are considered critical (fail-fast in production)
 */
const CRITICAL_PATHS_PRODUCTION = [
	'auth.AUTH_SECRET',
	'core.DATABASE_URL',
];

/**
 * Determines the severity of a validation issue
 * @param path - The configuration path
 */
export function getIssueSeverity(path: string): IssueSeverity {
	const isProduction = process.env.NODE_ENV === 'production';

	if (isProduction && CRITICAL_PATHS_PRODUCTION.some((p) => path.startsWith(p))) {
		return 'critical';
	}

	return 'warning';
}

/**
 * Converts Zod issues to validation issues
 * @param zodError - The Zod error object
 */
export function convertZodError(zodError: ZodError): ValidationIssue[] {
	return zodError.issues.map((issue: ZodIssue) => {
		const path = issue.path.join('.');
		return {
			path,
			message: issue.message,
			severity: getIssueSeverity(path),
		};
	});
}

/**
 * Logs validation results at startup
 * @param issues - Array of validation issues (empty if valid)
 */
export function logValidationResults(issues: ValidationIssue[]): void {
	const isDev = process.env.NODE_ENV === 'development';
	const isSilent = process.env.CONFIG_SILENT === 'true';

	if (isSilent) {
		return;
	}

	if (issues.length === 0) {
		if (isDev) {
			console.log('[ConfigService] Environment validation complete - all checks passed');
		}
		return;
	}

	console.log('[ConfigService] Environment validation complete');

	const criticalIssues = issues.filter((i) => i.severity === 'critical');
	const warnings = issues.filter((i) => i.severity === 'warning');

	criticalIssues.forEach((issue) => {
		console.error(`  [CRITICAL] ${issue.path}: ${issue.message}`);
	});

	warnings.forEach((issue) => {
		console.warn(`  [WARNING] ${issue.path}: ${issue.message}`);
	});
}

/**
 * Logs configuration summary in development mode
 * @param config - The configuration object to summarize
 */
export function logConfigSummary(config: Record<string, unknown>): void {
	const isDev = process.env.NODE_ENV === 'development';
	const isVerbose = process.env.CONFIG_VERBOSE === 'true';

	if (!isDev || !isVerbose) {
		return;
	}

	console.log('[ConfigService] Configuration loaded:');

	Object.entries(config).forEach(([section, values]) => {
		if (typeof values === 'object' && values !== null) {
			console.log(`  ${section}:`);
			Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
				const formattedValue = formatValueForLog(key, value);
				console.log(`    ${key}: ${formattedValue}`);
			});
		}
	});
}
