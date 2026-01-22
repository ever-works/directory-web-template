/**
 * Mapbox Geocoding Provider
 *
 * Implements geocoding using the Mapbox Geocoding API.
 * @see https://docs.mapbox.com/api/search/geocoding/
 */

import type {
	IGeocodingProvider,
	GeocodingResult,
	ReverseGeocodingResult,
	GeocodingOptions,
} from './geocoding-provider.interface';

/**
 * Mapbox API response types
 */
interface MapboxFeature {
	id: string;
	type: string;
	place_type: string[];
	relevance: number;
	text: string;
	place_name: string;
	center: [number, number]; // [longitude, latitude]
	geometry: {
		type: string;
		coordinates: [number, number];
	};
	context?: MapboxContext[];
	properties?: Record<string, unknown>;
}

interface MapboxContext {
	id: string;
	text: string;
	short_code?: string;
}

interface MapboxGeocodingResponse {
	type: string;
	query: string[] | [number, number];
	features: MapboxFeature[];
	attribution: string;
}

export class MapboxGeocodingProvider implements IGeocodingProvider {
	readonly name = 'mapbox';
	private readonly apiKey: string;
	private readonly baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

	constructor(apiKey?: string) {
		this.apiKey = apiKey || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
	}

	isConfigured(): boolean {
		return !!this.apiKey && this.apiKey.length > 0;
	}

	async geocode(address: string, options?: GeocodingOptions): Promise<GeocodingResult | null> {
		if (!this.isConfigured()) {
			console.warn('[MapboxGeocodingProvider] API key not configured');
			return null;
		}

		try {
			const encodedAddress = encodeURIComponent(address);
			const params = new URLSearchParams({
				access_token: this.apiKey,
				limit: String(options?.limit ?? 1),
			});

			// Add optional parameters
			if (options?.countryCodes?.length) {
				params.set('country', options.countryCodes.join(','));
			}
			if (options?.proximity) {
				params.set('proximity', `${options.proximity.longitude},${options.proximity.latitude}`);
			}
			if (options?.language) {
				params.set('language', options.language);
			}

			const url = `${this.baseUrl}/${encodedAddress}.json?${params.toString()}`;
			const response = await fetch(url);

			if (!response.ok) {
				console.error(`[MapboxGeocodingProvider] API error: ${response.status} ${response.statusText}`);
				return null;
			}

			const data: MapboxGeocodingResponse = await response.json();

			if (!data.features || data.features.length === 0) {
				return null;
			}

			const feature = data.features[0];
			const result = this.parseFeatureToResult(feature);

			return {
				...result,
				rawResponse: data,
			};
		} catch (error) {
			console.error('[MapboxGeocodingProvider] Geocoding error:', error);
			return null;
		}
	}

	async reverseGeocode(
		latitude: number,
		longitude: number,
		options?: GeocodingOptions
	): Promise<ReverseGeocodingResult | null> {
		if (!this.isConfigured()) {
			console.warn('[MapboxGeocodingProvider] API key not configured');
			return null;
		}

		try {
			const params = new URLSearchParams({
				access_token: this.apiKey,
				limit: String(options?.limit ?? 1),
			});

			if (options?.language) {
				params.set('language', options.language);
			}

			// Mapbox expects longitude,latitude order
			const url = `${this.baseUrl}/${longitude},${latitude}.json?${params.toString()}`;
			const response = await fetch(url);

			if (!response.ok) {
				console.error(`[MapboxGeocodingProvider] API error: ${response.status} ${response.statusText}`);
				return null;
			}

			const data: MapboxGeocodingResponse = await response.json();

			if (!data.features || data.features.length === 0) {
				return null;
			}

			const feature = data.features[0];
			const parsed = this.parseFeatureToResult(feature);

			return {
				formattedAddress: parsed.formattedAddress,
				streetAddress: this.extractStreetAddress(feature),
				city: parsed.city,
				state: parsed.state,
				country: parsed.country,
				countryCode: parsed.countryCode,
				postalCode: parsed.postalCode,
				rawResponse: data,
			};
		} catch (error) {
			console.error('[MapboxGeocodingProvider] Reverse geocoding error:', error);
			return null;
		}
	}

	private parseFeatureToResult(feature: MapboxFeature): GeocodingResult {
		// Mapbox center is [longitude, latitude]
		const [longitude, latitude] = feature.center;

		// Extract context information
		let city: string | undefined;
		let state: string | undefined;
		let country: string | undefined;
		let countryCode: string | undefined;
		let postalCode: string | undefined;

		if (feature.context) {
			for (const ctx of feature.context) {
				if (ctx.id.startsWith('place.')) {
					city = ctx.text;
				} else if (ctx.id.startsWith('region.')) {
					state = ctx.text;
				} else if (ctx.id.startsWith('country.')) {
					country = ctx.text;
					countryCode = ctx.short_code?.toUpperCase();
				} else if (ctx.id.startsWith('postcode.')) {
					postalCode = ctx.text;
				}
			}
		}

		// If the feature itself is a place type, use it
		if (feature.place_type.includes('place') && !city) {
			city = feature.text;
		}
		if (feature.place_type.includes('region') && !state) {
			state = feature.text;
		}
		if (feature.place_type.includes('country') && !country) {
			country = feature.text;
		}

		return {
			latitude,
			longitude,
			formattedAddress: feature.place_name,
			city,
			state,
			country,
			countryCode,
			postalCode,
			confidence: feature.relevance,
		};
	}

	private extractStreetAddress(feature: MapboxFeature): string | undefined {
		// Check if this is an address-level result
		if (feature.place_type.includes('address')) {
			return feature.text;
		}
		return undefined;
	}
}
