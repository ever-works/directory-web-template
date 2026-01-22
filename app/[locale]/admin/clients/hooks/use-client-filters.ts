import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAdminFilters, type UseAdminFiltersReturn } from '@/hooks/use-admin-filters';
import { computeDateRange } from '../utils/client-helpers';

export type DatePreset = 'all' | 'last7' | 'last30' | 'last90' | 'thisMonth' | 'custom';
export type DateFilterType = 'created' | 'updated';
export type ClientStatus = 'active' | 'inactive' | 'suspended' | 'trial';

export interface ClientFiltersConfig {
	/** Callback when filters change (useful for page reset) */
	onFiltersChange?: () => void;
}

export interface ClientFilters {
	searchTerm: string;
	statusFilter: string;
	planFilter: string;
	accountTypeFilter: string;
	providerFilter: string;
	datePreset: DatePreset;
	customDateFrom: string;
	customDateTo: string;
	dateFilterType: DateFilterType;
	createdAfter: string;
	createdBefore: string;
	updatedAfter: string;
	updatedBefore: string;
}

export interface UseClientFiltersReturn extends Omit<UseAdminFiltersReturn<ClientStatus>, 'clearAllFilters'> {
	// Legacy interface for filters object
	filters: ClientFilters;

	// Date-specific state
	datePreset: DatePreset;
	customDateFrom: string;
	customDateTo: string;
	dateFilterType: DateFilterType;

	// Computed date values
	createdAfter: string;
	createdBefore: string;
	updatedAfter: string;
	updatedBefore: string;

	// Date setters
	setDatePreset: (value: DatePreset) => void;
	setCustomDateFrom: (value: string) => void;
	setCustomDateTo: (value: string) => void;
	setDateFilterType: (value: DateFilterType) => void;

	// Convenience getters for single-value filters
	planFilter: string;
	accountTypeFilter: string;
	providerFilter: string;

	// Convenience setters for single-value filters
	setPlanFilter: (value: string) => void;
	setAccountTypeFilter: (value: string) => void;
	setProviderFilter: (value: string) => void;

	// Clear all filters including date filters
	clearFilters: () => void;

	// Count filters including date
	totalActiveFilterCount: number;

	// Has any active filters including date
	hasActiveFiltersIncludingDate: boolean;
}

/**
 * Custom hook for managing client filter state.
 * Composes with useAdminFilters and adds client-specific date filter state.
 */
export function useClientFilters(config: ClientFiltersConfig = {}): UseClientFiltersReturn {
	const { onFiltersChange } = config;

	// Compose with generic admin filters hook
	const adminFilters = useAdminFilters<ClientStatus>({
		onFiltersChange,
		initialMultiFilters: { plan: [], accountType: [], provider: [] },
	});

	// Client-specific date filter state
	const [datePreset, setDatePreset] = useState<DatePreset>('all');
	const [customDateFrom, setCustomDateFrom] = useState<string>('');
	const [customDateTo, setCustomDateTo] = useState<string>('');
	const [dateFilterType, setDateFilterType] = useState<DateFilterType>('created');

	// Track initial mount for date filters to prevent triggering onFiltersChange on mount
	const isInitialDateMount = useRef(true);

	// Store onFiltersChange in ref to avoid dependency issues
	const onFiltersChangeRef = useRef(onFiltersChange);
	useEffect(() => {
		onFiltersChangeRef.current = onFiltersChange;
	}, [onFiltersChange]);

	// Computed date values
	const [createdAfter, setCreatedAfter] = useState<string>('');
	const [createdBefore, setCreatedBefore] = useState<string>('');
	const [updatedAfter, setUpdatedAfter] = useState<string>('');
	const [updatedBefore, setUpdatedBefore] = useState<string>('');

	// Update computed date filters when date state changes
	useEffect(() => {
		const { from, to } = computeDateRange(datePreset, customDateFrom, customDateTo);

		if (dateFilterType === 'created') {
			setCreatedAfter(from);
			setCreatedBefore(to);
			setUpdatedAfter('');
			setUpdatedBefore('');
		} else {
			setUpdatedAfter(from);
			setUpdatedBefore(to);
			setCreatedAfter('');
			setCreatedBefore('');
		}
	}, [datePreset, dateFilterType, customDateFrom, customDateTo]);

	// Trigger onFiltersChange when date filters change (after initial mount)
	useEffect(() => {
		if (isInitialDateMount.current) {
			isInitialDateMount.current = false;
			return;
		}
		onFiltersChangeRef.current?.();
	}, [datePreset, dateFilterType, customDateFrom, customDateTo]);

	// Convenience getters for single-value filters (first value or empty string)
	const planFilter = adminFilters.multiFilters.plan?.[0] || '';
	const accountTypeFilter = adminFilters.multiFilters.accountType?.[0] || '';
	const providerFilter = adminFilters.multiFilters.provider?.[0] || '';

	// Convenience setters for single-value filters
	const setPlanFilter = useCallback(
		(value: string) => {
			adminFilters.setMultiFilter('plan', value ? [value] : []);
		},
		[adminFilters]
	);

	const setAccountTypeFilter = useCallback(
		(value: string) => {
			adminFilters.setMultiFilter('accountType', value ? [value] : []);
		},
		[adminFilters]
	);

	const setProviderFilter = useCallback(
		(value: string) => {
			adminFilters.setMultiFilter('provider', value ? [value] : []);
		},
		[adminFilters]
	);

	// Clear all filters including date filters
	const clearFilters = useCallback(() => {
		adminFilters.clearAllFilters();
		setDatePreset('all');
		setCustomDateFrom('');
		setCustomDateTo('');
		setDateFilterType('created');
	}, [adminFilters]);

	// Total count including date filter
	const totalActiveFilterCount = useMemo(() => {
		let count = adminFilters.activeFilterCount;
		if (datePreset !== 'all') count += 1;
		return count;
	}, [adminFilters.activeFilterCount, datePreset]);

	// Whether any filters (including date) are active
	const hasActiveFiltersIncludingDate = totalActiveFilterCount > 0;

	// Build legacy filters object for backward compatibility
	const filters: ClientFilters = useMemo(
		() => ({
			searchTerm: adminFilters.searchTerm,
			statusFilter: adminFilters.statusFilter,
			planFilter,
			accountTypeFilter,
			providerFilter,
			datePreset,
			customDateFrom,
			customDateTo,
			dateFilterType,
			createdAfter,
			createdBefore,
			updatedAfter,
			updatedBefore,
		}),
		[
			adminFilters.searchTerm,
			adminFilters.statusFilter,
			planFilter,
			accountTypeFilter,
			providerFilter,
			datePreset,
			customDateFrom,
			customDateTo,
			dateFilterType,
			createdAfter,
			createdBefore,
			updatedAfter,
			updatedBefore,
		]
	);

	return {
		// From adminFilters
		searchTerm: adminFilters.searchTerm,
		setSearchTerm: adminFilters.setSearchTerm,
		debouncedSearchTerm: adminFilters.debouncedSearchTerm,
		isSearching: adminFilters.isSearching,
		hasActiveSearch: adminFilters.hasActiveSearch,
		clearSearch: adminFilters.clearSearch,
		statusFilter: adminFilters.statusFilter,
		setStatusFilter: adminFilters.setStatusFilter,
		multiFilters: adminFilters.multiFilters,
		setMultiFilter: adminFilters.setMultiFilter,
		toggleMultiFilterValue: adminFilters.toggleMultiFilterValue,
		clearMultiFilter: adminFilters.clearMultiFilter,
		activeFilterCount: adminFilters.activeFilterCount,
		hasActiveFilters: adminFilters.hasActiveFilters,
		calculateActiveFilterCount: adminFilters.calculateActiveFilterCount,

		// Legacy filters object
		filters,

		// Date-specific state
		datePreset,
		customDateFrom,
		customDateTo,
		dateFilterType,

		// Computed date values
		createdAfter,
		createdBefore,
		updatedAfter,
		updatedBefore,

		// Date setters
		setDatePreset,
		setCustomDateFrom,
		setCustomDateTo,
		setDateFilterType,

		// Convenience single-value getters
		planFilter,
		accountTypeFilter,
		providerFilter,

		// Convenience single-value setters
		setPlanFilter,
		setAccountTypeFilter,
		setProviderFilter,

		// Clear all filters
		clearFilters,

		// Total count including date
		totalActiveFilterCount,

		// Has active filters including date
		hasActiveFiltersIncludingDate,
	};
}
