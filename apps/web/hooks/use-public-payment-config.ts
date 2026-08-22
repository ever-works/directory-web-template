'use client';

/**
 * usePublicPaymentConfig — spec 044.
 *
 * Client-side access to the public payment configuration (Stripe publishable
 * key, dynamic-pricing / demo flags, configured checkout providers).
 *
 * Why a hook and not `process.env`: platform-deployed k8s Works are built once
 * without per-Work env, so `process.env.NEXT_PUBLIC_*` is `undefined` in the
 * browser bundle even though the server has the values at runtime. The hook
 * therefore:
 *
 * 1. starts from the build-time env (`initialData`) so Vercel / demo builds that
 *    DO inline the keys render correctly on first paint, exactly as before;
 * 2. fetches `GET /api/payment/public-config` once per page load (shared React
 *    Query cache, 5 min stale time) and layers the server's runtime values on
 *    top via `mergePublicPaymentConfig` — env values are never lost, so an
 *    unavailable route degrades to the pre-044 behaviour.
 *
 * Works with or without a `<QueryClientProvider>` above it (the root
 * `app/layout.tsx` renders `LayoutThemeProvider` outside one): when no client
 * is in context it falls back to the shared browser client from
 * `lib/query-client`.
 *
 * @example
 * ```tsx
 * const { config, isResolved } = usePublicPaymentConfig();
 * if (config.stripePublishableKey) {
 *   // Stripe.js can be loaded
 * }
 * ```
 */

import { useContext, useMemo } from 'react';
import { QueryClientContext, useQuery } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import {
	EMPTY_PUBLIC_PAYMENT_CONFIG,
	mergePublicPaymentConfig,
	readPublicPaymentConfigFromEnv,
	type PublicPaymentConfig
} from '@/lib/payment/public-config';

export const PUBLIC_PAYMENT_CONFIG_ENDPOINT = '/api/payment/public-config';
export const PUBLIC_PAYMENT_CONFIG_QUERY_KEY = ['payment', 'public-config'] as const;

const PUBLIC_PAYMENT_CONFIG_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const PUBLIC_PAYMENT_CONFIG_GC_TIME = 10 * 60 * 1000; // 10 minutes

export interface PublicPaymentConfigState {
	/** Effective config: runtime (server) values layered over the build-time env. Always defined. */
	config: PublicPaymentConfig;
	/**
	 * True once the first runtime fetch has settled (success or error). Until then
	 * `config` only reflects what the bundle inlined at build time.
	 */
	isResolved: boolean;
	/** True while a fetch (initial or background refresh) is in flight. */
	isFetching: boolean;
	/** True when the last fetch failed — `config` then equals the build-time env. */
	isError: boolean;
}

/**
 * Build-time (inlined) config. Providers are only detected in the browser —
 * same as the pre-044 `LayoutThemeContext.getConfiguredProviders()` — so the
 * server-rendered markup never assumes a provider.
 */
function getBuildTimeConfig(): PublicPaymentConfig {
	const env = readPublicPaymentConfigFromEnv();
	return typeof window === 'undefined' ? { ...env, configuredProviders: [] } : env;
}

async function fetchPublicPaymentConfig(): Promise<PublicPaymentConfig> {
	const response = await fetch(PUBLIC_PAYMENT_CONFIG_ENDPOINT, {
		method: 'GET',
		headers: { Accept: 'application/json' },
		cache: 'no-store'
	});

	if (!response.ok) {
		throw new Error(`Failed to load public payment config (HTTP ${response.status})`);
	}

	// Normalise the shape defensively — an unexpected body (proxy HTML, partial JSON)
	// must never poison the cache with a malformed config.
	const body = (await response.json()) as Partial<PublicPaymentConfig>;
	return mergePublicPaymentConfig(body, EMPTY_PUBLIC_PAYMENT_CONFIG);
}

/**
 * Public payment configuration: build-time env first, then confirmed/extended by
 * `GET /api/payment/public-config` (runtime env).
 */
export function usePublicPaymentConfig(): PublicPaymentConfigState {
	const contextQueryClient = useContext(QueryClientContext);

	const query = useQuery<PublicPaymentConfig, Error>(
		{
			queryKey: PUBLIC_PAYMENT_CONFIG_QUERY_KEY,
			queryFn: fetchPublicPaymentConfig,
			// Build-time env renders on first paint; `initialDataUpdatedAt: 0` marks it
			// stale so the runtime fetch still happens on mount.
			initialData: getBuildTimeConfig,
			initialDataUpdatedAt: 0,
			staleTime: PUBLIC_PAYMENT_CONFIG_STALE_TIME,
			gcTime: PUBLIC_PAYMENT_CONFIG_GC_TIME,
			refetchOnMount: true,
			refetchOnWindowFocus: false,
			retry: 1
		},
		contextQueryClient ?? getQueryClient()
	);

	const config = useMemo(() => mergePublicPaymentConfig(query.data, getBuildTimeConfig()), [query.data]);

	return {
		config,
		isResolved: query.isFetched,
		isFetching: query.isFetching,
		isError: query.isError
	};
}

/** Stripe publishable key (runtime, with build-time env fallback) or `null`. */
export function useStripePublishableKey(): string | null {
	return usePublicPaymentConfig().config.stripePublishableKey;
}

/**
 * Whether Stripe dynamic pricing is enabled (runtime, with build-time env fallback).
 * Hook counterpart of `isStripeDynamicPricingEnabled()` in `hooks/use-stripe-products.ts`.
 */
export function useStripeDynamicPricingEnabled(): boolean {
	return usePublicPaymentConfig().config.dynamicPricing;
}
