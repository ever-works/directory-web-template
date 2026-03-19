/**
 * Geocoding Provider Interface
 *
 * Defines the contract for geocoding service providers (Mapbox, Google, etc.).
 * Each provider must implement these methods to be used by the GeocodingService.
 */

/**
 * Result of a forward geocoding operation (address → coordinates).
 */
export interface GeocodingResult {
	/** Latitude coordinate */
	latitude: number;
	/** Longitude coordinate */
	longitude: number;
	/** Formatted address returned by the provider */
	formattedAddress: string;
	/** City/locality name */
	city?: string;
	/** State/region/province name */
	state?: string;
	/** Country name */
	country?: string;
	/** Country code (ISO 3166-1 alpha-2) */
	countryCode?: string;
	/** Postal/ZIP code */
	postalCode?: string;
	/** Confidence score (0-1) if available */
	confidence?: number;
	/** Raw response from the provider for debugging */
	rawResponse?: unknown;
}

/**
 * Result of a reverse geocoding operation (coordinates → address).
 */
export interface ReverseGeocodingResult {
	/** Formatted address */
	formattedAddress: string;
	/** Street address (street number + street name) */
	streetAddress?: string;
	/** City/locality name */
	city?: string;
	/** State/region/province name */
	state?: string;
	/** Country name */
	country?: string;
	/** Country code (ISO 3166-1 alpha-2) */
	countryCode?: string;
	/** Postal/ZIP code */
	postalCode?: string;
	/** Raw response from the provider for debugging */
	rawResponse?: unknown;
}

/**
 * Options for geocoding requests.
 */
export interface GeocodingOptions {
	/** Limit search to specific country codes (ISO 3166-1 alpha-2) */
	countryCodes?: string[];
	/** Bias results toward a specific location */
	proximity?: {
		latitude: number;
		longitude: number;
	};
	/** Language code for results (e.g., 'en', 'es', 'de') */
	language?: string;
	/** Maximum number of results to return */
	limit?: number;
}

/**
 * Interface that all geocoding providers must implement.
 */
export interface IGeocodingProvider {
	/** Provider name for identification */
	readonly name: string;

	/**
	 * Forward geocode: Convert an address to coordinates.
	 * @param address - The address string to geocode
	 * @param options - Optional geocoding options
	 * @returns GeocodingResult or null if not found
	 */
	geocode(address: string, options?: GeocodingOptions): Promise<GeocodingResult | null>;

	/**
	 * Reverse geocode: Convert coordinates to an address.
	 * @param latitude - Latitude coordinate
	 * @param longitude - Longitude coordinate
	 * @param options - Optional geocoding options
	 * @returns ReverseGeocodingResult or null if not found
	 */
	reverseGeocode(
		latitude: number,
		longitude: number,
		options?: GeocodingOptions
	): Promise<ReverseGeocodingResult | null>;

	/**
	 * Check if the provider is properly configured and ready to use.
	 * @returns true if the provider can make requests
	 */
	isConfigured(): boolean;
}
