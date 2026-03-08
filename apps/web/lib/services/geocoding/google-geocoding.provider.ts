/**
 * Google Geocoding Provider
 *
 * Implements geocoding using the Google Maps Geocoding API.
 * @see https://developers.google.com/maps/documentation/geocoding
 */

import type {
	IGeocodingProvider,
	GeocodingResult,
	ReverseGeocodingResult,
	GeocodingOptions,
} from './geocoding-provider.interface';

/**
 * Google API response types
 */
interface GoogleAddressComponent {
	long_name: string;
	short_name: string;
	types: string[];
}

interface GoogleGeometry {
	location: {
		lat: number;
		lng: number;
	};
	location_type: string;
	viewport: {
		northeast: { lat: number; lng: number };
		southwest: { lat: number; lng: number };
	};
}

interface GoogleGeocodingResult {
	address_components: GoogleAddressComponent[];
	formatted_address: string;
	geometry: GoogleGeometry;
	place_id: string;
	types: string[];
}

interface GoogleGeocodingResponse {
	status: string;
	results: GoogleGeocodingResult[];
	error_message?: string;
}

export class GoogleGeocodingProvider implements IGeocodingProvider {
	readonly name = 'google';
	private readonly apiKey: string;
	private readonly baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

	constructor(apiKey?: string) {
		this.apiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
	}

	isConfigured(): boolean {
		return !!this.apiKey && this.apiKey.length > 0;
	}

	async geocode(address: string, options?: GeocodingOptions): Promise<GeocodingResult | null> {
		if (!this.isConfigured()) {
			console.warn('[GoogleGeocodingProvider] API key not configured');
			return null;
		}

		try {
			const params = new URLSearchParams({
				address,
				key: this.apiKey,
			});

			// Add optional parameters
			if (options?.countryCodes?.length) {
				// Google uses components filter for country restriction
				params.set('components', options.countryCodes.map((c) => `country:${c}`).join('|'));
			}
			if (options?.language) {
				params.set('language', options.language);
			}

			const url = `${this.baseUrl}?${params.toString()}`;
			const response = await fetch(url);

			if (!response.ok) {
				console.error(`[GoogleGeocodingProvider] HTTP error: ${response.status} ${response.statusText}`);
				return null;
			}

			const data: GoogleGeocodingResponse = await response.json();

			if (data.status !== 'OK' || !data.results || data.results.length === 0) {
				if (data.status !== 'ZERO_RESULTS') {
					console.error(`[GoogleGeocodingProvider] API error: ${data.status} - ${data.error_message || ''}`);
				}
				return null;
			}

			const result = data.results[0];
			const parsed = this.parseResultToGeocodingResult(result);

			return {
				...parsed,
				rawResponse: data,
			};
		} catch (error) {
			console.error('[GoogleGeocodingProvider] Geocoding error:', error);
			return null;
		}
	}

	async reverseGeocode(
		latitude: number,
		longitude: number,
		options?: GeocodingOptions
	): Promise<ReverseGeocodingResult | null> {
		if (!this.isConfigured()) {
			console.warn('[GoogleGeocodingProvider] API key not configured');
			return null;
		}

		try {
			const params = new URLSearchParams({
				latlng: `${latitude},${longitude}`,
				key: this.apiKey,
			});

			if (options?.language) {
				params.set('language', options.language);
			}

			const url = `${this.baseUrl}?${params.toString()}`;
			const response = await fetch(url);

			if (!response.ok) {
				console.error(`[GoogleGeocodingProvider] HTTP error: ${response.status} ${response.statusText}`);
				return null;
			}

			const data: GoogleGeocodingResponse = await response.json();

			if (data.status !== 'OK' || !data.results || data.results.length === 0) {
				if (data.status !== 'ZERO_RESULTS') {
					console.error(`[GoogleGeocodingProvider] API error: ${data.status} - ${data.error_message || ''}`);
				}
				return null;
			}

			const result = data.results[0];
			const parsed = this.parseResultToGeocodingResult(result);

			return {
				formattedAddress: parsed.formattedAddress,
				streetAddress: this.extractStreetAddress(result),
				city: parsed.city,
				state: parsed.state,
				country: parsed.country,
				countryCode: parsed.countryCode,
				postalCode: parsed.postalCode,
				rawResponse: data,
			};
		} catch (error) {
			console.error('[GoogleGeocodingProvider] Reverse geocoding error:', error);
			return null;
		}
	}

	private parseResultToGeocodingResult(result: GoogleGeocodingResult): GeocodingResult {
		const { lat, lng } = result.geometry.location;

		// Extract address components
		let city: string | undefined;
		let state: string | undefined;
		let country: string | undefined;
		let countryCode: string | undefined;
		let postalCode: string | undefined;

		for (const component of result.address_components) {
			const types = component.types;

			if (types.includes('locality')) {
				city = component.long_name;
			} else if (types.includes('administrative_area_level_1')) {
				state = component.long_name;
			} else if (types.includes('country')) {
				country = component.long_name;
				countryCode = component.short_name;
			} else if (types.includes('postal_code')) {
				postalCode = component.long_name;
			}
		}

		// Fallback for city if locality not found
		if (!city) {
			const sublocality = result.address_components.find((c) =>
				c.types.some((t) => t.startsWith('sublocality') || t === 'administrative_area_level_2')
			);
			if (sublocality) {
				city = sublocality.long_name;
			}
		}

		// Calculate confidence based on location_type
		let confidence: number | undefined;
		switch (result.geometry.location_type) {
			case 'ROOFTOP':
				confidence = 1.0;
				break;
			case 'RANGE_INTERPOLATED':
				confidence = 0.8;
				break;
			case 'GEOMETRIC_CENTER':
				confidence = 0.6;
				break;
			case 'APPROXIMATE':
				confidence = 0.4;
				break;
		}

		return {
			latitude: lat,
			longitude: lng,
			formattedAddress: result.formatted_address,
			city,
			state,
			country,
			countryCode,
			postalCode,
			confidence,
		};
	}

	private extractStreetAddress(result: GoogleGeocodingResult): string | undefined {
		const streetNumber = result.address_components.find((c) => c.types.includes('street_number'));
		const route = result.address_components.find((c) => c.types.includes('route'));

		if (streetNumber && route) {
			return `${streetNumber.long_name} ${route.long_name}`;
		}
		if (route) {
			return route.long_name;
		}
		return undefined;
	}
}
