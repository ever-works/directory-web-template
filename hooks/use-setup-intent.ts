'use client';

import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

export const SETUP_INTENT_QUERY_KEY = ['setup-intent'] as const;

const CACHE_CONFIG = {
	STALE_TIME: 5 * 60 * 1000, // 5 minutes
	GC_TIME: 30 * 60 * 1000, // 30 minutes
	MAX_RETRIES: 3
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SetupIntentError extends Error {
	status?: number;
	code?: string;
}

interface SetupIntentData {
	id: string;
	client_secret: string;
	status: 'requires_payment_method' | 'requires_confirmation' | 'processing' | 'succeeded' | 'canceled';
	usage: 'off_session' | 'on_session';
	customer?: string;
	payment_method?: string;
	created: number;
	metadata?: Record<string, string>;
}

interface SetupIntentResponse extends SetupIntentData {
	success?: boolean;
	message?: string;
}

interface CreateSetupIntentParams {
	customer_id?: string;
	payment_method_types?: string[];
	usage?: 'off_session' | 'on_session';
	metadata?: Record<string, string>;
	// Custom parameters for the API
	customer_name?: string;
	set_as_default?: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Creates a new SetupIntent for saving payment methods
 */
const createSetupIntent = async (params?: CreateSetupIntentParams): Promise<SetupIntentResponse> => {
	try {
		const response = await serverClient.post<SetupIntentResponse>('/api/stripe/setup-intent', params);

		if (!apiUtils.isSuccess(response)) {
			const errorMessage = apiUtils.getErrorMessage(response) || 'Failed to create setup intent';
			const error = new Error(errorMessage) as SetupIntentError;
			error.status = 'status' in response ? (response.status as number) : undefined;
			error.code = 'API_ERROR';
			throw error;
		}

		if (!response.data) {
			const error = new Error('No setup intent data received from server') as SetupIntentError;
			error.status = 204;
			error.code = 'NO_DATA';
			throw error;
		}

		return response.data;
	} catch (error) {
		// Re-throw SetupIntentError as-is
		if (error instanceof Error && 'status' in error) {
			throw error;
		}

		// Wrap unknown errors
		const wrappedError = new Error('Failed to create setup intent') as SetupIntentError;
		wrappedError.status = undefined;
		wrappedError.code = 'UNKNOWN_ERROR';
		wrappedError.cause = error;
		throw wrappedError;
	}
};

/**
 * Creates a new SetupIntent with custom parameters (customer_name, set_as_default)
 */
const createSetupIntentWithCustomParams = async (params: {
	customer_name: string;
	set_as_default?: boolean;
}): Promise<{ client_secret: string }> => {
	try {
		const response = await serverClient.post<{ client_secret: string }>('/api/stripe/setup-intent', params);

		if (!apiUtils.isSuccess(response)) {
			const errorMessage = apiUtils.getErrorMessage(response) || 'Error creating SetupIntent';
			const error = new Error(errorMessage) as SetupIntentError;
			error.status = 'status' in response ? (response.status as number) : undefined;
			error.code = 'API_ERROR';
			throw error;
		}

		if (!response.data) {
			const error = new Error('No client_secret received from server') as SetupIntentError;
			error.status = 204;
			error.code = 'NO_DATA';
			throw error;
		}

		return response.data;
	} catch (error) {
		// Re-throw SetupIntentError as-is
		if (error instanceof Error && 'status' in error) {
			throw error;
		}

		// Wrap unknown errors
		const wrappedError = new Error('Failed to create setup intent with custom params') as SetupIntentError;
		wrappedError.status = undefined;
		wrappedError.code = 'UNKNOWN_ERROR';
		wrappedError.cause = error;
		throw wrappedError;
	}
};

/**
 * Retrieves an existing SetupIntent by ID
 */
const getSetupIntent = async (setupIntentId: string): Promise<SetupIntentResponse> => {
	try {
		const response = await serverClient.get<SetupIntentResponse>(`/api/stripe/setup-intent/${setupIntentId}`);

		if (!apiUtils.isSuccess(response)) {
			const errorMessage = apiUtils.getErrorMessage(response) || 'Failed to retrieve setup intent';
			const error = new Error(errorMessage) as SetupIntentError;
			error.status = 'status' in response ? (response.status as number) : undefined;
			error.code = 'API_ERROR';
			throw error;
		}

		if (!response.data) {
			const error = new Error('Setup intent not found') as SetupIntentError;
			error.status = 404;
			error.code = 'NOT_FOUND';
			throw error;
		}

		return response.data;
	} catch (error) {
		if (error instanceof Error && 'status' in error) {
			throw error;
		}

		const wrappedError = new Error('Failed to retrieve setup intent') as SetupIntentError;
		wrappedError.status = undefined;
		wrappedError.code = 'UNKNOWN_ERROR';
		wrappedError.cause = error;
		throw wrappedError;
	}
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Determines if an error should be retried based on its characteristics
 */
const shouldRetryError = (failureCount: number, error: SetupIntentError): boolean => {
	// Don't retry if we've exceeded max retries
	if (failureCount >= CACHE_CONFIG.MAX_RETRIES) {
		return false;
	}

	// Don't retry authentication/authorization errors
	if (error.status === 401 || error.status === 403) {
		return false;
	}

	// Don't retry client errors (4xx) except for specific cases
	if (error.status && error.status >= 400 && error.status < 500) {
		// Retry rate limiting and timeout errors
		return error.status === 429 || error.status === 408;
	}

	// Don't retry if setup intent is not found (expected for new users)
	if (error.status === 204 || error.code === 'NO_DATA') {
		return false;
	}

	// Retry server errors (5xx) and network errors
	return true;
};

/**
 * Handles error notifications with appropriate user messaging
 */
const handleSetupIntentError = (error: SetupIntentError, context: string) => {
	console.error(`Setup Intent Error (${context}):`, error);

	// Don't show toast for expected errors
	if (error.status === 204 || error.code === 'NO_DATA') {
		return;
	}

	// Show user-friendly error messages
	const userMessage =
		error.status === 401
			? 'Please log in to continue'
			: error.status === 403
				? 'You do not have permission to perform this action'
				: error.status === 429
					? 'Too many requests. Please try again later'
					: 'Failed to process payment setup. Please try again';

	toast.error(userMessage);
};

// ============================================================================
// MAIN HOOK
// ============================================================================

interface UseSetupIntentOptions {
	enabled?: boolean;
	params?: CreateSetupIntentParams;
	onSuccess?: (data: SetupIntentResponse) => void;
	onError?: (error: SetupIntentError) => void;
	suppressSuccessToast?: boolean;
}

/**
 * Hook for managing SetupIntent creation and caching
 * Provides comprehensive error handling, retry logic, and cache management
 */
export function useSetupIntent(options: UseSetupIntentOptions = {}) {
	const { enabled = true, params, onSuccess, onError, suppressSuccessToast = false } = options;
	const queryClient = useQueryClient();

	// Memoize query key to prevent unnecessary re-renders
	const queryKey = useMemo(() => (params ? [...SETUP_INTENT_QUERY_KEY, params] : SETUP_INTENT_QUERY_KEY), [params]);

	const { data, isLoading, isError, error, refetch, isSuccess, isFetching, isStale } = useQuery<
		SetupIntentResponse,
		SetupIntentError
	>({
		queryKey,
		queryFn: () => createSetupIntent(params),
		enabled,
		staleTime: CACHE_CONFIG.STALE_TIME,
		gcTime: CACHE_CONFIG.GC_TIME,
		retry: shouldRetryError
	});

	// Handle success/error callbacks with useEffect
	useEffect(() => {
		if (isSuccess && data) {
			onSuccess?.(data);
			if (!suppressSuccessToast) {
				toast.success('Payment setup ready');
			}
		}
	}, [isSuccess, data, onSuccess, suppressSuccessToast]);

	useEffect(() => {
		if (isError && error) {
			handleSetupIntentError(error, 'useSetupIntent');
			onError?.(error);
		}
	}, [isError, error, onError]);

	// Memoize derived values
	const setupIntent = useMemo(() => data, [data]);
	const clientSecret = useMemo(() => setupIntent?.client_secret, [setupIntent]);
	const isReady = useMemo(
		() => Boolean(isSuccess && setupIntent && clientSecret && setupIntent.status === 'requires_payment_method'),
		[isSuccess, setupIntent, clientSecret]
	);

	// Cache management functions
	const invalidateCache = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: SETUP_INTENT_QUERY_KEY });
	}, [queryClient]);

	const clearCache = useCallback(() => {
		queryClient.removeQueries({ queryKey: SETUP_INTENT_QUERY_KEY });
	}, [queryClient]);

	const prefetch = useCallback(
		async (prefetchParams?: CreateSetupIntentParams) => {
			const prefetchKey = prefetchParams ? [...SETUP_INTENT_QUERY_KEY, prefetchParams] : SETUP_INTENT_QUERY_KEY;

			await queryClient.prefetchQuery({
				queryKey: prefetchKey,
				queryFn: () => createSetupIntent(prefetchParams),
				staleTime: CACHE_CONFIG.STALE_TIME
			});
		},
		[queryClient]
	);

	const setData = useCallback(
		(newData: SetupIntentResponse | null) => {
			queryClient.setQueryData(queryKey, newData);
		},
		[queryClient, queryKey]
	);

	return {
		// Data
		data,
		setupIntent,
		clientSecret,

		// Status
		isLoading,
		isFetching,
		isError,
		isSuccess,
		isReady,
		isStale,
		error,

		// Actions
		refetch,
		invalidateCache,
		clearCache,
		prefetch,
		setData
	};
}

// ============================================================================
// MUTATION HOOK
// ============================================================================

interface UseCreateSetupIntentOptions {
	onSuccess?: (data: SetupIntentResponse) => void;
	onError?: (error: SetupIntentError) => void;
}

/**
 * Hook for creating new SetupIntents with mutation
 * Provides optimistic updates and error handling
 */
export function useCreateSetupIntent(options: UseCreateSetupIntentOptions = {}) {
	const { onSuccess, onError } = options;
	const queryClient = useQueryClient();

	const mutation = useMutation<SetupIntentResponse, SetupIntentError, CreateSetupIntentParams | undefined>({
		mutationFn: createSetupIntent,
		onSuccess: (data, variables) => {
			// Update cache with new data
			const queryKey = variables ? [...SETUP_INTENT_QUERY_KEY, variables] : SETUP_INTENT_QUERY_KEY;

			queryClient.setQueryData(queryKey, data);

			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: SETUP_INTENT_QUERY_KEY });

			onSuccess?.(data);
			toast.success('Payment setup created successfully');
		},
		onError: (error) => {
			handleSetupIntentError(error, 'useCreateSetupIntent');
			onError?.(error);
		}
	});

	return {
		createSetupIntent: mutation.mutate,
		createSetupIntentAsync: mutation.mutateAsync,
		isCreating: mutation.isPending,
		isError: mutation.isError,
		error: mutation.error,
		reset: mutation.reset
	};
}

// ============================================================================
// CACHE MANAGEMENT HOOK
// ============================================================================

/**
 * Utility hook for managing SetupIntent cache across the application
 * Provides comprehensive cache management functions
 */
export function useSetupIntentCache() {
	const queryClient = useQueryClient();

	const invalidateAll = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: SETUP_INTENT_QUERY_KEY });
	}, [queryClient]);

	const clearAll = useCallback(() => {
		queryClient.removeQueries({ queryKey: SETUP_INTENT_QUERY_KEY });
	}, [queryClient]);

	const getFromCache = useCallback(
		(params?: CreateSetupIntentParams): SetupIntentResponse | undefined => {
			const queryKey = params ? [...SETUP_INTENT_QUERY_KEY, params] : SETUP_INTENT_QUERY_KEY;
			return queryClient.getQueryData(queryKey);
		},
		[queryClient]
	);

	const setInCache = useCallback(
		(data: SetupIntentResponse | null, params?: CreateSetupIntentParams) => {
			const queryKey = params ? [...SETUP_INTENT_QUERY_KEY, params] : SETUP_INTENT_QUERY_KEY;
			queryClient.setQueryData(queryKey, data);
		},
		[queryClient]
	);

	const isCached = useCallback(
		(params?: CreateSetupIntentParams): boolean => {
			const queryKey = params ? [...SETUP_INTENT_QUERY_KEY, params] : SETUP_INTENT_QUERY_KEY;
			const cachedData = queryClient.getQueryData(queryKey);
			return cachedData !== undefined;
		},
		[queryClient]
	);

	const prefetchSetupIntent = useCallback(
		async (params?: CreateSetupIntentParams) => {
			const queryKey = params ? [...SETUP_INTENT_QUERY_KEY, params] : SETUP_INTENT_QUERY_KEY;

			await queryClient.prefetchQuery({
				queryKey,
				queryFn: () => createSetupIntent(params),
				staleTime: CACHE_CONFIG.STALE_TIME
			});
		},
		[queryClient]
	);

	return {
		invalidateAll,
		clearAll,
		getFromCache,
		setInCache,
		isCached,
		prefetchSetupIntent
	};
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for retrieving a specific SetupIntent by ID
 */
export function useGetSetupIntent(setupIntentId: string, options: { enabled?: boolean } = {}) {
	const { enabled = true } = options;

	return useQuery<SetupIntentResponse, SetupIntentError>({
		queryKey: [...SETUP_INTENT_QUERY_KEY, 'get', setupIntentId],
		queryFn: () => getSetupIntent(setupIntentId),
		enabled: enabled && !!setupIntentId,
		staleTime: CACHE_CONFIG.STALE_TIME,
		gcTime: CACHE_CONFIG.GC_TIME,
		retry: shouldRetryError
	});
}

/**
 * Hook for creating SetupIntent with custom parameters (customer_name, set_as_default)
 */
export function useCreateSetupIntentWithCustomParams(
	options: { onSuccess?: (data: { client_secret: string }) => void; onError?: (error: SetupIntentError) => void } = {}
) {
	const { onSuccess, onError } = options;
	const queryClient = useQueryClient();

	const mutation = useMutation<
		{ client_secret: string },
		SetupIntentError,
		{ customer_name: string; set_as_default?: boolean }
	>({
		mutationFn: createSetupIntentWithCustomParams,
		onSuccess: (data) => {
			// Optionally invalidate related queries
			queryClient.invalidateQueries({ queryKey: SETUP_INTENT_QUERY_KEY });
			onSuccess?.(data);
		},
		onError: (error) => {
			handleSetupIntentError(error, 'useCreateSetupIntentWithCustomParams');
			onError?.(error);
		}
	});

	return {
		createSetupIntent: mutation.mutate,
		createSetupIntentAsync: mutation.mutateAsync,
		isCreating: mutation.isPending,
		isError: mutation.isError,
		error: mutation.error,
		reset: mutation.reset
	};
}

/**
 * Hook that provides all SetupIntent-related functionality
 * Combines query, mutation, and cache management
 */
export function useSetupIntentManager(params?: CreateSetupIntentParams) {
	const query = useSetupIntent({ params });
	const mutation = useCreateSetupIntent();
	const cache = useSetupIntentCache();

	return {
		// Query data and status
		...query,

		// Mutation functions
		createSetupIntent: mutation.createSetupIntent,
		createSetupIntentAsync: mutation.createSetupIntentAsync,
		isCreating: mutation.isCreating,
		createError: mutation.error,
		resetCreate: mutation.reset,

		// Cache management
		...cache
	};
}
