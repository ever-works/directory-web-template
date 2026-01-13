/**
 * Validates that a callback URL is safe to redirect to.
 * Prevents open redirect vulnerabilities by ensuring the URL is a relative path.
 *
 * @param url - The callback URL to validate
 * @returns true if the URL is a safe relative path, false otherwise
 *
 * @example
 * isValidCallbackUrl('/admin/items') // true
 * isValidCallbackUrl('/client/dashboard?page=2') // true
 * isValidCallbackUrl('https://evil.com') // false
 * isValidCallbackUrl('//evil.com') // false
 * isValidCallbackUrl(null) // false
 */
export function isValidCallbackUrl(url: string | null): boolean {
    if (!url) return false;
    try {
        // Must start with / and not be a protocol-relative URL
        return url.startsWith('/') && !url.startsWith('//');
    } catch {
        return false;
    }
}

/**
 * Returns a safe redirect path from a callback URL.
 * If the callback URL is invalid, returns the fallback path.
 *
 * @param callbackUrl - The callback URL from query params
 * @param fallbackPath - The default path to use if callback is invalid
 * @returns A safe redirect path
 */
export function getSafeRedirectPath(callbackUrl: string | null, fallbackPath: string): string {
    return isValidCallbackUrl(callbackUrl) ? callbackUrl! : fallbackPath;
}
