/**
 * Twenty CRM Error Types
 * Structured error types for Twenty CRM API interactions
 */

/**
 * Error codes for Twenty CRM API errors
 */
export enum TwentyCrmErrorCode {
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  OPERATION_FAILED = 'OPERATION_FAILED',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structured error for Twenty CRM API interactions
 */
export interface TwentyCrmError {
  code: TwentyCrmErrorCode;
  message: string;
  status?: number;
  isRetryable: boolean;
  details?: {
    originalError?: string;
    attempt?: number;
    maxRetries?: number;
    [key: string]: unknown;
  };
}

/**
 * Type guard to check if an error is a TwentyCrmError
 */
export function isTwentyCrmError(error: unknown): error is TwentyCrmError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'isRetryable' in error &&
    Object.values(TwentyCrmErrorCode).includes((error as TwentyCrmError).code)
  );
}

/**
 * Creates a TwentyCrmError from various error sources
 */
export function createTwentyCrmError(
  code: TwentyCrmErrorCode,
  message: string,
  options?: {
    status?: number;
    isRetryable?: boolean;
    details?: TwentyCrmError['details'];
  }
): TwentyCrmError {
  return {
    code,
    message,
    status: options?.status,
    isRetryable: options?.isRetryable ?? false,
    details: options?.details,
  };
}
