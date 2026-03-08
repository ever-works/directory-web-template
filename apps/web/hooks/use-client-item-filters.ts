import { useState, useCallback, useMemo } from 'react';
import { useDebounceValue } from './use-debounced-value';
import { ClientItemsListParams, ClientStatusFilter } from '@/lib/types/client-item';

export interface UseClientItemFiltersOptions {
  defaultStatus?: ClientStatusFilter;
  defaultSearch?: string;
  defaultPage?: number;
  defaultLimit?: number;
  defaultSortBy?: ClientItemsListParams['sortBy'];
  defaultSortOrder?: ClientItemsListParams['sortOrder'];
  searchDebounceMs?: number;
}

export interface UseClientItemFiltersReturn {
  // Current filter values
  status: ClientStatusFilter;
  search: string;
  debouncedSearch: string;
  page: number;
  limit: number;
  sortBy: ClientItemsListParams['sortBy'];
  sortOrder: ClientItemsListParams['sortOrder'];

  // Combined params for API calls
  params: ClientItemsListParams;

  // Actions
  setStatus: (status: ClientStatusFilter) => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSortBy: (sortBy: ClientItemsListParams['sortBy']) => void;
  setSortOrder: (sortOrder: ClientItemsListParams['sortOrder']) => void;
  toggleSortOrder: () => void;
  resetFilters: () => void;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // State flags
  isSearching: boolean;
  hasActiveFilters: boolean;
}

export function useClientItemFilters(options: UseClientItemFiltersOptions = {}): UseClientItemFiltersReturn {
  const {
    defaultStatus = 'all',
    defaultSearch = '',
    defaultPage = 1,
    defaultLimit = 10,
    defaultSortBy = 'updated_at',
    defaultSortOrder = 'desc',
    searchDebounceMs = 300,
  } = options;

  // Filter state
  const [status, setStatusState] = useState<ClientStatusFilter>(defaultStatus);
  const [search, setSearchState] = useState<string>(defaultSearch);
  const [page, setPageState] = useState<number>(defaultPage);
  const [limit, setLimitState] = useState<number>(defaultLimit);
  const [sortBy, setSortByState] = useState<ClientItemsListParams['sortBy']>(defaultSortBy);
  const [sortOrder, setSortOrderState] = useState<ClientItemsListParams['sortOrder']>(defaultSortOrder);

  // Debounced search value
  const debouncedSearch = useDebounceValue(search, searchDebounceMs);

  // Is currently searching (input differs from debounced)
  const isSearching = search !== debouncedSearch && search.trim() !== '';

  // Check if any filters are active (non-default values)
  const hasActiveFilters = useMemo(() => {
    return status !== 'all' || debouncedSearch.trim() !== '';
  }, [status, debouncedSearch]);

  // Combined params for API calls
  const params = useMemo<ClientItemsListParams>(() => ({
    page,
    limit,
    status,
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
  }), [page, limit, status, debouncedSearch, sortBy, sortOrder]);

  // Actions with auto-reset to page 1 when filters change
  const setStatus = useCallback((newStatus: ClientStatusFilter) => {
    setStatusState(newStatus);
    setPageState(1); // Reset to page 1 when status changes
  }, []);

  const setSearch = useCallback((newSearch: string) => {
    setSearchState(newSearch);
    // Don't reset page here - wait for debounced value to settle
  }, []);

  // Reset page when debounced search actually changes (handled by useEffect would be overkill here)
  // The component using this hook should handle the page reset based on debouncedSearch changes

  const setPage = useCallback((newPage: number) => {
    setPageState(Math.max(1, newPage));
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(Math.max(1, Math.min(100, newLimit)));
    setPageState(1); // Reset to page 1 when limit changes
  }, []);

  const setSortBy = useCallback((newSortBy: ClientItemsListParams['sortBy']) => {
    setSortByState(newSortBy);
    setPageState(1); // Reset to page 1 when sort changes
  }, []);

  const setSortOrder = useCallback((newSortOrder: ClientItemsListParams['sortOrder']) => {
    setSortOrderState(newSortOrder);
    setPageState(1); // Reset to page 1 when sort order changes
  }, []);

  const toggleSortOrder = useCallback(() => {
    setSortOrderState(prev => prev === 'asc' ? 'desc' : 'asc');
    setPageState(1);
  }, []);

  const resetFilters = useCallback(() => {
    setStatusState(defaultStatus);
    setSearchState(defaultSearch);
    setPageState(defaultPage);
    setLimitState(defaultLimit);
    setSortByState(defaultSortBy);
    setSortOrderState(defaultSortOrder);
  }, [defaultStatus, defaultSearch, defaultPage, defaultLimit, defaultSortBy, defaultSortOrder]);

  // Pagination helpers
  const goToPage = useCallback((targetPage: number) => {
    setPageState(Math.max(1, targetPage));
  }, []);

  const nextPage = useCallback(() => {
    setPageState(prev => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPageState(prev => Math.max(1, prev - 1));
  }, []);

  return {
    // Current filter values
    status,
    search,
    debouncedSearch,
    page,
    limit,
    sortBy,
    sortOrder,

    // Combined params
    params,

    // Actions
    setStatus,
    setSearch,
    setPage,
    setLimit,
    setSortBy,
    setSortOrder,
    toggleSortOrder,
    resetFilters,
    goToPage,
    nextPage,
    prevPage,

    // State flags
    isSearching,
    hasActiveFilters,
  };
}
