/**
 * Twenty CRM Configuration Constants
 * Default values and configuration for Twenty CRM REST client
 */

/**
 * Default timeout for Twenty CRM API requests (10 seconds)
 */
export const DEFAULT_TIMEOUT = 10000;

/**
 * Default maximum number of retry attempts
 */
export const DEFAULT_MAX_RETRIES = 3;

/**
 * Default initial backoff delay in milliseconds
 */
export const DEFAULT_INITIAL_BACKOFF_MS = 1000;

/**
 * Default maximum backoff delay in milliseconds (30 seconds)
 */
export const DEFAULT_MAX_BACKOFF_MS = 30000;

/**
 * HTTP status codes that should trigger a retry
 */
export const RETRYABLE_STATUS_CODES = [
  408, // Request Timeout
  429, // Too Many Requests (Rate Limit)
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504, // Gateway Timeout
] as const;

/**
 * Maximum jitter to add to backoff delay (1 second)
 */
export const MAX_JITTER_MS = 1000;
