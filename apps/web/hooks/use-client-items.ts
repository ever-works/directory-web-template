import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import {
  ClientSubmissionData,
  ClientItemStats,
  ClientItemsListParams,
  ClientUpdateItemRequest,
  ClientUpdateItemResponse,
  ClientDeleteItemResponse,
  ClientRestoreItemResponse,
} from '@/lib/types/client-item';

export interface ClientItemsListResponse {
  items: ClientSubmissionData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: ClientItemStats;
  success: boolean;
  error?: string;
}

export interface ClientStatsResponse {
  success: boolean;
  stats: ClientItemStats;
  error?: string;
}

// Query keys
const QUERY_KEYS = {
  clientItems: ['client', 'items'] as const,
  clientItemsList: (params: ClientItemsListParams) => [...QUERY_KEYS.clientItems, 'list', params] as const,
  clientItemStats: () => [...QUERY_KEYS.clientItems, 'stats'] as const,
  clientItemDetail: (id: string) => [...QUERY_KEYS.clientItems, 'detail', id] as const,
} as const;

// Export query keys for use in other hooks
export { QUERY_KEYS as CLIENT_ITEMS_QUERY_KEYS };

// API functions
const fetchClientItems = async (params: ClientItemsListParams = {}): Promise<ClientItemsListResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.status) searchParams.set('status', params.status);
  if (params.search) searchParams.set('search', params.search);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const response = await serverClient.get<ClientItemsListResponse>(`/api/client/items?${searchParams.toString()}`);

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data;
};

const fetchClientStats = async (): Promise<ClientItemStats> => {
  const response = await serverClient.get<ClientStatsResponse>('/api/client/items/stats');

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data.stats;
};

const updateClientItem = async (id: string, data: ClientUpdateItemRequest): Promise<ClientUpdateItemResponse> => {
  const response = await serverClient.put<ClientUpdateItemResponse>(`/api/client/items/${id}`, data);

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data;
};

const deleteClientItem = async (id: string): Promise<ClientDeleteItemResponse> => {
  const response = await serverClient.delete<ClientDeleteItemResponse>(`/api/client/items/${id}`);

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data;
};

const restoreClientItem = async (id: string): Promise<ClientRestoreItemResponse> => {
  const response = await serverClient.post<ClientRestoreItemResponse>(`/api/client/items/${id}/restore`);

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data;
};

// Hook
export function useClientItems(params: ClientItemsListParams = {}) {
  const queryClient = useQueryClient();

  // Fetch items
  const {
    data: itemsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: QUERY_KEYS.clientItemsList(params),
    queryFn: () => fetchClientItems(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });

  // Fetch stats separately (for independent refresh)
  const {
    data: stats,
    isLoading: isStatsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.clientItemStats(),
    queryFn: fetchClientStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientUpdateItemRequest }) => updateClientItem(id, data),
    onSuccess: (result) => {
      if (result.statusChanged) {
        toast.success(result.message || 'Item updated. Status changed to pending for re-review.');
      } else {
        toast.success(result.message || 'Item updated successfully');
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientItems });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update item');
    },
  });

  // Delete item mutation (soft delete)
  const deleteItemMutation = useMutation({
    mutationFn: deleteClientItem,
    onSuccess: (result) => {
      toast.success(result.message || 'Item deleted successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientItems });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete item');
    },
  });

  // Restore item mutation
  const restoreItemMutation = useMutation({
    mutationFn: restoreClientItem,
    onSuccess: (result) => {
      toast.success(result.message || 'Item restored successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientItems });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to restore item');
    },
  });

  // Handlers
  const handleUpdateItem = useCallback(async (id: string, data: ClientUpdateItemRequest): Promise<boolean> => {
    try {
      await updateItemMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  }, [updateItemMutation]);

  const handleDeleteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteItemMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteItemMutation]);

  const handleRestoreItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      await restoreItemMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [restoreItemMutation]);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clientItems });
  }, [queryClient]);

  // Prefetch next page
  const prefetchNextPage = useCallback((nextPage: number) => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.clientItemsList({ ...params, page: nextPage }),
      queryFn: () => fetchClientItems({ ...params, page: nextPage }),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient, params]);

  return {
    // Data
    items: itemsData?.items || [],
    total: itemsData?.total || 0,
    page: itemsData?.page || 1,
    limit: itemsData?.limit || 10,
    totalPages: itemsData?.totalPages || 1,
    stats: stats || itemsData?.stats || {
      total: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      deleted: 0,
    },

    // Loading states
    isLoading,
    isFetching,
    isStatsLoading,
    isUpdating: updateItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
    isRestoring: restoreItemMutation.isPending,
    isSubmitting: updateItemMutation.isPending || deleteItemMutation.isPending || restoreItemMutation.isPending,

    // Error
    error: error as Error | null,

    // Actions
    updateItem: handleUpdateItem,
    deleteItem: handleDeleteItem,
    restoreItem: handleRestoreItem,

    // Utility
    refetch,
    refreshData,
    prefetchNextPage,
  };
}
