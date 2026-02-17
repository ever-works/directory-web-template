import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckoutData } from '@/lib/payment/types/payment-types';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

/**
 * Types for the API response
 */
export interface CheckoutListResponse {
  success: boolean;
  data: CheckoutData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    totalPages: number;
    currentPage: number;
  };
  filters: {
    status: string;
    customerEmail: string;
    dateRange: string;
    appliedFilters: string[];
  };
  metadata: {
    timestamp: string;
    requestId: string;
    userId: string;
    userEmail: string;
    environment: string;
    version: string;
    method?: string;
  };
}

/**
 * Filter options for checkout queries
 */
export interface CheckoutFilters {
  status?: 'active' | 'cancelled' | 'expired' | 'on_trial' | 'past_due' | 'paused' | 'unpaid';
  limit?: number;
  page?: number;
  customerEmail?: string;
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
}

/**
 * Hook state and actions
 */
export interface UseCheckoutsReturn {
  // Data
  checkouts: CheckoutData[];
  pagination: CheckoutListResponse['pagination'] | null;
  filters: CheckoutListResponse['filters'] | null;
  metadata: CheckoutListResponse['metadata'] | null;
  
  // Loading states
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  
  // Error handling
  error: Error | null;
  errorCode: string | null;
  
  // Actions
  updateFilters: (newFilters: Partial<CheckoutFilters>) => void;
  resetFilters: () => void;
  refresh: () => void;
  invalidateCache: () => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  
  // Current state
  currentFilters: CheckoutFilters;
  hasMore: boolean;
  totalPages: number;
  currentPage: number;
  total: number;
}

/**
 * Configuration options for the hook
 */
export interface UseCheckoutsOptions {
  initialFilters?: CheckoutFilters;
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean | number;
  retryDelay?: number;
  onSuccess?: (data: CheckoutListResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Default filter values
 */
const DEFAULT_FILTERS: CheckoutFilters = {
  limit: 100,
  page: 1,
};

/**
 * Custom hook for fetching LemonSqueezy checkouts
 */
export function useLemonSqueezyCheckouts(
  initialFilters: CheckoutFilters = {},
  options: UseCheckoutsOptions = {}
): UseCheckoutsReturn {
  const {
    enabled = true,
    refetchInterval,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
  } = options;

  const queryClient = useQueryClient();
  
  // Local state for filters
  const [localFilters, setLocalFilters] = useState<CheckoutFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Generate query key based on filters
  const queryKey = useMemo(() => {
    return ['lemonsqueezy', 'listCheckouts', localFilters];
  }, [localFilters]);

  // Fetch function for GET requests
  const fetchCheckouts = useCallback(async (filters: CheckoutFilters): Promise<CheckoutListResponse> => {
    const queryString = apiUtils.createQueryString(filters);
    const endpoint = `/api/lemonsqueezy/list${queryString ? `?${queryString}` : ''}`;

    const response = await serverClient.get<CheckoutListResponse>(endpoint);

    if (!apiUtils.isSuccess(response)) {
      const error = new Error(apiUtils.getErrorMessage(response));
      (error as any).code = response.error;
      throw error;
    }

    return response.data;
  }, []);

  // Fetch function for POST requests (for complex filters)
  const fetchCheckoutsPost = useCallback(async (filters: CheckoutFilters): Promise<CheckoutListResponse> => {
    const response = await serverClient.post<CheckoutListResponse>('/api/lemonsqueezy/list', filters);

    if (!apiUtils.isSuccess(response)) {
      const error = new Error(apiUtils.getErrorMessage(response));
      (error as any).code = response.error;
      throw error;
    }

    return response.data;
  }, []);

  // Main query
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchCheckouts(localFilters),
    enabled,
    staleTime,
    gcTime: cacheTime,
    retry,
    retryDelay,
    refetchInterval,
  });

  useEffect(() => {
    if (data && onSuccess) {
      onSuccess(data);
    }
  }, [data, onSuccess]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // POST mutation for complex filters
  const _postMutation = useMutation({
    mutationFn: fetchCheckoutsPost,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      onSuccess?.(data);
    },
    onError,
  });

  // Actions
  const updateFilters = useCallback((newFilters: Partial<CheckoutFilters>) => {
    setLocalFilters((prev: CheckoutFilters) => ({
      ...prev,
      ...newFilters,
      page: 1,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setLocalFilters(DEFAULT_FILTERS as CheckoutFilters);
  }, []);

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['lemonsqueezy', 'listCheckouts'] });
  }, [queryClient]);

  const nextPage = useCallback(() => {
    if (data && 'pagination' in data && data.pagination?.hasMore) {
      setLocalFilters((prev: CheckoutFilters) => ({
        ...prev,
        page: (prev.page || 1) + 1,
      }));
    }
  }, [data]);

  const prevPage = useCallback(() => {
    if (data && 'pagination' in data && data.pagination?.currentPage && data.pagination.currentPage > 1) {
      setLocalFilters((prev: CheckoutFilters) => ({
        ...prev,
        page: Math.max(1, (prev.page || 1) - 1),
      }));
    }
  }, [data]);

  const goToPage = useCallback((page: number) => {
    if (data && 'pagination' in data && page >= 1 && page <= (data.pagination?.totalPages || 1)) {
      setLocalFilters((prev: CheckoutFilters) => ({
        ...prev,
        page,
      }));
    }
  }, [data]);

  // Computed values
  const checkouts = data && 'data' in data ? data.data : [];
  const pagination = data && 'pagination' in data ? data.pagination : null;
  const filters = data && 'filters' in data ? data.filters : null;
  const metadata = data && 'metadata' in data ? data.metadata : null;
  const hasMore = pagination?.hasMore || false;
  const totalPages = pagination?.totalPages || 1;
  const currentPage = pagination?.currentPage || 1;
  const total = pagination?.total || 0;
  const errorCode = (error as any)?.code || null;

  return {
    // Data
    checkouts,
    pagination,
    filters,
    metadata,
    
    // Loading states
    isLoading,
    isError,
    isFetching,
    isRefetching,
    
    // Error handling
    error,
    errorCode,
    
    // Actions
    updateFilters,
    resetFilters,
    refresh,
    invalidateCache,
    nextPage,
    prevPage,
    goToPage,
    
    // Current state
    currentFilters: localFilters,
    hasMore,
    totalPages,
    currentPage,
    total,
  };
}

/**
 * Hook for fetching a single checkout by ID
 */
export function useLemonSqueezyListCheckout(checkoutId: string) {
  const { checkouts, isLoading, isError, error } = useLemonSqueezyCheckouts({
    limit: 100,
  });

  const checkout = useMemo(() => {
    return checkouts.find(c => c.id === checkoutId || c.checkoutId === checkoutId);
  }, [checkouts, checkoutId]);

  return {
    checkout,
    isLoading,
    isError,
    error,
    exists: !!checkout,
  };
}

/**
 * Hook for POST requests (useful for complex filters)
 */
export function useLemonSqueezyCheckoutsPost() {
  const queryClient = useQueryClient();

  const fetchCheckoutsPost = useCallback(async (filters: CheckoutFilters): Promise<CheckoutListResponse> => {
    const response = await serverClient.post<CheckoutListResponse>('/api/lemonsqueezy/list', filters);

    if (!apiUtils.isSuccess(response)) {
      const error = new Error(apiUtils.getErrorMessage(response));
      (error as any).code = response.error;
      throw error;
    }

    return response.data;
  }, []);

  const mutation = useMutation({
    mutationFn: fetchCheckoutsPost,
    onSuccess: (data, variables) => {
      // Update cache with the new data
      const queryKey = ['lemonsqueezy', 'checkouts', variables];
      queryClient.setQueryData(queryKey, data);
    },
  });

  return {
    ...mutation,
    fetchCheckouts: mutation.mutate,
    fetchCheckoutsAsync: mutation.mutateAsync,
  };
}

/**
 * Hook for real-time updates with polling
 */
export function useLemonSqueezyCheckoutsRealtime(
  filters: CheckoutFilters = {},
  interval = 30000 // 30 seconds
) {
  return useLemonSqueezyCheckouts(filters, {
    refetchInterval: interval,
    staleTime: 0, // Always consider data stale for real-time updates
  });
}

/**
 * Utility functions for checkout data processing
 */
export const checkoutUtils = {
  /**
   * Calculate total amount from checkouts
   */
  calculateTotal: (checkouts: CheckoutData[], currency = 'USD'): number => {
    return checkouts
      .filter(c => c.currency === currency && c.status === 'active')
      .reduce((sum, c) => sum + c.amount, 0);
  },

  /**
   * Group checkouts by status
   */
  groupByStatus: (checkouts: CheckoutData[]): Record<string, CheckoutData[]> => {
    return checkouts.reduce((groups, checkout) => {
      const status = checkout.status;
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(checkout);
      return groups;
    }, {} as Record<string, CheckoutData[]>);
  },

  /**
   * Filter checkouts by date range
   */
  filterByDateRange: (
    checkouts: CheckoutData[],
    startDate: Date,
    endDate: Date
  ): CheckoutData[] => {
    return checkouts.filter(checkout => {
      const checkoutDate = new Date(checkout.createdAt);
      return checkoutDate >= startDate && checkoutDate <= endDate;
    });
  },

  /**
   * Get unique customers from checkouts
   */
  getUniqueCustomers: (checkouts: CheckoutData[]): string[] => {
    const emails = checkouts
      .map(c => c.customerEmail)
      .filter(Boolean) as string[];
    return [...new Set(emails)];
  },

  /**
   * Format amount with currency
   */
  formatAmount: (amount: number, currency = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount); // Amount is already in dollars (not cents)
  },

  /**
   * Format date with timezone support
   */
  formatDate: (dateString: string, options: Intl.DateTimeFormatOptions = {}): string => {
    try {
      if (!dateString) {
        return 'No date';
      }
      
      // Handle different date formats
      let date: Date;
      
      // Try parsing as ISO string first
      if (dateString.includes('T') && dateString.includes('Z')) {
        date = new Date(dateString);
      } else if (dateString.includes('T')) {
        // Handle ISO string without Z
        date = new Date(dateString + 'Z');
      } else {
        // Try as regular date string
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid date';
      }
      
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC', // Force UTC to avoid timezone conversion
        timeZoneName: 'short',
        ...options
      };
      
      return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid date';
    }
  },

  /**
   * Format date for display (short format)
   */
  formatDateShort: (dateString: string): string => {
    return checkoutUtils.formatDate(dateString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Format date for display (with time)
   */
  formatDateTime: (dateString: string): string => {
    return checkoutUtils.formatDate(dateString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Format date in local timezone
   */
  formatDateTimeLocal: (dateString: string): string => {
    return checkoutUtils.formatDate(dateString, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: undefined // Use local timezone
    });
  },

  /**
   * Get raw date for debugging
   */
  getRawDate: (dateString: string): string => {
    return dateString || 'No date';
  },

  /**
   * Get checkout statistics
   */
  getStats: (checkouts: CheckoutData[]) => {
    const active = checkouts.filter(c => c.status === 'active');
    const cancelled = checkouts.filter(c => c.status === 'cancelled');
    const expired = checkouts.filter(c => c.status === 'expired');
    const onTrial = checkouts.filter(c => c.status === 'on_trial');
    const pastDue = checkouts.filter(c => c.status === 'past_due');
    const paused = checkouts.filter(c => c.status === 'paused');
    const unpaid = checkouts.filter(c => c.status === 'unpaid');

    const totalAmount = checkoutUtils.calculateTotal(active);
    const uniqueCustomers = checkoutUtils.getUniqueCustomers(checkouts);

    return {
      total: checkouts.length,
      active: active.length,
      cancelled: cancelled.length,
      expired: expired.length,
      onTrial: onTrial.length,
      pastDue: pastDue.length,
      paused: paused.length,
      unpaid: unpaid.length,
      totalAmount,
      uniqueCustomers: uniqueCustomers.length,
      averageAmount: active.length > 0 ? totalAmount / active.length : 0,
    };
  },

  /**
   * Sort checkouts by various criteria
   */
  sortCheckouts: (
    checkouts: CheckoutData[],
    sortBy: 'date' | 'amount' | 'status' | 'email' = 'date',
    order: 'asc' | 'desc' = 'desc'
  ): CheckoutData[] => {
    return [...checkouts].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'email':
          comparison = (a.customerEmail || '').localeCompare(b.customerEmail || '');
          break;
      }

      return order === 'desc' ? -comparison : comparison;
    });
  },
};
