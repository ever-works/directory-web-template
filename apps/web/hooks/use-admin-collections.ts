import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  AssignCollectionItemsRequest,
} from '@/types/collection';

export interface CollectionsListResponse {
  success?: boolean;
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message?: string;
  error?: string;
}

export interface CollectionListParams {
  page?: number;
  limit?: number;
  search?: string;
  includeInactive?: boolean;
  sortBy?: 'name' | 'item_count' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

const QUERY_KEYS = {
  collections: ['admin', 'collections'] as const,
  collectionsList: (params: CollectionListParams) => [...QUERY_KEYS.collections, 'list', params] as const,
  collection: (id: string) => [...QUERY_KEYS.collections, 'detail', id] as const,
  collectionItems: (id: string) => [...QUERY_KEYS.collections, 'items', id] as const,
};

const fetchCollections = async (params: CollectionListParams = {}): Promise<CollectionsListResponse> => {
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.includeInactive) searchParams.set('includeInactive', 'true');
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const response = await serverClient.get<CollectionsListResponse>(`/api/admin/collections?${searchParams.toString()}`);
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }

  return response.data;
};

type CollectionMutationResponse = { success: boolean; collection?: Collection; message?: string };

const createCollection = async (data: CreateCollectionRequest) => {
  const response = await serverClient.post<CollectionMutationResponse>(`/api/admin/collections`, data);
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  return response.data;
};

const updateCollection = async (id: string, data: UpdateCollectionRequest) => {
  const response = await serverClient.put<CollectionMutationResponse>(`/api/admin/collections/${id}`, data);
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  return response.data;
};

const deleteCollection = async (id: string) => {
  const response = await serverClient.delete<{ success: boolean; message?: string }>(`/api/admin/collections/${id}`);
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  return response.data;
};

const fetchCollectionItems = async (id: string) => {
  const response = await serverClient.get<{ success: boolean; items: Array<{ id: string; name: string; slug: string }>; message?: string }>(`/api/admin/collections/${id}/items`);
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  return response.data.items;
};

const assignCollectionItems = async (id: string, data: AssignCollectionItemsRequest) => {
  const response = await serverClient.post<{ success: boolean; message?: string }>(`/api/admin/collections/${id}/items`, data);
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  return response.data;
};

export function useAdminCollections(params: CollectionListParams = {}) {
  const queryClient = useQueryClient();

  const invalidateCollections = useCallback(() => {
    apiUtils.clearCache();
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.collections });
  }, [queryClient]);

  /**
   * Write-through patch over every cached list query so the UI updates
   * synchronously when a mutation resolves, without waiting for the
   * background refetch triggered by `invalidateCollections()`.
   *
   * Filters to `['admin', 'collections', 'list', …]` so we never accidentally
   * mutate the detail or items query caches, which have different shapes.
   */
  const patchListCaches = useCallback(
    (mutate: (list: CollectionsListResponse) => CollectionsListResponse) => {
      queryClient.setQueriesData<CollectionsListResponse>(
        { queryKey: [...QUERY_KEYS.collections, 'list'] },
        (oldData) => (oldData ? mutate(oldData) : oldData)
      );
    },
    [queryClient]
  );

  const {
    data: collectionsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.collectionsList(params),
    queryFn: () => fetchCollections(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: (data: CollectionMutationResponse) => {
      toast.success(data.message || 'Collection created successfully');
      if (data.collection) {
        const created = data.collection;
        patchListCaches((list) => {
          // Avoid duplicates if React Query already inserted the row.
          if (list.collections.some((c) => c.id === created.id)) return list;
          return {
            ...list,
            collections: [created, ...list.collections],
            total: list.total + 1,
          };
        });
      }
      invalidateCollections();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create collection');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCollectionRequest }) => updateCollection(id, data),
    onSuccess: (data: CollectionMutationResponse) => {
      toast.success(data.message || 'Collection updated successfully');
      if (data.collection) {
        const updated = data.collection;
        patchListCaches((list) => ({
          ...list,
          collections: list.collections.map((c) =>
            c.id === updated.id ? { ...c, ...updated } : c
          ),
        }));
      }
      invalidateCollections();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update collection');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCollection,
    onSuccess: (_response, deletedId) => {
      toast.success('Collection deleted successfully');
      patchListCaches((list) => {
        if (!list.collections.some((c) => c.id === deletedId)) return list;
        return {
          ...list,
          collections: list.collections.filter((c) => c.id !== deletedId),
          total: Math.max(0, list.total - 1),
        };
      });
      invalidateCollections();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete collection');
    },
  });

  const assignItemsMutation = useMutation({
    mutationFn: ({ id, itemSlugs }: { id: string; itemSlugs: string[] }) => assignCollectionItems(id, { itemIds: itemSlugs }),
    onSuccess: (data: { success: boolean; message?: string }, vars) => {
      toast.success(data.message || 'Collection items updated');
      patchListCaches((list) => ({
        ...list,
        collections: list.collections.map((c) =>
          c.id === vars.id
            ? { ...c, item_count: vars.itemSlugs.length, items: vars.itemSlugs }
            : c
        ),
      }));
      invalidateCollections();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update collection items');
    },
  });

  const handleCreate = useCallback(async (data: CreateCollectionRequest): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data);
      return true;
    } catch {
      return false;
    }
  }, [createMutation]);

  const handleUpdate = useCallback(async (id: string, data: UpdateCollectionRequest): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  }, [updateMutation]);

  const handleDelete = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteMutation]);

  const handleAssignItems = useCallback(async (id: string, itemSlugs: string[]): Promise<boolean> => {
    try {
      await assignItemsMutation.mutateAsync({ id, itemSlugs });
      return true;
    } catch {
      return false;
    }
  }, [assignItemsMutation]);

  const refreshData = useCallback(() => {
    invalidateCollections();
  }, [invalidateCollections]);

  return {
    collections: collectionsData?.collections || [],
    total: collectionsData?.total || 0,
    page: collectionsData?.page || 1,
    totalPages: collectionsData?.totalPages || 1,
    limit: collectionsData?.limit || params.limit || 10,
    isLoading,
    isFetching,
    isSubmitting:
      createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || assignItemsMutation.isPending,
    createCollection: handleCreate,
    updateCollection: handleUpdate,
    deleteCollection: handleDelete,
    assignItems: handleAssignItems,
    fetchAssignedItems: fetchCollectionItems,
    refetch,
    refreshData,
  };
}
