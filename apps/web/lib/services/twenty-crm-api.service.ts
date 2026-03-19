/**
 * Twenty CRM API Service
 * Handles external API calls to Twenty CRM with timeout and error handling
 */

import type { TwentyCrmTestConnectionResult } from '@/lib/types/twenty-crm-config.types';
import { TwentyCrmRestClient } from './twenty-crm-rest-client.service';

const TEST_CONNECTION_TIMEOUT = 10000; // 10 seconds

export class TwentyCrmApiService {
  /**
   * Tests connection to Twenty CRM API using the REST client
   * Calls the metadata endpoint which is typically available and requires authentication
   *
   * @param baseUrl - Twenty CRM base URL
   * @param apiKey - Twenty CRM API key
   * @returns Test connection result with ok status, latency, and message
   */
  async testConnection(
    baseUrl: string,
    apiKey: string
  ): Promise<TwentyCrmTestConnectionResult> {
    const startTime = performance.now();

    // Create a REST client with test-specific config (no retries for connection test)
    const client = new TwentyCrmRestClient({
      baseUrl,
      apiKey,
      timeout: TEST_CONNECTION_TIMEOUT,
      maxRetries: 0, // No retries for connection test
    });

    // Test connection by calling the metadata endpoint
    const response = await client.get<Record<string, unknown>>('/rest/metadata', {
      skipRetry: true,
    });

    const latencyMs = Math.round(performance.now() - startTime);

    // Handle response using discriminated union
    if (response.success) {
      return {
        ok: true,
        latencyMs,
        message: 'Successfully connected to Twenty CRM',
        details: {
          status: 200,
        },
      };
    }

    // Handle error response
    const error = response.error;

    return {
      ok: false,
      latencyMs,
      message: error.message,
      details: {
        status: error.status,
        error: error.code,
      },
    };
  }

  /**
   * Validates that the base URL is reachable (basic connectivity check)
   * Does not require authentication
   *
   * @param baseUrl - Twenty CRM base URL
   * @returns Whether the URL is reachable
   */
  async isReachable(baseUrl: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(baseUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 401 || response.status === 403;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  }
}
