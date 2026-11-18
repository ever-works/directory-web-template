import { isServer, QueryClient, timeoutManager } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Server-side timers for TanStack Query (Spec 061).
 *
 * During SSR every `useQuery` builds a query and schedules its garbage-collection
 * timer for that hook's `gcTime` (5, 10, 30 minutes, a day...). A timer started
 * during a request keeps that request's whole async context alive until it fires:
 * the render streams, the RSC payload, the request stores. Under crawler traffic that
 * was ~1 MB per page held for minutes, gigabytes in total, and the pods were
 * OOM-killed. On the server a query client lives for one request, so its long timers
 * are useless: they are not scheduled at all. Short ones (retry back-off, at most
 * 30 s here) still run.
 */
const SERVER_MAX_QUERY_TIMER_MS = 60_000;
if (isServer) {
	timeoutManager.setTimeoutProvider<ReturnType<typeof setTimeout> | 0>({
		setTimeout: (callback, delay) => (delay >= SERVER_MAX_QUERY_TIMER_MS ? 0 : setTimeout(callback, delay)),
		clearTimeout: (id) => {
			if (id) clearTimeout(id);
		},
		setInterval: (callback, delay) => (delay >= SERVER_MAX_QUERY_TIMER_MS ? 0 : setInterval(callback, delay)),
		clearInterval: (id) => {
			if (id) clearInterval(id);
		}
	});
}

export function createQueryClientInstance(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
				// 10 minutes in the browser. On the server a client lives for one request: a
				// finite gcTime schedules a timer per query, and that timer keeps the whole
				// request's async context (render streams, RSC payload) alive until it fires,
				// so every page that prefetched held ~1 MB for 10 minutes (Spec 061).
				// Infinity schedules no timer (TanStack Query's own server default).
				gcTime: isServer ? Infinity : 10 * 60 * 1000,
				refetchOnWindowFocus: false, // Prevent excessive refetching
				refetchOnMount: false, // Don't refetch if data is fresh
				refetchOnReconnect: true, // Refetch on network reconnect
				retry: (failureCount) => {
					// Simple retry logic - retry network/server errors up to 2 times
					// Removed flawed string matching logic that caused false positives
					return failureCount < 2;
				},
				retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
			},
			mutations: {
				retry: 1, // Retry mutations once on failure
				onError: (error) => {
					const message = error.message;
					toast.error(`Mutation Error: ${message}`);
					console.error('Global Mutation Error:', error);
				}
			}
		}
	});
}

let browserQueryClient: QueryClient | undefined = undefined;

export const getQueryClient = () => {
	if (isServer) {
		return createQueryClientInstance();
	} else {
		if (!browserQueryClient) browserQueryClient = createQueryClientInstance();
		return browserQueryClient;
	}
};
