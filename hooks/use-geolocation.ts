'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Coordinates, GeolocationState, GeolocationErrorType } from '@/lib/maps/types';

/**
 * Options for the useGeolocation hook.
 */
interface UseGeolocationOptions {
	/** Enable high accuracy mode (may use more battery) */
	enableHighAccuracy?: boolean;
	/** Timeout in milliseconds (default: 10000) */
	timeout?: number;
	/** Maximum age of cached position in milliseconds (default: 0) */
	maximumAge?: number;
	/** Watch position changes continuously */
	watchPosition?: boolean;
}

/**
 * Return type for the useGeolocation hook.
 */
interface UseGeolocationReturn extends GeolocationState {
	/** Request the user's current location */
	requestLocation: () => Promise<Coordinates | null>;
	/** Check if geolocation is supported */
	isSupported: boolean;
	/** Clear the current position */
	clearPosition: () => void;
}

/**
 * Map browser geolocation error codes to our error types.
 */
function mapGeolocationError(error: GeolocationPositionError): GeolocationErrorType {
	switch (error.code) {
		case error.PERMISSION_DENIED:
			return 'PERMISSION_DENIED';
		case error.POSITION_UNAVAILABLE:
			return 'POSITION_UNAVAILABLE';
		case error.TIMEOUT:
			return 'TIMEOUT';
		default:
			return 'POSITION_UNAVAILABLE';
	}
}

/**
 * Hook for accessing browser geolocation with permission handling.
 *
 * Features:
 * - Permission status tracking
 * - Loading state during geolocation request
 * - Error handling with typed error codes
 * - Optional continuous position watching
 *
 * @param options - Configuration options
 * @returns Geolocation state and methods
 *
 * @example
 * ```tsx
 * const { coordinates, isLoading, error, requestLocation, permission } = useGeolocation();
 *
 * const handleUseMyLocation = async () => {
 *   const coords = await requestLocation();
 *   if (coords) {
 *     // Use the coordinates
 *   }
 * };
 * ```
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
	const { enableHighAccuracy = true, timeout = 10000, maximumAge = 0, watchPosition = false } = options;

	const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
	const [error, setError] = useState<GeolocationErrorType | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [permission, setPermission] = useState<PermissionState | null>(null);

	const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

	// Check permission status on mount
	useEffect(() => {
		if (!isSupported) return;

		const checkPermission = async () => {
			try {
				if (navigator.permissions) {
					const result = await navigator.permissions.query({ name: 'geolocation' });
					setPermission(result.state);

					// Listen for permission changes
					result.addEventListener('change', () => {
						setPermission(result.state);
					});
				}
			} catch {
				// Permissions API not supported, permission state unknown
				setPermission(null);
			}
		};

		checkPermission();
	}, [isSupported]);

	// Watch position if enabled
	useEffect(() => {
		if (!isSupported || !watchPosition) return;

		const watchId = navigator.geolocation.watchPosition(
			(position) => {
				setCoordinates({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude
				});
				setError(null);
			},
			(err) => {
				setError(mapGeolocationError(err));
			},
			{
				enableHighAccuracy,
				timeout,
				maximumAge
			}
		);

		return () => {
			navigator.geolocation.clearWatch(watchId);
		};
	}, [isSupported, watchPosition, enableHighAccuracy, timeout, maximumAge]);

	/**
	 * Request the user's current location.
	 * Returns the coordinates if successful, null otherwise.
	 */
	const requestLocation = useCallback(async (): Promise<Coordinates | null> => {
		if (!isSupported) {
			setError('NOT_SUPPORTED');
			return null;
		}

		setIsLoading(true);
		setError(null);

		return new Promise((resolve) => {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					const coords: Coordinates = {
						latitude: position.coords.latitude,
						longitude: position.coords.longitude
					};
					setCoordinates(coords);
					setIsLoading(false);
					setPermission('granted');
					resolve(coords);
				},
				(err) => {
					const errorType = mapGeolocationError(err);
					setError(errorType);
					setIsLoading(false);

					if (err.code === err.PERMISSION_DENIED) {
						setPermission('denied');
					}

					resolve(null);
				},
				{
					enableHighAccuracy,
					timeout,
					maximumAge
				}
			);
		});
	}, [isSupported, enableHighAccuracy, timeout, maximumAge]);

	/**
	 * Clear the current position.
	 */
	const clearPosition = useCallback(() => {
		setCoordinates(null);
		setError(null);
	}, []);

	return {
		coordinates,
		error,
		isLoading,
		permission,
		requestLocation,
		isSupported,
		clearPosition
	};
}
