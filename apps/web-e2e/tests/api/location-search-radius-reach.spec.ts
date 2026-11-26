import { test, expect, type APIRequestContext } from '@playwright/test';
import { ADMIN_STATE_FILE } from '../../helpers/test-data';

/**
 * Reach of the radius branch of `GET /api/location/search` (T-2832).
 *
 * `LocationIndexService.queryByRadius` asks the database for the rows inside
 * `LocationService.calculateBoundingBox` and runs the Haversine check only on those. The box had no
 * wrap at +-180, no pole case and a longitude half-width of radius / (111 * cos(lat)), so these
 * items, all inside the radius, were never returned:
 *
 * - across the date line: centre 0,179.5, radius 500 km, item at 0,-179.5 (about 111 km);
 * - over the North Pole: centre 80,0, radius 2000 km, item at 85,180 (about 1,668 km);
 * - at high latitude: centre 60,0, radius 3200 km, item at 75,65 (about 2,999 km).
 *
 * A mid-latitude case checks that ordinary searches still work. The spec creates one approved item
 * per case through `POST /api/admin/items` as the admin (storage state from global-setup.ts), which
 * indexes its coordinates, and deletes the items again at the end.
 *
 * The route answers 404 when the location feature is off, the default for the CI content stub
 * (`.github/workflows/e2e.yml`), and the spec skips then; the items are only created when it is on.
 */
const SEARCH = '/api/location/search';
const ITEMS_PATH = '/api/admin/items';

type Point = { latitude: number; longitude: number };

interface ReachCase {
	key: string;
	item: Point;
	center: Point;
	radiusKm: number;
	/** Great-circle distance from the centre to the item (Haversine, R = 6371 km). */
	distanceKm: number;
}

const CASES: ReachCase[] = [
	{
		key: 'mid-latitude',
		item: { latitude: 48.8566, longitude: 2.9522 },
		center: { latitude: 48.8566, longitude: 2.3522 },
		radiusKm: 50,
		distanceKm: 43.9
	},
	{
		key: 'date-line',
		item: { latitude: 0, longitude: -179.5 },
		center: { latitude: 0, longitude: 179.5 },
		radiusKm: 500,
		distanceKm: 111.2
	},
	{
		key: 'north-pole',
		item: { latitude: 85, longitude: 180 },
		center: { latitude: 80, longitude: 0 },
		radiusKm: 2000,
		distanceKm: 1667.9
	},
	{
		key: 'high-latitude',
		item: { latitude: 75, longitude: 65 },
		center: { latitude: 60, longitude: 0 },
		radiusKm: 3200,
		distanceKm: 2999.4
	}
];

type SearchBody = { success?: boolean; data?: { slugs?: string[]; distances?: Record<string, number> } };

async function search(request: APIRequestContext, center: Point, radiusKm: number): Promise<SearchBody> {
	const params = new URLSearchParams({
		near_lat: String(center.latitude),
		near_lng: String(center.longitude),
		radius: String(radiusKm)
	});
	const path = `${SEARCH}?${params.toString()}`;
	const response = await request.get(path);
	expect(response.status(), path).toBe(200);
	const body = (await response.json()) as SearchBody;
	expect(body.success, path).toBe(true);
	return body;
}

test.describe('API: /api/location/search radius reach (date line, poles, high latitude)', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	test('finds items inside the radius across the date line, over a pole and at high latitude', async ({
		request
	}) => {
		const probe = await request.get(`${SEARCH}?near_lat=0&near_lng=0`);
		test.skip(probe.status() === 404, 'Location features are disabled in this deployment');

		const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		const slugOf = (key: string) => `e2e-t2832-${key}-${suffix}`;
		const created: string[] = [];

		try {
			await test.step('create one item per case with fixed coordinates', async () => {
				for (const testCase of CASES) {
					const slug = slugOf(testCase.key);
					const response = await request.post(ITEMS_PATH, {
						data: {
							// The DELETE route removes the index row by id, so id and slug match
							id: slug,
							slug,
							name: `E2E T-2832 ${testCase.key} ${suffix}`,
							description: `Radius search reach fixture (${testCase.key})`,
							source_url: `https://example.com/${slug}`,
							// Only approved items are in the public index (T-2840)
							status: 'approved',
							location: { ...testCase.item, city: `E2E ${testCase.key}`, country: 'E2E' }
						}
					});
					expect(response.status(), `POST ${ITEMS_PATH} ${slug}`).toBe(201);
					created.push(slug);
				}
			});

			for (const testCase of CASES) {
				await test.step(`${testCase.key}: the item ${testCase.distanceKm} km away is found`, async () => {
					const slug = slugOf(testCase.key);
					const body = await search(request, testCase.center, testCase.radiusKm);
					expect(body.data?.slugs, `${testCase.key} item missing from the results`).toContain(slug);
					const distance = body.data?.distances?.[slug];
					expect(typeof distance, `${testCase.key} distance`).toBe('number');
					expect(
						Math.abs((distance as number) - testCase.distanceKm),
						`${testCase.key} distance`
					).toBeLessThan(1);
					expect(distance as number).toBeLessThanOrEqual(testCase.radiusKm);
				});
			}

			await test.step('results still honour the radius', async () => {
				// From the date-line centre, the items in Paris and the far north are thousands of km away
				const body = await search(request, CASES[1].center, CASES[1].radiusKm);
				expect(body.data?.slugs).not.toContain(slugOf('mid-latitude'));
				expect(body.data?.slugs).not.toContain(slugOf('north-pole'));
				for (const distance of Object.values(body.data?.distances ?? {})) {
					expect(distance).toBeLessThanOrEqual(CASES[1].radiusKm);
				}
			});
		} finally {
			for (const slug of created) {
				const response = await request.delete(`${ITEMS_PATH}/${encodeURIComponent(slug)}`);
				expect.soft(response.status(), `DELETE ${ITEMS_PATH}/${slug}`).toBe(200);
			}
		}
	});
});
