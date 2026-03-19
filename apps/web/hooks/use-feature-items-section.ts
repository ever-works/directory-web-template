import { useMemo } from 'react';
import { useFeaturedItems, FeaturedItem } from './use-featured-items-client';

export type { FeaturedItem };

interface UseFeaturedItemsSectionProps {
  limit?: number;
  enabled?: boolean;
}

export function useFeaturedItemsSection({
  limit = 6,
  enabled: _enabled = true,
}: UseFeaturedItemsSectionProps = {}) {
  const {
    featuredItems,
    isLoading,
    error,
    refetch,
  } = useFeaturedItems();

  // Filter items based on limit and active status
  const filteredItems = useMemo(
    () => featuredItems
      .filter(item => item.isActive)
      .sort((a, b) => a.featuredOrder - b.featuredOrder)
      .slice(0, limit),
    [featuredItems, limit]
  );

  return {
    featuredItems: filteredItems,
    isLoading,
    isError: !!error,
    error: error?.message || null,
    refetch,
    invalidateFeaturedItems: refetch,
    prefetchFeaturedItems: () => Promise.resolve(),
    isStale: false,
    dataUpdatedAt: Date.now(),
  };
}