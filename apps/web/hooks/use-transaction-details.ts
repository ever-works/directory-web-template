'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import { PaymentPlan } from '@/lib/constants';

// Types for transaction details
export interface TransactionDetails {
  id: string;
  planType: 'free' | 'pro' | 'premium';
  planName: string;
  price: number;
  paymentType: 'subscription' | 'submission';
  status: 'pending_review' | 'active' | 'approved' | 'published';
  customerEmail: string;
  submissionTitle: string;
  submissionsRemaining?: number;
  nextPaymentDate?: number;
}

export interface StripeSessionData {
  session: {
    id: string;
    amount_total: number;
    metadata?: {
      planType?: string;
      planName?: string;
      paymentType?: string;
      submissionTitle?: string;
    };
    customer_details?: {
      email?: string;
    };
  };
  subscription?: {
    status?: string;
  };
}

interface UseTransactionDetailsOptions {
  sessionId?: string | null;
  planType?:PaymentPlan | null;
  submissionId?: string | null;
  enabled?: boolean;
  autoRefresh?: boolean;
}

interface UseTransactionDetailsReturn {
  transactionDetails: TransactionDetails | null;
  isLoading: boolean;
  error: string | null;
  isError: boolean;
  refetch: () => void;
  invalidateCache: () => Promise<void>;
  isAutoRefreshing: boolean;
}

/**
 * Custom hook to fetch and manage transaction details
 * Uses React Query for caching and server-api-client for requests
 */
export const useTransactionDetails = ({
  sessionId,
  planType,
  submissionId,
  enabled = true,
  autoRefresh = false,
}: UseTransactionDetailsOptions): UseTransactionDetailsReturn => {
  const t = useTranslations('success');
  const queryClient = useQueryClient();

  // State to track refresh status

  // Function to fetch details from Stripe
  const fetchStripeTransactionDetails = useCallback(async (sessionId: string): Promise<TransactionDetails> => {
 
    const response = await serverClient.get<StripeSessionData>(`/api/stripe/checkout?session_id=${sessionId}`);

    if (!apiUtils.isSuccess(response)) {
      throw new Error(apiUtils.getErrorMessage(response) || t("FETCH_TRANSACTION_ERROR"));
    }

    const data = response.data;
    if (!data?.session) {
      throw new Error(t("INVALID_TRANSACTION_DETAILS"));
    }

    const session = data.session;
    const subscription = data.subscription;

    return {
      id: session.id,
      planType: (session.metadata?.planType as 'free' | 'pro' | 'premium') || "pro",
      planName: session.metadata?.planName || "Pro Plan",
      price: session.amount_total / 100,
      paymentType: (session.metadata?.paymentType as 'subscription' | 'submission') || "submission",
      status: (subscription?.status as TransactionDetails['status']) || "pending_review",
      customerEmail: session.customer_details?.email || "N/A",
      submissionTitle: session.metadata?.submissionTitle || "N/A",
    };
  }, [t]);

  const createFreeTransactionDetails = useCallback((submissionId: string): TransactionDetails => {
    return {
      id: submissionId,
      planType: "free",
      planName: "Free Plan",
      price: 0,
      paymentType: "submission",
      status: "pending_review",
      customerEmail: "user@example.com",
      submissionTitle: "My Awesome Product",
    };
  }, []);

  // Dynamic query key based on parameters
  const queryKey = useMemo(() => {
    if (sessionId) {
      return ['transaction-details', 'stripe', sessionId];
    }
    if (planType === 'free' && submissionId) {
      return ['transaction-details', 'free', submissionId];
    }
    return ['transaction-details', 'invalid'];
  }, [sessionId, planType, submissionId]);

  // Query function
  const queryFn = useCallback(async (): Promise<TransactionDetails> => {
    if (sessionId) {
      return fetchStripeTransactionDetails(sessionId);
    }
    
    if (planType === 'free' && submissionId) {
      return createFreeTransactionDetails(submissionId);
    }
    
    throw new Error(t("INVALID_TRANSACTION_DETAILS"));
  }, [sessionId, planType, submissionId, fetchStripeTransactionDetails, createFreeTransactionDetails, t]);

  // Query activation condition
  const shouldFetch = enabled && (
    (sessionId !== null && sessionId !== undefined) ||
    (planType === 'free' && submissionId !== null && submissionId !== undefined)
  );

  // React Query implementation
  const {
    data: transactionDetails,
    isLoading,
    error,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn,
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: (failureCount, error) => {
      if (error.message.includes('INVALID_TRANSACTION_DETAILS')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const isAutoRefreshing = autoRefresh || (transactionDetails?.status === 'pending_review');

  const invalidateCache = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['transaction-details'],
    });
  }, [queryClient]);



  return {
    transactionDetails: transactionDetails || null,
    isLoading,
    error: error?.message || null,
    isError,
    refetch,
    invalidateCache,
    isAutoRefreshing,
  };
};

/**
 * Utility hook for managing transaction cache
 */
export const useTransactionCache = () => {
  const queryClient = useQueryClient();

  const invalidateTransactionCache = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ['transaction-details'],
    });
  }, [queryClient]);

  const clearTransactionCache = useCallback(() => {
    queryClient.removeQueries({
      queryKey: ['transaction-details'],
    });
  }, [queryClient]);

  const prefetchTransaction = useCallback(async (sessionId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ['transaction-details', 'stripe', sessionId],
      queryFn: async () => {
        const response = await serverClient.get<StripeSessionData>(`/api/stripe/checkout?session_id=${sessionId}`);
        if (!apiUtils.isSuccess(response)) {
          throw new Error(apiUtils.getErrorMessage(response));
        }
        return response.data;
      },
      staleTime: 1000 * 60 * 5,
    });
  }, [queryClient]);

  return {
    invalidateTransactionCache,
    clearTransactionCache,
    prefetchTransaction,
  };
};

/**
 * Hook to get transaction details synchronously from cache
 */
export const useTransactionDetailsSync = (sessionId?: string | null, submissionId?: string | null) => {
  const queryClient = useQueryClient();

  return useMemo(() => {
    const queryKey = sessionId 
      ? ['transaction-details', 'stripe', sessionId]
      : submissionId 
        ? ['transaction-details', 'free', submissionId]
        : null;

    if (!queryKey) return null;

    return queryClient.getQueryData<TransactionDetails>(queryKey) || null;
  }, [queryClient, sessionId, submissionId]);
};
