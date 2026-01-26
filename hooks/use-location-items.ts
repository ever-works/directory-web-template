'use client';

import { useQuery } from '@tanstack/react-query';
import type { LocationFilterState } from '@/components/filters/types';

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

	const { data, isLoading } = useQuery<LocationSearchResponse>({
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

	if (!isActive) {
		return {
			matchingSlugs: null,
			distances: new Map(),
			isLoading: false,
		};
	}

	const matchingSlugs = data?.data?.slugs ? new Set(data.data.slugs) : new Set<string>();
	const distances = new Map<string, number>(
		data?.data?.distances ? Object.entries(data.data.distances) : []
	);

	return {
		matchingSlugs,
		distances,
		isLoading,
	};
}
