/**
 * Environment variable parsing utilities
 * Provides type-safe parsing of environment variables with proper defaults
 */

/**
 * Parses an environment variable as a string
 * @param key - The environment variable key
 * @param defaultValue - Default value if not set
 */
export function parseString(key: string, defaultValue?: string): string | undefined {
	const value = process.env[key];
	if (value === undefined || value === '') {
		return defaultValue;
	}
	return value;
}

/**
 * Parses an environment variable as a required string
 * @param key - The environment variable key
 * @throws Error if the variable is not set
 */
export function parseRequiredString(key: string): string {
	const value = process.env[key];
	if (value === undefined || value === '') {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

/**
 * Parses an environment variable as a number
 * @param key - The environment variable key
 * @param defaultValue - Default value if not set or invalid
 */
export function parseNumber(key: string, defaultValue?: number): number | undefined {
	const value = process.env[key];
	if (value === undefined || value === '') {
		return defaultValue;
	}
	const parsed = Number(value);
	if (isNaN(parsed)) {
		return defaultValue;
	}
	return parsed;
}

/**
 * Parses an environment variable as a boolean
 * Accepts: '1', 'true', 'yes', 'on' (case-insensitive) as true
 * @param key - The environment variable key
 * @param defaultValue - Default value if not set
 */
export function parseBoolean(key: string, defaultValue: boolean = false): boolean {
	const value = process.env[key];
	if (value === undefined || value === '') {
		return defaultValue;
	}
	const normalized = value.toLowerCase().trim();
	return ['1', 'true', 'yes', 'on'].includes(normalized);
}

/**
 * Parses an environment variable as a URL
 * @param key - The environment variable key
 * @param defaultValue - Default value if not set
 */
export function parseUrl(key: string, defaultValue?: string): string | undefined {
	const value = process.env[key];
	if (value === undefined || value === '') {
		return defaultValue;
	}
	try {
		new URL(value);
		return value;
	} catch {
		return defaultValue;
	}
}

/**
 * Parses an environment variable as a comma-separated array
 * @param key - The environment variable key
 * @param defaultValue - Default value if not set
 */
export function parseArray(key: string, defaultValue: string[] = []): string[] {
	const value = process.env[key];
	if (value === undefined || value === '') {
		return defaultValue;
	}
	return value.split(',').map((item) => item.trim()).filter(Boolean);
}

/**
 * Checks if an environment variable is set (non-empty)
 * @param key - The environment variable key
 */
export function isEnvSet(key: string): boolean {
	const value = process.env[key];
	return value !== undefined && value !== '';
}

/**
 * Gets the application URL with Vercel fallback
 * @param defaultValue - Default value if not set
 */
export function getAppUrl(defaultValue: string = 'http://localhost:3000'): string {
	const appUrl = process.env.NEXT_PUBLIC_APP_URL;
	if (appUrl) {
		return appUrl;
	}
	const vercelUrl = process.env.VERCEL_URL;
	if (vercelUrl) {
		return `https://${vercelUrl}`;
	}
	return defaultValue;
}
