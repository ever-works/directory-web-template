import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/use-current-user';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';

// Types for billing data
export interface PaymentHistoryItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  plan: string;
  planId: string;
  status: string;
  billingInterval: string;
  paymentProvider: string;
  subscriptionId: string;
  description: string;
  invoiceUrl?: string | null;
  invoiceNumber?: string | null;
}

export interface SubscriptionInfo {
  hasActiveSubscription: boolean;
  currentSubscription?: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    startDate: string;
    endDate: string;
    nextBillingDate: string;
    paymentProvider: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    billingInterval: string;
    currentPeriodEnd?: string;
    currentPeriodStart?: string;
  };
  subscriptionHistory?: Array<{
    id: string;
    planId: string;
    planName: string;
    status: string;
    startDate: string;
    endDate: string;
    cancelledAt?: string;
    cancelReason?: string;
    amount: number;
    currency: string;
    billingInterval: string;
    currentPeriodEnd?: string;
    currentPeriodStart?: string;
  }>;
}

// Query keys for React Query
export const billingQueryKeys = {
  all: ['billing'] as const,
  subscription: () => [...billingQueryKeys.all, 'subscription'] as const,
  payments: () => [...billingQueryKeys.all, 'payments'] as const,
  user: (userId: string) => [...billingQueryKeys.all, 'user', userId] as const,
};

// API functions
const fetchSubscription = async (): Promise<SubscriptionInfo> => {
  const response = await serverClient.get<SubscriptionInfo>('/api/user/subscription');
  if (apiUtils.isSuccess(response)) {
    return response.data;
  }
  throw new Error(apiUtils.getErrorMessage(response) || 'Failed to fetch subscription data');
};

const fetchPayments = async (): Promise<PaymentHistoryItem[]> => {
  const response = await serverClient.get<PaymentHistoryItem[]>('/api/user/payments');
  if (apiUtils.isSuccess(response)) {
    return response.data;
  }
  throw new Error(apiUtils.getErrorMessage(response) || 'Failed to fetch payment data');
};


export function useBillingData() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Subscription query
  const subscriptionQuery = useQuery({
    queryKey: billingQueryKeys.subscription(),
    queryFn: fetchSubscription,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes (formerly cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Payments query
  const paymentsQuery = useQuery({
    queryKey: billingQueryKeys.payments(),
    queryFn: fetchPayments,
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000,    // 15 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Refresh mutations
  const refreshSubscriptionMutation = useMutation({
    mutationFn: fetchSubscription,
    onSuccess: (data) => {
      queryClient.setQueryData(billingQueryKeys.subscription(), data);
    },
  });

  const refreshPaymentsMutation = useMutation({
    mutationFn: fetchPayments,
    onSuccess: (data) => {
      queryClient.setQueryData(billingQueryKeys.payments(), data);
    },
  });

  // Combined refresh mutation
  const refreshAllMutation = useMutation({
    mutationFn: async () => {
      const [subscription, payments] = await Promise.all([
        fetchSubscription(),
        fetchPayments(),
      ]);
      return { subscription, payments };
    },
    onSuccess: ({ subscription, payments }) => {
      queryClient.setQueryData(billingQueryKeys.subscription(), subscription);
      queryClient.setQueryData(billingQueryKeys.payments(), payments);
    },
  });

  // Utility functions
  const refresh = async (): Promise<void> => {
    await refreshAllMutation.mutateAsync();
  };

  const refreshSubscription = async (): Promise<void> => {
    await refreshSubscriptionMutation.mutateAsync();
  };

  const refreshPayments = async (): Promise<void> => {
    await refreshPaymentsMutation.mutateAsync();
  };

  const clearCache = (): void => {
    queryClient.removeQueries({ queryKey: billingQueryKeys.all });
  };

  const invalidateCache = (): void => {
    queryClient.invalidateQueries({ queryKey: billingQueryKeys.all });
  };

  // Computed state
  const loading = subscriptionQuery.isLoading || paymentsQuery.isLoading;
  const error = subscriptionQuery.error || paymentsQuery.error;
  const isStale = subscriptionQuery.isStale || paymentsQuery.isStale;
  const lastUpdated = subscriptionQuery.dataUpdatedAt || paymentsQuery.dataUpdatedAt;

  // Combined data
  const subscription = subscriptionQuery.data || null;
  const payments = paymentsQuery.data || [];

  return {
    // Data
    subscription,
    payments,
    
    // State
    loading,
    error: error instanceof Error ? error.message : null,
    lastUpdated: lastUpdated ? new Date(lastUpdated) : null,
    isStale,
    
    // Individual query states
    subscriptionQuery,
    paymentsQuery,
    
    // Mutations
    refresh,
    refreshSubscription,
    refreshPayments,
    
    // Cache management
    clearCache,
    invalidateCache,
    
    // Mutation states
    isRefreshing: refreshAllMutation.isPending,
    isRefreshingSubscription: refreshSubscriptionMutation.isPending,
    isRefreshingPayments: refreshPaymentsMutation.isPending,
  };
}

/**
 * Hook for optimistic updates when subscription changes
 */
export function useOptimisticSubscriptionUpdate() {
  const queryClient = useQueryClient();

  const updateSubscriptionOptimistically = (updates: Partial<SubscriptionInfo>) => {
    queryClient.setQueryData<SubscriptionInfo>(
      billingQueryKeys.subscription(),
      (oldData) => {
        if (!oldData) return oldData;
        return { ...oldData, ...updates };
      }
    );
  };

  const revertSubscriptionUpdate = () => {
    queryClient.invalidateQueries({ queryKey: billingQueryKeys.subscription() });
  };

  return {
    updateSubscriptionOptimistically,
    revertSubscriptionUpdate,
  };
}

/**
 * Hook for prefetching billing data
 */
export function usePrefetchBillingData() {
  const queryClient = useQueryClient();

  const prefetchSubscription = () => {
    queryClient.prefetchQuery({
      queryKey: billingQueryKeys.subscription(),
      queryFn: fetchSubscription,
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchPayments = () => {
    queryClient.prefetchQuery({
      queryKey: billingQueryKeys.payments(),
      queryFn: fetchPayments,
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchAll = () => {
    Promise.all([prefetchSubscription(), prefetchPayments()]);
  };

  return {
    prefetchSubscription,
    prefetchPayments,
    prefetchAll,
  };
}
