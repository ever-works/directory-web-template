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
 * Location settings configuration from YAML (snake_case).
 * Used for parsing config.yml settings.location section.
 */
export interface LocationConfigSettings {
	enabled?: boolean;
	provider?: MapProvider;
	map_style?: MapStyle;
	distance_filter_enabled?: boolean;
	distance_sort_enabled?: boolean;
	default_radius_km?: number;
	show_exact_address?: boolean;
	require_location_on_submit?: boolean;
	/** Default map center when no location is provided [latitude, longitude] */
	default_center?: [number, number];
}

/**
 * Runtime location settings (camelCase).
 * Used throughout the application for type-safe access.
 */
export interface LocationSettings {
	enabled: boolean;
	provider: MapProvider;
	mapStyle: MapStyle;
	distanceFilterEnabled: boolean;
	distanceSortEnabled: boolean;
	defaultRadiusKm: number;
	showExactAddress: boolean;
	requireLocationOnSubmit: boolean;
	/** Default map center { latitude, longitude } */
	defaultCenter: { latitude: number; longitude: number };
}

/**
 * Default location settings values.
 * Used when settings are not configured.
 * Default center is set to a neutral location (0, 0) - configure in settings for your region.
 */
export const DEFAULT_LOCATION_SETTINGS: LocationSettings = {
	enabled: false,
	provider: 'mapbox',
	mapStyle: 'streets',
	distanceFilterEnabled: true,
	distanceSortEnabled: true,
	defaultRadiusKm: 50,
	showExactAddress: false,
	requireLocationOnSubmit: false,
	defaultCenter: { latitude: 0, longitude: 0 },
};

/**
 * Maps snake_case config settings to camelCase runtime settings.
 * @param config - Location settings from config.yml (snake_case)
 * @returns Runtime location settings (camelCase)
 */
export function mapLocationConfigToRuntime(config?: LocationConfigSettings): LocationSettings {
	const defaultCenter = config?.default_center
		? { latitude: config.default_center[0], longitude: config.default_center[1] }
		: DEFAULT_LOCATION_SETTINGS.defaultCenter;

	return {
		enabled: config?.enabled ?? DEFAULT_LOCATION_SETTINGS.enabled,
		provider: config?.provider ?? DEFAULT_LOCATION_SETTINGS.provider,
		mapStyle: config?.map_style ?? DEFAULT_LOCATION_SETTINGS.mapStyle,
		distanceFilterEnabled: config?.distance_filter_enabled ?? DEFAULT_LOCATION_SETTINGS.distanceFilterEnabled,
		distanceSortEnabled: config?.distance_sort_enabled ?? DEFAULT_LOCATION_SETTINGS.distanceSortEnabled,
		defaultRadiusKm: config?.default_radius_km ?? DEFAULT_LOCATION_SETTINGS.defaultRadiusKm,
		showExactAddress: config?.show_exact_address ?? DEFAULT_LOCATION_SETTINGS.showExactAddress,
		requireLocationOnSubmit: config?.require_location_on_submit ?? DEFAULT_LOCATION_SETTINGS.requireLocationOnSubmit,
		defaultCenter,
	};
}

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
		isPreviewAvailable: boolean;
		name: string;
	};
	google: {
		isConfigured: boolean;
		isPreviewAvailable: boolean;
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
