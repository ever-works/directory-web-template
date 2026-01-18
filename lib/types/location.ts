// ######################### Location Types #########################

// ######################### Enum Types #########################

/**
 * Map provider options for location features.
 */
export type MapProvider = 'mapbox' | 'google';

/**
 * Map style options for rendering.
 */
export type MapStyle = 'streets' | 'satellite';

// ######################### Settings Types #########################

/**
 * Location settings stored in config.yml under settings.location.
 * Controls location-based features throughout the application.
 */
export interface LocationSettings {
	enabled: boolean;
	provider: MapProvider;
	map_style: MapStyle;
	distance_filter_enabled: boolean;
	distance_sort_enabled: boolean;
	default_radius_km: number;
	show_exact_address: boolean;
	require_location_on_submit: boolean;
}

/**
 * Default location settings values.
 * Used when settings are not configured.
 */
export const DEFAULT_LOCATION_SETTINGS: LocationSettings = {
	enabled: false,
	provider: 'mapbox',
	map_style: 'streets',
	distance_filter_enabled: true,
	distance_sort_enabled: true,
	default_radius_km: 50,
	show_exact_address: false,
	require_location_on_submit: false,
};

// ######################### Data Types #########################

/**
 * Location data for items stored in the item_location_index table.
 * This is an index-only structure - source of truth remains in YAML files.
 */
export interface LocationData {
	item_slug: string;
	latitude: number;
	longitude: number;
	address: string | null;
	city: string | null;
	state: string | null;
	country: string | null;
	postal_code: string | null;
	service_area: string | null;
	is_remote: boolean;
	indexed_at: Date;
}

// ######################### API Status Types #########################

/**
 * API key status for display in admin UI.
 * Used to show configured/not configured status without exposing actual keys.
 */
export interface MapProviderStatus {
	provider: MapProvider;
	isConfigured: boolean;
	displayName: string;
}

/**
 * Response from map-status API endpoint.
 */
export interface MapStatusResponse {
	mapbox: {
		isConfigured: boolean;
		name: string;
	};
	google: {
		isConfigured: boolean;
		name: string;
	};
}

// ######################### Geo Query Types #########################

/**
 * Bounding box for geospatial queries.
 */
export interface GeoBoundingBox {
	minLat: number;
	maxLat: number;
	minLng: number;
	maxLng: number;
}

/**
 * Options for location-based item queries.
 */
export interface LocationQueryOptions {
	latitude?: number;
	longitude?: number;
	radiusKm?: number;
	city?: string;
	country?: string;
	includeRemote?: boolean;
}

/**
 * Result of a location-based item query.
 */
export interface LocationQueryResult {
	itemSlug: string;
	distanceKm?: number;
	city: string | null;
	country: string | null;
}
