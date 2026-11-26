import { test, expect, type APIRequestContext } from '@playwright/test';

/**
 * Contract for the radius branch of `GET /api/location/search`
 * (`apps/web/app/api/location/search/route.ts`, parsed by
 * `apps/web/lib/utils/location-search-params.ts`, T-2826).
 *
 * - The values the filter UI sends keep working: `hooks/use-location-items.ts`
 *   writes `near_lat` / `near_lng` / `radius` with `Number#toString` (so tiny
 *   values come out as `1e-7`), and the radius slider and the admin default both
 *   stay in 10..500 km.
 * - A centre outside -90..90 / -180..180, an infinite value, or a value with
 *   trailing junk is a 400 `Invalid coordinates`. A radius that is not a positive
 *   finite number is a 400 `Invalid radius`. A radius above the cap is capped,
 *   not rejected.
 * - A very long malformed value is rejected without a server error.
 *
 * The route answers 404 before it reads the query when the location feature is
 * off, which is the default for the CI content stub. Every test skips in that
 * case. Public route: no storage state is needed.
 */
const SEARCH = '/api/location/search';

async function skipWhenLocationDisabled(request: APIRequestContext): Promise<void> {
	const probe = await request.get(`${SEARCH}?near_lat=0&near_lng=0`);
	test.skip(probe.status() === 404, 'Location features are disabled in this deployment');
}

function query(params: Record<string, string>): string {
	return `${SEARCH}?${new URLSearchParams(params).toString()}`;
}

test.describe('API: /api/location/search radius validation', () => {
	test('accepts the coordinates and radii the filter UI sends', async ({ request }) => {
		await skipWhenLocationDisabled(request);

		const accepted: Array<Record<string, string>> = [
			{ near_lat: (48.8566).toString(), near_lng: (2.3522).toString(), radius: (50).toString() },
			{ near_lat: (-33.8688).toString(), near_lng: (151.2093).toString(), radius: '10' },
			{ near_lat: '40.7128', near_lng: '-74.006', radius: '500' },
			{ near_lat: (1e-7).toString(), near_lng: (-2.5e-7).toString(), radius: '10' },
			{ near_lat: '90', near_lng: '180', radius: '10' },
			{ near_lat: '-90', near_lng: '-180', radius: '10' },
			{ near_lat: '0', near_lng: '0' },
			{ near_lat: '48.85', near_lng: '2.35', radius: '2.5' },
			{ near_lat: '48.85', near_lng: '2.35', radius: '1e12' }
		];

		for (const params of accepted) {
			const path = query(params);
			const response = await request.get(path);
			expect(response.status(), `${path} should be accepted`).toBe(200);
			const body = (await response.json()) as {
				success?: boolean;
				data?: { slugs?: unknown; distances?: unknown };
			};
			expect(body.success, path).toBe(true);
			expect(Array.isArray(body.data?.slugs), path).toBe(true);
			expect(typeof body.data?.distances, path).toBe('object');
		}
	});

	test('rejects an out-of-range, infinite or partly numeric centre with 400', async ({ request }) => {
		await skipWhenLocationDisabled(request);

		const rejected: Array<[string, string]> = [
			['95', '10'],
			['-90.5', '10'],
			['10', '500'],
			['10', '-181'],
			['Infinity', '10'],
			['1e999', '10'],
			['95abc', '10'],
			['10', '0x10'],
			['NaN', '10']
		];

		for (const [nearLat, nearLng] of rejected) {
			const path = query({ near_lat: nearLat, near_lng: nearLng, radius: '10' });
			const response = await request.get(path);
			expect(response.status(), `${path} should be rejected`).toBe(400);
			expect(await response.json(), path).toEqual({ error: 'Invalid coordinates' });
		}
	});

	test('rejects a radius that is not a positive finite number with 400', async ({ request }) => {
		await skipWhenLocationDisabled(request);

		for (const radius of ['0', '-5', '10km', 'Infinity', 'abc']) {
			const path = query({ near_lat: '48.85', near_lng: '2.35', radius });
			const response = await request.get(path);
			expect(response.status(), `${path} should be rejected`).toBe(400);
			expect(await response.json(), path).toEqual({ error: 'Invalid radius' });
		}
	});

	test('rejects a very long malformed coordinate without a server error', async ({ request }) => {
		await skipWhenLocationDisabled(request);

		const path = query({ near_lat: `${'1'.repeat(8_000)}x`, near_lng: '2.35', radius: '10' });
		const response = await request.get(path);
		expect(response.status()).toBe(400);
		expect(await response.json()).toEqual({ error: 'Invalid coordinates' });
	});
});
