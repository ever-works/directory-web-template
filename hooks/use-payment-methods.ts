'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentMethodData {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
    country?: string;
    fingerprint?: string;
  };
  billing_details?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
  created: number;
  metadata?: Record<string, string>;
  is_default?: boolean;
}

export interface PaymentMethodsResponse {
  success: boolean;
  data: PaymentMethodData[];
  message?: string;
}

interface PaymentMethodError extends Error {
  status?: number;
  code?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const PAYMENT_METHODS_QUERY_KEY = ['payment-methods'] as const;

const CACHE_CONFIG = {
  STALE_TIME: 2 * 60 * 1000, // 2 minutes
  GC_TIME: 10 * 60 * 1000,   // 10 minutes
} as const;

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchPaymentMethods = async (): Promise<PaymentMethodsResponse> => {
  const response = await serverClient.get<PaymentMethodsResponse>('/api/stripe/payment-methods/list');

  if (!apiUtils.isSuccess(response)) {
    const error = new Error(apiUtils.getErrorMessage(response)) as PaymentMethodError;
    throw error;
  }

  return response.data;
};

const deletePaymentMethod = async (paymentMethodId: string): Promise<{ success: boolean }> => {
  const response = await serverClient.delete<{ success: boolean }>('/api/stripe/payment-methods/delete', {
    body: JSON.stringify({ paymentMethodId }),
  });

  if (!apiUtils.isSuccess(response)) {
    const error = new Error(apiUtils.getErrorMessage(response)) as PaymentMethodError;
    throw error;
  }

  return response.data;
};

const createPaymentMethod = async (setupIntentId: string, setAsDefault = false): Promise<PaymentMethodData> => {
  const response = await serverClient.post<{ data: PaymentMethodData }>('/api/stripe/payment-methods/create', {
    setup_intent_id: setupIntentId,
    set_as_default: setAsDefault
  });

  if (!apiUtils.isSuccess(response)) {
    const error = new Error(apiUtils.getErrorMessage(response)) as PaymentMethodError;
    throw error;
  }

  return response.data.data;
};

const updatePaymentMethod = async (paymentMethodId: string, updateData: any): Promise<PaymentMethodData> => {
  const response = await serverClient.put<{ data: PaymentMethodData }>('/api/stripe/payment-methods/update', {
    payment_method_id: paymentMethodId,
    ...updateData
  });

  if (!apiUtils.isSuccess(response)) {
    const error = new Error(apiUtils.getErrorMessage(response)) as PaymentMethodError;
    throw error;
  }

  return response.data.data;
};

const setDefaultPaymentMethod = async (paymentMethodId: string): Promise<{ success: boolean }> => {
  const response = await serverClient.patch<{ success: boolean }>('/api/stripe/payment-methods/update', {
    payment_method_id: paymentMethodId
  });

  if (!apiUtils.isSuccess(response)) {
    const error = new Error(apiUtils.getErrorMessage(response)) as PaymentMethodError;
    throw error;
  }

  return response.data;
};

// ============================================================================
// MAIN HOOK
// ============================================================================

export function usePaymentMethods() {
  const queryClient = useQueryClient();

  // Query for fetching payment methods
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isSuccess
  } = useQuery<PaymentMethodsResponse, PaymentMethodError>({
    queryKey: PAYMENT_METHODS_QUERY_KEY,
    queryFn: fetchPaymentMethods,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error.status === 401 || error.status === 403) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Mutation for deleting payment methods
  const deleteMutation = useMutation<{ success: boolean }, PaymentMethodError, string>({
    mutationFn: deletePaymentMethod,
    onSuccess: (_, paymentMethodId) => {
      queryClient.setQueryData<PaymentMethodsResponse>(
        PAYMENT_METHODS_QUERY_KEY,
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.filter(method => method.id !== paymentMethodId)
          };
        }
      );

      toast.success('Payment method deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting payment method:', error);
      toast.error(error.message || 'Failed to delete payment method');

      // Refetch to ensure data consistency
      refetch();
    }
  });

  // Mutation for creating payment methods
  const createMutation = useMutation<PaymentMethodData, PaymentMethodError, { setupIntentId: string; setAsDefault?: boolean }>({
    mutationFn: ({ setupIntentId, setAsDefault }) => createPaymentMethod(setupIntentId, setAsDefault),
    onSuccess: (newPaymentMethod) => {
      // Optimistically update the cache
      queryClient.setQueryData<PaymentMethodsResponse>(
        PAYMENT_METHODS_QUERY_KEY,
        (oldData) => {
          if (!oldData) return { success: true, data: [newPaymentMethod] };
          return {
            ...oldData,
            data: [...oldData.data, newPaymentMethod]
          };
        }
      );

      toast.success('Payment method added successfully');
    },
    onError: (error) => {
      console.error('Error creating payment method:', error);
      toast.error(error.message || 'Failed to add payment method');
    }
  });

  // Mutation for updating payment methods
  const updateMutation = useMutation<PaymentMethodData, PaymentMethodError, { paymentMethodId: string; updateData: any }>({
    mutationFn: ({ paymentMethodId, updateData }) => updatePaymentMethod(paymentMethodId, updateData),
    onSuccess: (updatedPaymentMethod) => {
      // Optimistically update the cache
      queryClient.setQueryData<PaymentMethodsResponse>(
        PAYMENT_METHODS_QUERY_KEY,
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.map(method =>
              method.id === updatedPaymentMethod.id ? updatedPaymentMethod : method
            )
          };
        }
      );

      toast.success('Payment method updated successfully');
    },
    onError: (error) => {
      console.error('Error updating payment method:', error);
      toast.error(error.message || 'Failed to update payment method');

      // Refetch to ensure data consistency
      refetch();
    }
  });

  // Mutation for setting default payment method
  const setDefaultMutation = useMutation<{ success: boolean }, PaymentMethodError, string>({
    mutationFn: setDefaultPaymentMethod,
    onSuccess: (_, _paymentMethodId) => {
      // Optimistically update the cache - this would require additional logic to track default
      toast.success('Default payment method updated successfully');

      // Refetch to get updated default status
      refetch();
    },
    onError: (error) => {
      console.error('Error setting default payment method:', error);
      toast.error(error.message || 'Failed to set default payment method');
    }
  });

  // Derived values
  const paymentMethods = data?.data || [];
  const hasPaymentMethods = paymentMethods.length > 0;

  // Actions
  const deletePaymentMethodAction = useCallback((paymentMethodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }
    deleteMutation.mutate(paymentMethodId);
  }, [deleteMutation]);

  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
  }, [queryClient]);

  const clearCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
  }, [queryClient]);

  return {
    // Data
    paymentMethods,
    hasPaymentMethods,

    // Status
    isLoading,
    isError,
    isSuccess,
    error,

    // Actions
    refetch,
    deletePaymentMethod: deletePaymentMethodAction,
    isDeleting: deleteMutation.isPending,

    // New actions
    createPaymentMethod: createMutation.mutate,
    createPaymentMethodAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updatePaymentMethod: updateMutation.mutate,
    updatePaymentMethodAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    setDefaultPaymentMethod: setDefaultMutation.mutate,
    setDefaultPaymentMethodAsync: setDefaultMutation.mutateAsync,
    isSettingDefault: setDefaultMutation.isPending,
    setDefaultError: setDefaultMutation.error,

    // Cache management
    invalidateCache,
    clearCache
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getCardBrandInfo = (brand: string) => {
  switch (brand?.toLowerCase()) {
    case 'visa':
      return { 
        color: 'from-blue-500 to-blue-700', 
        text: 'VISA',
        bgColor: 'bg-blue-500'
      };
    case 'mastercard':
      return { 
        color: 'from-red-500 to-orange-500', 
        text: 'MC',
        bgColor: 'bg-red-500'
      };
    case 'amex':
    case 'american_express':
      return { 
        color: 'from-green-500 to-green-700', 
        text: 'AMEX',
        bgColor: 'bg-green-500'
      };
    case 'discover':
      return { 
        color: 'from-orange-500 to-orange-700', 
        text: 'DISC',
        bgColor: 'bg-orange-500'
      };
    default:
      return { 
        color: 'from-gray-500 to-gray-700', 
        text: brand?.toUpperCase().substring(0, 4) || 'CARD',
        bgColor: 'bg-gray-500'
      };
  }
};


export const isCardExpired = (month: number, year: number): boolean => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  return year < currentYear || (year === currentYear && month < currentMonth);
};

export const isCardExpiringSoon = (month: number, year: number): boolean => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // Consider "expiring soon" as within 2 months
  const expiryDate = new Date(year, month - 1);
  const twoMonthsFromNow = new Date(currentYear, currentMonth + 1);
  
  return expiryDate <= twoMonthsFromNow && !isCardExpired(month, year);
};
