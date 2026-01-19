/**
 * Location Index Database Queries
 *
 * Provides database operations for the item_location_index table.
 * This table serves as an index for fast geo queries - source of truth remains in YAML.
 */

import { and, eq, gte, lte, inArray, count, sql } from 'drizzle-orm';
import { db } from '../drizzle';
import {
	itemLocationIndex,
	locationIndexMeta,
	type NewItemLocationIndex,
	type ItemLocationIndex,
	type LocationIndexMeta,
} from '../schema';

// ===================== Helpers =====================

/**
 * Normalize a location string for consistent matching.
 * Trims whitespace and converts to lowercase.
 *
 * @param value - The string to normalize
 * @returns Normalized string or null
 */
function normalizeLocationString(value: string | null | undefined): string | null {
	if (!value) return null;
	return value.trim().toLowerCase();
}

// ===================== Types =====================

export interface UpsertLocationIndexParams {
	itemSlug: string;
	latitude: number;
	longitude: number;
	address?: string | null;
	city?: string | null;
	state?: string | null;
	country?: string | null;
	postalCode?: string | null;
	serviceArea?: string | null;
	isRemote?: boolean;
}

export interface LocationQueryParams {
	minLat?: number;
	maxLat?: number;
	minLng?: number;
	maxLng?: number;
	city?: string;
	country?: string;
	isRemote?: boolean;
	limit?: number;
	offset?: number;
}

export interface LocationIndexStats {
	totalIndexed: number;
	/** Timestamp of the most recently indexed individual item */
	lastIndexedAt: Date | null;
	/** Timestamp of the last full index rebuild (set by service, not DB) */
	lastRebuildAt?: Date | null;
	citiesCount: number;
	countriesCount: number;
	remoteCount: number;
}

// ===================== Write Operations =====================

/**
 * Upsert a location index entry.
 * Creates a new entry or updates existing based on itemSlug.
 *
 * @param params - Location data to upsert
 * @returns The upserted location entry
 */
export async function upsertLocationIndex(params: UpsertLocationIndexParams): Promise<ItemLocationIndex> {
	const [result] = await db
		.insert(itemLocationIndex)
		.values({
			itemSlug: params.itemSlug,
			latitude: params.latitude,
			longitude: params.longitude,
			address: params.address ?? null,
			city: params.city ?? null,
			state: params.state ?? null,
			country: params.country ?? null,
			cityNormalized: normalizeLocationString(params.city),
			countryNormalized: normalizeLocationString(params.country),
			postalCode: params.postalCode ?? null,
			serviceArea: params.serviceArea ?? null,
			isRemote: params.isRemote ?? false,
			indexedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: itemLocationIndex.itemSlug,
			set: {
				latitude: params.latitude,
				longitude: params.longitude,
				address: params.address ?? null,
				city: params.city ?? null,
				state: params.state ?? null,
				country: params.country ?? null,
				cityNormalized: normalizeLocationString(params.city),
				countryNormalized: normalizeLocationString(params.country),
				postalCode: params.postalCode ?? null,
				serviceArea: params.serviceArea ?? null,
				isRemote: params.isRemote ?? false,
				indexedAt: new Date(),
			},
		})
		.returning();

	return result;
}

/**
 * Batch upsert multiple location index entries.
 *
 * @param entries - Array of location data to upsert
 * @returns Number of entries processed
 */
export async function batchUpsertLocationIndex(entries: UpsertLocationIndexParams[]): Promise<number> {
	if (entries.length === 0) return 0;

	const values: NewItemLocationIndex[] = entries.map((entry) => ({
		itemSlug: entry.itemSlug,
		latitude: entry.latitude,
		longitude: entry.longitude,
		address: entry.address ?? null,
		city: entry.city ?? null,
		state: entry.state ?? null,
		country: entry.country ?? null,
		cityNormalized: normalizeLocationString(entry.city),
		countryNormalized: normalizeLocationString(entry.country),
		postalCode: entry.postalCode ?? null,
		serviceArea: entry.serviceArea ?? null,
		isRemote: entry.isRemote ?? false,
		indexedAt: new Date(),
	}));

	// Process in batches of 100 to avoid query size limits
	const BATCH_SIZE = 100;
	let processed = 0;

	for (let i = 0; i < values.length; i += BATCH_SIZE) {
		const batch = values.slice(i, i + BATCH_SIZE);

		await db
			.insert(itemLocationIndex)
			.values(batch)
			.onConflictDoUpdate({
				target: itemLocationIndex.itemSlug,
				set: {
					latitude: sql`excluded.latitude`,
					longitude: sql`excluded.longitude`,
					address: sql`excluded.address`,
					city: sql`excluded.city`,
					state: sql`excluded.state`,
					country: sql`excluded.country`,
					cityNormalized: sql`excluded.city_normalized`,
					countryNormalized: sql`excluded.country_normalized`,
					postalCode: sql`excluded.postal_code`,
					serviceArea: sql`excluded.service_area`,
					isRemote: sql`excluded.is_remote`,
					indexedAt: sql`excluded.indexed_at`,
				},
			});

		processed += batch.length;
	}

	return processed;
}

/**
 * Remove an item from the location index.
 *
 * @param itemSlug - Slug of the item to remove
 * @returns true if an entry was deleted
 */
export async function removeFromLocationIndex(itemSlug: string): Promise<boolean> {
	const result = await db.delete(itemLocationIndex).where(eq(itemLocationIndex.itemSlug, itemSlug)).returning();

	return result.length > 0;
}

/**
 * Remove multiple items from the location index.
 *
 * @param itemSlugs - Array of slugs to remove
 * @returns Number of entries deleted
 */
export async function batchRemoveFromLocationIndex(itemSlugs: string[]): Promise<number> {
	if (itemSlugs.length === 0) return 0;

	const result = await db
		.delete(itemLocationIndex)
		.where(inArray(itemLocationIndex.itemSlug, itemSlugs))
		.returning();

	return result.length;
}

/**
 * Clear the entire location index.
 * Used during full rebuild.
 *
 * @returns Number of entries deleted
 */
export async function clearLocationIndex(): Promise<number> {
	const result = await db.delete(itemLocationIndex).returning();
	return result.length;
}

// ===================== Read Operations =====================

/**
 * Get a location index entry by slug.
 *
 * @param itemSlug - Slug of the item
 * @returns Location entry or null
 */
export async function getLocationBySlug(itemSlug: string): Promise<ItemLocationIndex | null> {
	const [result] = await db
		.select()
		.from(itemLocationIndex)
		.where(eq(itemLocationIndex.itemSlug, itemSlug))
		.limit(1);

	return result ?? null;
}

/**
 * Get location index entries by slugs.
 *
 * @param itemSlugs - Array of slugs to look up
 * @returns Array of location entries
 */
export async function getLocationsBySlugs(itemSlugs: string[]): Promise<ItemLocationIndex[]> {
	if (itemSlugs.length === 0) return [];

	return db.select().from(itemLocationIndex).where(inArray(itemLocationIndex.itemSlug, itemSlugs));
}

/**
 * Query items within a bounding box.
 * Useful for initial radius filtering before precise distance calculation.
 *
 * @param params - Query parameters including bounding box
 * @returns Array of location entries
 */
export async function queryByBoundingBox(params: LocationQueryParams): Promise<ItemLocationIndex[]> {
	const conditions = [];

	if (params.minLat !== undefined) {
		conditions.push(gte(itemLocationIndex.latitude, params.minLat));
	}
	if (params.maxLat !== undefined) {
		conditions.push(lte(itemLocationIndex.latitude, params.maxLat));
	}
	if (params.minLng !== undefined) {
		conditions.push(gte(itemLocationIndex.longitude, params.minLng));
	}
	if (params.maxLng !== undefined) {
		conditions.push(lte(itemLocationIndex.longitude, params.maxLng));
	}

	let query = db.select().from(itemLocationIndex);

	if (conditions.length > 0) {
		query = query.where(and(...conditions)) as typeof query;
	}

	if (params.limit) {
		query = query.limit(params.limit) as typeof query;
	}
	if (params.offset) {
		query = query.offset(params.offset) as typeof query;
	}

	return query;
}

/**
 * Query items by city.
 * Uses indexed normalized column for fast case-insensitive matching.
 *
 * @param city - City name to search for
 * @param includeRemote - Include remote items (default false)
 * @returns Array of item slugs
 */
export async function queryByCity(city: string, includeRemote = false): Promise<string[]> {
	const normalizedCity = normalizeLocationString(city);
	if (!normalizedCity) return [];

	// Use equality on normalized column (indexed for fast queries)
	const conditions = [eq(itemLocationIndex.cityNormalized, normalizedCity)];

	if (!includeRemote) {
		conditions.push(eq(itemLocationIndex.isRemote, false));
	}

	const results = await db
		.select({ itemSlug: itemLocationIndex.itemSlug })
		.from(itemLocationIndex)
		.where(and(...conditions));

	return results.map((r) => r.itemSlug);
}

/**
 * Query items by country.
 * Uses indexed normalized column for fast case-insensitive matching.
 *
 * @param country - Country name to search for
 * @param includeRemote - Include remote items (default false)
 * @returns Array of item slugs
 */
export async function queryByCountry(country: string, includeRemote = false): Promise<string[]> {
	const normalizedCountry = normalizeLocationString(country);
	if (!normalizedCountry) return [];

	// Use equality on normalized column (indexed for fast queries)
	const conditions = [eq(itemLocationIndex.countryNormalized, normalizedCountry)];

	if (!includeRemote) {
		conditions.push(eq(itemLocationIndex.isRemote, false));
	}

	const results = await db
		.select({ itemSlug: itemLocationIndex.itemSlug })
		.from(itemLocationIndex)
		.where(and(...conditions));

	return results.map((r) => r.itemSlug);
}

/**
 * Query remote-only items.
 *
 * @returns Array of item slugs for remote items
 */
export async function queryRemoteItems(): Promise<string[]> {
	const results = await db
		.select({ itemSlug: itemLocationIndex.itemSlug })
		.from(itemLocationIndex)
		.where(eq(itemLocationIndex.isRemote, true));

	return results.map((r) => r.itemSlug);
}

/**
 * Get all indexed item slugs.
 *
 * @returns Array of all indexed item slugs
 */
export async function getAllIndexedSlugs(): Promise<string[]> {
	const results = await db.select({ itemSlug: itemLocationIndex.itemSlug }).from(itemLocationIndex);

	return results.map((r) => r.itemSlug);
}

/**
 * Get all location entries (for distance calculations).
 *
 * @returns Array of all location entries
 */
export async function getAllLocationEntries(): Promise<ItemLocationIndex[]> {
	return db.select().from(itemLocationIndex);
}

/**
 * Result type for remote location entries query.
 */
export interface RemoteLocationEntry {
	itemSlug: string;
	city: string | null;
	country: string | null;
}

/**
 * Get remote-only location entries with minimal fields.
 * Optimized for radius queries - only fetches slug, city, country.
 *
 * @returns Array of remote location entries
 */
export async function getRemoteLocationEntries(): Promise<RemoteLocationEntry[]> {
	return db
		.select({
			itemSlug: itemLocationIndex.itemSlug,
			city: itemLocationIndex.city,
			country: itemLocationIndex.country,
		})
		.from(itemLocationIndex)
		.where(eq(itemLocationIndex.isRemote, true));
}

// ===================== Statistics =====================

/**
 * Get statistics about the location index.
 *
 * @returns Index statistics
 */
export async function getLocationIndexStats(): Promise<LocationIndexStats> {
	// Get total count
	const [countResult] = await db.select({ count: count() }).from(itemLocationIndex);

	// Get last indexed timestamp
	const [lastIndexed] = await db
		.select({ indexedAt: itemLocationIndex.indexedAt })
		.from(itemLocationIndex)
		.orderBy(sql`${itemLocationIndex.indexedAt} DESC`)
		.limit(1);

	// Get distinct cities count
	const [citiesResult] = await db
		.select({ count: sql<number>`COUNT(DISTINCT ${itemLocationIndex.city})` })
		.from(itemLocationIndex)
		.where(sql`${itemLocationIndex.city} IS NOT NULL`);

	// Get distinct countries count
	const [countriesResult] = await db
		.select({ count: sql<number>`COUNT(DISTINCT ${itemLocationIndex.country})` })
		.from(itemLocationIndex)
		.where(sql`${itemLocationIndex.country} IS NOT NULL`);

	// Get remote count
	const [remoteResult] = await db
		.select({ count: count() })
		.from(itemLocationIndex)
		.where(eq(itemLocationIndex.isRemote, true));

	return {
		totalIndexed: Number(countResult?.count ?? 0),
		lastIndexedAt: lastIndexed?.indexedAt ?? null,
		citiesCount: Number(citiesResult?.count ?? 0),
		countriesCount: Number(countriesResult?.count ?? 0),
		remoteCount: Number(remoteResult?.count ?? 0),
	};
}

// ===================== Metadata Operations =====================

/**
 * Update the location index metadata after a rebuild.
 * Uses upsert to create or update the singleton row.
 *
 * @param rebuildAt - Timestamp of the rebuild
 * @param durationMs - Duration of the rebuild in milliseconds
 * @param itemCount - Number of items processed
 */
export async function updateLocationIndexMeta(
	rebuildAt: Date,
	durationMs: number,
	itemCount: number
): Promise<void> {
	await db
		.insert(locationIndexMeta)
		.values({
			id: 'singleton',
			lastRebuildAt: rebuildAt,
			lastRebuildDurationMs: durationMs,
			lastRebuildItemCount: itemCount,
			updatedAt: new Date(),
		})
		.onConflictDoUpdate({
			target: locationIndexMeta.id,
			set: {
				lastRebuildAt: rebuildAt,
				lastRebuildDurationMs: durationMs,
				lastRebuildItemCount: itemCount,
				updatedAt: new Date(),
			},
		});
}

/**
 * Get the location index metadata.
 *
 * @returns Metadata or null if not yet set
 */
export async function getLocationIndexMeta(): Promise<LocationIndexMeta | null> {
	const [result] = await db
		.select()
		.from(locationIndexMeta)
		.where(eq(locationIndexMeta.id, 'singleton'))
		.limit(1);

	return result ?? null;
}
