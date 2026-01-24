import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useDebounceSearch } from './use-debounced-search';

/**
 * Configuration options for the admin filters hook
 */
export interface AdminFiltersConfig<TStatus extends string = string> {
	/** Minimum search length to trigger debounce (default: 2) */
	minSearchLength?: number;
	/** Debounce delay in milliseconds (default: 300) */
	debounceDelay?: number;
	/** Initial status filter value */
	initialStatus?: TStatus | '';
	/** Initial multi-select filter values keyed by filter name */
	initialMultiFilters?: Record<string, string[]>;
	/**
	 * Callback when filters change (useful for page reset).
	 * Note: Does not need to be memoized - stored in ref internally.
	 */
	onFiltersChange?: () => void;
}

/**
 * Return type for the useAdminFilters hook
 */
export interface UseAdminFiltersReturn<TStatus extends string = string> {
	// Search state
	searchTerm: string;
	setSearchTerm: (value: string) => void;
	debouncedSearchTerm: string;
	isSearching: boolean;
	hasActiveSearch: boolean;
	clearSearch: () => void;

	// Status filter
	statusFilter: TStatus | '';
	setStatusFilter: (status: TStatus | '') => void;

	// Multi-select filters (categories, tags, etc.)
	multiFilters: Record<string, string[]>;
	setMultiFilter: (filterName: string, values: string[]) => void;
	toggleMultiFilterValue: (filterName: string, value: string) => void;
	clearMultiFilter: (filterName: string) => void;

	// Active filter utilities
	activeFilterCount: number;
	hasActiveFilters: boolean;
	clearAllFilters: () => void;

	// Utility function
	calculateActiveFilterCount: () => number;
}

/**
 * Generic admin filters hook for unified filter state management.
 * Provides debounced search, status filtering, and multi-select filters.
 *
 * @example
 * ```tsx
 * type ItemStatus = 'draft' | 'pending' | 'approved' | 'rejected';
 *
 * const {
 *   searchTerm,
 *   setSearchTerm,
 *   debouncedSearchTerm,
 *   isSearching,
 *   statusFilter,
 *   setStatusFilter,
 *   multiFilters,
 *   setMultiFilter,
 *   activeFilterCount,
 *   clearAllFilters,
 * } = useAdminFilters<ItemStatus>({
 *   onFiltersChange: () => setCurrentPage(1),
 * });
 * ```
 */
export function useAdminFilters<TStatus extends string = string>(
	config: AdminFiltersConfig<TStatus> = {}
): UseAdminFiltersReturn<TStatus> {
	const {
		minSearchLength = 2,
		debounceDelay = 300,
		initialStatus = '' as TStatus | '',
		initialMultiFilters = {},
		onFiltersChange,
	} = config;

	// Search state
	const [searchTerm, setSearchTerm] = useState('');

	// Status filter state
	const [statusFilter, setStatusFilter] = useState<TStatus | ''>(initialStatus);

	// Multi-select filters state (categories, tags, etc.)
	const [multiFilters, setMultiFilters] = useState<Record<string, string[]>>(initialMultiFilters);

	// Track if this is the initial mount to prevent triggering onFiltersChange on mount
	const isInitialMount = useRef(true);

	// Store onFiltersChange in ref to avoid dependency issues
	// This prevents re-running effects when consumer passes non-memoized callbacks
	const onFiltersChangeRef = useRef(onFiltersChange);
	useEffect(() => {
		onFiltersChangeRef.current = onFiltersChange;
	}, [onFiltersChange]);

	// Debounced search with minimum length requirement
	const trimmedSearch = searchTerm.trim();
	const searchToDebounce = trimmedSearch.length >= minSearchLength ? trimmedSearch : '';

	// Memoized onSearch callback to prevent unnecessary recreation
	const handleSearchChange = useCallback(() => {
		if (!isInitialMount.current) {
			onFiltersChangeRef.current?.();
		}
	}, []);

	const { debouncedValue: debouncedSearchTerm, isSearching } = useDebounceSearch({
		searchValue: searchToDebounce,
		delay: debounceDelay,
		onSearch: handleSearchChange,
	});

	// Track filter changes for page reset (status and multi-filters)
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}
		onFiltersChangeRef.current?.();
	}, [statusFilter, multiFilters]);

	// Derived state
	const hasActiveSearch = trimmedSearch.length >= minSearchLength;

	// Calculate active filter count
	const calculateActiveFilterCount = useCallback((): number => {
		let count = 0;
		if (hasActiveSearch) count += 1;
		if (statusFilter) count += 1;
		Object.values(multiFilters).forEach((values) => {
			count += values.length;
		});
		return count;
	}, [hasActiveSearch, statusFilter, multiFilters]);

	const activeFilterCount = useMemo(calculateActiveFilterCount, [calculateActiveFilterCount]);
	const hasActiveFilters = activeFilterCount > 0;

	// Multi-filter helpers
	const setMultiFilter = useCallback((filterName: string, values: string[]) => {
		setMultiFilters((prev) => ({ ...prev, [filterName]: values }));
	}, []);

	const toggleMultiFilterValue = useCallback((filterName: string, value: string) => {
		setMultiFilters((prev) => {
			const current = prev[filterName] || [];
			const updated = current.includes(value)
				? current.filter((v) => v !== value)
				: [...current, value];
			return { ...prev, [filterName]: updated };
		});
	}, []);

	const clearMultiFilter = useCallback((filterName: string) => {
		setMultiFilters((prev) => ({ ...prev, [filterName]: [] }));
	}, []);

	// Clear all filters (preserves keys with empty arrays)
	// Explicitly calls onFiltersChange for immediate page reset,
	// since search-only clearing would otherwise wait for debounce
	const clearAllFilters = useCallback(() => {
		setSearchTerm('');
		setStatusFilter('' as TStatus | '');
		setMultiFilters((prev) => {
			const cleared: Record<string, string[]> = {};
			Object.keys(prev).forEach((key) => {
				cleared[key] = [];
			});
			return cleared;
		});
		// Immediate callback for consistent page reset behavior
		onFiltersChangeRef.current?.();
	}, []);

	const clearSearch = useCallback(() => {
		setSearchTerm('');
	}, []);

	return {
		// Search
		searchTerm,
		setSearchTerm,
		debouncedSearchTerm,
		isSearching,
		hasActiveSearch,
		clearSearch,

		// Status
		statusFilter,
		setStatusFilter,

		// Multi-filters
		multiFilters,
		setMultiFilter,
		toggleMultiFilterValue,
		clearMultiFilter,

		// Active filter utilities
		activeFilterCount,
		hasActiveFilters,
		clearAllFilters,

		// Utility
		calculateActiveFilterCount,
	};
}
