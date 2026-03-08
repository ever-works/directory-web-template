'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LocationFilterState } from '@/components/filters/types';

const EMPTY_MAP = new Map<string, number>();

interface LocationSearchResponse {
	success: boolean;
	data: {
		slugs: string[];
		distances: Record<string, number>;
	};
}

interface UseLocationItemsReturn {
	/** Set of matching item slugs, or null if no location filter is active */
	matchingSlugs: Set<string> | null;
	/** Map of item slug to distance in km */
	distances: Map<string, number>;
	/** Whether the location query is loading */
	isLoading: boolean;
}

/**
 * Build query params for the location search API from location filter state
 */
function buildSearchParams(locationFilter: LocationFilterState): URLSearchParams | null {
	const params = new URLSearchParams();

	if (locationFilter.nearMe) {
		params.set('near_lat', locationFilter.nearMe.latitude.toString());
		params.set('near_lng', locationFilter.nearMe.longitude.toString());
		params.set('radius', locationFilter.nearMe.radius.toString());
		return params;
	}

	if (locationFilter.city) {
		params.set('city', locationFilter.city);
		return params;
	}

	if (locationFilter.country) {
		params.set('country', locationFilter.country);
		return params;
	}

	return null;
}

/**
 * Check if any location filter is active
 */
function isLocationFilterActive(locationFilter: LocationFilterState): boolean {
	return !!(locationFilter.nearMe || locationFilter.city || locationFilter.country);
}

/**
 * Hook that queries the location search API when a location filter is active.
 * Returns matching slugs and distances for filtering and displaying on item cards.
 *
 * @param locationFilter - Current location filter state from filter context
 * @returns Matching slugs, distances, and loading state
 */
export function useLocationItems(locationFilter: LocationFilterState): UseLocationItemsReturn {
	const isActive = isLocationFilterActive(locationFilter);

	const { data, isLoading, isError } = useQuery<LocationSearchResponse>({
		queryKey: [
			'location-search',
			locationFilter.nearMe?.latitude,
			locationFilter.nearMe?.longitude,
			locationFilter.nearMe?.radius,
			locationFilter.city,
			locationFilter.country,
		],
		queryFn: async () => {
			const params = buildSearchParams(locationFilter);
			if (!params) {
				return { success: true, data: { slugs: [], distances: {} } };
			}
			const response = await fetch(`/api/location/search?${params.toString()}`);
			if (!response.ok) {
				throw new Error('Location search failed');
			}
			return response.json() as Promise<LocationSearchResponse>;
		},
		enabled: isActive,
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 5 * 60 * 1000, // 5 minutes
	});

	// Memoize return values to prevent unstable references from cascading re-renders
	// null = data not yet loaded → don't apply location filtering (show all items while loading)
	// Set = API responded → filter to matching slugs (empty Set = no matches)
	const matchingSlugs = useMemo(
		() => data?.data?.slugs ? new Set(data.data.slugs) : null,
		[data?.data?.slugs]
	);

	const distances = useMemo(
		() => data?.data?.distances
			? new Map<string, number>(Object.entries(data.data.distances))
			: EMPTY_MAP,
		[data?.data?.distances]
	);

	if (!isActive || isError) {
		return { matchingSlugs: null, distances: EMPTY_MAP, isLoading: false };
	}

	return { matchingSlugs, distances, isLoading };
}
