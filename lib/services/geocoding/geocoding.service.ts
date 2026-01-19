/**
 * Geocoding Service
 *
 * Main service for geocoding operations. Provides:
 * - Provider abstraction (Mapbox, Google)
 * - In-memory caching with configurable TTL
 * - Configuration-based provider selection
 */

import type { MapProvider } from '@/lib/types/location';
import { getLocationProvider } from '@/lib/utils/settings';
import type {
	IGeocodingProvider,
	GeocodingResult,
	ReverseGeocodingResult,
	GeocodingOptions,
} from './geocoding-provider.interface';
import { MapboxGeocodingProvider } from './mapbox-geocoding.provider';
import { GoogleGeocodingProvider } from './google-geocoding.provider';

/**
 * Cache entry with timestamp for TTL management.
 */
interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

/**
 * Configuration options for GeocodingService.
 */
export interface GeocodingServiceConfig {
	/** Default geocoding provider to use */
	defaultProvider?: MapProvider;
	/** Cache TTL in milliseconds (default: 15 minutes) */
	cacheTtlMs?: number;
	/** Maximum cache size (default: 1000 entries) */
	maxCacheSize?: number;
}

const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_CACHE_SIZE = 1000;

/**
 * Main geocoding service with caching and provider abstraction.
 */
export class GeocodingService {
	private providers: Map<MapProvider, IGeocodingProvider>;
	private cache: Map<string, CacheEntry<GeocodingResult | ReverseGeocodingResult | null>>;
	private cacheTtlMs: number;
	private maxCacheSize: number;

	constructor(config?: GeocodingServiceConfig) {
		this.cacheTtlMs = config?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
		this.maxCacheSize = config?.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE;
		this.cache = new Map();

		// Initialize providers
		this.providers = new Map();
		this.providers.set('mapbox', new MapboxGeocodingProvider());
		this.providers.set('google', new GoogleGeocodingProvider());
	}

	/**
	 * Get the default provider based on configuration.
	 */
	private getDefaultProvider(): IGeocodingProvider {
		const configuredProvider = getLocationProvider();
		const provider = this.providers.get(configuredProvider);

		// If configured provider is not available, try fallback
		if (provider && provider.isConfigured()) {
			return provider;
		}

		// Fallback to any configured provider
		for (const [, p] of this.providers) {
			if (p.isConfigured()) {
				return p;
			}
		}

		// Return configured provider even if not configured (will return null on calls)
		return provider || this.providers.get('mapbox')!;
	}

	/**
	 * Get a specific provider by name.
	 */
	getProvider(name: MapProvider): IGeocodingProvider | undefined {
		return this.providers.get(name);
	}

	/**
	 * Check if a specific provider is configured.
	 */
	isProviderConfigured(name: MapProvider): boolean {
		return this.providers.get(name)?.isConfigured() ?? false;
	}

	/**
	 * Check if any provider is configured and ready to use.
	 */
	isConfigured(): boolean {
		for (const [, provider] of this.providers) {
			if (provider.isConfigured()) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Forward geocode an address to coordinates.
	 * Results are cached for the configured TTL.
	 *
	 * @param address - The address string to geocode
	 * @param options - Optional geocoding options
	 * @param providerName - Optional specific provider to use
	 * @returns GeocodingResult or null if not found
	 */
	async geocodeAddress(
		address: string,
		options?: GeocodingOptions,
		providerName?: MapProvider
	): Promise<GeocodingResult | null> {
		const cacheKey = this.buildCacheKey('geo', address, options, providerName);

		// Check cache
		const cached = this.getFromCache<GeocodingResult>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		// Get provider
		const provider = providerName ? this.providers.get(providerName) : this.getDefaultProvider();
		if (!provider) {
			console.warn(`[GeocodingService] Provider '${providerName}' not found`);
			return null;
		}

		// Perform geocoding
		const result = await provider.geocode(address, options);

		// Cache result (even null to prevent repeated failed lookups)
		this.setInCache(cacheKey, result);

		return result;
	}

	/**
	 * Reverse geocode coordinates to an address.
	 * Results are cached for the configured TTL.
	 *
	 * @param latitude - Latitude coordinate
	 * @param longitude - Longitude coordinate
	 * @param options - Optional geocoding options
	 * @param providerName - Optional specific provider to use
	 * @returns ReverseGeocodingResult or null if not found
	 */
	async reverseGeocode(
		latitude: number,
		longitude: number,
		options?: GeocodingOptions,
		providerName?: MapProvider
	): Promise<ReverseGeocodingResult | null> {
		// Round coordinates to reduce cache misses for nearby locations
		const roundedLat = Math.round(latitude * 100000) / 100000;
		const roundedLng = Math.round(longitude * 100000) / 100000;

		const cacheKey = this.buildCacheKey('rev', `${roundedLat},${roundedLng}`, options, providerName);

		// Check cache
		const cached = this.getFromCache<ReverseGeocodingResult>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		// Get provider
		const provider = providerName ? this.providers.get(providerName) : this.getDefaultProvider();
		if (!provider) {
			console.warn(`[GeocodingService] Provider '${providerName}' not found`);
			return null;
		}

		// Perform reverse geocoding
		const result = await provider.reverseGeocode(latitude, longitude, options);

		// Cache result
		this.setInCache(cacheKey, result);

		return result;
	}

	/**
	 * Build a cache key from the request parameters.
	 * Includes all options that can affect results to ensure cache correctness.
	 */
	private buildCacheKey(
		type: 'geo' | 'rev',
		query: string,
		options?: GeocodingOptions,
		provider?: MapProvider
	): string {
		const parts = [type, query];

		if (provider) {
			parts.push(`p:${provider}`);
		}

		if (options) {
			if (options.countryCodes?.length) {
				// Copy array before sorting to avoid mutating caller's input
				parts.push(`cc:${[...options.countryCodes].sort().join(',')}`);
			}
			if (options.language) {
				parts.push(`l:${options.language}`);
			}
			if (options.proximity) {
				// Round proximity to reduce cache fragmentation while maintaining accuracy
				const roundedLat = Math.round(options.proximity.latitude * 1000) / 1000;
				const roundedLng = Math.round(options.proximity.longitude * 1000) / 1000;
				parts.push(`prox:${roundedLat},${roundedLng}`);
			}
			if (options.limit !== undefined) {
				parts.push(`lim:${options.limit}`);
			}
		}

		return parts.join('|').toLowerCase();
	}

	/**
	 * Get an entry from cache if not expired.
	 */
	private getFromCache<T>(key: string): T | null | undefined {
		const entry = this.cache.get(key);

		if (!entry) {
			return undefined; // Not in cache
		}

		if (Date.now() - entry.timestamp > this.cacheTtlMs) {
			this.cache.delete(key);
			return undefined; // Expired
		}

		return entry.data as T | null;
	}

	/**
	 * Set an entry in cache with current timestamp.
	 */
	private setInCache(key: string, data: GeocodingResult | ReverseGeocodingResult | null): void {
		// Evict oldest entries if cache is full
		if (this.cache.size >= this.maxCacheSize) {
			this.evictOldestEntries(Math.floor(this.maxCacheSize * 0.1)); // Remove 10%
		}

		this.cache.set(key, {
			data,
			timestamp: Date.now(),
		});
	}

	/**
	 * Evict the oldest entries from cache.
	 */
	private evictOldestEntries(count: number): void {
		const entries = Array.from(this.cache.entries())
			.sort((a, b) => a[1].timestamp - b[1].timestamp)
			.slice(0, count);

		for (const [key] of entries) {
			this.cache.delete(key);
		}
	}

	/**
	 * Clear the entire cache.
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics.
	 */
	getCacheStats(): { size: number; maxSize: number; ttlMs: number } {
		return {
			size: this.cache.size,
			maxSize: this.maxCacheSize,
			ttlMs: this.cacheTtlMs,
		};
	}
}

// Singleton instance
let geocodingServiceInstance: GeocodingService | null = null;

/**
 * Get the singleton GeocodingService instance.
 */
export function getGeocodingService(): GeocodingService {
	if (!geocodingServiceInstance) {
		geocodingServiceInstance = new GeocodingService();
	}
	return geocodingServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing).
 */
export function resetGeocodingService(): void {
	geocodingServiceInstance = null;
}
