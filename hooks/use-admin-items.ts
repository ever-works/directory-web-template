import { useCallback } from 'react';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import { ItemData, CreateItemRequest, UpdateItemRequest } from '@/lib/types/item';

export interface ItemsListResponse {
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  success: boolean;
  message?: string;
  error?: string;
}

export interface ItemsListParams {
  page?: number;
  limit?: number;
  status?: string;
  categories?: string[];
  tags?: string[];
  search?: string;
  sortBy?: 'name' | 'updated_at' | 'status' | 'submitted_at';
  sortOrder?: 'asc' | 'desc';
}

export interface ItemStatsResponse {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface ReviewItemRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}

export interface BulkActionRequest {
  action: 'approve' | 'reject' | 'delete';
  ids: string[];
  reason?: string;
}

export interface BulkActionResult {
  id: string;
  success: boolean;
  error?: string;
}

export interface BulkActionResponse {
  success: boolean;
  message: string;
  results: BulkActionResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Query keys
const QUERY_KEYS = {
  items: ['admin', 'items'] as const,
  itemsList: (params: ItemsListParams) => [...QUERY_KEYS.items, 'list', params] as const,
  itemStats: () => [...QUERY_KEYS.items, 'stats'] as const,
} as const;

// API functions
const fetchItems = async (params: ItemsListParams = {}): Promise<ItemsListResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.status) searchParams.set('status', params.status);
  if (params.categories && params.categories.length > 0) searchParams.set('categories', params.categories.join(','));
  if (params.tags && params.tags.length > 0) searchParams.set('tags', params.tags.join(','));
  if (params.search) searchParams.set('search', params.search);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const response = await serverClient.get<ItemsListResponse>(`/api/admin/items?${searchParams.toString()}`);

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data;
};

const fetchItemStats = async (): Promise<ItemStatsResponse> => {
  const response = await serverClient.get<{ success: boolean; data: ItemStatsResponse }>('/api/admin/items/stats');
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data.data;
};

const createItem = async (data: CreateItemRequest): Promise<ItemsListResponse> => {
  const response = await serverClient.post<ItemsListResponse>('/api/admin/items', data);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data;
};

const updateItem = async (id: string, data: UpdateItemRequest): Promise<ItemsListResponse> => {
  const response = await serverClient.put<ItemsListResponse>(`/api/admin/items/${id}`, data);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data;
};

const deleteItem = async (id: string): Promise<void> => {
  const response = await serverClient.delete(`/api/admin/items/${id}`);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
};

const reviewItem = async (id: string, data: ReviewItemRequest): Promise<ItemsListResponse> => {
  const response = await serverClient.post<ItemsListResponse>(`/api/admin/items/${id}/review`, data);

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data;
};

const bulkAction = async (data: BulkActionRequest): Promise<BulkActionResponse> => {
  const response = await serverClient.post<BulkActionResponse>('/api/admin/items/bulk', data);

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data;
};

// Hook
export function useAdminItems(params: ItemsListParams = {}) {
  // Fetch items
  const {
    data: itemsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.itemsList(params),
    queryFn: () => fetchItems(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes - reduced from 30 seconds
    retry: 3,
    placeholderData: keepPreviousData, // Keep previous data while fetching new data
  });

  // Fetch stats
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: QUERY_KEYS.itemStats(),
    queryFn: fetchItemStats,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Helper to refetch both items and stats
  const refetchAll = useCallback(async () => {
    // Clear server client cache to ensure fresh data
    serverClient.clearCache();
    await Promise.all([refetch(), refetchStats()]);
  }, [refetch, refetchStats]);

  // Create item mutation
  const createItemMutation = useMutation({
    mutationFn: createItem,
    onError: (error) => {
      toast.error(error.message || 'Failed to create item');
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateItemRequest }) => updateItem(id, data),
    onError: (error) => {
      toast.error(error.message || 'Failed to update item');
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: deleteItem,
    onError: (error) => {
      toast.error(error.message || 'Failed to delete item');
    },
  });

  // Review item mutation
  const reviewItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewItemRequest }) => reviewItem(id, data),
    onError: (error) => {
      toast.error(error.message || 'Failed to review item');
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: bulkAction,
    onError: (error) => {
      toast.error(error.message || 'Failed to process bulk action');
    },
  });

  // Handlers
  const handleCreateItem = useCallback(async (data: CreateItemRequest): Promise<boolean> => {
    try {
      const result = await createItemMutation.mutateAsync(data);
      toast.success(result.message || 'Item created successfully');
      await refetchAll();
      return true;
    } catch {
      return false;
    }
  }, [createItemMutation, refetchAll]);

  const handleUpdateItem = useCallback(async (id: string, data: UpdateItemRequest): Promise<boolean> => {
    try {
      const result = await updateItemMutation.mutateAsync({ id, data });
      toast.success(result.message || 'Item updated successfully');
      await refetchAll();
      return true;
    } catch {
      return false;
    }
  }, [updateItemMutation, refetchAll]);

  const handleDeleteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteItemMutation.mutateAsync(id);
      toast.success('Item deleted successfully');
      await refetchAll();
      return true;
    } catch {
      return false;
    }
  }, [deleteItemMutation, refetchAll]);

  const handleReviewItem = useCallback(async (id: string, status: 'approved' | 'rejected', notes?: string): Promise<boolean> => {
    try {
      const result = await reviewItemMutation.mutateAsync({ id, data: { status, review_notes: notes } });
      toast.success(result.message || `Item ${status} successfully`);
      await refetchAll();
      return true;
    } catch {
      return false;
    }
  }, [reviewItemMutation, refetchAll]);

  const refreshData = useCallback(() => {
    return refetchAll();
  }, [refetchAll]);

  // Bulk action handlers
  const handleBulkApprove = useCallback(async (ids: string[]): Promise<BulkActionResponse | null> => {
    try {
      const result = await bulkActionMutation.mutateAsync({ action: 'approve', ids });
      if (result.summary.failed === 0) {
        toast.success(result.message);
      } else if (result.summary.successful > 0) {
        toast.warning(`${result.summary.successful} approved, ${result.summary.failed} failed`);
      } else {
        toast.error('All items failed to approve');
      }
      await refetchAll();
      return result;
    } catch {
      return null;
    }
  }, [bulkActionMutation, refetchAll]);

  const handleBulkReject = useCallback(async (ids: string[], reason: string): Promise<BulkActionResponse | null> => {
    try {
      const result = await bulkActionMutation.mutateAsync({ action: 'reject', ids, reason });
      if (result.summary.failed === 0) {
        toast.success(result.message);
      } else if (result.summary.successful > 0) {
        toast.warning(`${result.summary.successful} rejected, ${result.summary.failed} failed`);
      } else {
        toast.error('All items failed to reject');
      }
      await refetchAll();
      return result;
    } catch {
      return null;
    }
  }, [bulkActionMutation, refetchAll]);

  const handleBulkDelete = useCallback(async (ids: string[]): Promise<BulkActionResponse | null> => {
    try {
      const result = await bulkActionMutation.mutateAsync({ action: 'delete', ids });
      if (result.summary.failed === 0) {
        toast.success(result.message);
      } else if (result.summary.successful > 0) {
        toast.warning(`${result.summary.successful} deleted, ${result.summary.failed} failed`);
      } else {
        toast.error('All items failed to delete');
      }
      await refetchAll();
      return result;
    } catch {
      return null;
    }
  }, [bulkActionMutation, refetchAll]);

  // Per-action loading states for granular UI feedback
  const isApproving = reviewItemMutation.isPending && reviewItemMutation.variables?.data.status === 'approved';
  const isRejecting = reviewItemMutation.isPending && reviewItemMutation.variables?.data.status === 'rejected';
  const isDeleting = deleteItemMutation.isPending;
  // Only return pendingItemId when a mutation is actually pending to avoid stale values
  const pendingItemId =
    (reviewItemMutation.isPending ? reviewItemMutation.variables?.id : null) ||
    (deleteItemMutation.isPending ? deleteItemMutation.variables : null) ||
    null;

  // Bulk action loading state
  const isBulkProcessing = bulkActionMutation.isPending;
  const bulkActionType = bulkActionMutation.isPending ? bulkActionMutation.variables?.action : null;

  return {
    // Data
    items: itemsData?.items || [],
    total: itemsData?.total || 0,
    page: itemsData?.page || 1,
    totalPages: itemsData?.totalPages || 1,
    stats: stats || {
      total: 0,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    },

    // Loading states
    isLoading, // True only on initial load (no cached data)
    isFetching, // True when fetching (including background refetch)
    isStatsLoading,
    isSubmitting: createItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending || reviewItemMutation.isPending,

    // Per-action loading states
    isApproving,
    isRejecting,
    isDeleting,
    pendingItemId,

    // Bulk action loading states
    isBulkProcessing,
    bulkActionType,

    // Actions
    createItem: handleCreateItem,
    updateItem: handleUpdateItem,
    deleteItem: handleDeleteItem,
    reviewItem: handleReviewItem,

    // Bulk actions
    bulkApprove: handleBulkApprove,
    bulkReject: handleBulkReject,
    bulkDelete: handleBulkDelete,

    // Utility
    refetch,
    refreshData,
  };
}
