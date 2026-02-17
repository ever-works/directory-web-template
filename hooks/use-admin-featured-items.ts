import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ItemData } from '@/lib/types/item';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

export interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  itemDescription?: string;
  featuredOrder: number;
  featuredUntil?: string;
  isActive: boolean;
  featuredBy: string;
  featuredAt: string;
  createdAt: string;
  updatedAt: string;
}

interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UseAdminFeaturedItemsOptions {
  page?: number;
  limit?: number;
  showActiveOnly?: boolean;
  searchTerm?: string;
}

interface UseAdminFeaturedItemsReturn {
  // Data
  featuredItems: FeaturedItem[];
  allItems: ItemData[];
  filteredItems: FeaturedItem[];
  
  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalItems: number;
  
  // Filters
  searchTerm: string;
  showActiveOnly: boolean;
  
  // Actions
  createFeaturedItem: (data: Partial<FeaturedItem>) => Promise<boolean>;
  updateFeaturedItem: (id: string, data: Partial<FeaturedItem>) => Promise<boolean>;
  deleteFeaturedItem: (id: string) => Promise<boolean>;
  updateOrder: (id: string, newOrder: number) => Promise<boolean>;
  
  // Filter actions
  setSearchTerm: (term: string) => void;
  setShowActiveOnly: (active: boolean) => void;
  setCurrentPage: (page: number) => void;
  
  // Utility
  getItemBySlug: (slug: string) => ItemData | undefined;
  refreshData: () => void;
}

// Query keys for React Query
const featuredItemsQueryKeys = {
  all: ['featured-items'] as const,
  lists: () => [...featuredItemsQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...featuredItemsQueryKeys.lists(), filters] as const,
  details: () => [...featuredItemsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...featuredItemsQueryKeys.details(), id] as const,
};

const allItemsQueryKeys = {
  all: ['all-items'] as const,
  lists: () => [...allItemsQueryKeys.all, 'list'] as const,
};

// API functions
const fetchFeaturedItems = async (page: number, limit: number, showActiveOnly: boolean): Promise<FeaturedItemsResponse> => {
  const params = apiUtils.createQueryString({ page, limit, active: showActiveOnly });
  const response = await serverClient.get<FeaturedItemsResponse>(`/api/admin/featured-items?${params}`);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data;
};

const fetchAllItems = async (): Promise<{ success: boolean; items: ItemData[] }> => {
  const response = await serverClient.get<{ success: boolean; items: ItemData[] }>('/api/admin/items?page=1&limit=1000');
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data;
};

const createFeaturedItem = async (data: Partial<FeaturedItem>): Promise<{ success: boolean; data: FeaturedItem }> => {
  const response = await serverClient.post<{ success: boolean; data: FeaturedItem }>('/api/admin/featured-items', data);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data;
};

const updateFeaturedItem = async (id: string, data: Partial<FeaturedItem>): Promise<{ success: boolean; data: FeaturedItem }> => {
  const response = await serverClient.put<{ success: boolean; data: FeaturedItem }>(`/api/admin/featured-items/${id}`, data);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data;
};

const deleteFeaturedItem = async (id: string): Promise<{ success: boolean }> => {
  const response = await serverClient.delete<{ success: boolean }>(`/api/admin/featured-items/${id}`);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data;
};

export function useAdminFeaturedItems(options: UseAdminFeaturedItemsOptions = {}): UseAdminFeaturedItemsReturn {
  const {
    page: initialPage = 1,
    limit = 10,
    showActiveOnly: initialShowActiveOnly = true,
    searchTerm: initialSearchTerm = "",
  } = options;

  // State for filters
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [showActiveOnly, setShowActiveOnly] = useState(initialShowActiveOnly);
  
  // Query client for cache management
  const queryClient = useQueryClient();

  // React Query hooks
  const {
    data: featuredItemsData,
    isLoading: featuredItemsLoading,
    error: _featuredItemsError,
  } = useQuery({
    queryKey: featuredItemsQueryKeys.list({ page: currentPage, limit, showActiveOnly }),
    queryFn: () => fetchFeaturedItems(currentPage, limit, showActiveOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes - reduced from 30 seconds
    retry: 3,
  });

  const {
    data: allItemsData,
    isLoading: allItemsLoading,
    error: _allItemsError,
  } = useQuery({
    queryKey: allItemsQueryKeys.lists(),
    queryFn: fetchAllItems,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createFeaturedItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featuredItemsQueryKeys.all });
      toast.success('Item featured successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to feature item: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeaturedItem> }) => 
      updateFeaturedItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featuredItemsQueryKeys.all });
      toast.success('Featured item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update featured item: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeaturedItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featuredItemsQueryKeys.all });
      toast.success('Item removed from featured');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove featured item: ${error.message}`);
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, newOrder }: { id: string; newOrder: number }) => 
      updateFeaturedItem(id, { featuredOrder: newOrder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featuredItemsQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update order: ${error.message}`);
    },
  });

  // Derived data
  const featuredItems = featuredItemsData?.data || [];
  const allItems = useMemo(() => allItemsData?.items || [], [allItemsData?.items]);
  const isLoading = featuredItemsLoading || allItemsLoading;
  const isSubmitting = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const totalPages = featuredItemsData?.pagination.totalPages || 1;
  const totalItems = featuredItemsData?.pagination.total || 0;

  // Filter items based on search term
  const filteredItems = featuredItems.filter(item =>
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.itemSlug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get item by slug
  const getItemBySlug = useCallback((slug: string): ItemData | undefined => {
    return allItems.find(item => item.slug === slug);
  }, [allItems]);

  // Refresh all data
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: featuredItemsQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: allItemsQueryKeys.all });
  }, [queryClient]);

  // Wrapper functions for mutations
  const handleCreateFeaturedItem = useCallback(async (data: Partial<FeaturedItem>): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data);
      return true;
    } catch {
      return false;
    }
  }, [createMutation]);

  const handleUpdateFeaturedItem = useCallback(async (id: string, data: Partial<FeaturedItem>): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  }, [updateMutation]);

  const handleDeleteFeaturedItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  }, [deleteMutation]);

  const handleUpdateOrder = useCallback(async (id: string, newOrder: number): Promise<boolean> => {
    try {
      await updateOrderMutation.mutateAsync({ id, newOrder });
      return true;
    } catch {
      return false;
    }
  }, [updateOrderMutation]);

  return {
    // Data
    featuredItems,
    allItems,
    filteredItems,
    
    // Loading states
    isLoading,
    isSubmitting,
    
    // Pagination
    currentPage,
    totalPages,
    totalItems,
    
    // Filters
    searchTerm,
    showActiveOnly,
    
    // Actions
    createFeaturedItem: handleCreateFeaturedItem,
    updateFeaturedItem: handleUpdateFeaturedItem,
    deleteFeaturedItem: handleDeleteFeaturedItem,
    updateOrder: handleUpdateOrder,
    
    // Filter actions
    setSearchTerm,
    setShowActiveOnly,
    setCurrentPage,
    
    // Utility
    getItemBySlug,
    refreshData,
  };
}
