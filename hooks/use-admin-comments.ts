import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

// Types
export interface AdminCommentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface AdminCommentItem {
  id: string;
  content: string;
  rating: number | null;
  userId: string;
  itemId: string;
  createdAt: string | null;
  updatedAt: string | null;
  user: AdminCommentUser;
}

export interface CommentsListResponse {
  comments: AdminCommentItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CommentsListParams {
  page?: number;
  limit?: number;
  search?: string;
}

// Query keys for React Query
const commentsQueryKeys = {
  all: ['admin-comments'] as const,
  lists: () => [...commentsQueryKeys.all, 'list'] as const,
  list: (params: CommentsListParams) => [...commentsQueryKeys.lists(), params] as const,
  details: () => [...commentsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...commentsQueryKeys.details(), id] as const,
};

// API functions
const fetchComments = async (params: CommentsListParams): Promise<CommentsListResponse> => {
  const queryString = apiUtils.createQueryString({
    page: params.page?.toString() || '1',
    limit: params.limit?.toString() || '10',
    ...(params.search && { search: params.search }),
  });
  
  const response = await serverClient.get<{ success: boolean; data: CommentsListResponse }>(`/api/admin/comments?${queryString}`);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  // Extract the data from the API response structure
  return response.data.data;
};

const deleteComment = async (id: string): Promise<void> => {
  const response = await serverClient.delete(`/api/admin/comments/${id}`);
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
};

interface UseAdminCommentsOptions {
  page?: number;
  limit?: number;
  search?: string;
}

interface UseAdminCommentsReturn {
  // Data
  comments: AdminCommentItem[];

  // Loading states
  isLoading: boolean;
  isFetching: boolean;
  isDeleting: string | null;

  // Pagination
  totalPages: number;
  totalComments: number;

  // Actions
  deleteComment: (id: string) => Promise<boolean>;

  // Utility
  refetch: () => void;
  refreshData: () => void;
}

export function useAdminComments(options: UseAdminCommentsOptions = {}): UseAdminCommentsReturn {
  const {
    page = 1,
    limit = 10,
    search,
  } = options;

  // State for delete operation
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Query client for cache management
  const queryClient = useQueryClient();

  // React Query hooks
  const {
    data: commentsData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: commentsQueryKeys.list({
      page,
      limit,
      search: search || undefined,
    }),
    queryFn: () => fetchComments({
      page,
      limit,
      search: search || undefined,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes - reduced from 30 seconds
    retry: 3,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKeys.all });
      toast.success('Comment deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete comment: ${error.message}`);
    },
  });

  // Derived data
  const comments = commentsData?.comments || [];
  const totalPages = commentsData?.pagination?.totalPages || 1;
  const totalComments = commentsData?.pagination?.total || 0;

  // Wrapper function for delete
  const handleDeleteComment = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    
    try {
      setIsDeleting(id);
      await deleteMutation.mutateAsync(id);
      return true;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      return false;
    } finally {
      setIsDeleting(null);
    }
  }, [deleteMutation]);

  // Refresh all data
  const refreshData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: commentsQueryKeys.all });
  }, [queryClient]);

  return {
    // Data
    comments,

    // Loading states
    isLoading,
    isFetching,
    isDeleting,

    // Pagination
    totalPages,
    totalComments,

    // Actions
    deleteComment: handleDeleteComment,

    // Utility
    refetch,
    refreshData,
  };
}
