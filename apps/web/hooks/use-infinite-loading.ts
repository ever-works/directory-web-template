"use client";

import { useState, useCallback } from "react";
import { useLayoutTheme } from "@/components/context";
import { PER_PAGE } from "@/lib/paginate";

interface UseInfiniteLoadingProps<T> {
  items: T[];
  initialPage: number;
  perPage?: number;
}

interface UseInfiniteLoadingResult<T> {
  displayedItems: T[];
  hasMore: boolean;
  isLoading: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
}

export function useInfiniteLoading<T>({
  items,
  initialPage,
  perPage = PER_PAGE,
}: UseInfiniteLoadingProps<T>): UseInfiniteLoadingResult<T> {
  const { paginationType } = useLayoutTheme();
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const totalPages = Math.ceil(items.length / perPage);
  const displayedItems = items.slice(0, currentPage * perPage);
  const hasMore = currentPage < totalPages && displayedItems.length < items.length;

  // Set to 0 for production, or e.g. 300 for development
  const ARTIFICIAL_DELAY = 300;

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || paginationType !== "infinite") return;

    setIsLoading(true);
    setError(null);

    try {
      if (ARTIFICIAL_DELAY) {
        await new Promise(resolve => setTimeout(resolve, ARTIFICIAL_DELAY));
      }
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load more items"));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, paginationType]);

  return {
    displayedItems,
    hasMore,
    isLoading,
    error,
    loadMore,
  };
} 