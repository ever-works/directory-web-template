import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import {
  ClientSubmissionData,
  ClientItemResponse,
  ClientUpdateItemRequest,
  ClientUpdateItemResponse,
  ClientDeleteItemResponse,
  ClientRestoreItemResponse,
} from '@/lib/types/client-item';
import { CLIENT_ITEMS_QUERY_KEYS } from './use-client-items';

// API functions
const fetchClientItemDetail = async (id: string): Promise<ClientItemResponse> => {
  const response = await serverClient.get<ClientItemResponse>(`/api/client/items/${id}`);

  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data;
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

export interface UseClientItemDetailsOptions {
  enabled?: boolean;
  onUpdateSuccess?: (result: ClientUpdateItemResponse) => void;
  onDeleteSuccess?: () => void;
  onRestoreSuccess?: (result: ClientRestoreItemResponse) => void;
}

// Hook
export function useClientItemDetails(id: string | null | undefined, options: UseClientItemDetailsOptions = {}) {
  const { enabled = true, onUpdateSuccess, onDeleteSuccess, onRestoreSuccess } = options;
  const queryClient = useQueryClient();

  // Fetch item details
  const {
    data: itemData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: CLIENT_ITEMS_QUERY_KEYS.clientItemDetail(id || ''),
    queryFn: () => fetchClientItemDetail(id!),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: (data: ClientUpdateItemRequest) => updateClientItem(id!, data),
    onSuccess: (result) => {
      if (result.statusChanged) {
        toast.success(result.message || 'Item updated. Status changed to pending for re-review.');
      } else {
        toast.success(result.message || 'Item updated successfully');
      }
      // Invalidate both detail and list queries
      queryClient.invalidateQueries({ queryKey: CLIENT_ITEMS_QUERY_KEYS.clientItems });
      onUpdateSuccess?.(result);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update item');
    },
  });

  // Delete item mutation (soft delete)
  const deleteItemMutation = useMutation({
    mutationFn: () => deleteClientItem(id!),
    onSuccess: (result) => {
      toast.success(result.message || 'Item deleted successfully');
      // Invalidate both detail and list queries
      queryClient.invalidateQueries({ queryKey: CLIENT_ITEMS_QUERY_KEYS.clientItems });
      onDeleteSuccess?.();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete item');
    },
  });

  // Restore item mutation
  const restoreItemMutation = useMutation({
    mutationFn: () => restoreClientItem(id!),
    onSuccess: (result) => {
      toast.success(result.message || 'Item restored successfully');
      // Invalidate both detail and list queries
      queryClient.invalidateQueries({ queryKey: CLIENT_ITEMS_QUERY_KEYS.clientItems });
      onRestoreSuccess?.(result);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to restore item');
    },
  });

  // Handlers
  const handleUpdateItem = useCallback(async (data: ClientUpdateItemRequest): Promise<boolean> => {
    if (!id) return false;
    try {
      await updateItemMutation.mutateAsync(data);
      return true;
    } catch {
      return false;
    }
  }, [id, updateItemMutation]);

  const handleDeleteItem = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    try {
      await deleteItemMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  }, [id, deleteItemMutation]);

  const handleRestoreItem = useCallback(async (): Promise<boolean> => {
    if (!id) return false;
    try {
      await restoreItemMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  }, [id, restoreItemMutation]);

  // Extract item and engagement from response
  const item: ClientSubmissionData | null = itemData?.item || null;
  const engagement = itemData?.engagement || { views: 0, likes: 0 };

  return {
    // Data
    item,
    engagement,

    // Loading states
    isLoading,
    isFetching,
    isUpdating: updateItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
    isRestoring: restoreItemMutation.isPending,
    isSubmitting: updateItemMutation.isPending || deleteItemMutation.isPending || restoreItemMutation.isPending,

    // Error
    error: error as Error | null,
    notFound: error && (error as any)?.message?.includes('not found'),

    // Actions
    updateItem: handleUpdateItem,
    deleteItem: handleDeleteItem,
    restoreItem: handleRestoreItem,

    // Utility
    refetch,
  };
}
