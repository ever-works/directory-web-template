import { useMemo, useState, useEffect, useCallback } from "react";
import { clampAndScrollToTop } from '@/utils/pagination';
import type { ItemData } from "@/lib/content";
import { PER_PAGE } from "@/lib/paginate";

interface UsePaginationLogicOptions {
  perPage?: number;
  showPagination: boolean;
}

interface PaginationResult {
  paginatedItems: ItemData[];
  currentPage: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
  resetToFirstPage: () => void;
}

/**
 * Hook to handle pagination logic
 * Returns paginated items and page controls
 */
export function usePaginationLogic(
  items: ItemData[],
  options: UsePaginationLogicOptions
): PaginationResult {
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = options.perPage || PER_PAGE;

  const totalPages = useMemo(
    () => Math.ceil(items.length / perPage),
    [items.length, perPage]
  );

  const paginatedItems = useMemo(() => {
    if (!options.showPagination) return items;
    const start = (currentPage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, currentPage, perPage, options.showPagination]);

  const handlePageChange = useCallback((page: number) => {
    clampAndScrollToTop(page, totalPages, setCurrentPage);
  }, [totalPages]);

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    paginatedItems,
    currentPage,
    totalPages,
    handlePageChange,
    resetToFirstPage,
  };
}

/**
 * Hook to detect filter changes and reset pagination
 */
export function useFilterChangeDetection(
  searchTerm: string,
  selectedTags: string[],
  selectedTag: string | null,
  sortBy: string,
  resetCallback: () => void
): void {
  const filterKey = useMemo(
    () => `${searchTerm}-${selectedTags.join(',')}-${selectedTag || ''}-${sortBy}`,
    [searchTerm, selectedTags, selectedTag, sortBy]
  );

  useEffect(() => {
    resetCallback();
  }, [filterKey, resetCallback]);
}
