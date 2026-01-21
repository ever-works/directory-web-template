'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapPin, Loader2, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapProviderInstance } from '@/hooks/use-map-provider';
import { useLocationSettings } from '@/hooks/use-location-settings';
import type { MapComponentProps, MapMarkerData } from '@/lib/maps/types';
import type { IMapInstance, IClustererInstance } from '@/lib/maps/providers/map-provider.interface';

const DEFAULT_ZOOM = 12;

// CSS class names extracted for reusability
const mapContainerBaseStyles = 'relative w-full rounded-xl overflow-hidden';
const mapLoadingOverlayStyles =
	'absolute inset-0 bg-white/80 dark:bg-gray-900/80 z-10 flex items-center justify-center';
const mapDisabledStyles =
	'bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center';
const mapErrorStyles =
	'bg-red-50 dark:bg-red-900/10 flex flex-col items-center justify-center border border-red-200 dark:border-red-800';

/**
 * Interactive Map component that works with configured provider (Mapbox or Google Maps).
 *
 * Features:
 * - Automatic provider detection from settings
 * - Marker display with optional clustering
 * - Zoom controls and fullscreen toggle
 * - Loading, error, and disabled states
 * - Accessible with proper ARIA attributes
 *
 * @example
 * ```tsx
 * <Map
 *   markers={items}
 *   center={{ latitude: 40.7128, longitude: -74.0060 }}
 *   zoom={12}
 *   onMarkerClick={(marker) => console.log('Clicked:', marker)}
 * />
 * ```
 */
export function Map({
	markers = [],
	center,
	zoom = DEFAULT_ZOOM,
	style,
	className,
	height = 400,
	width = '100%',
	controls = {
		showZoomControls: true,
		showFullscreenControl: true
	},
	enableClustering = true,
	clusterOptions,
	isLoading: externalLoading = false,
	isDisabled = false,
	error: externalError = null,
	onMarkerClick,
	onClusterClick,
	onViewportChange,
	onReady,
	onError,
	ariaLabel
}: MapComponentProps): React.ReactElement {
	const { settings } = useLocationSettings();

	// Use provided center or fall back to configured default
	const mapCenter = center ?? settings.defaultCenter;
	const { provider, isLoading: providerLoading, error: providerError } = useMapProviderInstance();

	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<IMapInstance | null>(null);
	const clustererRef = useRef<IClustererInstance | null>(null);

	// Refs for callbacks to avoid stale closures
	const onViewportChangeRef = useRef(onViewportChange);
	const onMarkerClickRef = useRef(onMarkerClick);
	const onClusterClickRef = useRef(onClusterClick);
	const onReadyRef = useRef(onReady);
	const onErrorRef = useRef(onError);

	// Keep refs in sync
	onViewportChangeRef.current = onViewportChange;
	onMarkerClickRef.current = onMarkerClick;
	onClusterClickRef.current = onClusterClick;
	onReadyRef.current = onReady;
	onErrorRef.current = onError;

	const [isMapLoading, setIsMapLoading] = useState(true);
	const [mapError, setMapError] = useState<string | null>(null);
	const [isFullscreen, setIsFullscreen] = useState(false);

	const mapStyle = style ?? settings.mapStyle;
	const showLoading = externalLoading || providerLoading || isMapLoading;
	const displayError = externalError || providerError?.message || mapError;

	// Memoize initial config to prevent re-initialization on prop changes
	const initialConfig = useMemo(
		() => ({
			center: mapCenter,
			zoom,
			mapStyle,
			controls,
			enableClustering,
			clusterOptions,
			markers
		}),
		// Only compute on mount - subsequent changes handled by separate effects
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	// Initialize map when provider is ready
	useEffect(() => {
		if (!provider || !mapContainerRef.current || isDisabled) {
			setIsMapLoading(false);
			return;
		}

		let isMounted = true;
		setIsMapLoading(true);
		setMapError(null);

		const initMap = async () => {
			try {
				// Create map instance using initial config
				const mapInstance = await provider.createMap(mapContainerRef.current!, {
					center: initialConfig.center,
					zoom: initialConfig.zoom,
					style: initialConfig.mapStyle,
					controls: {
						showZoomControls: initialConfig.controls.showZoomControls,
						showFullscreenControl: false, // We handle fullscreen manually
						showScaleControl: initialConfig.controls.showScaleControl
					},
					interactive: true
				});

				if (!isMounted) {
					mapInstance.destroy();
					return;
				}

				mapInstanceRef.current = mapInstance;

				// Set up viewport change listener using ref to avoid stale closure
				mapInstance.on('moveend', () => {
					if (!onViewportChangeRef.current) return;
					const currentCenter = mapInstance.getCenter();
					const currentZoom = mapInstance.getZoom();
					const bounds = mapInstance.getBounds();
					onViewportChangeRef.current({
						center: currentCenter,
						zoom: currentZoom,
						bounds: bounds || undefined
					});
				});

				// Initialize clustering if enabled and we have markers
				if (initialConfig.enableClustering && initialConfig.markers.length > 0) {
					clustererRef.current = provider.createClusterer(
						mapInstance,
						{
							radius: initialConfig.clusterOptions?.radius ?? 60,
							maxZoom: initialConfig.clusterOptions?.maxZoom ?? 16,
							minPoints: initialConfig.clusterOptions?.minPoints ?? 2
						},
						// Use ref to avoid stale closure
						(cluster) => {
							onClusterClickRef.current?.({
								id: `cluster-${cluster.coordinates.latitude}-${cluster.coordinates.longitude}`,
								coordinates: cluster.coordinates,
								count: cluster.markerIds.length,
								markerIds: cluster.markerIds,
								expansionZoom: cluster.expansionZoom
							});
						}
					);
					clustererRef.current.addMarkers(initialConfig.markers);
				} else if (!initialConfig.enableClustering && initialConfig.markers.length > 0) {
					// Add markers without clustering
					initialConfig.markers.forEach((markerData) => {
						const marker = provider.createMarker(mapInstance, {
							data: markerData,
							icon: markerData.icon
						});

						// Use ref to avoid stale closure
						marker.onClick(() => onMarkerClickRef.current?.(markerData));
					});
				}

				setIsMapLoading(false);
				onReadyRef.current?.();
			} catch (err) {
				if (isMounted) {
					const errorMessage = err instanceof Error ? err.message : 'Failed to load map';
					setMapError(errorMessage);
					setIsMapLoading(false);
					onErrorRef.current?.(err instanceof Error ? err : new Error(errorMessage));
				}
			}
		};

		initMap();

		return () => {
			isMounted = false;
			if (clustererRef.current) {
				clustererRef.current.destroy();
				clustererRef.current = null;
			}
			if (mapInstanceRef.current) {
				mapInstanceRef.current.destroy();
				mapInstanceRef.current = null;
			}
		};
	}, [provider, isDisabled, initialConfig]);

	// Update markers when they change
	useEffect(() => {
		if (!clustererRef.current || !enableClustering) return;

		clustererRef.current.clearMarkers();
		clustererRef.current.addMarkers(markers);
	}, [markers, enableClustering]);

	// Update map center when it changes
	useEffect(() => {
		if (!mapInstanceRef.current) return;
		mapInstanceRef.current.setCenter(mapCenter);
	}, [mapCenter]);

	// Update map zoom when it changes
	useEffect(() => {
		if (!mapInstanceRef.current) return;
		mapInstanceRef.current.setZoom(zoom);
	}, [zoom]);

	// Handle fullscreen toggle
	const toggleFullscreen = useCallback(async () => {
		const container = mapContainerRef.current?.parentElement;
		if (!container) return;

		try {
			if (!document.fullscreenElement) {
				await container.requestFullscreen();
				setIsFullscreen(true);
			} else {
				await document.exitFullscreen();
				setIsFullscreen(false);
			}
			// Trigger map resize after fullscreen change
			setTimeout(() => {
				mapInstanceRef.current?.resize();
			}, 100);
		} catch (err) {
			console.error('Fullscreen error:', err);
		}
	}, []);

	// Listen for fullscreen change
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(Boolean(document.fullscreenElement));
			mapInstanceRef.current?.resize();
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
	}, []);

	// Height style
	const heightStyle = typeof height === 'number' ? `${height}px` : height;
	const widthStyle = typeof width === 'number' ? `${width}px` : width;

	// Disabled state
	if (isDisabled || !settings.enabled) {
		return (
			<div
				className={cn(mapContainerBaseStyles, mapDisabledStyles, className)}
				style={{ height: heightStyle, width: widthStyle }}
				role="region"
				aria-label={ariaLabel || 'Map (disabled)'}
			>
				<MapPin className="w-12 h-12 text-gray-400 mb-2" />
				<p className="text-sm text-gray-500 dark:text-gray-400 text-center px-4">
					Map is disabled
				</p>
			</div>
		);
	}

	// Error state
	if (displayError && !showLoading) {
		return (
			<div
				className={cn(mapContainerBaseStyles, mapErrorStyles, className)}
				style={{ height: heightStyle, width: widthStyle }}
				role="alert"
				aria-label="Map error"
			>
				<AlertCircle className="w-12 h-12 text-red-500 mb-2" />
				<p className="text-sm text-red-600 dark:text-red-400 text-center px-4">{displayError}</p>
			</div>
		);
	}

	return (
		<div
			className={cn(mapContainerBaseStyles, 'border border-gray-200 dark:border-gray-700', className)}
			style={{ height: heightStyle, width: widthStyle }}
		>
			{/* Loading overlay */}
			{showLoading && (
				<div className={mapLoadingOverlayStyles}>
					<Loader2 className="w-8 h-8 animate-spin text-gray-400" />
				</div>
			)}

			{/* Map container */}
			<div
				ref={mapContainerRef}
				className="w-full h-full"
				role="application"
				aria-label={ariaLabel || 'Interactive map'}
				tabIndex={0}
			/>

			{/* Fullscreen toggle button */}
			{controls.showFullscreenControl && !showLoading && (
				<button
					onClick={toggleFullscreen}
					className="absolute top-3 right-3 z-10 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
					aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
				>
					{isFullscreen ? (
						<Minimize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
					) : (
						<Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-300" />
					)}
				</button>
			)}
		</div>
	);
}
