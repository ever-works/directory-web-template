/**
 * Map UI Components Types
 *
 * Types for interactive map components including markers, clusters, popups, and viewports.
 * These types work with the provider abstraction layer for both Mapbox and Google Maps.
 */

import type { MapProvider, MapStyle } from '@/lib/types/location';

// ######################### Coordinates Types #########################

/**
 * Geographic coordinates with latitude and longitude.
 */
export interface Coordinates {
	latitude: number;
	longitude: number;
}

/**
 * Bounding box for map viewport.
 */
export interface MapBounds {
	north: number;
	south: number;
	east: number;
	west: number;
}

// ######################### Marker Types #########################

/**
 * Data for a map marker representing an item.
 */
export interface MapMarkerData {
	/** Unique identifier for the marker */
	id: string;
	/** Geographic position */
	coordinates: Coordinates;
	/** Display title for the marker */
	title: string;
	/** Optional icon URL or identifier */
	icon?: string;
	/** Category name for styling/filtering */
	category?: string;
	/** Item slug for linking to detail page */
	slug: string;
	/** Short description for popup preview */
	description?: string;
}

/**
 * Extended marker data with distance information.
 */
export interface MapMarkerWithDistance extends MapMarkerData {
	/** Distance from reference point in kilometers */
	distanceKm?: number;
}

// ######################### Cluster Types #########################

/**
 * Data for a marker cluster.
 */
export interface MapClusterData {
	/** Unique identifier for the cluster */
	id: string;
	/** Center coordinates of the cluster */
	coordinates: Coordinates;
	/** Number of markers in the cluster */
	count: number;
	/** IDs of markers contained in this cluster */
	markerIds: string[];
	/** Zoom level at which cluster expands */
	expansionZoom: number;
}

// ######################### Viewport Types #########################

/**
 * Map viewport state (center, zoom, bounds).
 */
export interface MapViewport {
	center: Coordinates;
	zoom: number;
	bounds?: MapBounds;
}

// ######################### Event Handler Types #########################

/**
 * Callbacks for map events.
 */
export interface MapEventHandlers {
	/** Called when a marker is clicked */
	onMarkerClick?: (marker: MapMarkerData) => void;
	/** Called when a cluster is clicked */
	onClusterClick?: (cluster: MapClusterData) => void;
	/** Called when the viewport changes (pan/zoom) */
	onViewportChange?: (viewport: MapViewport) => void;
	/** Called when the map finishes loading */
	onMapReady?: () => void;
	/** Called when a map error occurs */
	onMapError?: (error: Error) => void;
}

// ######################### Controls Types #########################

/**
 * Configuration for map UI controls.
 */
export interface MapControlsConfig {
	/** Show zoom in/out buttons */
	showZoomControls?: boolean;
	/** Show fullscreen toggle button */
	showFullscreenControl?: boolean;
	/** Show compass/navigation control */
	showNavigationControl?: boolean;
	/** Show distance scale indicator */
	showScaleControl?: boolean;
}

// ######################### Autocomplete Types #########################

/**
 * Address suggestion from autocomplete.
 */
export interface AddressSuggestion {
	/** Unique identifier for the suggestion */
	id: string;
	/** Primary text (e.g., street address) */
	mainText: string;
	/** Secondary text (e.g., city, state) */
	secondaryText: string;
	/** Full formatted address */
	fullAddress: string;
	/** Coordinates if available from suggestion */
	coordinates?: Coordinates;
}

// ######################### Service Area Types #########################

/**
 * Service area coverage options.
 */
export type ServiceArea = 'local' | 'regional' | 'national' | 'global';

/**
 * Service area option for dropdown.
 */
export interface ServiceAreaOption {
	value: ServiceArea;
	label: string;
}

// ######################### Geolocation Types #########################

/**
 * Possible geolocation error types.
 */
export type GeolocationErrorType =
	| 'PERMISSION_DENIED'
	| 'POSITION_UNAVAILABLE'
	| 'TIMEOUT'
	| 'NOT_SUPPORTED';

/**
 * Geolocation hook state.
 */
export interface GeolocationState {
	/** Current coordinates if available */
	coordinates: Coordinates | null;
	/** Error type if geolocation failed */
	error: GeolocationErrorType | null;
	/** Whether geolocation is in progress */
	isLoading: boolean;
	/** Current permission status */
	permission: PermissionState | null;
}

// ######################### Cluster Options #########################

/**
 * Configuration options for marker clustering.
 */
export interface ClusterOptions {
	/** Cluster radius in pixels (default: 60) */
	radius?: number;
	/** Maximum zoom level for clustering (default: 16) */
	maxZoom?: number;
	/** Minimum zoom level for clustering (default: 0) */
	minZoom?: number;
	/** Minimum points to form a cluster (default: 2) */
	minPoints?: number;
}

// ######################### Map Component Props #########################

/**
 * Props for the main Map component.
 */
export interface MapComponentProps {
	/** Markers to display on the map */
	markers?: MapMarkerData[];
	/** Initial center coordinates */
	center?: Coordinates;
	/** Initial zoom level (1-20) */
	zoom?: number;
	/** Map style (streets or satellite) */
	style?: MapStyle;
	/** CSS class name for the container */
	className?: string;
	/** Map height (CSS value) */
	height?: string | number;
	/** Map width (CSS value) */
	width?: string | number;
	/** Map controls configuration */
	controls?: MapControlsConfig;
	/** Enable marker clustering */
	enableClustering?: boolean;
	/** Clustering configuration options */
	clusterOptions?: ClusterOptions;
	/** External loading state */
	isLoading?: boolean;
	/** Disable map interaction */
	isDisabled?: boolean;
	/** Error message to display */
	error?: string | null;
	/** Called when a marker is clicked */
	onMarkerClick?: (marker: MapMarkerData) => void;
	/** Called when a cluster is clicked */
	onClusterClick?: (cluster: MapClusterData) => void;
	/** Called when viewport changes */
	onViewportChange?: (viewport: MapViewport) => void;
	/** Called when map is ready */
	onReady?: () => void;
	/** Called on map error */
	onError?: (error: Error) => void;
	/** Accessibility label for the map */
	ariaLabel?: string;
}

/**
 * Props for MapMarker component.
 */
export interface MapMarkerProps {
	/** Marker data */
	data: MapMarkerData;
	/** Whether this marker is selected */
	isSelected?: boolean;
	/** Allow dragging the marker */
	isDraggable?: boolean;
	/** Show item icon on marker */
	showIcon?: boolean;
	/** Icon size variant */
	iconSize?: 'sm' | 'md' | 'lg';
	/** Called when marker is clicked */
	onClick?: (marker: MapMarkerData) => void;
	/** Called when dragging ends */
	onDragEnd?: (coordinates: Coordinates) => void;
}

/**
 * Props for MapCluster component.
 */
export interface MapClusterProps {
	/** Markers to cluster */
	markers: MapMarkerData[];
	/** Clustering options */
	options?: ClusterOptions;
	/** Called when cluster is clicked */
	onClusterClick?: (cluster: MapClusterData) => void;
	/** Called when individual marker is clicked */
	onMarkerClick?: (marker: MapMarkerData) => void;
}

/**
 * Props for MapItemPopup component.
 */
export interface MapItemPopupProps {
	/** Item data to display */
	item: {
		slug: string;
		name: string;
		icon?: string;
		category?: string;
		description?: string;
	};
	/** Whether popup is visible */
	isOpen: boolean;
	/** Popup position */
	position: Coordinates;
	/** Called when popup is closed */
	onClose: () => void;
	/** Locale for link generation */
	locale?: string;
}

/**
 * Props for LocationPicker component.
 */
export interface LocationPickerProps {
	/** Current location value */
	value?: LocationPickerValue;
	/** Called when location changes */
	onChange?: (location: LocationPickerValue) => void;
	/** Field validation errors */
	errors?: {
		address?: string;
		coordinates?: string;
		serviceArea?: string;
	};
	/** Show map preview */
	showMap?: boolean;
	/** Show service area dropdown */
	showServiceArea?: boolean;
	/** Show remote service checkbox */
	showRemoteOption?: boolean;
	/** Map preview height */
	mapHeight?: string | number;
	/** Disable all inputs */
	isDisabled?: boolean;
	/** Show loading state */
	isLoading?: boolean;
	/** Field ID for accessibility */
	id?: string;
	/** aria-describedby for accessibility */
	ariaDescribedBy?: string;
}

/**
 * Location picker form value.
 */
export interface LocationPickerValue {
	address?: string;
	city?: string;
	state?: string;
	country?: string;
	postalCode?: string;
	latitude?: number;
	longitude?: number;
	serviceArea?: ServiceArea;
	isRemote?: boolean;
}

// ######################### Provider Types #########################

/**
 * Configuration for creating a map provider.
 */
export interface MapProviderConfig {
	provider: MapProvider;
	accessToken?: string;
	mapId?: string;
}

/**
 * Result from useMapProvider hook.
 */
export interface UseMapProviderResult {
	/** Current provider type */
	provider: MapProvider;
	/** Whether the provider is configured (has API keys) */
	isConfigured: boolean;
	/** Whether the provider library is loading */
	isLoading: boolean;
	/** Error if provider failed to load */
	error: Error | null;
	/** Map style setting */
	mapStyle: MapStyle;
}
