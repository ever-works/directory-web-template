import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE } from '../../helpers/test-data';

/**
 * Draft, pending and rejected items stay off the public site (T-2846).
 *
 * `fetchItems` and `fetchItem` (apps/web/lib/content.ts) read every item YAML in the content data
 * folder, and client submissions (`pending`), admin drafts and rejected items are written to that
 * same folder. So an anonymous visitor got the page of an item nobody had approved, and saw it on
 * the home listing and on /map. Both now return approved (or status-less) items only.
 *
 * The spec creates one located item per status through `POST /api/admin/items` as the admin
 * (storage state from global-setup.ts), newest last, so the unpublished ones would lead the home
 * listing. With a request context that has no cookies it checks that only the approved item has
 * a page, and that no unpublished item is on the home listing or in the /map page (soft checks, so
 * a failure lists every leak). The items are deleted at the end.
 *
 * /map answers 404 when the location feature is off, the default for the CI content stub
 * (`.github/workflows/e2e.yml`); the map check then only confirms the route is gated.
 */
const ITEMS_PATH = '/api/admin/items';

type Status = 'approved' | 'rejected' | 'draft' | 'pending';

// Created in this order: the unpublished items are the newest, so they would be on page 1
const STATUSES: Status[] = ['approved', 'rejected', 'draft', 'pending'];

test.describe('Public: unpublished items are hidden from anonymous visitors', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	test('draft, pending and rejected items have no page and are not on the home listing or /map', async ({
		request,
		playwright,
		baseURL
	}) => {
		// Four creates, four deletes and six public page renders (each first one compiles in dev)
		test.slow();

		// The first request to a page compiles it in dev, which can take longer than the 30 s default
		const anonymous = await playwright.request.newContext({
			baseURL,
			storageState: { cookies: [], origins: [] },
			timeout: 90_000
		});
		const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		const fixtures = STATUSES.map((status, index) => ({
			status,
			slug: `e2e-t2846-${status}-${suffix}`,
			name: `E2E T-2846 ${status} ${suffix}`,
			location: {
				address: `${index + 1} E2E T-2846 Street ${suffix}`,
				city: `E2E T2846 ${status} city`,
				country: 'E2E',
				latitude: Number((-48.5 - 0.01 * index).toFixed(4)),
				longitude: Number((-123.1 - 0.01 * index).toFixed(4))
			}
		}));
		const approved = fixtures.find((fixture) => fixture.status === 'approved')!;
		const unpublished = fixtures.filter((fixture) => fixture.status !== 'approved');
		const created: string[] = [];

		try {
			await test.step('create one located item per status as the admin', async () => {
				for (const fixture of fixtures) {
					const response = await request.post(ITEMS_PATH, {
						data: {
							// The DELETE route finds the item by id, so id and slug match
							id: fixture.slug,
							slug: fixture.slug,
							name: fixture.name,
							description: `Public visibility fixture (${fixture.status})`,
							source_url: `https://example.com/${fixture.slug}`,
							category: ['productivity'],
							tags: ['e2e'],
							status: fixture.status,
							location: fixture.location
						}
					});
					expect(response.status(), `POST ${ITEMS_PATH} ${fixture.slug}`).toBe(201);
					created.push(fixture.slug);
				}
			});

			await test.step('only the approved item has a page', async () => {
				const page = await anonymous.get(`/items/${approved.slug}`);
				expect(page.status(), `/items/${approved.slug}`).toBe(200);
				expect(await page.text(), 'the approved item page shows the item').toContain(approved.name);

				for (const fixture of unpublished) {
					const response = await anonymous.get(`/items/${fixture.slug}`);
					expect.soft(response.status(), `/items/${fixture.slug} (${fixture.status})`).toBe(404);
					expect.soft(await response.text(), `/items/${fixture.slug} body`).not.toContain(fixture.name);
				}
			});

			await test.step('the home listing does not show the unpublished items', async () => {
				const home = await anonymous.get('/');
				expect(home.status(), 'GET /').toBe(200);
				const html = await home.text();
				expect(html, 'the home listing renders item cards').toContain('/items/');
				for (const fixture of unpublished) {
					expect.soft(html, `${fixture.status} item on the home listing`).not.toContain(fixture.slug);
					expect.soft(html, `${fixture.status} item name on the home listing`).not.toContain(fixture.name);
				}
			});

			await test.step('/map does not carry the unpublished items', async () => {
				const map = await anonymous.get('/map');
				expect([200, 404], 'GET /map').toContain(map.status());
				if (map.status() === 404) return; // location features are off: nothing is on a map
				const html = await map.text();
				for (const fixture of unpublished) {
					expect.soft(html, `${fixture.status} item on /map`).not.toContain(fixture.slug);
					expect.soft(html, `${fixture.status} item address on /map`).not.toContain(fixture.location.address);
				}
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
