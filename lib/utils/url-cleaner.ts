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

// Compute once at module load time
const appUrl = getNormalizedAppUrl();

/**
 * Get the base URL for API calls with proper cleaning
 * Uses the validated and normalized app URL
 */
export function getBaseUrl(): string {
  return appUrl;
}

/**
 * Construct a full URL from a path
 */
export function buildUrl(path: string, baseUrl?: string): string {
  const base = baseUrl ? cleanUrl(baseUrl) : getBaseUrl();

  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${base}${cleanPath}`;
}
