/**
 * Map Provider Interface
 *
 * Defines the contract for map provider implementations.
 * Both Mapbox and Google Maps providers must implement this interface.
 */

import type {
	Coordinates,
	MapBounds,
	MapMarkerData,
	ClusterOptions,
	AddressSuggestion,
	MapControlsConfig
} from '../types';
import type { MapStyle } from '@/lib/types/location';

// ######################### Instance Types #########################

/**
 * Abstract map instance interface.
 * Wraps provider-specific map objects.
 */
export interface IMapInstance {
	/** Set the map center */
	setCenter(coordinates: Coordinates): void;
	/** Set the map zoom level */
	setZoom(zoom: number): void;
	/** Get current center coordinates */
	getCenter(): Coordinates;
	/** Get current zoom level */
	getZoom(): number;
	/** Get current map bounds */
	getBounds(): MapBounds | null;
	/** Fit map to bounds with optional padding */
	fitBounds(bounds: MapBounds, padding?: number): void;
	/** Trigger map resize (for container size changes) */
	resize(): void;
	/** Add event listener */
	on(event: string, handler: (...args: unknown[]) => void): void;
	/** Remove event listener */
	off(event: string, handler: (...args: unknown[]) => void): void;
	/** Destroy the map instance */
	destroy(): void;
}

/**
 * Abstract marker instance interface.
 */
export interface IMarkerInstance {
	/** Set marker position */
	setPosition(coordinates: Coordinates): void;
	/** Enable/disable dragging */
	setDraggable(draggable: boolean): void;
	/** Get current position */
	getPosition(): Coordinates;
	/** Show the marker */
	show(): void;
	/** Hide the marker */
	hide(): void;
	/** Remove the marker from the map */
	remove(): void;
	/** Add click handler */
	onClick(handler: () => void): void;
	/** Add drag end handler */
	onDragEnd(handler: (coordinates: Coordinates) => void): void;
}

/**
 * Abstract clusterer instance interface.
 */
export interface IClustererInstance {
	/** Add markers to the clusterer */
	addMarkers(markers: MapMarkerData[]): void;
	/** Remove specific markers from the clusterer */
	removeMarkers(markerIds: string[]): void;
	/** Clear all markers */
	clearMarkers(): void;
	/** Refresh cluster calculations */
	refresh(): void;
	/** Destroy the clusterer */
	destroy(): void;
}

/**
 * Abstract autocomplete instance interface.
 */
export interface IAutocompleteInstance {
	/** Clear the input */
	clear(): void;
	/** Destroy the autocomplete */
	destroy(): void;
}

// ######################### Map Create Options #########################

/**
 * Options for creating a map instance.
 */
export interface MapCreateOptions {
	/** Initial center coordinates */
	center: Coordinates;
	/** Initial zoom level */
	zoom: number;
	/** Map style (streets or satellite) */
	style: MapStyle;
	/** Map controls configuration */
	controls?: MapControlsConfig;
	/** Whether the map is interactive */
	interactive?: boolean;
}

/**
 * Options for creating a marker.
 */
export interface MarkerCreateOptions {
	/** Marker data */
	data: MapMarkerData;
	/** Whether marker is draggable */
	draggable?: boolean;
	/** Custom icon element or URL */
	icon?: string | HTMLElement;
}

// ######################### Provider Interface #########################

/**
 * Map provider interface.
 * Implementations must provide methods for creating and managing map instances.
 */
export interface IMapProvider {
	/** Provider name identifier */
	readonly name: 'mapbox' | 'google';

	/**
	 * Check if the provider script is loaded.
	 */
	isLoaded(): boolean;

	/**
	 * Load the provider script/library.
	 * Should be idempotent (safe to call multiple times).
	 */
	loadScript(): Promise<void>;

	/**
	 * Create a new map instance.
	 * @param container - DOM element to render the map in
	 * @param options - Map creation options
	 */
	createMap(container: HTMLElement, options: MapCreateOptions): Promise<IMapInstance>;

	/**
	 * Create a marker on the map.
	 * @param map - Map instance to add marker to
	 * @param options - Marker creation options
	 */
	createMarker(map: IMapInstance, options: MarkerCreateOptions): IMarkerInstance;

	/**
	 * Create a clusterer for grouping markers.
	 * @param map - Map instance
	 * @param options - Clustering options
	 * @param onClusterClick - Callback when cluster is clicked
	 */
	createClusterer(
		map: IMapInstance,
		options: ClusterOptions,
		onClusterClick?: (cluster: { coordinates: Coordinates; markerIds: string[]; expansionZoom: number }) => void
	): IClustererInstance;

	/**
	 * Create an autocomplete instance for address search.
	 * @param input - Input element to attach autocomplete to
	 * @param onSelect - Callback when suggestion is selected
	 */
	createAutocomplete(
		input: HTMLInputElement,
		onSelect: (suggestion: AddressSuggestion) => void
	): IAutocompleteInstance;

	/**
	 * Get the style URL for the given style type.
	 * @param style - Style type (streets or satellite)
	 */
	getStyleUrl(style: MapStyle): string;

	/**
	 * Check if the provider is properly configured (has required API keys).
	 */
	isConfigured(): boolean;
}

// ######################### Provider Factory Type #########################

/**
 * Factory function type for creating providers.
 */
export type MapProviderFactory = (provider: 'mapbox' | 'google') => IMapProvider | null;
