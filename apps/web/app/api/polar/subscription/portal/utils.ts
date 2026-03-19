import { NextRequest } from 'next/server';
import { coreConfig } from '@/lib/config/config-service';

/**
 * Configuration constants for return URL handling
 */
export const RETURN_URL_CONFIG = {
	DEFAULT_PATH: '/settings/billing',
	MAX_PATH_LENGTH: 2048,
	MIN_PATH_LENGTH: 1,
} as const;

/**
 * Type guard to check if a value is a valid string
 * 
 * @param value - Value to check
 * @returns True if value is a non-empty string
 */
export function isValidString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Extracts the pathname from an absolute URL
 * 
 * @param absoluteUrl - Absolute URL string
 * @returns Pathname or null if URL is invalid
 */
export function extractPathFromAbsoluteUrl(absoluteUrl: string): string | null {
	try {
		const url = new URL(absoluteUrl);
		return url.pathname || null;
	} catch {
		return null;
	}
}

/**
 * Normalizes a relative path to ensure it starts with '/'
 * 
 * @param path - Relative path string
 * @returns Normalized path starting with '/'
 */
export function normalizeRelativePath(path: string): string {
	const trimmed = path.trim();
	return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Validates that a path is within acceptable length limits
 * 
 * @param path - Path string to validate
 * @returns True if path is valid, false otherwise
 */
export function isValidPathLength(path: string): boolean {
	return (
		path.length >= RETURN_URL_CONFIG.MIN_PATH_LENGTH &&
		path.length <= RETURN_URL_CONFIG.MAX_PATH_LENGTH
	);
}

/**
 * Gets the application base URL from environment variables
 * 
 * @returns Application base URL (absolute URI)
 */
export function getAppUrl(): string {
	return coreConfig.APP_URL || 'https://demo.ever.works';
}

/**
 * Converts a relative path to an absolute URL
 * 
 * @param relativePath - Relative path (must start with '/')
 * @returns Absolute URL
 * 
 * @example
 * ```typescript
 * const absoluteUrl = buildAbsoluteUrl('/settings/billing');
 * // Returns: 'https://example.com/settings/billing'
 * ```
 */
export function buildAbsoluteUrl(relativePath: string): string {
	const appUrl = getAppUrl().trim().replace(/\/+$/, '');
	const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
	return `${appUrl}${normalizedPath}`;
}

/**
 * Extracts and normalizes the return URL from the request body.
 * 
 * This function handles multiple input formats:
 * - Absolute URLs (http://, https://) - extracts pathname
 * - Relative paths - normalizes to start with '/'
 * - Invalid/missing values - returns default path
 * 
 * Security considerations:
 * - Rejects absolute URLs to prevent open redirects
 * - Validates path length to prevent DoS attacks
 * - Sanitizes input to remove potential injection vectors
 * 
 * @param request - Next.js request object
 * @returns Normalized relative path for return URL
 * 
 * @example
 * ```typescript
 * const returnUrl = await extractReturnUrl(request);
 * // Returns: '/settings/billing' or extracted pathname
 * ```
 */
export async function extractReturnUrl(request: NextRequest): Promise<string> {
	try {
		const body = await request.json().catch(() => null);

		// Early return if no body or no returnUrl field
		if (!body || typeof body !== 'object' || !('returnUrl' in body)) {
			return RETURN_URL_CONFIG.DEFAULT_PATH;
		}

		const rawReturnUrl = body.returnUrl;

		// Validate that returnUrl is a string
		if (!isValidString(rawReturnUrl)) {
			return RETURN_URL_CONFIG.DEFAULT_PATH;
		}

		const trimmedUrl = rawReturnUrl.trim();

		// Handle empty strings
		if (trimmedUrl.length === 0) {
			return RETURN_URL_CONFIG.DEFAULT_PATH;
		}

		// Handle absolute URLs by extracting pathname
		const isAbsoluteUrl = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');

		if (isAbsoluteUrl) {
			const pathname = extractPathFromAbsoluteUrl(trimmedUrl);
			if (!pathname || !isValidPathLength(pathname)) {
				return RETURN_URL_CONFIG.DEFAULT_PATH;
			}
			return pathname;
		}

		// Security: Strip protocol-relative URLs (//evil.com/path) to prevent open redirects
		// These bypass the absolute URL check but browsers interpret // as protocol-relative
		let sanitizedUrl = trimmedUrl;
		while (sanitizedUrl.startsWith('//')) {
			sanitizedUrl = sanitizedUrl.slice(1);
		}

		// Handle relative paths
		const normalizedPath = normalizeRelativePath(sanitizedUrl);

		// Validate path length
		if (!isValidPathLength(normalizedPath)) {
			return RETURN_URL_CONFIG.DEFAULT_PATH;
		}

		return normalizedPath;
	} catch (error) {
		// Log error in development for debugging
		if (coreConfig.NODE_ENV === 'development') {
			console.debug('[extractReturnUrl] Error parsing request body:', error);
		}

		// Always return default path on any error
		return RETURN_URL_CONFIG.DEFAULT_PATH;
	}
}
