"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CommentWithUser } from "@/lib/types/comment";
import { useLoginModal } from "./use-login-modal";
import { serverClient, apiUtils } from "@/lib/api/server-api-client";

interface CreateCommentData {
  content: string;
  itemId: string;
  rating: number;
}

interface UpdateCommentData {
  commentId: string;
  content?: string;
  rating?: number;
}

const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};

export function useComments(itemId: string) {
  const queryClient = useQueryClient();
  const loginModal = useLoginModal();

  const { data: comments = [], isPending } = useQuery<CommentWithUser[]>({
    queryKey: ["comments", itemId],
    queryFn: async ({ signal }) => {
      const response = await serverClient.get<{ success: boolean; comments: CommentWithUser[] }>(
        `/api/items/${itemId}/comments`,
        { signal }
      );
      if (!apiUtils.isSuccess(response)) {
        throw new Error(apiUtils.getErrorMessage(response));
      }
      return response.data.comments;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - balance between freshness and stability
    gcTime: 10 * 60 * 1000, // 10 minutes - match global default
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Prevent flash on window focus
  });

  const { mutateAsync: createComment, isPending: isCreating } = useMutation({
    mutationFn: async ({ content, itemId, rating }: CreateCommentData) => {
      const response = await serverClient.post<{ success: boolean; comment: CommentWithUser }>(`/api/items/${itemId}/comments`, { content, rating });

      if (!apiUtils.isSuccess(response)) {
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
          loginModal.onOpen('Please sign in to comment');
          throw new Error('Unauthorized');
        }
        throw new Error(apiUtils.getErrorMessage(response));
      }

      // response.data contains the API response: { success: true, comment: CommentWithUser }
      return response.data.comment;
    },
    onMutate: async () => {
      // Optimistically increment comments count in the Statistics card
      queryClient.setQueriesData<{ totals: { comments: number; [k: string]: any }; series: any[] }>(
        { queryKey: ['item-activity', itemId], exact: false },
        (old) => {
          if (!old) return old;
          return { ...old, totals: { ...old.totals, comments: old.totals.comments + 1 } };
        }
      );
    },
    onSuccess: async (newComment) => {
      if (newComment) {
        // Optimistically update cache with server-returned comment data
        queryClient.setQueryData<CommentWithUser[]>(["comments", itemId], (old = []) => {
          // Check if comment already exists to prevent duplicates
          const commentExists = old.some(c => c.id === newComment.id);
          if (commentExists) {
            return old;
          }
          // Add new comment at the beginning
          return [newComment, ...old];
        });
        dispatchCommentEvent(newComment);
        // Force refetch rating query to show updated data immediately
        await queryClient.refetchQueries({ queryKey: ["item-rating", itemId] });
        // Sync Statistics card (comments count + avgRating) with server
        queryClient.invalidateQueries({ queryKey: ['item-activity', itemId] });
      }
    },
    onError: async () => {
      // Revert the optimistic comments increment
      queryClient.invalidateQueries({ queryKey: ['item-activity', itemId] });
    },
  });

  const { mutateAsync: deleteComment, isPending: isDeleting } = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await serverClient.delete(`/api/items/${itemId}/comments/${commentId}`);

      if (!apiUtils.isSuccess(response)) {
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
          throw new Error("Please login to delete comment");
        }
        throw new Error(apiUtils.getErrorMessage(response));
      }
    },
    onMutate: async () => {
      // Optimistically decrement comments count in the Statistics card
      queryClient.setQueriesData<{ totals: { comments: number; [k: string]: any }; series: any[] }>(
        { queryKey: ['item-activity', itemId], exact: false },
        (old) => {
          if (!old) return old;
          return { ...old, totals: { ...old.totals, comments: Math.max(0, old.totals.comments - 1) } };
        }
      );
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: ["comments", itemId],
        exact: true
      });
      // Sync Statistics card (comments count + avgRating) with server
      queryClient.invalidateQueries({ queryKey: ['item-activity', itemId] });
    },
    onError: async () => {
      // Revert the optimistic decrement
      queryClient.invalidateQueries({ queryKey: ['item-activity', itemId] });
    },
  });

  const { mutateAsync: updateComment, isPending: isUpdating } = useMutation({
    mutationFn: async ({ commentId, content, rating }: UpdateCommentData) => {
      const response = await serverClient.put<CommentWithUser>(
        `/api/items/${itemId}/comments/${commentId}`,
        { content, rating }
      );

      if (!apiUtils.isSuccess(response)) {
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
          loginModal.onOpen('Please sign in to edit comment');
          throw new Error('Unauthorized');
        }
        throw new Error(apiUtils.getErrorMessage(response));
      }

      return response.data;
    },
    onSuccess: async (updatedComment) => {
      if (updatedComment) {
        // Optimistically update cache with server-returned comment data
        queryClient.setQueryData<CommentWithUser[]>(["comments", itemId], (old = []) => {
          return old.map(comment =>
            comment.id === updatedComment.id ? updatedComment : comment
          );
        });
        dispatchCommentEvent(updatedComment);
        // Force refetch rating to reflect updated rating immediately
        await queryClient.refetchQueries({ queryKey: ["item-rating", itemId] });
        // Sync avgRating in Statistics card
        queryClient.invalidateQueries({ queryKey: ['item-activity', itemId] });
      }
    },
  });

  const { mutate: rateCommentMutation, isPending: isRatingComment } = useMutation({
    mutationFn: async ({ commentId, rating }: { commentId: string; rating: number }) => {
      const encodedItemId = encodeURIComponent(itemId);
      const response = await serverClient.post(`/api/items/${encodedItemId}/comments/rating`, { commentId, rating });

      if (!apiUtils.isSuccess(response)) {
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
          loginModal.onOpen('Please sign in to rate comment');
          return;
        }
        throw new Error(apiUtils.getErrorMessage(response));
      }

      return response.data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["comments", itemId] });
      await queryClient.refetchQueries({ queryKey: ["item-rating", itemId] });
      // Sync avgRating in Statistics card
      queryClient.invalidateQueries({ queryKey: ['item-activity', itemId] });
    },
  });

  const { mutate: updateCommentRatingMutation, isPending: isUpdatingRating } = useMutation({
    mutationFn: async ({ commentId, rating }: { commentId: string; rating: number }) => {
      const encodedItemId = encodeURIComponent(itemId);
      const response = await serverClient.put(`/api/items/${encodedItemId}/comments/rating`, { commentId, rating });

      if (!apiUtils.isSuccess(response)) {
        if (response.error?.includes('401') || response.error?.includes('Unauthorized')) {
          loginModal.onOpen('Please sign in to rate comment');
          return;
        }
        throw new Error(apiUtils.getErrorMessage(response));
      }

      return response.data;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["comments", itemId] });
      await queryClient.refetchQueries({ queryKey: ["item-rating", itemId] });
      // Sync avgRating in Statistics card
      queryClient.invalidateQueries({ queryKey: ['item-activity', itemId] });
    },
  });


  const { data: commentRating = 0, isLoading: isLoadingRating } = useQuery({
    queryKey: ["commentRating", itemId],
    queryFn: async () => {
      const encodedItemId = encodeURIComponent(itemId);
      const response = await serverClient.get(`/api/items/${encodedItemId}/comments/rating`);
      if (!apiUtils.isSuccess(response)) {
        throw new Error(apiUtils.getErrorMessage(response));
      }
      return response.data;
    },
  });


  return {
    comments,
    isPending,
    createComment,
    isCreating,
    updateComment,
    isUpdating,
    deleteComment,
    isDeleting,
    updateCommentRating: updateCommentRatingMutation,
    isUpdatingRating,
    commentRating,
    isLoadingRating,
    rateComment: rateCommentMutation,
    isRatingComment,
  };
} 