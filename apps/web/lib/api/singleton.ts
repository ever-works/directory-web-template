import type { ApiClientConfig } from './types';
import { ApiClient } from './api-client-class';

/**
 * Singleton manager for ApiClient instances
 */
class ApiClientSingleton {
	private static instance: ApiClient | null = null;

	private constructor() {
		// Prevents direct instantiation
	}

	/**
	 * Gets the unique instance of the API client
	 * @param config - Optional configuration for the API client
	 * @returns Unique instance of the API client
	 */
	public static getInstance(config?: ApiClientConfig): ApiClient {
		if (!ApiClientSingleton.instance) {
			ApiClientSingleton.instance = new ApiClient(config);
		}
		return ApiClientSingleton.instance;
	}

	/**
	 * Resets the singleton instance (useful for tests)
	 */
	public static resetInstance(): void {
		ApiClientSingleton.instance = null;
	}
}

/**
 * Public entry-point for the shared {@link ApiClient} singleton.
 *
 * Returns the existing instance if one was created earlier in the
 * process; otherwise creates one from `config`. The `config` argument
 * is therefore only honoured on the FIRST call — subsequent calls
 * ignore it and return the already-configured instance. Use the
 * `ApiClientSingleton.resetInstance()` test helper if you need to
 * re-configure between tests.
 *
 * @see ApiClientSingleton.getInstance
 */
export const getApiClient = ApiClientSingleton.getInstance;
