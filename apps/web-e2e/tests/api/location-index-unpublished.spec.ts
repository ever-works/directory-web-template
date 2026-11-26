import { test, expect, type APIRequestContext } from '@playwright/test';
import { ADMIN_STATE_FILE } from '../../helpers/test-data';

/**
 * Only approved items are in the public location index (T-2840, spec 063).
 *
 * `GET /api/location/coordinates`, `/api/location/search`, `/api/location/cities` and
 * `/api/location/countries` need no sign-in and answer from `item_location_index`, which has no
 * status column. The index took every item with a location, so an anonymous request returned the
 * slug, exact coordinates, city and country of draft, pending and rejected items.
 *
 * The spec creates one item per status near Point Nemo (no other spec puts an item there), each
 * with its own city and country, through `POST /api/admin/items` as the admin (storage state from
 * global-setup.ts). It checks, with a request context that has no cookies, that only the approved
 * item shows up. Then it changes the statuses: rejecting the approved item (review route) and
 * moving an approved item back to draft (`PUT`) take it out, approving the pending item (review
 * route) puts it in. The items are deleted at the end.
 *
 * The routes answer 404 when the location feature is off, the default for the CI content stub
 * (`.github/workflows/e2e.yml`), and the spec skips then; the items are only created when it is on.
 */
const ITEMS_PATH = '/api/admin/items';
const COORDINATES = '/api/location/coordinates';
const SEARCH = '/api/location/search';
const CITIES = '/api/location/cities';
const COUNTRIES = '/api/location/countries';

const CENTER = { latitude: -48.8767, longitude: -123.3933 };
const RADIUS_KM = 50;

type Status = 'draft' | 'pending' | 'rejected' | 'approved';

interface Fixture {
	status: Status;
	slug: string;
	city: string;
	country: string;
	latitude: number;
	longitude: number;
}

type CoordinateEntry = {
	slug: string;
	latitude: number;
	longitude: number;
	city: string | null;
	country: string | null;
};

async function getJson<T>(api: APIRequestContext, path: string): Promise<T> {
	const response = await api.get(path);
	expect(response.status(), `GET ${path}`).toBe(200);
	const body = (await response.json()) as { success?: boolean; data?: T };
	expect(body.success, `GET ${path}`).toBe(true);
	return body.data as T;
}

/** What an anonymous visitor can learn about the fixtures from the four public routes. */
async function publicView(api: APIRequestContext, fixtures: Fixture[]) {
	const coordinates = await getJson<CoordinateEntry[]>(api, COORDINATES);
	const radius = await getJson<{ slugs: string[] }>(
		api,
		`${SEARCH}?near_lat=${CENTER.latitude}&near_lng=${CENTER.longitude}&radius=${RADIUS_KM}`
	);
	const cities = await getJson<string[]>(api, CITIES);
	const countries = await getJson<string[]>(api, COUNTRIES);

	const seen: Record<string, string[]> = {};
	for (const fixture of fixtures) {
		const where: string[] = [];
		if (coordinates.some((entry) => entry.slug === fixture.slug)) where.push('coordinates slug');
		if (coordinates.some((entry) => entry.latitude === fixture.latitude && entry.longitude === fixture.longitude)) {
			where.push('coordinates lat/lng');
		}
		if (radius.slugs.includes(fixture.slug)) where.push('radius search');
		const byCity = await getJson<{ slugs: string[] }>(api, `${SEARCH}?city=${encodeURIComponent(fixture.city)}`);
		if (byCity.slugs.includes(fixture.slug)) where.push('city search');
		const byCountry = await getJson<{ slugs: string[] }>(
			api,
			`${SEARCH}?country=${encodeURIComponent(fixture.country)}`
		);
		if (byCountry.slugs.includes(fixture.slug)) where.push('country search');
		if (cities.includes(fixture.city)) where.push('cities');
		if (countries.includes(fixture.country)) where.push('countries');
		seen[fixture.slug] = where;
	}
	return seen;
}

const EVERYWHERE = [
	'coordinates slug',
	'coordinates lat/lng',
	'radius search',
	'city search',
	'country search',
	'cities',
	'countries'
];

test.describe('API: the public location index holds only approved items', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	test('draft, pending and rejected items stay out of coordinates, search, cities and countries', async ({
		request,
		playwright,
		baseURL
	}) => {
		const probe = await request.get(COORDINATES);
		test.skip(probe.status() === 404, 'Location features are disabled in this deployment');

		const anonymous = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
		const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		const statuses: Status[] = ['draft', 'pending', 'rejected', 'approved'];
		const fixtures: Fixture[] = statuses.map((status, index) => ({
			status,
			slug: `e2e-t2840-${status}-${suffix}`,
			city: `E2E T2840 ${status} city ${suffix}`,
			country: `E2E T2840 ${status} country ${suffix}`,
			latitude: Number((CENTER.latitude + 0.01 * (index + 1)).toFixed(4)),
			longitude: Number((CENTER.longitude + 0.01 * (index + 1)).toFixed(4))
		}));
		const bySlug = (status: Status) => fixtures.find((fixture) => fixture.status === status)!.slug;
		const expectView = async (expected: Record<string, string[]>, label: string) => {
			await expect
				.poll(() => publicView(anonymous, fixtures), { message: label, timeout: 15_000 })
				.toEqual(expected);
		};
		const created: string[] = [];

		try {
			await test.step('create one located item per status', async () => {
				for (const fixture of fixtures) {
					const response = await request.post(ITEMS_PATH, {
						data: {
							// The DELETE route removes the index row by id, so id and slug match
							id: fixture.slug,
							slug: fixture.slug,
							name: `E2E T-2840 ${fixture.status} ${suffix}`,
							description: `Location index visibility fixture (${fixture.status})`,
							source_url: `https://example.com/${fixture.slug}`,
							status: fixture.status,
							location: {
								latitude: fixture.latitude,
								longitude: fixture.longitude,
								city: fixture.city,
								country: fixture.country
							}
						}
					});
					expect(response.status(), `POST ${ITEMS_PATH} ${fixture.slug}`).toBe(201);
					created.push(fixture.slug);
				}
			});

			await test.step('an anonymous visitor sees only the approved item', async () => {
				await expectView(
					{
						[bySlug('draft')]: [],
						[bySlug('pending')]: [],
						[bySlug('rejected')]: [],
						[bySlug('approved')]: EVERYWHERE
					},
					'only the approved item is public after create'
				);
			});

			await test.step('rejecting the approved item and approving the pending one swap them', async () => {
				const reject = await request.post(`${ITEMS_PATH}/${bySlug('approved')}/review`, {
					data: { status: 'rejected', review_notes: 'E2E T-2840: the listing is not ready yet' }
				});
				expect(reject.status(), 'reject the approved item').toBe(200);
				const approve = await request.post(`${ITEMS_PATH}/${bySlug('pending')}/review`, {
					data: { status: 'approved' }
				});
				expect(approve.status(), 'approve the pending item').toBe(200);

				await expectView(
					{
						[bySlug('draft')]: [],
						[bySlug('pending')]: EVERYWHERE,
						[bySlug('rejected')]: [],
						[bySlug('approved')]: []
					},
					'the review moved the items in and out of the index'
				);
			});

			await test.step('moving the approved item back to draft takes it out', async () => {
				const update = await request.put(`${ITEMS_PATH}/${bySlug('pending')}`, { data: { status: 'draft' } });
				expect(update.status(), 'PUT status draft').toBe(200);

				await expectView(
					{
						[bySlug('draft')]: [],
						[bySlug('pending')]: [],
						[bySlug('rejected')]: [],
						[bySlug('approved')]: []
					},
					'a status change by PUT takes the item out of the index'
				);
			});
		} finally {
			for (const slug of created) {
				const response = await request.delete(`${ITEMS_PATH}/${encodeURIComponent(slug)}`);
				expect.soft(response.status(), `DELETE ${ITEMS_PATH}/${slug}`).toBe(200);
			}
			await anonymous.dispose();
		}
	});
});
