import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clampAndScrollToTop } from '@/utils/pagination';
import type { ItemData } from "@/lib/content";
import { PER_PAGE } from "@/lib/paginate";

interface ServerPaginationOptions {
  /** Catalogue-wide filtered total (server-supplied). */
  total: number;
  /** Current page number (server-supplied, URL-driven). */
  page: number;
  /** Listing base path, e.g. `/discover`. */
  basePath: string;
  /** Current URL search-string, including the leading `?` (or empty). */
  search: string;
}

interface UsePaginationLogicOptions {
  perPage?: number;
  showPagination: boolean;
  /**
   * If supplied, paginate against the server-supplied `total` and navigate
   * via `router.push` (URL-driven). Used when the parent already sliced
   * `items` server-side (Spec 020). When omitted, the hook falls back to
   * pure in-memory client pagination — preserved for callers that pass the
   * full list (collections / tags / categories grids).
   */
  serverPagination?: ServerPaginationOptions;
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
  const router = useRouter();
  const [clientPage, setClientPage] = useState(1);
  const perPage = options.perPage || PER_PAGE;

  const isServer = !!options.serverPagination;
  const serverTotal = options.serverPagination?.total ?? 0;
  const serverPage = options.serverPagination?.page ?? 1;
  const serverBasePath = options.serverPagination?.basePath ?? '';
  const serverSearch = options.serverPagination?.search ?? '';

  const totalPages = useMemo(() => {
    if (isServer) return Math.max(1, Math.ceil(serverTotal / perPage));
    return Math.ceil(items.length / perPage);
  }, [isServer, serverTotal, items.length, perPage]);

  const currentPage = isServer ? serverPage : clientPage;

  const paginatedItems = useMemo(() => {
    if (!options.showPagination) return items;
    if (isServer) return items; // Already sliced server-side
    const start = (clientPage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, clientPage, perPage, options.showPagination, isServer]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (isServer) {
        const target = Math.max(1, Math.min(totalPages, page));
        const url = `${serverBasePath}/${target}${serverSearch}`;
        router.push(url);
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else {
        clampAndScrollToTop(page, totalPages, setClientPage);
      }
    },
    [isServer, totalPages, serverBasePath, serverSearch, router]
  );

  const resetToFirstPage = useCallback(() => {
    if (!isServer) setClientPage(1);
  }, [isServer]);

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
