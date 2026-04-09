'use client';
import { createContext, useContext } from 'react';
import { FilterContextType } from '../types';
import { useFilterState } from '../hooks/use-filter-state';

/**
 * Filter context for sharing filter state across components
 */
export const FilterContext = createContext<FilterContextType | null>(null);

/**
 * Hook to use filter context
 */
export function useFilters() {
	const context = useContext(FilterContext);
	if (!context) {
		throw new Error('useFilters must be used within a FilterProvider');
	}
	return context;
}

export interface FilterProviderProps {
	children: React.ReactNode;
	initialTag?: string | null;
	initialCategory?: string | null;
	initialSortBy?: string;
}

/**
 * Filter provider component
 * Provides filter state to child components
 * Can accept initial tag/category from page routes
 */
export function FilterProvider({ children, initialTag, initialCategory, initialSortBy }: FilterProviderProps) {
	const filterState = useFilterState(initialTag, initialCategory, initialSortBy);

	return <FilterContext.Provider value={filterState}>{children}</FilterContext.Provider>;
}
