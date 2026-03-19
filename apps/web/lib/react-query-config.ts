import { QueryClient } from '@tanstack/react-query';

/**
 * React Query configuration optimized for billing and subscription management
 * 
 * Features:
 * - Optimized stale times for different data types
 * - Background refetching on window focus
 * - Automatic retry with exponential backoff
 * - Cache garbage collection
 * - DevTools integration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time - data is considered fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Default garbage collection time - data kept in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Retry failed requests up to 3 times
      retry: (failureCount, error) => {
        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('4')) {
          return false;
        }
        
        // Don't retry on authentication errors
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        
        return failureCount < 3;
      },
      
      // Exponential backoff with jitter
      retryDelay: (attemptIndex) => {
        const baseDelay = 1000 * Math.pow(2, attemptIndex);
        const jitter = Math.random() * 0.3 + 0.85; // 85% to 115% of base delay
        return Math.min(baseDelay * jitter, 30000); // Cap at 30 seconds
      },
      
      // Refetch on window focus for real-time updates
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Refetch on mount if data is stale
      refetchOnMount: true,

      notifyOnChangeProps: ['data', 'error', 'isLoading', 'isFetching'],
    },
    mutations: {
      // Retry failed mutations
      retry: 1,

    },
  },
});

/**
 * Query key factory for consistent cache management
 */
export const queryKeys = {
  billing: {
    all: ['billing'] as const,
    subscription: () => [...queryKeys.billing.all, 'subscription'] as const,
    payments: () => [...queryKeys.billing.all, 'payments'] as const,
    user: (userId: string) => [...queryKeys.billing.all, 'user', userId] as const,
  },
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
  },
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    subscriptions: () => [...queryKeys.admin.all, 'subscriptions'] as const,
    payments: () => [...queryKeys.admin.all, 'payments'] as const,
  },
};

/**
 * Prefetch strategies for better UX
 */
export const prefetchStrategies = {
  // Prefetch billing data when user navigates to settings
  billing: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.billing.subscription(),
      queryFn: async () => {
        // This will be replaced with actual API call
        return null;
      },
      staleTime: 5 * 60 * 1000,
    });
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.billing.payments(),
      queryFn: async () => {
        // This will be replaced with actual API call
        return null;
      },
      staleTime: 10 * 60 * 1000,
    });
  },
  
  // Prefetch user profile data
  userProfile: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.user.profile(),
      queryFn: async () => {
        // This will be replaced with actual API call
        return null;
      },
      staleTime: 10 * 60 * 1000,
    });
  },
};

/**
 * Cache invalidation utilities
 */
export const cacheUtils = {
  // Invalidate all billing-related queries
  invalidateBilling: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
  },
  
  // Invalidate specific billing data
  invalidateSubscription: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
  },
  
  invalidatePayments: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.payments() });
  },
  
  // Remove all billing data from cache
  removeBilling: () => {
    queryClient.removeQueries({ queryKey: queryKeys.billing.all });
  },
  
  // Reset entire query cache
  resetCache: () => {
    queryClient.clear();
  },
};
