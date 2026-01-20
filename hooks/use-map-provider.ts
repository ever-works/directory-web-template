'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocationSettings } from './use-location-settings';
import type { UseMapProviderResult } from '@/lib/maps/types';
import type { IMapProvider } from '@/lib/maps/providers/map-provider.interface';

/**
 * Hook to get the configured map provider.
 *
 * Reads the provider setting from location settings and returns
 * the appropriate provider instance with loading/error states.
 *
 * @returns UseMapProviderResult with provider info, loading state, and error
 */
export function useMapProvider(): UseMapProviderResult {
	const { settings } = useLocationSettings();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [providerInstance, setProviderInstance] = useState<IMapProvider | null>(null);

	const provider = settings.provider;
	const mapStyle = settings.mapStyle;

	// Determine if the provider is configured based on env vars
	const isConfigured = useMemo(() => {
		if (provider === 'mapbox') {
			return Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
		}
		if (provider === 'google') {
			return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
		}
		return false;
	}, [provider]);

	// Load the provider when it changes
	useEffect(() => {
		if (!isConfigured) {
			setProviderInstance(null);
			setError(null);
			return;
		}

		let isMounted = true;
		setIsLoading(true);
		setError(null);

		const loadProvider = async () => {
			try {
				let providerClass: IMapProvider;

				if (provider === 'mapbox') {
					const { MapboxMapProvider } = await import('@/lib/maps/providers/mapbox-map-provider');
					providerClass = new MapboxMapProvider();
				} else {
					const { GoogleMapProvider } = await import('@/lib/maps/providers/google-map-provider');
					providerClass = new GoogleMapProvider();
				}

				// Pre-load the provider script
				await providerClass.loadScript();

				if (isMounted) {
					setProviderInstance(providerClass);
					setIsLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					setError(err instanceof Error ? err : new Error('Failed to load map provider'));
					setIsLoading(false);
				}
			}
		};

		loadProvider();

		return () => {
			isMounted = false;
		};
	}, [provider, isConfigured]);

	return {
		provider,
		isConfigured,
		isLoading,
		error,
		mapStyle
	};
}

/**
 * Hook to get the map provider instance.
 *
 * Use this when you need the actual provider instance to create maps.
 * Returns null if provider is not configured or still loading.
 */
export function useMapProviderInstance(): {
	provider: IMapProvider | null;
	isLoading: boolean;
	error: Error | null;
} {
	const { settings } = useLocationSettings();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [providerInstance, setProviderInstance] = useState<IMapProvider | null>(null);

	const providerType = settings.provider;

	// Determine if the provider is configured based on env vars
	const isConfigured = useMemo(() => {
		if (providerType === 'mapbox') {
			return Boolean(process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN);
		}
		if (providerType === 'google') {
			return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
		}
		return false;
	}, [providerType]);

	// Load the provider when it changes
	useEffect(() => {
		if (!isConfigured) {
			setProviderInstance(null);
			setError(null);
			return;
		}

		let isMounted = true;
		setIsLoading(true);
		setError(null);

		const loadProvider = async () => {
			try {
				let instance: IMapProvider;

				if (providerType === 'mapbox') {
					const { MapboxMapProvider } = await import('@/lib/maps/providers/mapbox-map-provider');
					instance = new MapboxMapProvider();
				} else {
					const { GoogleMapProvider } = await import('@/lib/maps/providers/google-map-provider');
					instance = new GoogleMapProvider();
				}

				// Pre-load the provider script
				await instance.loadScript();

				if (isMounted) {
					setProviderInstance(instance);
					setIsLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					setError(err instanceof Error ? err : new Error('Failed to load map provider'));
					setIsLoading(false);
				}
			}
		};

		loadProvider();

		return () => {
			isMounted = false;
		};
	}, [providerType, isConfigured]);

	return {
		provider: providerInstance,
		isLoading,
		error
	};
}
