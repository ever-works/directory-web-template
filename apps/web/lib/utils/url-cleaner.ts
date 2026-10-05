/**
 * Utility functions for cleaning and validating URLs
 */

const FALLBACK_URL = 'https://demo.ever.works';

/**
 * Clean and validate a URL string
 * Removes surrounding quotes, whitespace, and ensures proper protocol
 */
export function cleanUrl(url: string): string {
  if (!url) return '';

  // Remove any surrounding quotes or whitespace
  let cleaned = url.trim().replace(/^["']|["']$/g, '');

  // Check for existing protocol (case-insensitive)
  const protocolMatch = cleaned.match(/^([a-z]+):\/\//i);

  if (protocolMatch) {
    // Protocol exists - normalize to lowercase
    const protocol = protocolMatch[1].toLowerCase();
    const rest = cleaned.substring(protocolMatch[0].length);
    return `${protocol}://${rest}`;
  } else {
    // No protocol - add https:// as default for security
    return `https://${cleaned}`;
  }
}

/**
 * Validate that a URL string is an absolute URL
 * Attempts to construct a URL object to verify validity
 */
export function isValidAbsoluteUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    // Must have a protocol and hostname
    return !!urlObj.protocol && !!urlObj.hostname;
  } catch {
    return false;
  }
}

/**
 * Get the normalized application URL with proper validation and fallback chain
 * Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> hardcoded fallback
 * Includes validation at each step with console warnings for debugging
 */
function getNormalizedAppUrl(): string {
  // Extract and trim environment variables
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const envVercelUrl = process.env.VERCEL_URL?.trim();

  // Prefer NEXT_PUBLIC_APP_URL if present and non-empty
  if (envAppUrl) {
    const cleaned = cleanUrl(envAppUrl);
    if (cleaned && isValidAbsoluteUrl(cleaned)) {
      return cleaned;
    }
    console.warn(`Invalid NEXT_PUBLIC_APP_URL: "${envAppUrl}" (cleaned: "${cleaned}"). Using fallback.`);
  }

  // Fallback to VERCEL_URL if available
  if (envVercelUrl) {
    // Strip any existing scheme (http:// or https://)
    let vercelUrl = envVercelUrl.replace(/^https?:\/\//i, '');
    // Strip trailing slashes
    vercelUrl = vercelUrl.replace(/\/+$/, '');
    // Add https://
    const rawUrl = `https://${vercelUrl}`;

    const cleaned = cleanUrl(rawUrl);
    if (cleaned && isValidAbsoluteUrl(cleaned)) {
      return cleaned;
    }
    console.warn(`Invalid VERCEL_URL: "${envVercelUrl}" (cleaned: "${cleaned}"). Using fallback.`);
  }

  // Use hardcoded fallback
  return FALLBACK_URL;
}

/**
 * Validate and normalise a canonical origin override.
 * Returns the normalised origin (scheme://host[:port], no trailing slash), or
 * undefined when the value is empty, not an absolute http(s) URL, or carries a
 * path, query, fragment or credentials (the caller then falls back to the app
 * URL).
 */
export function resolveCanonicalOrigin(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;

  const cleaned = cleanUrl(trimmed).replace(/\/+$/, '');
  if (cleaned && isValidAbsoluteUrl(cleaned)) {
    // An http(s) ORIGIN only. A path would be prefixed to every URL the site
    // publishes (https://brand.example/foo/items/x in the sitemap, robots and
    // canonicals); a query, fragment or credentials make no sense in one.
    const url = new URL(cleaned);
    if (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    ) {
      return url.origin;
    }
  }
  console.warn(`Invalid NEXT_PUBLIC_CANONICAL_URL: "${trimmed}" (cleaned: "${cleaned}"). Ignoring it.`);
  return undefined;
}

// Compute once at module load time
const appUrl = getNormalizedAppUrl();

// Referenced literally (not via process.env[name]) so Next.js can inline it at
// build time, which keeps server and client renders on the same origin.
const canonicalOrigin = resolveCanonicalOrigin(process.env.NEXT_PUBLIC_CANONICAL_URL);

/**
 * The site's public canonical origin, when one is pinned.
 *
 * NEXT_PUBLIC_APP_URL is the host the deploy platform serves the app on, and
 * it also drives functional URLs (cookies, auth and payment callbacks). A site
 * that is reachable on several hosts (a platform subdomain plus a dedicated
 * brand domain) pins NEXT_PUBLIC_CANONICAL_URL so that every URL it PUBLISHES
 * (canonical, hreflang, og:url, sitemap, robots, feeds, JSON-LD) names one
 * origin, whichever host served the request. Unset, behaviour is unchanged.
 */
export function getCanonicalOrigin(): string | undefined {
  return canonicalOrigin;
}

/**
 * Get the public base URL of the site: the pinned canonical origin when
 * NEXT_PUBLIC_CANONICAL_URL is set, otherwise the validated app URL.
 * Use this for every URL the site publishes to crawlers and readers.
 */
export function getBaseUrl(): string {
  return canonicalOrigin ?? appUrl;
}

/**
 * Get the app URL the deployment is served on (NEXT_PUBLIC_APP_URL chain),
 * ignoring any canonical pin. Use this for functional round trips such as
 * payment return URLs, which must come back to the host holding the session.
 */
export function getAppBaseUrl(): string {
  return appUrl;
}

/**
 * Construct a full URL from a path.
 * Defaults to the app URL (functional round trips), not the canonical origin.
 */
export function buildUrl(path: string, baseUrl?: string): string {
  const base = baseUrl ? cleanUrl(baseUrl) : getAppBaseUrl();

  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${base}${cleanPath}`;
}
