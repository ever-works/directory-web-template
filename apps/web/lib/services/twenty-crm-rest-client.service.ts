/**
 * Twenty CRM REST Client Service
 * Robust HTTP client for Twenty CRM API with retry logic, timeout, and error handling
 */

import type {
  TwentyCrmClientConfig,
  TwentyCrmResponse,
} from '@/lib/types/twenty-crm-config.types';
import {
  TwentyCrmErrorCode,
  createTwentyCrmError,
  type TwentyCrmError,
} from '@/lib/types/twenty-crm-errors.types';
import {
  DEFAULT_TIMEOUT,
  DEFAULT_MAX_RETRIES,
  DEFAULT_INITIAL_BACKOFF_MS,
  DEFAULT_MAX_BACKOFF_MS,
} from '@/lib/config/twenty-crm.config';
import {
  generateIdempotencyKey,
  calculateExponentialBackoff,
  shouldRetryRequest,
  sanitizeErrorForLogging,
  delay,
} from '@/lib/utils/twenty-crm-client.utils';

/**
 * Options for individual HTTP requests
 */
interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
  skipRetry?: boolean;
  idempotencyKey?: string;
}

export class TwentyCrmRestClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;
  private initialBackoffMs: number;
  private maxBackoffMs: number;

  constructor(config: TwentyCrmClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.initialBackoffMs = config.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;
    this.maxBackoffMs = config.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
  }

  /**
   * Performs a GET request
   */
  async get<T>(path: string, options?: RequestOptions): Promise<TwentyCrmResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  /**
   * Performs a POST request with automatic idempotency key generation
   */
  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<TwentyCrmResponse<T>> {
    const idempotencyKey = options?.idempotencyKey ?? generateIdempotencyKey();
    return this.request<T>('POST', path, { ...options, idempotencyKey }, body);
  }

  /**
   * Performs a PUT request with automatic idempotency key generation
   */
  async put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<TwentyCrmResponse<T>> {
    const idempotencyKey = options?.idempotencyKey ?? generateIdempotencyKey();
    return this.request<T>('PUT', path, { ...options, idempotencyKey }, body);
  }

  /**
   * Performs a DELETE request
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<TwentyCrmResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Core request method with retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    options?: RequestOptions,
    body?: unknown
  ): Promise<TwentyCrmResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const timeout = options?.timeout ?? this.timeout;
    const skipRetry = options?.skipRetry ?? false;

    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        const result = await this.executeRequest<T>(method, url, timeout, options, body);
        return { success: true, data: result };
      } catch (error) {
        attempt++;

        // Determine if we should retry
        const status = error && typeof error === 'object' && 'status' in error
          ? (error.status as number)
          : undefined;

        const shouldRetry =
          !skipRetry && shouldRetryRequest(status, error, attempt, this.maxRetries);

        if (!shouldRetry) {
          // Convert error to TwentyCrmError and return
          const twentyError = this.convertToTwentyCrmError(error, attempt);
          return { success: false, error: twentyError };
        }

        // Calculate backoff delay and wait
        const backoffMs = calculateExponentialBackoff(
          attempt - 1,
          this.initialBackoffMs,
          this.maxBackoffMs
        );

        console.warn(
          `Twenty CRM request failed (attempt ${attempt}/${this.maxRetries}). Retrying in ${backoffMs}ms...`,
          { method, path, status }
        );

        await delay(backoffMs);
      }
    }

    // Max retries exceeded
    const error = createTwentyCrmError(
      TwentyCrmErrorCode.UNKNOWN,
      'Maximum retry attempts exceeded',
      {
        isRetryable: false,
        details: { attempt, maxRetries: this.maxRetries },
      }
    );

    return { success: false, error };
  }

  /**
   * Executes a single HTTP request with timeout
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    timeout: number,
    options?: RequestOptions,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers = this.buildHeaders(options);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return await this.handleResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Builds request headers with auth and idempotency key
   */
  private buildHeaders(options?: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Add idempotency key if provided
    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    return headers;
  }

  /**
   * Handles HTTP response and parses JSON
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle successful responses
    if (response.ok) {
      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data as T;
    }

    // Handle error responses
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || response.statusText);
    (error as typeof error & { status: number }).status = response.status;
    (error as typeof error & { response: typeof errorData }).response = errorData;

    throw error;
  }

  /**
   * Converts various error types to TwentyCrmError
   */
  private convertToTwentyCrmError(error: unknown, attempt: number): TwentyCrmError {
    // Handle timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return createTwentyCrmError(
        TwentyCrmErrorCode.TIMEOUT,
        `Request timeout after ${this.timeout}ms`,
        {
          isRetryable: true,
          details: { attempt, maxRetries: this.maxRetries },
        }
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return createTwentyCrmError(
        TwentyCrmErrorCode.NETWORK_ERROR,
        'Network error - cannot reach Twenty CRM server',
        {
          isRetryable: true,
          details: {
            attempt,
            maxRetries: this.maxRetries,
            originalError: sanitizeErrorForLogging(error, this.apiKey),
          },
        }
      );
    }

    // Handle HTTP errors with status codes
    if (error && typeof error === 'object' && 'status' in error) {
      const status = error.status as number;
      const message = error instanceof Error ? error.message : 'Request failed';

      if (status === 401 || status === 403) {
        return createTwentyCrmError(
          TwentyCrmErrorCode.AUTH_ERROR,
          'Authentication failed - invalid API key',
          {
            status,
            isRetryable: false,
          }
        );
      }

      if (status === 404) {
        return createTwentyCrmError(
          TwentyCrmErrorCode.NOT_FOUND,
          'Resource not found',
          {
            status,
            isRetryable: false,
          }
        );
      }

      if (status === 429) {
        return createTwentyCrmError(
          TwentyCrmErrorCode.RATE_LIMIT,
          'Rate limit exceeded',
          {
            status,
            isRetryable: true,
            details: { attempt, maxRetries: this.maxRetries },
          }
        );
      }

      if (status >= 500) {
        return createTwentyCrmError(
          TwentyCrmErrorCode.SERVER_ERROR,
          'Twenty CRM server error',
          {
            status,
            isRetryable: true,
            details: { attempt, maxRetries: this.maxRetries },
          }
        );
      }

      if (status >= 400 && status < 500) {
        return createTwentyCrmError(
          TwentyCrmErrorCode.VALIDATION_ERROR,
          message,
          {
            status,
            isRetryable: false,
          }
        );
      }
    }

    // Handle unknown errors
    const errorMessage = error instanceof Error
      ? error.message
      : 'Unknown error occurred';

    return createTwentyCrmError(
      TwentyCrmErrorCode.UNKNOWN,
      errorMessage,
      {
        isRetryable: false,
        details: {
          attempt,
          maxRetries: this.maxRetries,
          originalError: sanitizeErrorForLogging(error, this.apiKey),
        },
      }
    );
  }
}
