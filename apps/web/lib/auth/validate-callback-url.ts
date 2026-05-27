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
 *
 * **Known gaps worth tightening if this is ever the only open-redirect
 * defence:**
 *   - **Backslash bypass.** `/\evil.com` and `/\\evil.com` start with
 *     a single `/` and so currently return `true`. Some browsers and
 *     server-side URL parsers historically treat `\` as `/`, which
 *     can turn a "relative" path into a cross-origin redirect. Modern
 *     browsers percent-encode it (`/%5Cevil.com`), but defence in
 *     depth says to reject `\` outright.
 *   - **Whitespace / control chars.** Leading whitespace, tabs, CR,
 *     LF, NUL, and Unicode line separators can confuse upstream
 *     parsers; many open-redirect CVEs hinge on a leading control
 *     character being stripped before re-parse. Reject anything
 *     matching `[\x00-\x20\x7F]` at the start.
 *   - **The try/catch is dead.** `String#startsWith` doesn't throw on
 *     strings; the only failure mode is a non-string `url`, which is
 *     already excluded by the `!url` guard + TS signature. Remove the
 *     try/catch when you next touch this OR keep it intentionally as
 *     a belt-and-braces shield if/when the input type widens.
 *
 * NextAuth's own callbackUrl validation (`config/auth.config.ts`)
 * runs an additional `new URL(callbackUrl, baseUrl).origin ===
 * baseUrl` check, so this helper is one layer in a defence stack —
 * not the sole gate.
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

/**
 * Maximum allowed length for callback URLs.
 * This prevents parameter pollution attacks and excessive URL lengths.
 */
const MAX_CALLBACK_URL_LENGTH = 2048;

/**
 * Creates a safe callback URL from pathname and search params.
 * Limits total length to prevent abuse and parameter pollution attacks.
 *
 * @param pathname - The URL pathname
 * @param search - The URL search params (optional)
 * @returns A safe callback URL within length limits
 *
 * @example
 * createSafeCallbackUrl('/client/items', '?page=2') // '/client/items?page=2'
 * createSafeCallbackUrl('/client/items', '?very_long_params...') // Truncated to pathname only if too long
 */
export function createSafeCallbackUrl(pathname: string, search?: string): string {
    // Start with just the pathname
    if (!search) {
        return pathname.substring(0, MAX_CALLBACK_URL_LENGTH);
    }

    const fullUrl = pathname + search;

    // If within limits, return full URL
    if (fullUrl.length <= MAX_CALLBACK_URL_LENGTH) {
        return fullUrl;
    }

    // If too long, truncate - prefer keeping pathname over search params
    if (pathname.length >= MAX_CALLBACK_URL_LENGTH) {
        return pathname.substring(0, MAX_CALLBACK_URL_LENGTH);
    }

    // Truncate the search params to fit within limit
    const availableLength = MAX_CALLBACK_URL_LENGTH - pathname.length;
    return pathname + search.substring(0, availableLength);
}
