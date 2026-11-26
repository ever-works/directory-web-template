import type { GeoBoundingBox } from '@/lib/types/location';

/** One plain longitude range in degrees, with `minLng <= maxLng`. */
export interface LongitudeRange {
	minLng: number;
	maxLng: number;
}

/**
 * The longitude ranges a bounding box covers.
 *
 * A box from `LocationService.calculateBoundingBox` that crosses the date line has
 * `minLng > maxLng` (its west edge lies east of its east edge, as in a GeoJSON bbox), and covers
 * `minLng..180` plus `-180..maxLng`. Any other box covers `minLng..maxLng`.
 *
 * `queryByBoundingBox` keeps a row whose longitude is inside one of these ranges, and
 * `LocationService.isWithinBoundingBox` runs the same check in memory, so the two always agree.
 */
export function getLongitudeRanges(box: Pick<GeoBoundingBox, 'minLng' | 'maxLng'>): LongitudeRange[] {
	if (box.minLng <= box.maxLng) {
		return [{ minLng: box.minLng, maxLng: box.maxLng }];
	}
	return [
		{ minLng: box.minLng, maxLng: 180 },
		{ minLng: -180, maxLng: box.maxLng }
	];
}
