/**
 * Twenty CRM Client Utilities
 * Helper functions for REST client operations
 */

import { maskApiKey } from './twenty-crm-validation';
import {
  DEFAULT_INITIAL_BACKOFF_MS,
  DEFAULT_MAX_BACKOFF_MS,
  MAX_JITTER_MS,
  RETRYABLE_STATUS_CODES,
} from '@/lib/config/twenty-crm.config';

/**
 * Generates a unique idempotency key for POST/PUT requests
 * Uses crypto.randomUUID() for RFC 4122 compliance
 *
 * @returns UUID v4 string
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Calculates exponential backoff delay with jitter
 * Formula: min(initialBackoff * 2^attempt + jitter, maxBackoff)
 * Jitter is random value between 0 and MAX_JITTER_MS to prevent thundering herd
 *
 * @param attempt - Current retry attempt number (0-indexed)
 * @param initialBackoffMs - Initial backoff delay in milliseconds
 * @param maxBackoffMs - Maximum backoff delay in milliseconds
 * @returns Calculated backoff delay in milliseconds
 */
export function calculateExponentialBackoff(
  attempt: number,
  initialBackoffMs: number = DEFAULT_INITIAL_BACKOFF_MS,
  maxBackoffMs: number = DEFAULT_MAX_BACKOFF_MS
): number {
  // Calculate exponential backoff: initialBackoff * 2^attempt
  const exponentialDelay = initialBackoffMs * Math.pow(2, attempt);

  // Add random jitter to prevent thundering herd problem
  const jitter = Math.random() * MAX_JITTER_MS;

  // Return minimum of (exponential delay + jitter) and max backoff
  return Math.min(exponentialDelay + jitter, maxBackoffMs);
}

/**
 * Determines if a request should be retried based on status code, error, and attempt count
 *
 * @param status - HTTP status code (if available)
 * @param error - Error that occurred
 * @param attempt - Current attempt number (1-indexed)
 * @param maxRetries - Maximum number of retries allowed
 * @returns Whether the request should be retried
 */
export function shouldRetryRequest(
  status: number | undefined,
  error: Error | unknown,
  attempt: number,
  maxRetries: number
): boolean {
  // Don't retry if max retries exceeded
  if (attempt > maxRetries) {
    return false;
  }

  // Retry on retryable status codes (408, 429, 5xx)
  if (status && RETRYABLE_STATUS_CODES.includes(status as typeof RETRYABLE_STATUS_CODES[number])) {
    return true;
  }

  // Retry on timeout errors (AbortError)
  if (error instanceof Error && error.name === 'AbortError') {
    return true;
  }

  // Retry on network errors (TypeError from fetch)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Retry on ECONNRESET and similar network errors
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const networkErrorCodes = ['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED'];
    if (networkErrorCodes.includes(error.code)) {
      return true;
    }
  }

  // Don't retry for other errors
  return false;
}

/**
 * Sanitizes error messages by removing sensitive information (API keys)
 * Used for safe logging and error reporting
 *
 * @param error - Error to sanitize
 * @param apiKey - API key to mask in error messages
 * @returns Sanitized error message
 */
export function sanitizeErrorForLogging(error: unknown, apiKey: string): string {
  let errorMessage = 'Unknown error';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String(error.message);
  }

  // Mask API key in error message
  return errorMessage.replace(new RegExp(apiKey, 'g'), maskApiKey(apiKey));
}

/**
 * Delays execution for a specified duration
 * Used for implementing backoff delays between retry attempts
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
