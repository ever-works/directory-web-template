/**
 * useStripeProducts Hook
 *
 * Client-side hook to fetch products from Stripe when dynamic pricing is enabled.
 * Uses React Query for caching and automatic refetching.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useStripeProducts();
 *
 * if (data?.products) {
 *   // Use dynamic products
 * }
 * if (data?.stripeConfig) {
 *   // Use multi-currency price IDs
 * }
 * ```
 */

import { useQuery } from '@tanstack/react-query';
import type { StripeProductsResponse } from '@/lib/services/stripe-products.service';
import type { PlanConfig } from '@/lib/config/billing';

// Extended response including stripeConfig
export interface StripeProductsApiResponse extends StripeProductsResponse {
	stripeConfig?: Record<'premium' | 'standard' | 'free', PlanConfig>;
}

interface UseStripeProductsOptions {
	/**
	 * Whether to enable fetching products
	 * @default true if NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING is 'true'
	 */
	enabled?: boolean;

	/**
	 * Stale time in milliseconds
	 * @default 300000 (5 minutes)
	 */
	staleTime?: number;
}

/**
 * Check if Stripe dynamic pricing is enabled (client-side)
 */
export function isStripeDynamicPricingEnabled(): boolean {
	return process.env.NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING === 'true';
}

/**
 * Fetch Stripe products from the API
 */
async function fetchStripeProducts(): Promise<StripeProductsApiResponse> {
	const response = await fetch('/api/stripe/products', {
		method: 'GET',
		headers: {
			'Content-Type': 'application/json'
		},
		cache: 'no-store'
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to fetch products');
	}

	return response.json();
}

/**
 * Hook to fetch Stripe products for dynamic pricing
 * Returns products, prices, sponsorAds, and stripeConfig (multi-currency price IDs)
 */
export function useStripeProducts(options: UseStripeProductsOptions = {}) {
	const { enabled = isStripeDynamicPricingEnabled(), staleTime = 5 * 60 * 1000 } = options;

	return useQuery<StripeProductsApiResponse, Error>({
		queryKey: ['stripe-products'],
		queryFn: fetchStripeProducts,
		enabled,
		staleTime,
		gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
		retry: 2,
		retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
	});
}

/**
 * Hook to check if dynamic pricing is being used
 * Returns true only if dynamic pricing is enabled AND products were fetched successfully
 */
export function useDynamicPricingStatus() {
	const { data, isSuccess } = useStripeProducts({
		enabled: isStripeDynamicPricingEnabled()
	});

	return {
		isDynamicPricingActive: isStripeDynamicPricingEnabled() && isSuccess && !!data?.products?.length,
		hasProducts: !!data?.products?.length,
		hasSponsorPricing: !!(data?.sponsorAds?.weekly && data?.sponsorAds?.monthly),
		hasStripeConfig: !!data?.stripeConfig
	};
}
