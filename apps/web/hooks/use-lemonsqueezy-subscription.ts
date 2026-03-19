import { useMutation, useQueryClient } from '@tanstack/react-query';
import { serverClient } from '@/lib/api/server-api-client';

/**
 * Types for subscription actions
 */
export interface UpdateSubscriptionPlanData {
  subscriptionId: string;
  variantId: number;
  proration?: 'immediate' | 'next_period';
  invoiceImmediately?: boolean;
  disableProrations?: boolean;
  billingAnchor?: number;
}

export interface CancelSubscriptionData {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
}

export interface PauseSubscriptionData {
  subscriptionId: string;
  pauseMode?: 'void' | 'free';
  pauseUntil?: string; 
}

export interface ResumeSubscriptionData {
  subscriptionId: string;
}

export interface ReactivateSubscriptionData {
  subscriptionId: string;
}

/**
 * Hook for managing subscription actions
 */
export function useSubscriptionActions() {
  const queryClient = useQueryClient();

  // Update subscription plan
  const updatePlan = useMutation({
    mutationFn: async (data: UpdateSubscriptionPlanData) => {
      const response = await serverClient.post('/api/lemonsqueezy/update-plan', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch subscription data
      queryClient.invalidateQueries({ queryKey: ['lemonsqueezy-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['lemonsqueezy-stats'] });
    },
  });

  // Cancel subscription
  const cancelSubscription = useMutation({
    mutationFn: async (data: CancelSubscriptionData) => {
      const response = await serverClient.post('/api/lemonsqueezy/cancel', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lemonsqueezy-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['lemonsqueezy-stats'] });
    },
  });

  // Pause subscription
  const pauseSubscription = useMutation({
    mutationFn: async (data: PauseSubscriptionData) => {
      const response = await serverClient.post('/api/lemonsqueezy/pause', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lemonsqueezy-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['lemonsqueezy-stats'] });
    },
  });

  // Resume subscription
  const resumeSubscription = useMutation({
    mutationFn: async (data: ResumeSubscriptionData) => {
      const response = await serverClient.post('/api/lemonsqueezy/resume', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lemonsqueezy-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['lemonsqueezy-stats'] });
    },
  });

  // Reactivate subscription
  const reactivateSubscription = useMutation({
    mutationFn: async (data: ReactivateSubscriptionData) => {
      const response = await serverClient.post('/api/lemonsqueezy/reactivate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lemonsqueezy-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['lemonsqueezy-stats'] });
    },
  });

  return {
    updatePlan,
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    reactivateSubscription,
  };
}
