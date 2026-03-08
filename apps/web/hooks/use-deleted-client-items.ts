import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import {
  ClientSubmissionData,
  ClientRestoreItemResponse,
} from '@/lib/types/client-item';
import { CLIENT_ITEMS_QUERY_KEYS } from './use-client-items';

export interface DeletedClientItemsResponse {
  items: ClientSubmissionData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  success: boolean;
  error?: string;
}

// Query keys for deleted items
const DELETED_QUERY_KEYS = {
  deletedItems: [...CLIENT_ITEMS_QUERY_KEYS.clientItems, 'deleted'] as const,
  deletedItemsList: (page: number, limit: number) =>
    [...DELETED_QUERY_KEYS.deletedItems, 'list', { page, limit }] as const,
} as const;

// API function to fetch deleted items
const fetchDeletedClientItems = async (
  page: number = 1,
  limit: number = 10
): Promise<DeletedClientItemsResponse> => {
  const searchParams = new URLSearchParams();
  searchParams.set('deleted', 'true');
  searchParams.set('page', page.toString());
  searchParams.set('limit', limit.toString());

  const response = await serverClient.get<DeletedClientItemsResponse>(
    `/api/client/items?${searchParams.toString()}`
  );

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data;
};

// API function to restore item
const restoreClientItem = async (id: string): Promise<ClientRestoreItemResponse> => {
  const response = await serverClient.post<ClientRestoreItemResponse>(
    `/api/client/items/${id}/restore`
  );

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data;
};

export interface UseDeletedClientItemsParams {
  page?: number;
  limit?: number;
}

/**
 * Hook for managing deleted (trashed) client items
 */
export function useDeletedClientItems(params: UseDeletedClientItemsParams = {}) {
  const { page = 1, limit = 10 } = params;
  const queryClient = useQueryClient();
  const [restoringItemId, setRestoringItemId] = useState<string | null>(null);

  // Fetch deleted items
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: DELETED_QUERY_KEYS.deletedItemsList(page, limit),
    queryFn: () => fetchDeletedClientItems(page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });

  // Restore item mutation
  const restoreItemMutation = useMutation({
    mutationFn: restoreClientItem,
    onSuccess: async (result) => {
      toast.success(result.message || 'Item restored successfully');
      // Invalidate and refetch both deleted items and main items lists
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: DELETED_QUERY_KEYS.deletedItems,
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: CLIENT_ITEMS_QUERY_KEYS.clientItems,
          refetchType: 'active',
        }),
      ]);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to restore item');
    },
  });

  // Handler for restore
  const handleRestoreItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      setRestoringItemId(id);
      await restoreItemMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    } finally {
      setRestoringItemId(null);
    }
  }, [restoreItemMutation]);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: DELETED_QUERY_KEYS.deletedItems });
  }, [queryClient]);

  return {
    // Data
    items: data?.items || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    totalPages: data?.totalPages || 1,

    // Loading states
    isLoading,
    isFetching,
    restoringItemId,

    // Error
    error: error as Error | null,

    // Actions
    restoreItem: handleRestoreItem,

    // Utility
    refetch,
    refreshData,
  };
}
