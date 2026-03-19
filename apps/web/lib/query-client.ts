import { isServer, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';


export function createQueryClientInstance(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
				gcTime: 10 * 60 * 1000, // 10 minutes - cache retention
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
