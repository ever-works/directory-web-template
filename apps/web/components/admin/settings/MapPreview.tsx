'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';

interface MapPreviewProps {
	provider: 'mapbox' | 'google';
	mapStyle: 'streets' | 'satellite';
	isConfigured: boolean;
	translations: {
		notConfigured: string;
		loadingError: string;
		mapError: string;
		mapboxNotConfigured: string;
		googleNotConfigured: string;
		mapboxNotInstalled: string;
		googleNotInstalled: string;
	};
}

// Default preview location (San Francisco)
const DEFAULT_CENTER = {
	lat: 37.7749,
	lng: -122.4194
};
const DEFAULT_ZOOM = 12;

export function MapPreview({ provider, mapStyle, isConfigured, translations }: MapPreviewProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<unknown>(null);

	useEffect(() => {
		if (!isConfigured || !mapContainerRef.current) {
			setIsLoading(false);
			return;
		}

		let isMounted = true;
		setIsLoading(true);
		setError(null);

		const loadMap = async () => {
			try {
				if (provider === 'mapbox') {
					await loadMapboxMap();
				} else {
					await loadGoogleMap();
				}
			} catch (err) {
				if (isMounted) {
					console.error('Failed to load map:', err);
					setError(err instanceof Error ? err.message : translations.loadingError);
					setIsLoading(false);
				}
			}
		};

		const loadMapboxMap = async () => {
			try {
				const mapboxgl = (await import('mapbox-gl')).default;

				const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
				if (!accessToken) {
					throw new Error(translations.mapboxNotConfigured);
				}

				mapboxgl.accessToken = accessToken;

				// Cleanup previous instance
				if (mapInstanceRef.current && typeof (mapInstanceRef.current as { remove?: () => void }).remove === 'function') {
					(mapInstanceRef.current as { remove: () => void }).remove();
				}

				const map = new mapboxgl.Map({
					container: mapContainerRef.current!,
					style:
						mapStyle === 'satellite'
							? 'mapbox://styles/mapbox/satellite-streets-v12'
							: 'mapbox://styles/mapbox/streets-v12',
					center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
					zoom: DEFAULT_ZOOM,
					interactive: false
				});

				mapInstanceRef.current = map;

				map.on('load', () => {
					if (isMounted) {
						setIsLoading(false);
					}
				});

				map.on('error', (e) => {
					if (isMounted) {
						setError(e.error?.message || translations.mapError);
						setIsLoading(false);
					}
				});
			} catch (err) {
				// If mapbox-gl is not installed, show a helpful message
				if (err instanceof Error && err.message.includes('Cannot find module')) {
					throw new Error(translations.mapboxNotInstalled);
				}
				throw err;
			}
		};

		const loadGoogleMap = async () => {
			try {
				const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
				if (!apiKey) {
					throw new Error(translations.googleNotConfigured);
				}

				// Use the new functional API for @googlemaps/js-api-loader v2.x
				const { setOptions, importLibrary } = await import('@googlemaps/js-api-loader');

				// Set the API options
				setOptions({
					key: apiKey,
					v: 'weekly'
				});

				// Import the maps library
				const mapsLibrary = await importLibrary('maps');
				const { Map } = mapsLibrary;

				const map = new Map(mapContainerRef.current!, {
					center: DEFAULT_CENTER,
					zoom: DEFAULT_ZOOM,
					mapTypeId: mapStyle === 'satellite' ? 'satellite' : 'roadmap',
					disableDefaultUI: true,
					mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID
				});

				mapInstanceRef.current = map;

				if (isMounted) {
					setIsLoading(false);
				}
			} catch (err) {
				// If @googlemaps/js-api-loader is not installed, show a helpful message
				if (err instanceof Error && err.message.includes('Cannot find module')) {
					throw new Error(translations.googleNotInstalled);
				}
				throw err;
			}
		};

		loadMap();

		return () => {
			isMounted = false;
			// Cleanup Mapbox instance on unmount
			if (mapInstanceRef.current && typeof (mapInstanceRef.current as { remove?: () => void }).remove === 'function') {
				(mapInstanceRef.current as { remove: () => void }).remove();
				mapInstanceRef.current = null;
			}
		};
	}, [provider, mapStyle, isConfigured, translations]);

	if (!isConfigured) {
		return (
			<div className="w-full h-48 bg-gray-100 dark:bg-white/[0.05] rounded-lg flex flex-col items-center justify-center">
				<MapPin className="w-8 h-8 text-gray-400 mb-2" />
				<p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
					{translations.notConfigured}
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="w-full h-48 bg-red-50 dark:bg-red-900/20 rounded-lg flex flex-col items-center justify-center border border-red-200 dark:border-red-800">
				<AlertCircle className="w-8 h-8 text-red-400 mb-2" />
				<p className="text-sm text-red-600 dark:text-red-400 text-center px-4">{error}</p>
			</div>
		);
	}

	return (
		<div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.06]">
			{isLoading && (
				<div className="absolute inset-0 bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center z-10">
					<Loader2 className="w-6 h-6 animate-spin text-gray-400" />
				</div>
			)}
			<div ref={mapContainerRef} className="w-full h-full" />
		</div>
	);
}
