import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { GeoBoundingBox } from '@/lib/types/location';
import { LocationService, type Coordinates } from '../../services/location/location.service';
import { getLongitudeRanges } from '../geo-bounding-box';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `GET /api/location/search?near_lat=&near_lng=&radius=` (`LocationIndexService.queryByRadius`)
 * asks the database for the rows inside `LocationService.calculateBoundingBox` first and runs the
 * Haversine check only on those, so an item outside the box is never found. The box was
 * centre +- radius / 111 degrees of latitude and +- radius / (111 * cos(lat)) degrees of
 * longitude, with no wrap at +-180 and no pole case. It dropped items across the date line, past a
 * pole and at high latitudes (where radius / cos(lat) is narrower than the circle). The box now
 * uses the spherical bounds; a box that crosses the date line has minLng > maxLng and the query
 * keeps both parts.
 */

const service = new LocationService();

/**
 * The comparisons `queryByBoundingBox` sends to the database for a box: latitude in
 * minLat..maxLat, and longitude inside one of the box's longitude ranges (see the source guard at
 * the end of this file).
 */
function keptByQueryFilter(point: Coordinates, box: GeoBoundingBox): boolean {
	return (
		point.latitude >= box.minLat &&
		point.latitude <= box.maxLat &&
		getLongitudeRanges(box).some((range) => point.longitude >= range.minLng && point.longitude <= range.maxLng)
	);
}

/** The point `distanceKm` away from `center` on the initial bearing `bearingDeg` (great circle). */
function destination(center: Coordinates, distanceKm: number, bearingDeg: number): Coordinates {
	const rad = Math.PI / 180;
	const angular = distanceKm / 6371;
	const lat1 = center.latitude * rad;
	const lng1 = center.longitude * rad;
	const bearing = bearingDeg * rad;
	const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
	const lng2 =
		lng1 +
		Math.atan2(
			Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
			Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2)
		);
	const lngDeg = ((((lng2 / rad + 180) % 360) + 360) % 360) - 180;
	return { latitude: lat2 / rad, longitude: lngDeg };
}

interface Case {
	name: string;
	center: Coordinates;
	radiusKm: number;
	point: Coordinates;
}

const CASES: Case[] = [
	{
		name: 'mid-latitude (Paris, 50 km, a point about 44 km east)',
		center: { latitude: 48.8566, longitude: 2.3522 },
		radiusKm: 50,
		point: { latitude: 48.8566, longitude: 2.9522 }
	},
	{
		name: 'across the date line (0,179.5, 500 km, item at 0,-179.5 about 111 km away)',
		center: { latitude: 0, longitude: 179.5 },
		radiusKm: 500,
		point: { latitude: 0, longitude: -179.5 }
	},
	{
		name: 'across the date line the other way (0,-179.5, 500 km, item at 0,179.5)',
		center: { latitude: 0, longitude: -179.5 },
		radiusKm: 500,
		point: { latitude: 0, longitude: 179.5 }
	},
	{
		name: 'over the North Pole (80,0, 2000 km, item at 85,180 about 1,670 km away)',
		center: { latitude: 80, longitude: 0 },
		radiusKm: 2000,
		point: { latitude: 85, longitude: 180 }
	},
	{
		name: 'over the South Pole (-80,0, 2000 km, item at -85,180)',
		center: { latitude: -80, longitude: 0 },
		radiusKm: 2000,
		point: { latitude: -85, longitude: 180 }
	},
	{
		name: 'high latitude, no pole crossing (60,0, 3200 km, item at 75,65 about 3,000 km away)',
		center: { latitude: 60, longitude: 0 },
		radiusKm: 3200,
		point: { latitude: 75, longitude: 65 }
	}
];

describe('LocationService.calculateBoundingBox reach', () => {
	for (const testCase of CASES) {
		it(`keeps an item inside the radius: ${testCase.name}`, () => {
			const { center, radiusKm, point } = testCase;
			const distanceKm = service.calculateDistance(
				center.latitude,
				center.longitude,
				point.latitude,
				point.longitude
			);
			// The Haversine check (the final filter in queryByRadius) keeps the item...
			assert.ok(distanceKm <= radiusKm, `precondition: the item is ${distanceKm.toFixed(1)} km away`);

			// ...so the box the query sends to the database must keep it too.
			const box = service.calculateBoundingBox(center, radiusKm);
			assert.ok(
				keptByQueryFilter(point, box),
				`the query filter drops ${point.latitude},${point.longitude} (${distanceKm.toFixed(0)} km away): box ${JSON.stringify(box)}`
			);
			assert.equal(service.isWithinBoundingBox(point, box), true, 'isWithinBoundingBox disagrees with the query');
		});
	}

	it('keeps every point inside the radius, from any centre and for any radius', () => {
		const misses: string[] = [];
		for (let latitude = -90; latitude <= 90; latitude += 15) {
			for (let longitude = -180; longitude <= 180; longitude += 45) {
				const center = { latitude, longitude };
				for (const radiusKm of [1, 50, 500, 2000, 5000, 15000]) {
					const box = service.calculateBoundingBox(center, radiusKm);
					for (let bearing = 0; bearing < 360; bearing += 15) {
						for (const fraction of [0.5, 0.999]) {
							const point = destination(center, radiusKm * fraction, bearing);
							if (!keptByQueryFilter(point, box) || !service.isWithinBoundingBox(point, box)) {
								misses.push(
									`${latitude},${longitude} r=${radiusKm} -> ${point.latitude.toFixed(3)},${point.longitude.toFixed(3)}`
								);
							}
						}
					}
				}
			}
		}
		assert.deepEqual(misses.slice(0, 10), [], `${misses.length} in-radius points dropped by the box`);
	});

	it('keeps a mid-latitude box tight: one longitude range about the old width', () => {
		const box = service.calculateBoundingBox({ latitude: 48.8566, longitude: 2.3522 }, 50);
		assert.ok(box.minLng < box.maxLng, 'a box away from the date line must not wrap');
		assert.equal(getLongitudeRanges(box).length, 1);
		// 50 km is about 0.45 degrees of latitude and 0.68 degrees of longitude at Paris
		assert.ok(Math.abs(box.maxLat - box.minLat - 0.899) < 0.01, `latitude span ${box.maxLat - box.minLat}`);
		assert.ok(Math.abs(box.maxLng - box.minLng - 1.366) < 0.01, `longitude span ${box.maxLng - box.minLng}`);
		assert.equal(keptByQueryFilter({ latitude: 48.8566, longitude: 3.5 }, box), false, 'about 84 km east');
		assert.equal(keptByQueryFilter({ latitude: 49.4, longitude: 2.3522 }, box), false, 'about 60 km north');
	});

	it('wraps a box that crosses the date line instead of spanning the whole world', () => {
		const box = service.calculateBoundingBox({ latitude: 0, longitude: 179.5 }, 500);
		assert.ok(box.minLng > box.maxLng, `expected a wrapped box, got ${JSON.stringify(box)}`);
		assert.ok(box.minLng > 175 && box.minLng < 175.6, `minLng ${box.minLng}`);
		assert.ok(box.maxLng > -176.6 && box.maxLng < -176, `maxLng ${box.maxLng}`);
		// Items far from the date line stay out of the database result
		assert.equal(keptByQueryFilter({ latitude: 0, longitude: 0 }, box), false);
		assert.equal(service.isWithinBoundingBox({ latitude: 0, longitude: 0 }, box), false);
		assert.equal(keptByQueryFilter({ latitude: 0, longitude: -170 }, box), false);
		assert.equal(keptByQueryFilter({ latitude: 0, longitude: 170 }, box), false);
	});

	it('covers every longitude once the circle reaches a pole, and keeps latitude in -90..90', () => {
		const north = service.calculateBoundingBox({ latitude: 80, longitude: 0 }, 2000);
		assert.deepEqual([north.minLng, north.maxLng], [-180, 180]);
		assert.equal(north.maxLat, 90);
		assert.ok(north.minLat > 61 && north.minLat < 62.1, `minLat ${north.minLat}`);
		// An item below the circle's lowest latitude stays out
		assert.equal(keptByQueryFilter({ latitude: 60, longitude: 0 }, north), false);

		const south = service.calculateBoundingBox({ latitude: -90, longitude: 0 }, 10);
		assert.deepEqual([south.minLat, south.minLng, south.maxLng], [-90, -180, 180]);
	});

	it('widens the box at high latitude to the true circle width', () => {
		// radius / (111 * cos(60)) gives 57.7 degrees; the circle reaches 74.3 degrees east and west
		const box = service.calculateBoundingBox({ latitude: 60, longitude: 0 }, 3200);
		assert.ok(box.minLat > 31 && box.maxLat < 89, `this circle does not reach the pole: ${JSON.stringify(box)}`);
		assert.ok(Math.abs(box.maxLng - 74.33) < 0.05, `maxLng ${box.maxLng}`);
		assert.ok(Math.abs(box.minLng + 74.33) < 0.05, `minLng ${box.minLng}`);
	});
});

describe('getLongitudeRanges', () => {
	it('returns the one range of a plain box', () => {
		assert.deepEqual(getLongitudeRanges({ minLng: -10, maxLng: 20 }), [{ minLng: -10, maxLng: 20 }]);
		assert.deepEqual(getLongitudeRanges({ minLng: -180, maxLng: 180 }), [{ minLng: -180, maxLng: 180 }]);
	});

	it('splits a box that crosses the date line into its two parts', () => {
		assert.deepEqual(getLongitudeRanges({ minLng: 175, maxLng: -176 }), [
			{ minLng: 175, maxLng: 180 },
			{ minLng: -180, maxLng: -176 }
		]);
	});
});

describe('queryByBoundingBox longitude filter (source guard)', () => {
	// The query helpers import the database client and cannot be loaded under `tsx --test`, so
	// this reads the source: the longitude filter must come from getLongitudeRanges, with one
	// `and(gte, lte)` per range joined by `or`, not one plain `gte(minLng) and lte(maxLng)` pair.
	const source = readFileSync(join(__dirname, '../../db/queries/location-index.queries.ts'), 'utf8').replace(
		/\s+/g,
		' '
	);
	const start = source.indexOf('export async function queryByBoundingBox(');
	const end = source.indexOf(' export ', start + 1);
	const body = source.slice(start, end < 0 ? undefined : end);

	it('builds the longitude condition from every range of the box', () => {
		assert.ok(start >= 0, 'queryByBoundingBox not found');
		assert.ok(
			/import \{[^}]*\bgetLongitudeRanges\b[^}]*\} from '@\/lib\/utils\/geo-bounding-box'/.test(source),
			'location-index.queries.ts does not import getLongitudeRanges'
		);
		assert.ok(/getLongitudeRanges\(/.test(body), 'queryByBoundingBox does not call getLongitudeRanges');
		assert.ok(
			/\bor\( ?\.\.\.\w+\.map\(\(?\w+\)? => and\( ?gte\(itemLocationIndex\.longitude, \w+\.minLng\), lte\(itemLocationIndex\.longitude, \w+\.maxLng\) ?\) ?\) ?\)/.test(
				body
			),
			'queryByBoundingBox does not OR one longitude range condition per range'
		);
		assert.ok(
			!/gte\(itemLocationIndex\.longitude, params\.minLng\)/.test(body) &&
				!/lte\(itemLocationIndex\.longitude, params\.maxLng\)/.test(body),
			'queryByBoundingBox still compares longitude with the raw minLng / maxLng, which drops a wrapped box'
		);
	});
});
