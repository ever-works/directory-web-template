'use client';

import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

// Constants
const DEFAULT_CURRENCY = 'USD' as const;
const CURRENCY_QUERY_KEY = ['user-currency'] as const;

// Types
interface CurrencyResponse {
	currency: string | null;
	country: string | null;
	detected: boolean; // Whether currency/country was successfully detected or is a fallback
}

export interface UpdateCurrencyOptions {
	onSuccess?: (currency: string) => void;
	onError?: (error: Error) => void;
}

/**
 * Validates if a currency code is valid (3 uppercase letters)
 */
function isValidCurrencyCode(currency: string): boolean {
	return /^[A-Z]{3}$/.test(currency);
}

/**
 * Normalizes currency code to uppercase
 */
function normalizeCurrency(currency: string): string {
	return currency.trim().toUpperCase();
}

/**
 * Fetch user currency and country from API
 * Works for both authenticated and anonymous users
 * @throws {Error} If the API request fails
 */
async function fetchUserCurrency(): Promise<{ currency: string; country: string | null; detected: boolean }> {
	const response = await serverClient.get<CurrencyResponse>('/api/user/currency');

	if (!apiUtils.isSuccess(response)) {
		throw new Error(apiUtils.getErrorMessage(response) || 'Failed to fetch currency');
	}

	// Handle case where currency might be null (fallback to USD)
	// Always return a valid currency string
	const currency = response.data.currency ? normalizeCurrency(response.data.currency) : DEFAULT_CURRENCY;
	const detected = response.data.detected ?? false; // Default to false if not provided (backward compatibility)

	// Log detection failures for monitoring (only in development)
	if (!detected && process.env.NODE_ENV === 'development') {
		console.info('[useCurrency] Currency detection failed, using fallback:', currency);
	}

	return {
		currency,
		country: response.data.country || null,
		detected
	};
}

/**
 * Hook to get and manage user currency
 *
 * @returns Currency state and update function
 * @throws {Error} If the API request fails
 * @example
 * ```tsx
 * const { currency, updateCurrency, isLoading, isError } = useCurrency();
 *
 * // Update currency
 * updateCurrency('EUR', {
 *   onSuccess: (newCurrency) => console.log(`Currency updated to ${newCurrency}`),
 *   onError: (error) => console.error('Failed to update currency:', error)
 * });
 * ```
 *
 */
export function useCurrency() {
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const isAuthenticated = !!session?.user?.id;

	const {
		data: currencyData,
		isLoading,
		isError,
		error,
		refetch
	} = useQuery<{ currency: string; country: string | null; detected: boolean }>({
		queryKey: CURRENCY_QUERY_KEY,
		queryFn: fetchUserCurrency,
		// Enable for all users (authenticated and anonymous) since API supports both
		enabled: true,
		staleTime: 1000 * 60 * 60, // 1 hour
		gcTime: 1000 * 60 * 60 * 24, // 24 hours
		retry: (failureCount, error) => {
			// Retry up to 2 times for network errors, but not for 4xx errors
			if (failureCount >= 2) return false;
			if (error instanceof Error && 'status' in error) {
				const status = (error as any).status;
				return status >= 500 || status === 0; // Retry on server errors or network failures
			}
			return true;
		},
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
		refetchOnWindowFocus: false,
		refetchOnReconnect: true,
		// Provide default value to avoid undefined
		placeholderData: { currency: DEFAULT_CURRENCY, country: null, detected: false }
	});

	const currency = currencyData?.currency || DEFAULT_CURRENCY;
	const country = currencyData?.country || null;
	const detected = currencyData?.detected ?? false;

	const updateCurrencyMutation = useMutation({
		mutationFn: async (newCurrency: string): Promise<string> => {
			// Check if user is authenticated before allowing update
			if (!isAuthenticated) {
				throw new Error('You must be signed in to update your currency preference');
			}

			const normalizedCurrency = normalizeCurrency(newCurrency);

			// Validate currency format
			if (!isValidCurrencyCode(normalizedCurrency)) {
				throw new Error(`Invalid currency code: ${newCurrency}. Expected 3 uppercase letters (e.g., USD, EUR)`);
			}

			// Don't use cached country when updating currency to avoid stale data
			// Omit country property entirely when null - server schema accepts optional/nullable country
			const payload: { currency: string; country?: string } = {
				currency: normalizedCurrency
			};

			const response = await serverClient.put<CurrencyResponse>('/api/user/currency', payload);

			if (!apiUtils.isSuccess(response)) {
				throw new Error(apiUtils.getErrorMessage(response) || 'Failed to update currency');
			}

			return normalizedCurrency;
		},
		onMutate: async (newCurrency) => {
			// Cancel outgoing refetches to avoid overwriting optimistic update
			await queryClient.cancelQueries({ queryKey: CURRENCY_QUERY_KEY });

			// Snapshot the previous value for rollback
			const previousData = queryClient.getQueryData<{
				currency: string;
				country: string | null;
				detected: boolean;
			}>(CURRENCY_QUERY_KEY);

			// Optimistically update to the new value (preserve existing country and detected state)
			const normalizedCurrency = normalizeCurrency(newCurrency);
			queryClient.setQueryData(CURRENCY_QUERY_KEY, {
				currency: normalizedCurrency,
				country: previousData?.country || null,
				detected: previousData?.detected ?? false
			});

			// Return context with the previous value
			return { previousData };
		},
		onError: (error, _newCurrency, context) => {
			// Rollback to previous value on error
			if (context?.previousData) {
				queryClient.setQueryData(CURRENCY_QUERY_KEY, context.previousData);
			}
		},
		onSettled: () => {
			// Invalidate to refetch from server and ensure consistency
			queryClient.invalidateQueries({ queryKey: CURRENCY_QUERY_KEY });
		}
	});

	/**
	 * Update user currency preference
	 *
	 * @param newCurrency - The new currency code (e.g., 'USD', 'EUR')
	 * @param options - Optional callbacks for success/error handling
	 */
	const updateCurrency = useCallback(
		(newCurrency: string, options?: UpdateCurrencyOptions) => {
			updateCurrencyMutation.mutate(newCurrency, {
				onSuccess: (currency) => {
					options?.onSuccess?.(currency);
				},
				onError: (error) => {
					options?.onError?.(error);
				}
			});
		},
		[updateCurrencyMutation]
	);

	return {
		currency,
		isLoading,
		country,
		detected, // Whether currency was successfully detected or is a fallback
		isError,
		error: error instanceof Error ? error : isError ? new Error('Failed to fetch currency') : null,
		updateCurrency,
		isUpdating: updateCurrencyMutation.isPending,
		refetch
	};
}
