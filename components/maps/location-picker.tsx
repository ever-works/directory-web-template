'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapPin, Navigation, Loader2, ChevronDown, Check, Globe, Building, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useMapProviderInstance } from '@/hooks/use-map-provider';
import { useLocationSettings } from '@/hooks/use-location-settings';
import type {
	LocationPickerProps,
	LocationPickerValue,
	ServiceArea,
	Coordinates,
	AddressSuggestion
} from '@/lib/maps/types';
import type { IMapInstance, IMarkerInstance, IAutocompleteInstance } from '@/lib/maps/providers/map-provider.interface';

// Service area options with icons
const SERVICE_AREA_OPTIONS: Array<{ value: ServiceArea; label: string; icon: React.ElementType }> = [
	{ value: 'local', label: 'Local', icon: MapPin },
	{ value: 'regional', label: 'Regional', icon: Building },
	{ value: 'national', label: 'National', icon: Building2 },
	{ value: 'global', label: 'Global', icon: Globe }
];

const DEFAULT_ZOOM = 14;

/**
 * LocationPicker component for selecting and editing location data.
 *
 * Features:
 * - Address autocomplete using configured provider
 * - Map preview with draggable marker
 * - "Use My Location" button for browser geolocation
 * - Service area dropdown (Local, Regional, National, Global)
 * - Remote/online service checkbox
 * - Form integration with value/onChange
 *
 * @example
 * ```tsx
 * <LocationPicker
 *   value={formData.location}
 *   onChange={(location) => setFormData({ ...formData, location })}
 *   errors={errors.location}
 *   showServiceArea
 *   showRemoteOption
 * />
 * ```
 */
export function LocationPicker({
	value,
	onChange,
	errors,
	showMap = true,
	showServiceArea = true,
	showRemoteOption = true,
	mapHeight = 200,
	isDisabled = false,
	isLoading: externalLoading = false,
	id,
	ariaDescribedBy
}: LocationPickerProps): React.ReactElement {
	const { settings } = useLocationSettings();
	const { provider, isLoading: providerLoading } = useMapProviderInstance();
	const { isLoading: geoLoading, requestLocation, permission } = useGeolocation();

	const mapContainerRef = useRef<HTMLDivElement>(null);
	const addressInputRef = useRef<HTMLInputElement>(null);
	const mapInstanceRef = useRef<IMapInstance | null>(null);
	const markerRef = useRef<IMarkerInstance | null>(null);
	const autocompleteRef = useRef<IAutocompleteInstance | null>(null);

	// Refs for callbacks to avoid stale closures in effects
	const handleAddressSelectRef = useRef<((suggestion: AddressSuggestion) => void) | undefined>(undefined);
	const handleMarkerDragEndRef = useRef<((coords: Coordinates) => void) | undefined>(undefined);

	const [isMapLoading, setIsMapLoading] = useState(true);
	const [isServiceAreaOpen, setIsServiceAreaOpen] = useState(false);

	const currentAddress = value?.address || '';
	const currentCoordinates = useMemo<Coordinates | null>(() => {
		if (value?.latitude && value?.longitude) {
			return { latitude: value.latitude, longitude: value.longitude };
		}
		return null;
	}, [value?.latitude, value?.longitude]);

	// Update internal state and notify parent
	const updateValue = useCallback(
		(updates: Partial<LocationPickerValue>) => {
			if (onChange) {
				onChange({
					...value,
					...updates
				});
			}
		},
		[value, onChange]
	);

	// Handle address selection from autocomplete
	const handleAddressSelect = useCallback(
		(suggestion: AddressSuggestion) => {
			updateValue({
				address: suggestion.fullAddress,
				latitude: suggestion.coordinates?.latitude,
				longitude: suggestion.coordinates?.longitude
			});

			// Update map marker position
			if (suggestion.coordinates && mapInstanceRef.current && markerRef.current) {
				markerRef.current.setPosition(suggestion.coordinates);
				mapInstanceRef.current.setCenter(suggestion.coordinates);
			}
		},
		[updateValue]
	);

	// Handle "Use My Location" button
	const handleUseMyLocation = useCallback(async () => {
		const coords = await requestLocation();
		if (coords) {
			updateValue({
				latitude: coords.latitude,
				longitude: coords.longitude
			});

			// Update map marker position
			if (mapInstanceRef.current && markerRef.current) {
				markerRef.current.setPosition(coords);
				mapInstanceRef.current.setCenter(coords);
			}
		}
	}, [requestLocation, updateValue]);

	// Handle marker drag end
	const handleMarkerDragEnd = useCallback(
		(coords: Coordinates) => {
			updateValue({
				latitude: coords.latitude,
				longitude: coords.longitude
			});
		},
		[updateValue]
	);

	// Keep refs in sync with latest callbacks (for use in effects without causing re-init)
	handleAddressSelectRef.current = handleAddressSelect;
	handleMarkerDragEndRef.current = handleMarkerDragEnd;

	// Memoize initial coordinates to avoid unnecessary re-renders
	const initialCoordinates = useMemo<Coordinates | null>(() => {
		if (value?.latitude && value?.longitude) {
			return { latitude: value.latitude, longitude: value.longitude };
		}
		return null;
		// Only compute on mount - subsequent changes handled by separate effect
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Handle service area change
	const handleServiceAreaChange = useCallback(
		(area: ServiceArea) => {
			updateValue({ serviceArea: area });
			setIsServiceAreaOpen(false);
		},
		[updateValue]
	);

	// Handle remote checkbox change
	const handleRemoteChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			updateValue({ isRemote: e.target.checked });
		},
		[updateValue]
	);

	// Initialize map and autocomplete when provider is ready
	useEffect(() => {
		if (!provider || !showMap || isDisabled) {
			setIsMapLoading(false);
			return;
		}

		let isMounted = true;
		setIsMapLoading(true);

		const initMap = async () => {
			try {
				// Initialize map if container is available
				if (mapContainerRef.current) {
					const centerPoint = initialCoordinates || settings.defaultCenter;

					const mapInstance = await provider.createMap(mapContainerRef.current, {
						center: centerPoint,
						zoom: DEFAULT_ZOOM,
						style: settings.mapStyle,
						controls: {
							showZoomControls: true,
							showFullscreenControl: false
						},
						interactive: true
					});

					if (!isMounted) {
						mapInstance.destroy();
						return;
					}

					mapInstanceRef.current = mapInstance;

					// Add draggable marker
					const marker = provider.createMarker(mapInstance, {
						data: {
							id: 'location-picker-marker',
							coordinates: centerPoint,
							title: 'Selected location',
							slug: ''
						},
						draggable: true
					});

					markerRef.current = marker;
					// Use ref to avoid stale closure
					marker.onDragEnd((coords: Coordinates) => {
						handleMarkerDragEndRef.current?.(coords);
					});
				}

				// Initialize autocomplete if input is available
				if (addressInputRef.current) {
					autocompleteRef.current = provider.createAutocomplete(
						addressInputRef.current,
						// Use ref to avoid stale closure
						(suggestion: AddressSuggestion) => {
							handleAddressSelectRef.current?.(suggestion);
						}
					);
				}

				if (isMounted) {
					setIsMapLoading(false);
				}
			} catch (err) {
				console.error('Failed to initialize location picker:', err);
				if (isMounted) {
					setIsMapLoading(false);
				}
			}
		};

		initMap();

		return () => {
			isMounted = false;
			if (autocompleteRef.current) {
				autocompleteRef.current.destroy();
				autocompleteRef.current = null;
			}
			if (markerRef.current) {
				markerRef.current.remove();
				markerRef.current = null;
			}
			if (mapInstanceRef.current) {
				mapInstanceRef.current.destroy();
				mapInstanceRef.current = null;
			}
		};
	}, [provider, showMap, isDisabled, settings.mapStyle, settings.defaultCenter, initialCoordinates]);

	// Update marker position when value changes externally
	useEffect(() => {
		if (!markerRef.current || !mapInstanceRef.current || !currentCoordinates) return;

		markerRef.current.setPosition(currentCoordinates);
		mapInstanceRef.current.setCenter(currentCoordinates);
	}, [currentCoordinates]);

	// Height style for map
	const mapHeightStyle = typeof mapHeight === 'number' ? `${mapHeight}px` : mapHeight;

	return (
		<div className="space-y-4" id={id} aria-describedby={ariaDescribedBy}>
			{/* Address autocomplete input */}
			<div className="relative">
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					Address
				</label>
				<div className="relative">
					<input
						ref={addressInputRef}
						type="text"
						defaultValue={currentAddress}
						placeholder="Enter an address..."
						disabled={isDisabled}
						className={cn(
							'w-full px-4 py-2.5 pl-10 rounded-lg border transition-colors',
							'bg-white dark:bg-gray-800',
							'text-gray-900 dark:text-white',
							'placeholder-gray-400 dark:placeholder-gray-500',
							errors?.address
								? 'border-red-500 focus:ring-red-500'
								: 'border-gray-300 dark:border-gray-600 focus:ring-blue-500',
							'focus:outline-none focus:ring-2 focus:border-transparent',
							isDisabled && 'opacity-50 cursor-not-allowed'
						)}
						aria-invalid={Boolean(errors?.address)}
					/>
					<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
				</div>
				{errors?.address && (
					<p className="mt-1 text-sm text-red-500" role="alert">
						{errors.address}
					</p>
				)}
			</div>

			{/* Use My Location button */}
			<button
				type="button"
				onClick={handleUseMyLocation}
				disabled={isDisabled || geoLoading || permission === 'denied'}
				className={cn(
					'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
					'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600',
					'text-gray-700 dark:text-gray-200',
					(isDisabled || geoLoading || permission === 'denied') && 'opacity-50 cursor-not-allowed'
				)}
			>
				{geoLoading ? (
					<Loader2 className="w-4 h-4 animate-spin" />
				) : (
					<Navigation className="w-4 h-4" />
				)}
				Use My Location
			</button>

			{/* Map preview */}
			{showMap && (
				<div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
					{isMapLoading && (
						<div
							className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10"
							style={{ height: mapHeightStyle }}
						>
							<Loader2 className="w-6 h-6 animate-spin text-gray-400" />
						</div>
					)}
					<div ref={mapContainerRef} style={{ height: mapHeightStyle }} className="w-full" />
					{errors?.coordinates && (
						<p className="absolute bottom-2 left-2 text-xs text-red-500 bg-white dark:bg-gray-800 px-2 py-1 rounded">
							{errors.coordinates}
						</p>
					)}
				</div>
			)}

			{/* Coordinates display */}
			{currentCoordinates && (
				<div className="text-xs text-gray-500 dark:text-gray-400">
					Coordinates: {currentCoordinates.latitude.toFixed(6)}, {currentCoordinates.longitude.toFixed(6)}
				</div>
			)}

			{/* Service area dropdown */}
			{showServiceArea && (
				<div className="relative">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Service Area
					</label>
					<button
						type="button"
						onClick={() => setIsServiceAreaOpen(!isServiceAreaOpen)}
						disabled={isDisabled}
						className={cn(
							'w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-colors',
							'bg-white dark:bg-gray-800',
							'text-gray-900 dark:text-white',
							errors?.serviceArea
								? 'border-red-500'
								: 'border-gray-300 dark:border-gray-600',
							'hover:bg-gray-50 dark:hover:bg-gray-700',
							isDisabled && 'opacity-50 cursor-not-allowed'
						)}
					>
						<span className="flex items-center gap-2">
							{(() => {
								const selectedOption = SERVICE_AREA_OPTIONS.find((o) => o.value === value?.serviceArea);
								const Icon = selectedOption?.icon || MapPin;
								return (
									<>
										<Icon className="w-4 h-4 text-gray-400" />
										{selectedOption?.label || 'Select service area'}
									</>
								);
							})()}
						</span>
						<ChevronDown className={cn('w-4 h-4 transition-transform', isServiceAreaOpen && 'rotate-180')} />
					</button>

					{isServiceAreaOpen && (
						<div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
							{SERVICE_AREA_OPTIONS.map((option) => (
								<button
									key={option.value}
									type="button"
									onClick={() => handleServiceAreaChange(option.value)}
									className={cn(
										'w-full flex items-center justify-between px-4 py-2.5 text-left',
										'hover:bg-gray-100 dark:hover:bg-gray-700',
										'text-gray-900 dark:text-white',
										option.value === value?.serviceArea && 'bg-blue-50 dark:bg-blue-900/20'
									)}
								>
									<span className="flex items-center gap-2">
										<option.icon className="w-4 h-4 text-gray-400" />
										{option.label}
									</span>
									{option.value === value?.serviceArea && (
										<Check className="w-4 h-4 text-blue-500" />
									)}
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{/* Remote service checkbox */}
			{showRemoteOption && (
				<label className="flex items-center gap-3 cursor-pointer">
					<input
						type="checkbox"
						checked={value?.isRemote || false}
						onChange={handleRemoteChange}
						disabled={isDisabled}
						className={cn(
							'w-5 h-5 rounded border-gray-300 dark:border-gray-600',
							'text-blue-600 focus:ring-blue-500',
							isDisabled && 'opacity-50 cursor-not-allowed'
						)}
					/>
					<div>
						<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Remote / Online Service
						</span>
						<p className="text-xs text-gray-500 dark:text-gray-400">
							This service is available online without a physical location
						</p>
					</div>
				</label>
			)}
		</div>
	);
}
