/**
 * Location Service
 *
 * Provides location-based calculations and utilities:
 * - Haversine distance calculation
 * - Radius filtering
 * - Distance sorting
 * - Bounding box calculations
 */

import type { GeoBoundingBox } from '@/lib/types/location';
import { getLongitudeRanges } from '@/lib/utils/geo-bounding-box';

/**
 * Earth's radius in kilometers.
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Coordinates interface for location calculations.
 */
export interface Coordinates {
	latitude: number;
	longitude: number;
}

/**
 * Item with location data for filtering/sorting.
 */
export interface ItemWithLocation {
	slug: string;
	latitude: number;
	longitude: number;
}

/**
 * Item with calculated distance.
 */
export interface ItemWithDistance extends ItemWithLocation {
	distanceKm: number;
}

/**
 * LocationService provides geographic calculations and utilities.
 */
export class LocationService {
	/**
	 * Calculate the distance between two points using the Haversine formula.
	 * This gives the great-circle distance between two points on a sphere.
	 *
	 * @param lat1 - Latitude of point 1 in degrees
	 * @param lng1 - Longitude of point 1 in degrees
	 * @param lat2 - Latitude of point 2 in degrees
	 * @param lng2 - Longitude of point 2 in degrees
	 * @returns Distance in kilometers
	 */
	calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
		// Convert degrees to radians
		const dLat = this.toRadians(lat2 - lat1);
		const dLng = this.toRadians(lng2 - lng1);
		const lat1Rad = this.toRadians(lat1);
		const lat2Rad = this.toRadians(lat2);

		// Haversine formula
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return EARTH_RADIUS_KM * c;
	}

	/**
	 * Calculate distance between two coordinate objects.
	 *
	 * @param from - Starting coordinates
	 * @param to - Ending coordinates
	 * @returns Distance in kilometers
	 */
	calculateDistanceBetween(from: Coordinates, to: Coordinates): number {
		return this.calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude);
	}

	/**
	 * Filter items by radius from a center point.
	 *
	 * @param items - Array of items with location data
	 * @param center - Center point coordinates
	 * @param radiusKm - Radius in kilometers
	 * @returns Array of item slugs within the radius
	 */
	filterByRadius(items: ItemWithLocation[], center: Coordinates, radiusKm: number): string[] {
		return items
			.filter((item) => {
				const distance = this.calculateDistance(
					center.latitude,
					center.longitude,
					item.latitude,
					item.longitude
				);
				return distance <= radiusKm;
			})
			.map((item) => item.slug);
	}

	/**
	 * Filter items by radius and return items with distances.
	 *
	 * @param items - Array of items with location data
	 * @param center - Center point coordinates
	 * @param radiusKm - Radius in kilometers
	 * @returns Array of items with calculated distances
	 */
	filterByRadiusWithDistance(
		items: ItemWithLocation[],
		center: Coordinates,
		radiusKm: number
	): ItemWithDistance[] {
		const results: ItemWithDistance[] = [];

		for (const item of items) {
			const distanceKm = this.calculateDistance(
				center.latitude,
				center.longitude,
				item.latitude,
				item.longitude
			);

			if (distanceKm <= radiusKm) {
				results.push({
					...item,
					distanceKm,
				});
			}
		}

		return results;
	}

	/**
	 * Sort items by distance from a center point (closest first).
	 *
	 * @param items - Array of items with location data
	 * @param center - Center point coordinates
	 * @returns Array of item slugs sorted by distance (closest first)
	 */
	sortByDistance(items: ItemWithLocation[], center: Coordinates): string[] {
		return items
			.map((item) => ({
				slug: item.slug,
				distance: this.calculateDistance(center.latitude, center.longitude, item.latitude, item.longitude),
			}))
			.sort((a, b) => a.distance - b.distance)
			.map((item) => item.slug);
	}

	/**
	 * Sort items by distance and return with distance values.
	 *
	 * @param items - Array of items with location data
	 * @param center - Center point coordinates
	 * @returns Array of items with distances, sorted closest first
	 */
	sortByDistanceWithValues(items: ItemWithLocation[], center: Coordinates): ItemWithDistance[] {
		return items
			.map((item) => ({
				...item,
				distanceKm: this.calculateDistance(center.latitude, center.longitude, item.latitude, item.longitude),
			}))
			.sort((a, b) => a.distanceKm - b.distanceKm);
	}

	/**
	 * Calculate a bounding box around a center point for initial filtering.
	 * This is useful for efficient database queries before applying precise distance calculations.
	 *
	 * Uses the spherical bounds of the circle, so every point within `radiusKm` is inside the box:
	 * - latitude is the centre +- the angular radius, clamped to -90..90;
	 * - when that range reaches a pole, the circle covers every longitude near it, so the box
	 *   spans -180..180;
	 * - otherwise the longitude half-width is asin(sin(d) / cos(lat)), which is wider than
	 *   radius / (111 * cos(lat)) at high latitudes;
	 * - a box that crosses the date line wraps: it has `minLng > maxLng` and covers
	 *   `minLng..180` plus `-180..maxLng` (see `getLongitudeRanges`).
	 *
	 * @param center - Center point coordinates
	 * @param radiusKm - Radius in kilometers
	 * @returns Bounding box with min/max lat/lng (`minLng > maxLng` when it crosses the date line)
	 */
	calculateBoundingBox(center: Coordinates, radiusKm: number): GeoBoundingBox {
		// Angular radius of the circle, in radians
		const angularRadius = radiusKm / EARTH_RADIUS_KM;
		const latitude = this.toRadians(center.latitude);
		const minLat = latitude - angularRadius;
		const maxLat = latitude + angularRadius;

		// The circle reaches a pole, so it covers every longitude around that pole
		if (minLat <= -Math.PI / 2 || maxLat >= Math.PI / 2) {
			return {
				minLat: Math.max(this.toDegrees(minLat), -90),
				maxLat: Math.min(this.toDegrees(maxLat), 90),
				minLng: -180,
				maxLng: 180,
			};
		}

		// Widest longitude offset of the circle. The ratio is below 1 here (the circle stays off the
		// poles); the cap only guards against rounding.
		const lngDelta = this.toDegrees(Math.asin(Math.min(1, Math.sin(angularRadius) / Math.cos(latitude))));
		let minLng = center.longitude - lngDelta;
		let maxLng = center.longitude + lngDelta;
		// Wrap across the date line (lngDelta is at most 90, so only one side can cross it)
		if (minLng < -180) minLng += 360;
		if (maxLng > 180) maxLng -= 360;

		return {
			minLat: this.toDegrees(minLat),
			maxLat: this.toDegrees(maxLat),
			minLng,
			maxLng,
		};
	}

	/**
	 * Check if a point is within a bounding box. Matches the filter `queryByBoundingBox` sends to
	 * the database, including a box that crosses the date line (`minLng > maxLng`).
	 *
	 * @param point - Point coordinates to check
	 * @param box - Bounding box
	 * @returns true if point is within the bounding box
	 */
	isWithinBoundingBox(point: Coordinates, box: GeoBoundingBox): boolean {
		return (
			point.latitude >= box.minLat &&
			point.latitude <= box.maxLat &&
			getLongitudeRanges(box).some((range) => point.longitude >= range.minLng && point.longitude <= range.maxLng)
		);
	}

	/**
	 * Convert degrees to radians.
	 */
	private toRadians(degrees: number): number {
		return degrees * (Math.PI / 180);
	}

	/**
	 * Convert radians to degrees.
	 */
	private toDegrees(radians: number): number {
		return radians * (180 / Math.PI);
	}

	/**
	 * Convert distance from kilometers to miles.
	 *
	 * @param km - Distance in kilometers
	 * @returns Distance in miles
	 */
	kmToMiles(km: number): number {
		return km * 0.621371;
	}

	/**
	 * Convert distance from miles to kilometers.
	 *
	 * @param miles - Distance in miles
	 * @returns Distance in kilometers
	 */
	milesToKm(miles: number): number {
		return miles / 0.621371;
	}

	/**
	 * Format distance for display.
	 *
	 * @param km - Distance in kilometers
	 * @param useImperial - Use miles instead of kilometers
	 * @returns Formatted distance string
	 */
	formatDistance(km: number, useImperial = false): string {
		if (useImperial) {
			const miles = this.kmToMiles(km);
			if (miles < 1) {
				return `${Math.round(miles * 5280)} ft`;
			}
			return `${miles.toFixed(1)} mi`;
		}

		if (km < 1) {
			return `${Math.round(km * 1000)} m`;
		}
		return `${km.toFixed(1)} km`;
	}
}

// Singleton instance
let locationServiceInstance: LocationService | null = null;

/**
 * Get the singleton LocationService instance.
 */
export function getLocationService(): LocationService {
	if (!locationServiceInstance) {
		locationServiceInstance = new LocationService();
	}
	return locationServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing).
 */
export function resetLocationService(): void {
	locationServiceInstance = null;
}
