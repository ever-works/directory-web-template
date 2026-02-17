import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import {
	CategoryData,
	CategoryWithCount,
	CreateCategoryRequest,
	UpdateCategoryRequest,
	CategoryListResponse,
	CategoryListOptions
} from '@/lib/types/category';

// Query keys factory
const QUERY_KEYS = {
  categories: ['admin', 'categories'] as const,
  categoriesList: (params: CategoryListOptions) => [...QUERY_KEYS.categories, 'list', params] as const,
  allCategories: () => [...QUERY_KEYS.categories, 'all'] as const,
  category: (id: string) => [...QUERY_KEYS.categories, 'detail', id] as const,
} as const;

// API functions
const fetchCategories = async (params: CategoryListOptions = {}): Promise<CategoryListResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params.includeInactive) searchParams.set('includeInactive', 'true');
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const response = await serverClient.get<CategoryListResponse>(`/api/admin/categories?${searchParams.toString()}`);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data;
};

const fetchCategory = async (id: string): Promise<CategoryData> => {
  const response = await serverClient.get<{ success: boolean; category: CategoryData }>(`/api/admin/categories/${id}`);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data.category;
};

const createCategory = async (data: CreateCategoryRequest): Promise<CategoryData> => {
  const response = await serverClient.post<{ success: boolean; category: CategoryData }>('/api/admin/categories', data);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data.category;
};

const updateCategory = async (id: string, data: UpdateCategoryRequest): Promise<CategoryData> => {
  const response = await serverClient.put<{ success: boolean; category: CategoryData }>(`/api/admin/categories/${id}`, data);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data.category;
};

const deleteCategory = async (id: string, hard = false): Promise<void> => {
  const url = hard ? `/api/admin/categories/${id}?hard=true` : `/api/admin/categories/${id}`;
  const response = await serverClient.delete(url);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
};

const fetchAllCategories = async (): Promise<CategoryData[]> => {
  const response = await serverClient.get<{ success: boolean; data: CategoryData[] }>('/api/admin/categories/all');
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data.data;
};

// Hook interface
export interface UseAdminCategoriesOptions {
  params?: CategoryListOptions;
  enabled?: boolean;
}

export interface UseAdminCategoriesReturn {
  // Data
  categories: CategoryWithCount[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  
  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;
  
  // Actions
  createCategory: (data: CreateCategoryRequest) => Promise<boolean>;
  updateCategory: (id: string, data: UpdateCategoryRequest) => Promise<boolean>;
  deleteCategory: (id: string, hard?: boolean) => Promise<boolean>;
  
  // Utility
  refetch: () => void;
  refreshData: () => void;
}

// Main hook
export function useAdminCategories(options: UseAdminCategoriesOptions = {}): UseAdminCategoriesReturn {
  const { params = {}, enabled = true } = options;
  const queryClient = useQueryClient();

  // Fetch categories list
  const {
    data: categoriesData,
    isLoading,
    error: _error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.categoriesList(params),
    queryFn: () => fetchCategories(params),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (data) => {
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create category');
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) => updateCategory(id, data),
    onSuccess: (data) => {
      toast.success('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update category');
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => deleteCategory(id, hard),
    onSuccess: () => {
      toast.success('Category deleted successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });

  // Action handlers
  const handleCreateCategory = useCallback(async (data: CreateCategoryRequest): Promise<boolean> => {
    try {
      await createCategoryMutation.mutateAsync(data);
      return true;
    } catch {
      return false;
    }
  }, [createCategoryMutation]);

  const handleUpdateCategory = useCallback(async (id: string, data: UpdateCategoryRequest): Promise<boolean> => {
    try {
      await updateCategoryMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  }, [updateCategoryMutation]);

  const handleDeleteCategory = useCallback(async (id: string, hard = false): Promise<boolean> => {
    try {
      await deleteCategoryMutation.mutateAsync({ id, hard });
      return true;
    } catch {
      return false;
    }
  }, [deleteCategoryMutation]);

  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
  }, [queryClient]);

  return {
    // Data
    categories: categoriesData?.categories || [],
    total: categoriesData?.total || 0,
    page: categoriesData?.page || 1,
    totalPages: categoriesData?.totalPages || 1,
    limit: categoriesData?.limit || 10,
    
    // Loading states
    isLoading,
    isSubmitting: createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending,
    
    // Actions
    createCategory: handleCreateCategory,
    updateCategory: handleUpdateCategory,
    deleteCategory: handleDeleteCategory,
    
    // Utility
    refetch,
    refreshData,
  };
}

// Hook for single category
export interface UseCategoryOptions {
  id: string;
  enabled?: boolean;
}

export interface UseCategoryReturn {
  category: CategoryData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCategory({ id, enabled = true }: UseCategoryOptions): UseCategoryReturn {
  const {
    data: category,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.category(id),
    queryFn: () => fetchCategory(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
  });

  return {
    category: category || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// Hook for category mutations only
export interface UseCategoryMutationsReturn {
  createCategory: (data: CreateCategoryRequest) => Promise<boolean>;
  updateCategory: (id: string, data: UpdateCategoryRequest) => Promise<boolean>;
  deleteCategory: (id: string, hard?: boolean) => Promise<boolean>;
  isSubmitting: boolean;
}

export function useCategoryMutations(): UseCategoryMutationsReturn {
  const queryClient = useQueryClient();

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create category');
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryRequest }) => updateCategory(id, data),
    onSuccess: () => {
      toast.success('Category updated successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update category');
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => deleteCategory(id, hard),
    onSuccess: () => {
      toast.success('Category deleted successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });

  const handleCreateCategory = useCallback(async (data: CreateCategoryRequest): Promise<boolean> => {
    try {
      await createCategoryMutation.mutateAsync(data);
      return true;
    } catch {
      return false;
    }
  }, [createCategoryMutation]);

  const handleUpdateCategory = useCallback(async (id: string, data: UpdateCategoryRequest): Promise<boolean> => {
    try {
      await updateCategoryMutation.mutateAsync({ id, data });
      return true;
    } catch {
      return false;
    }
  }, [updateCategoryMutation]);

  const handleDeleteCategory = useCallback(async (id: string, hard = false): Promise<boolean> => {
    try {
      await deleteCategoryMutation.mutateAsync({ id, hard });
      return true;
    } catch {
      return false;
    }
  }, [deleteCategoryMutation]);

  return {
    createCategory: handleCreateCategory,
    updateCategory: handleUpdateCategory,
    deleteCategory: handleDeleteCategory,
    isSubmitting: createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending,
  };
}

// Hook for getting all categories without pagination
export function useAllCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.allCategories(),
    queryFn: () => fetchAllCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for getting all categories with formatted response
export function useAllCategoriesFormatted() {
  const { data: allCategories, isLoading, error, refetch } = useAllCategories();
  
  return {
    allCategories: allCategories || [],
    isLoading,
    error,
    refetch,
  };
}
