import { useQuery } from '@tanstack/react-query';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

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

// Query keys for React Query
const featuredItemsQueryKeys = {
  all: ['featured-items-client'] as const,
  lists: () => [...featuredItemsQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...featuredItemsQueryKeys.lists(), filters] as const,
};

// API function
const fetchFeaturedItems = async (): Promise<FeaturedItem[]> => {
  const response = await serverClient.get<FeaturedItemsResponse>('/api/featured-items');
  
  if (!apiUtils.isSuccess(response)) {
    throw new Error(apiUtils.getErrorMessage(response));
  }
  
  return response.data.data;
};

export function useFeaturedItems() {
  const { features } = useFeatureFlagsWithSimulation();

  const {
    data: featuredItems = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: featuredItemsQueryKeys.list({}),
    enabled: features.featuredItems, // Only fetch when featuredItems feature is enabled
    queryFn: async () => {
      const response = await fetchFeaturedItems();
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Custom retry logic with exponential backoff
    // Note: Changed from immediate retries (retry: 3) to smart retry with delays
    // This is an improvement that prevents server hammering on transient errors
    retry: (failureCount, error) => {
      // Don't retry if database is unavailable (fail fast)
      if (error instanceof Error && error.message?.includes('Database not configured')) {
        return false;
      }
      // Otherwise retry once (reduced from 3 to minimize timeouts)
      return failureCount < 2;
    },
    // Exponential backoff: 1s, 2s, 4s... up to 30s max
    // Prevents overwhelming the server during outages or rate limiting
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    featuredItems,
    isLoading,
    error,
    refetch,
  };
}
