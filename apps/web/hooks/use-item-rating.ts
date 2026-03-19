"use client";
import { apiUtils, serverClient } from "@/lib/api/server-api-client";
import { useQuery } from "@tanstack/react-query";
import { useFeatureFlagsWithSimulation } from "@/hooks/use-feature-flags-with-simulation";

interface RatingData {
  averageRating: number;
  totalRatings: number;
}

export function useItemRating(itemId: string, enabled: boolean = true) {
  const { features } = useFeatureFlagsWithSimulation();

  const {
    data: rating = { averageRating: 0, totalRatings: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery<RatingData>({
    queryKey: ["item-rating", itemId],
    enabled: features.ratings && enabled, // Only fetch when ratings feature is enabled
    queryFn: async ({ signal }) => {
      const encodedItemId = encodeURIComponent(itemId);
      // Avoid HTTP cache; rely on React Query invalidation for freshness
      const response = await serverClient.get<RatingData>(`/api/items/${encodedItemId}/comments/rating`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-store" },
        signal,
      });
      if (!apiUtils.isSuccess(response)) {
        throw new Error(apiUtils.getErrorMessage(response) || "Failed to fetch rating");
      }
      return response.data;
    },
    // Use moderate defaults; mutations and explicit refetch handle immediates
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    rating,
    isLoading,
    error,
    refetch,
  };
} 