'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGeolocation } from '@/hooks/use-geolocation';
import { apiUtils, serverClient } from '@/lib/api/server-api-client';
import type { Coordinates } from '@/lib/maps/types';
import type { LocationPrivacy } from '@/lib/validations/user-location';

// ######################### Types #########################

export interface UserLocationProfile {
	defaultLatitude: number | null;
	defaultLongitude: number | null;
	defaultCity: string | null;
	defaultCountry: string | null;
	locationPrivacy: LocationPrivacy;
}

export interface UseUserLocationReturn {
	/** Best available coordinates (browser > profile > null) */
	coordinates: Coordinates | null;
	/** Source of the current coordinates */
	source: 'browser' | 'profile' | null;
	/** Profile location data from the database */
	profileLocation: UserLocationProfile | null;
	/** Whether data is loading (profile fetch or browser geo) */
	isLoading: boolean;
	/** Request browser geolocation */
	requestBrowserLocation: () => Promise<Coordinates | null>;
	/** Save location to profile */
	saveProfileLocation: (data: Partial<UserLocationProfile>) => Promise<UserLocationProfile>;
	/** Clear saved profile location */
	clearProfileLocation: () => Promise<UserLocationProfile>;
	/** Whether save/clear is in progress */
	isSaving: boolean;
	/** Error from profile fetch */
	error: Error | null;
}

// ######################### Constants #########################

export const USER_LOCATION_QUERY_KEY = ['user', 'profile', 'location'] as const;

const STALE_TIME = 10 * 60 * 1000; // 10 minutes
const GC_TIME = 30 * 60 * 1000; // 30 minutes

// ######################### API Functions #########################

const fetchProfileLocation = async (): Promise<UserLocationProfile> => {
	const response = await serverClient.get<UserLocationProfile>('/api/user/profile/location');
	if (!apiUtils.isSuccess(response)) {
		const errorMessage = apiUtils.getErrorMessage(response) || 'Failed to fetch location';
		throw new Error(errorMessage);
	}
	if (!response.data) {
		throw new Error('No location data received');
	}
	return response.data;
};

const patchProfileLocation = async (data: Partial<UserLocationProfile>): Promise<UserLocationProfile> => {
	const response = await serverClient.patch<UserLocationProfile>('/api/user/profile/location', data);
	if (!apiUtils.isSuccess(response)) {
		const errorMessage = apiUtils.getErrorMessage(response) || 'Failed to save location';
		throw new Error(errorMessage);
	}
	if (!response.data) {
		throw new Error('No location data received');
	}
	return response.data;
};

// ######################### Hook #########################

/**
 * Hook combining browser geolocation with saved profile location.
 *
 * Priority: browser coordinates > profile coordinates.
 * Profile location is only used as fallback when locationPrivacy is not 'private'.
 *
 * @example
 * ```tsx
 * const { coordinates, source, saveProfileLocation } = useUserLocation();
 *
 * if (coordinates) {
 *   console.log(`Using ${source} location: ${coordinates.latitude}, ${coordinates.longitude}`);
 * }
 * ```
 */
export function useUserLocation(): UseUserLocationReturn {
	const queryClient = useQueryClient();
	const {
		coordinates: browserCoords,
		isLoading: geoLoading,
		requestLocation,
	} = useGeolocation();

	const {
		data: profileLocation,
		isLoading: profileLoading,
		error: profileError,
	} = useQuery<UserLocationProfile, Error>({
		queryKey: USER_LOCATION_QUERY_KEY,
		queryFn: fetchProfileLocation,
		staleTime: STALE_TIME,
		gcTime: GC_TIME,
		refetchOnWindowFocus: false,
		retry: (failureCount, err) => {
			if (err.message.includes('Unauthorized')) return false;
			return failureCount < 2;
		},
	});

	const saveMutation = useMutation<UserLocationProfile, Error, Partial<UserLocationProfile>>({
		mutationFn: patchProfileLocation,
		onSuccess: (data) => {
			queryClient.setQueryData(USER_LOCATION_QUERY_KEY, data);
		},
	});

	// Determine best coordinates: browser takes priority
	let coordinates: Coordinates | null = null;
	let source: 'browser' | 'profile' | null = null;

	if (browserCoords) {
		coordinates = browserCoords;
		source = 'browser';
	} else if (
		profileLocation?.defaultLatitude != null &&
		profileLocation?.defaultLongitude != null
	) {
		coordinates = {
			latitude: profileLocation.defaultLatitude,
			longitude: profileLocation.defaultLongitude,
		};
		source = 'profile';
	}

	return {
		coordinates,
		source,
		profileLocation: profileLocation ?? null,
		isLoading: profileLoading || geoLoading,
		requestBrowserLocation: requestLocation,
		saveProfileLocation: (data) => saveMutation.mutateAsync(data),
		clearProfileLocation: () =>
			saveMutation.mutateAsync({
				defaultLatitude: null,
				defaultLongitude: null,
				defaultCity: null,
				defaultCountry: null,
			}),
		isSaving: saveMutation.isPending,
		error: profileError,
	};
}
