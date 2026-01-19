/**
 * Location Index Service
 *
 * Critical service for syncing location data between YAML files and the database index.
 * The database serves as an index for fast geo queries - YAML files remain the source of truth.
 *
 * Responsibilities:
 * - Index items with location data from YAML
 * - Geocode addresses when coordinates are not provided
 * - Query items by radius, city, or country
 * - Full index rebuild
 * - Index statistics
 */

import type { ItemData, ItemLocationData } from '@/lib/types/item';
import type { LocationQueryResult } from '@/lib/types/location';
import {
	upsertLocationIndex,
	batchUpsertLocationIndex,
	removeFromLocationIndex,
	clearLocationIndex,
	getLocationBySlug,
	getLocationsBySlugs,
	queryByBoundingBox,
	queryByCity,
	queryByCountry,
	queryRemoteItems,
	getAllIndexedSlugs,
	getAllLocationEntries,
	getRemoteLocationEntries,
	getLocationIndexStats,
	updateLocationIndexMeta,
	getLocationIndexMeta,
	type UpsertLocationIndexParams,
	type LocationIndexStats,
} from '@/lib/db/queries/location-index.queries';
import { getGeocodingService } from '../geocoding/geocoding.service';
import { getLocationService, type Coordinates } from './location.service';
import { getLocationEnabled } from '@/lib/utils/settings';

// ===================== Types =====================

export interface IndexItemResult {
	slug: string;
	success: boolean;
	geocoded: boolean;
	error?: string;
}

export interface RebuildIndexResult {
	totalProcessed: number;
	indexed: number;
	skipped: number;
	failed: number;
	errors: Array<{ slug: string; error: string }>;
	durationMs: number;
}

export interface RadiusQueryOptions {
	latitude: number;
	longitude: number;
	radiusKm: number;
	includeRemote?: boolean;
	limit?: number;
}

// ===================== Service Class =====================

/**
 * LocationIndexService manages the sync between YAML location data and the database index.
 */
export class LocationIndexService {
	private geocodingService = getGeocodingService();
	private locationService = getLocationService();

	/**
	 * Index a single item's location data.
	 * Reads location from YAML, geocodes if needed, and upserts to the index.
	 *
	 * @param item - Item data with optional location
	 * @returns Result of the indexing operation
	 */
	async indexItem(item: ItemData): Promise<IndexItemResult> {
		const result: IndexItemResult = {
			slug: item.slug,
			success: false,
			geocoded: false,
		};

		try {
			// Check if item has location data
			if (!item.location) {
				result.error = 'No location data';
				return result;
			}

			const locationData = item.location;

			// If item is remote-only with no coordinates, just mark it as remote
			if (locationData.is_remote && !locationData.latitude && !locationData.longitude && !locationData.address) {
				await upsertLocationIndex({
					itemSlug: item.slug,
					latitude: 0, // Default for remote items
					longitude: 0,
					isRemote: true,
					serviceArea: locationData.service_area,
				});
				result.success = true;
				return result;
			}

			// Get or geocode coordinates
			let latitude = locationData.latitude;
			let longitude = locationData.longitude;
			let geocodedCity = locationData.city;
			let geocodedState = locationData.state;
			let geocodedCountry = locationData.country;
			let geocodedPostalCode = locationData.postal_code;

			// If no coordinates provided, try to geocode the address
			if ((latitude === undefined || longitude === undefined) && locationData.address) {
				const geocodeResult = await this.geocodingService.geocodeAddress(locationData.address);

				if (geocodeResult) {
					latitude = geocodeResult.latitude;
					longitude = geocodeResult.longitude;
					result.geocoded = true;

					// Use geocoded values as fallbacks
					geocodedCity = geocodedCity || geocodeResult.city;
					geocodedState = geocodedState || geocodeResult.state;
					geocodedCountry = geocodedCountry || geocodeResult.country;
					geocodedPostalCode = geocodedPostalCode || geocodeResult.postalCode;
				} else {
					result.error = 'Geocoding failed - no results for address';
					return result;
				}
			}

			// Validate we have coordinates
			if (latitude === undefined || longitude === undefined) {
				result.error = 'No coordinates available (neither provided nor geocoded)';
				return result;
			}

			// Upsert to index
			await upsertLocationIndex({
				itemSlug: item.slug,
				latitude,
				longitude,
				address: locationData.address,
				city: geocodedCity,
				state: geocodedState,
				country: geocodedCountry,
				postalCode: geocodedPostalCode,
				serviceArea: locationData.service_area,
				isRemote: locationData.is_remote ?? false,
			});

			result.success = true;
			return result;
		} catch (error) {
			result.error = error instanceof Error ? error.message : 'Unknown error';
			return result;
		}
	}

	/**
	 * Remove an item from the location index.
	 *
	 * @param slug - Slug of the item to remove
	 * @returns true if an entry was removed
	 */
	async removeFromIndex(slug: string): Promise<boolean> {
		return removeFromLocationIndex(slug);
	}

	/**
	 * Rebuild the entire location index from a list of items.
	 * Clears the existing index and re-indexes all items with location data.
	 *
	 * @param items - Array of items to index
	 * @returns Result of the rebuild operation
	 */
	async rebuildIndex(items: ItemData[]): Promise<RebuildIndexResult> {
		const startTime = Date.now();
		const result: RebuildIndexResult = {
			totalProcessed: items.length,
			indexed: 0,
			skipped: 0,
			failed: 0,
			errors: [],
			durationMs: 0,
		};

		try {
			// Clear existing index
			await clearLocationIndex();

			// Filter items with location data
			const itemsWithLocation = items.filter((item) => item.location);

			// Process items in batches for better performance
			const BATCH_SIZE = 50;
			const batchEntries: UpsertLocationIndexParams[] = [];

			for (const item of itemsWithLocation) {
				const indexResult = await this.prepareLocationEntry(item);

				if (indexResult.success && indexResult.entry) {
					batchEntries.push(indexResult.entry);

					// Process batch when it reaches the size limit
					if (batchEntries.length >= BATCH_SIZE) {
						await batchUpsertLocationIndex(batchEntries);
						result.indexed += batchEntries.length;
						batchEntries.length = 0;
					}
				} else if (indexResult.skipped) {
					result.skipped++;
				} else {
					result.failed++;
					if (indexResult.error) {
						result.errors.push({ slug: item.slug, error: indexResult.error });
					}
				}
			}

			// Process remaining batch
			if (batchEntries.length > 0) {
				await batchUpsertLocationIndex(batchEntries);
				result.indexed += batchEntries.length;
			}

			// Items without location are considered skipped
			result.skipped += items.length - itemsWithLocation.length;
		} catch (error) {
			console.error('[LocationIndexService] Rebuild failed:', error);
			throw error;
		}

		result.durationMs = Date.now() - startTime;

		// Persist rebuild metadata to database (survives restarts/deployments)
		try {
			await updateLocationIndexMeta(new Date(), result.durationMs, result.indexed);
		} catch (metaError) {
			console.error('[LocationIndexService] Failed to update rebuild metadata:', metaError);
			// Don't fail the rebuild for metadata update failure
		}

		return result;
	}

	/**
	 * Prepare a location entry for batch insert.
	 */
	private async prepareLocationEntry(
		item: ItemData
	): Promise<{ success: boolean; entry?: UpsertLocationIndexParams; skipped?: boolean; error?: string }> {
		if (!item.location) {
			return { success: false, skipped: true };
		}

		const locationData = item.location;

		// Handle remote-only items
		if (locationData.is_remote && !locationData.latitude && !locationData.longitude && !locationData.address) {
			return {
				success: true,
				entry: {
					itemSlug: item.slug,
					latitude: 0,
					longitude: 0,
					isRemote: true,
					serviceArea: locationData.service_area,
				},
			};
		}

		let latitude = locationData.latitude;
		let longitude = locationData.longitude;
		let geocodedCity = locationData.city;
		let geocodedState = locationData.state;
		let geocodedCountry = locationData.country;
		let geocodedPostalCode = locationData.postal_code;

		// Geocode if needed
		if ((latitude === undefined || longitude === undefined) && locationData.address) {
			const geocodeResult = await this.geocodingService.geocodeAddress(locationData.address);

			if (geocodeResult) {
				latitude = geocodeResult.latitude;
				longitude = geocodeResult.longitude;
				geocodedCity = geocodedCity || geocodeResult.city;
				geocodedState = geocodedState || geocodeResult.state;
				geocodedCountry = geocodedCountry || geocodeResult.country;
				geocodedPostalCode = geocodedPostalCode || geocodeResult.postalCode;
			} else {
				return { success: false, error: 'Geocoding failed' };
			}
		}

		if (latitude === undefined || longitude === undefined) {
			return { success: false, error: 'No coordinates available' };
		}

		return {
			success: true,
			entry: {
				itemSlug: item.slug,
				latitude,
				longitude,
				address: locationData.address,
				city: geocodedCity,
				state: geocodedState,
				country: geocodedCountry,
				postalCode: geocodedPostalCode,
				serviceArea: locationData.service_area,
				isRemote: locationData.is_remote ?? false,
			},
		};
	}

	/**
	 * Get statistics about the location index.
	 * Includes lastRebuildAt from persistent storage (survives restarts/deployments).
	 *
	 * @returns Index statistics including last rebuild time
	 */
	async getIndexStats(): Promise<LocationIndexStats> {
		const [stats, meta] = await Promise.all([getLocationIndexStats(), getLocationIndexMeta()]);
		return {
			...stats,
			lastRebuildAt: meta?.lastRebuildAt ?? null,
		};
	}

	// ===================== Query Methods =====================

	/**
	 * Query items within a radius of a point.
	 * Uses bounding box pre-filtering and then precise Haversine distance calculation.
	 *
	 * Remote items (when includeRemote=true) are returned independently of distance
	 * with distanceKm: undefined, appended after distance-sorted results.
	 *
	 * @param options - Query options
	 * @returns Array of location query results with distances
	 */
	async queryByRadius(options: RadiusQueryOptions): Promise<LocationQueryResult[]> {
		const center: Coordinates = {
			latitude: options.latitude,
			longitude: options.longitude,
		};

		// Calculate bounding box for initial filtering
		const boundingBox = this.locationService.calculateBoundingBox(center, options.radiusKm);

		// Query database with bounding box (excludes remote items at 0,0)
		const candidates = await queryByBoundingBox({
			minLat: boundingBox.minLat,
			maxLat: boundingBox.maxLat,
			minLng: boundingBox.minLng,
			maxLng: boundingBox.maxLng,
		});

		// Filter candidates by precise distance (non-remote items only)
		const locationResults: LocationQueryResult[] = [];

		for (const candidate of candidates) {
			// Skip remote items - they'll be handled separately
			if (candidate.isRemote) {
				continue;
			}

			// Calculate precise distance
			const distanceKm = this.locationService.calculateDistance(
				center.latitude,
				center.longitude,
				candidate.latitude,
				candidate.longitude
			);

			if (distanceKm <= options.radiusKm) {
				locationResults.push({
					itemSlug: candidate.itemSlug,
					distanceKm,
					city: candidate.city,
					country: candidate.country,
				});
			}
		}

		// Sort location-based results by distance
		locationResults.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

		// Handle remote items separately if requested (efficient indexed query)
		const remoteResults: LocationQueryResult[] = [];
		if (options.includeRemote) {
			const remoteEntries = await getRemoteLocationEntries();
			for (const entry of remoteEntries) {
				remoteResults.push({
					itemSlug: entry.itemSlug,
					distanceKm: undefined, // Remote items have no distance
					city: entry.city,
					country: entry.country,
				});
			}
		}

		// Combine results: location-based first (sorted by distance), then remote items
		const results = [...locationResults, ...remoteResults];

		// Apply limit if specified
		if (options.limit && results.length > options.limit) {
			return results.slice(0, options.limit);
		}

		return results;
	}

	/**
	 * Query items by city.
	 *
	 * @param city - City name
	 * @param includeRemote - Include remote items (default false)
	 * @returns Array of item slugs
	 */
	async queryByCity(city: string, includeRemote = false): Promise<string[]> {
		return queryByCity(city, includeRemote);
	}

	/**
	 * Query items by country.
	 *
	 * @param country - Country name
	 * @param includeRemote - Include remote items (default false)
	 * @returns Array of item slugs
	 */
	async queryByCountry(country: string, includeRemote = false): Promise<string[]> {
		return queryByCountry(country, includeRemote);
	}

	/**
	 * Query remote-only items.
	 *
	 * @returns Array of item slugs for remote items
	 */
	async queryRemoteItems(): Promise<string[]> {
		return queryRemoteItems();
	}

	/**
	 * Get location data for a specific item.
	 *
	 * @param slug - Item slug
	 * @returns Location data or null
	 */
	async getItemLocation(slug: string) {
		return getLocationBySlug(slug);
	}

	/**
	 * Get location data for multiple items.
	 *
	 * @param slugs - Array of item slugs
	 * @returns Array of location data
	 */
	async getItemsLocations(slugs: string[]) {
		return getLocationsBySlugs(slugs);
	}

	/**
	 * Get all indexed item slugs.
	 *
	 * @returns Array of indexed slugs
	 */
	async getAllIndexedSlugs(): Promise<string[]> {
		return getAllIndexedSlugs();
	}

	/**
	 * Check if location features are enabled.
	 *
	 * @returns true if location is enabled in settings
	 */
	isEnabled(): boolean {
		return getLocationEnabled();
	}
}

// Singleton instance
let locationIndexServiceInstance: LocationIndexService | null = null;

/**
 * Get the singleton LocationIndexService instance.
 */
export function getLocationIndexService(): LocationIndexService {
	if (!locationIndexServiceInstance) {
		locationIndexServiceInstance = new LocationIndexService();
	}
	return locationIndexServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing).
 */
export function resetLocationIndexService(): void {
	locationIndexServiceInstance = null;
}
