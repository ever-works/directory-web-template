import { useCallback, useEffect, useRef, useState } from 'react';
import type { ItemData } from '@/lib/content';

interface UseServerInfiniteLoadingProps {
  /** Initial page slice (server-rendered). */
  initialItems: ItemData[];
  /** Catalogue-wide filtered total. */
  total: number;
  /** Page number of `initialItems`. */
  initialPage: number;
  perPage: number;
  /** Builds the JSON-listing API URL for a given page (filters/sort baked in by caller). */
  buildPageUrl: (page: number) => string;
  /** Locale to send through the API. */
  locale: string;
}

interface UseServerInfiniteLoadingResult {
  displayedItems: ItemData[];
  hasMore: boolean;
  isLoading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
}

/**
 * Server-side infinite loading. Pairs with `app/api/items/listing` route to
 * fetch successive pages on scroll without shipping the full catalogue to
 * the browser (Spec 020).
 *
 * `initialItems` is the SSR-rendered first page. `loadMore` fetches the
 * next page from the JSON API and appends to the displayed list. The
 * accumulated buffer resets when `initialItems` / filters change.
 */
export function useServerInfiniteLoading({
  initialItems,
  total,
  initialPage,
  perPage,
  buildPageUrl,
  locale,
}: UseServerInfiniteLoadingProps): UseServerInfiniteLoadingResult {
  const [extraItems, setExtraItems] = useState<ItemData[]>([]);
  const [nextPage, setNextPage] = useState(initialPage + 1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const inFlight = useRef(false);

  // Reset accumulated buffer whenever the SSR slice changes (filters /
  // sort / first-page navigation). React's identity check on `initialItems`
  // handles the trigger.
  useEffect(() => {
    setExtraItems([]);
    setNextPage(initialPage + 1);
    setError(null);
  }, [initialItems, initialPage]);

  const displayedItems = extraItems.length === 0 ? initialItems : [...initialItems, ...extraItems];
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const hasMore = nextPage <= totalPages && displayedItems.length < total;

  const loadMore = useCallback(async () => {
    if (inFlight.current || isLoading || !hasMore) return;
    inFlight.current = true;
    setIsLoading(true);
    setError(null);
    try {
      const url = `${buildPageUrl(nextPage)}${buildPageUrl(nextPage).includes('?') ? '&' : '?'}lang=${encodeURIComponent(locale)}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Listing API ${response.status}`);
      }
      const payload = (await response.json()) as { items: ItemData[] };
      if (!Array.isArray(payload.items)) {
        throw new Error('Listing API returned malformed items');
      }
      setExtraItems((prev) => [...prev, ...payload.items]);
      setNextPage((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more items'));
    } finally {
      setIsLoading(false);
      inFlight.current = false;
    }
  }, [buildPageUrl, locale, nextPage, hasMore, isLoading]);

  return { displayedItems, hasMore, isLoading, error, loadMore };
}
