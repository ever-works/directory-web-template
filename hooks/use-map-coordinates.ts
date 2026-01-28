'use client';

import { useQuery } from '@tanstack/react-query';

interface CoordinateEntry {
	slug: string;
	latitude: number;
	longitude: number;
	city: string | null;
	country: string | null;
}

interface CoordinatesResponse {
	success: boolean;
	data: CoordinateEntry[];
}

interface UseMapCoordinatesReturn {
	coordinates: CoordinateEntry[];
	isLoading: boolean;
	error: Error | null;
}

/**
 * Hook that fetches item coordinates from the location index for map display.
 *
 * @param enabled - Whether to fetch (default true). Set false when map view is not active.
 * @returns Coordinates array, loading state, and error
 */
export function useMapCoordinates(enabled = true): UseMapCoordinatesReturn {
	const { data, isLoading, error } = useQuery<CoordinatesResponse>({
		queryKey: ['map-coordinates'],
		queryFn: async () => {
			const response = await fetch('/api/location/coordinates');
			if (!response.ok) {
				throw new Error('Failed to fetch coordinates');
			}
			return response.json() as Promise<CoordinatesResponse>;
		},
		enabled,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	});

	return {
		coordinates: data?.data ?? [],
		isLoading,
		error: error as Error | null,
	};
}
