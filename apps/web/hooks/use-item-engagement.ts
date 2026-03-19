import { useState, useEffect, useMemo } from 'react';
import type { ItemData } from '@/lib/content';
import type { ItemEngagementMetrics } from '@/lib/db/queries/engagement.queries';

/**
 * Extended ItemData with optional engagement metrics
 */
export interface ItemWithEngagement extends ItemData {
  engagement?: ItemEngagementMetrics;
}

interface UseItemEngagementOptions {
  /** Whether to fetch engagement data (default: true) */
  enabled?: boolean;
  /** Batch size for API calls (default: 100) */
  batchSize?: number;
}

interface UseItemEngagementResult {
  /** Items enriched with engagement metrics */
  items: ItemWithEngagement[];
  /** Whether engagement data is being loaded */
  isLoading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Whether engagement data has been loaded */
  hasEngagement: boolean;
}

/**
 * Hook to fetch and attach engagement metrics to items
 * 
 * Usage:
 * ```tsx
 * const { items: enrichedItems, isLoading } = useItemEngagement(items);
 * const sortedItems = sortItems(enrichedItems, 'popularity');
 * ```
 */
export function useItemEngagement(
  items: ItemData[],
  options: UseItemEngagementOptions = {}
): UseItemEngagementResult {
  const { enabled = true, batchSize = 100 } = options;
  
  const [metricsMap, setMetricsMap] = useState<Record<string, ItemEngagementMetrics>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasEngagement, setHasEngagement] = useState(false);

  // Get unique slugs that need engagement data
  const slugs = useMemo(() => 
    [...new Set(items.map(item => item.slug))],
    [items]
  );

  // Create a stable string key for dependency tracking
  const slugsKey = useMemo(() => slugs.join(','), [slugs]);

  // Fetch engagement data when items change
  useEffect(() => {
    if (!enabled || slugs.length === 0) {
      return;
    }

    let cancelled = false;

    const fetchEngagement = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const allMetrics: Record<string, ItemEngagementMetrics> = {};

        // Fetch in parallel batches to avoid URL length limits
        const batches: string[][] = [];
        for (let i = 0; i < slugs.length; i += batchSize) {
          batches.push(slugs.slice(i, i + batchSize));
        }
        const results = await Promise.all(
          batches.map(async (batch) => {
            const response = await fetch(
              `/api/items/engagement?slugs=${encodeURIComponent(batch.join(','))}`
            );
            if (!response.ok) {
              throw new Error(`Failed to fetch engagement data: ${response.statusText}`);
            }
            return response.json();
          })
        );
        for (const data of results) {
          if (data.metrics) {
            Object.assign(allMetrics, data.metrics);
          }
        }

        if (!cancelled) {
          setMetricsMap(allMetrics);
          setHasEngagement(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          console.error('[useItemEngagement] Error fetching engagement:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchEngagement();

    return () => {
      cancelled = true;
    };
  }, [slugsKey, slugs, enabled, batchSize]);

  // Enrich items with engagement data
  const enrichedItems = useMemo(() => {
    if (!hasEngagement) {
      return items;
    }

    return items.map(item => ({
      ...item,
      engagement: metricsMap[item.slug],
    }));
  }, [items, metricsMap, hasEngagement]);

  return {
    items: enrichedItems,
    isLoading,
    error,
    hasEngagement,
  };
}
