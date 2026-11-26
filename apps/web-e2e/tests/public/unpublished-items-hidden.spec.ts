import { resolve } from 'path';
import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../../helpers/test-data';

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
 * a failure lists every leak). Then it assigns all four items to a new collection and checks that
 * /collections and the collection page carry no unpublished slug. The collection and the items are
 * deleted at the end.
 *
 * /map answers 404 when the location feature is off, the default for the CI content stub
 * (`.github/workflows/e2e.yml`); the map check then only confirms the route is gated.
 *
 * The per-item engagement APIs answer for an unpublished item as for an unknown one (T-2853).
 * They key their rows by the slug in the URL and looked no item up (the views route found any
 * item, whatever its status), so `POST /api/items/<draft>/views` counted a view where an unknown
 * slug got 404, and a signed-in user could comment on and vote for a draft. The spec posts a view
 * for each item with no session, then, as the client user from global-setup.ts, a comment and a
 * vote on the approved item (the control) and on the draft, and reads the draft's comments,
 * rating and votes back. Last, it rejects the approved item: the comment, rating and vote it got
 * while public no longer show. The comment and the votes are deleted at the end.
 */
const ITEMS_PATH = '/api/admin/items';

// The views route counts nothing for a bot, and its bot check matches Playwright's own
// User-Agent, so the view requests send a desktop browser's.
const BROWSER_HEADERS = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
};
const NOT_FOUND = { success: false, error: 'Item not found' };

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
		// Four creates, four deletes, six public page renders and four engagement routes, each first
		// request compiling in dev: under `next dev` the run took 2.8 of the 3 minutes of test.slow()
		test.setTimeout(300_000);

		// The first request to a page compiles it in dev, which can take longer than the 30 s default
		const anonymous = await playwright.request.newContext({
			baseURL,
			storageState: { cookies: [], origins: [] },
			timeout: 90_000
		});
		// The client user from global-setup.ts has a client profile, which comments and votes need
		const client = await playwright.request.newContext({
			baseURL,
			storageState: resolve(__dirname, '../..', CLIENT_STATE_FILE),
			timeout: 90_000
		});
		const comments: { slug: string; id: string }[] = [];
		const voted: string[] = [];
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
		const collection = { id: `e2e-t2846-${suffix}`, name: `E2E T-2846 collection ${suffix}` };
		let collectionCreated = false;

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

			await test.step('the views API counts a view for the approved item only', async () => {
				const view = await anonymous.post(`/api/items/${approved.slug}/views`, { headers: BROWSER_HEADERS });
				expect(view.status(), `POST views ${approved.slug}`).toBe(200);
				// Not the bot branch: the view reached the item lookup
				expect(await view.json(), `POST views ${approved.slug} body`).toEqual({ success: true, counted: true });

				for (const fixture of unpublished) {
					const response = await anonymous.post(`/api/items/${fixture.slug}/views`, {
						headers: BROWSER_HEADERS
					});
					expect.soft(response.status(), `POST views ${fixture.slug} (${fixture.status})`).toBe(404);
					expect.soft(await response.json(), `POST views ${fixture.slug} body`).toEqual(NOT_FOUND);
				}
			});

			await test.step('a signed-in user cannot comment on or vote for the draft', async () => {
				const draft = unpublished.find((fixture) => fixture.status === 'draft')!;
				const content = `E2E T-2853 comment ${suffix}`;

				async function comment(slug: string) {
					const response = await client.post(`/api/items/${slug}/comments`, { data: { content, rating: 4 } });
					const body = await response.json();
					if (body?.comment?.id) comments.push({ slug, id: body.comment.id });
					return { status: response.status(), body };
				}
				async function vote(slug: string) {
					const response = await client.post(`/api/items/${slug}/votes`, { data: { type: 'up' } });
					if (response.ok()) voted.push(slug);
					return { status: response.status(), body: await response.json() };
				}

				// Control: the same user may comment on and vote for the approved item
				const approvedComment = await comment(approved.slug);
				expect(approvedComment.status, `POST comments ${approved.slug}`).toBe(200);
				const approvedVote = await vote(approved.slug);
				expect(approvedVote.status, `POST votes ${approved.slug}`).toBe(200);
				expect(approvedVote.body, `POST votes ${approved.slug} body`).toMatchObject({
					count: 1,
					userVote: 'up'
				});
				const approvedComments = await (await anonymous.get(`/api/items/${approved.slug}/comments`)).json();
				expect(
					approvedComments.comments.map((row: { content: string }) => row.content),
					`GET comments ${approved.slug}`
				).toContain(content);

				const draftComment = await comment(draft.slug);
				expect.soft(draftComment.status, `POST comments ${draft.slug} (draft)`).toBe(404);
				expect.soft(draftComment.body, `POST comments ${draft.slug} body`).toEqual(NOT_FOUND);
				const draftVote = await vote(draft.slug);
				expect.soft(draftVote.status, `POST votes ${draft.slug} (draft)`).toBe(404);
				expect.soft(draftVote.body, `POST votes ${draft.slug} body`).toEqual(NOT_FOUND);

				// Nothing about the draft can be read back: no comment, no rating, no vote
				const draftComments = await client.get(`/api/items/${draft.slug}/comments`);
				expect.soft(await draftComments.json(), `GET comments ${draft.slug}`).toEqual({
					success: true,
					comments: []
				});
				const draftRating = await client.get(`/api/items/${draft.slug}/comments/rating`);
				expect.soft(await draftRating.json(), `GET comments/rating ${draft.slug}`).toEqual({
					averageRating: 0,
					totalRatings: 0
				});
				const draftVotes = await client.get(`/api/items/${draft.slug}/votes`);
				expect.soft(await draftVotes.json(), `GET votes ${draft.slug}`).toEqual({
					success: true,
					count: 0,
					userVote: null
				});
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

			await test.step('a collection does not carry the unpublished items', async () => {
				// The admin "assign items" action stores every slug it is given in collections.yml,
				// unpublished ones included, and the collection pages pass that list to the browser.
				const createCollection = await request.post('/api/admin/collections', {
					data: { id: collection.id, name: collection.name, description: 'Public visibility fixture' }
				});
				expect(createCollection.status(), 'POST /api/admin/collections').toBe(201);
				collectionCreated = true;
				const assign = await request.post(`/api/admin/collections/${collection.id}/items`, {
					data: { itemIds: fixtures.map((fixture) => fixture.slug) }
				});
				expect(assign.status(), `POST /api/admin/collections/${collection.id}/items`).toBe(200);

				for (const path of ['/collections', `/collections/${collection.id}`]) {
					const response = await anonymous.get(path);
					expect(response.status(), `GET ${path}`).toBe(200);
					const html = await response.text();
					// Control: the page carries the collection's item slugs at all
					expect(html, `${path} carries the approved item`).toContain(approved.slug);
					for (const fixture of unpublished) {
						expect.soft(html, `${fixture.status} item on ${path}`).not.toContain(fixture.slug);
					}
				}
			});

			await test.step('the approved item shows no comment, rating or vote once it is rejected', async () => {
				// The comment and the vote were left while the item was public (the control above read
				// them back). The draft's reads cannot show this: its writes are refused first.
				const review = await request.post(`${ITEMS_PATH}/${approved.slug}/review`, {
					data: { status: 'rejected', review_notes: 'E2E T-2853: rejected after it got a comment and a vote' }
				});
				expect(review.status(), `POST ${ITEMS_PATH}/${approved.slug}/review`).toBe(200);

				const rejectedComments = await client.get(`/api/items/${approved.slug}/comments`);
				expect.soft(await rejectedComments.json(), `GET comments ${approved.slug} (rejected)`).toEqual({
					success: true,
					comments: []
				});
				const rejectedRating = await client.get(`/api/items/${approved.slug}/comments/rating`);
				expect.soft(await rejectedRating.json(), `GET comments/rating ${approved.slug} (rejected)`).toEqual({
					averageRating: 0,
					totalRatings: 0
				});
				const rejectedVotes = await client.get(`/api/items/${approved.slug}/votes`);
				expect.soft(await rejectedVotes.json(), `GET votes ${approved.slug} (rejected)`).toEqual({
					success: true,
					count: 0,
					userVote: null
				});
			});
		} finally {
			if (collectionCreated) {
				const response = await request.delete(`/api/admin/collections/${collection.id}`);
				expect.soft(response.status(), `DELETE /api/admin/collections/${collection.id}`).toBe(200);
			}
			for (const slug of created) {
				const response = await request.delete(`${ITEMS_PATH}/${encodeURIComponent(slug)}`);
				expect.soft(response.status(), `DELETE ${ITEMS_PATH}/${slug}`).toBe(200);
			}
			// Neither DELETE looks the item up, so they work once the items are gone
			for (const { slug, id } of comments) {
				const response = await client.delete(`/api/items/${slug}/comments/${id}`);
				expect.soft(response.status(), `DELETE comment ${id} on ${slug}`).toBe(204);
			}
			for (const slug of voted) {
				const response = await client.delete(`/api/items/${slug}/votes`);
				expect.soft(response.status(), `DELETE votes ${slug}`).toBe(200);
			}
			await client.dispose();
			await anonymous.dispose();
		}
	});
});
