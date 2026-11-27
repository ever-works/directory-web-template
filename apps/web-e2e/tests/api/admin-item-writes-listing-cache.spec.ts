import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE } from '../../helpers/test-data';

/**
 * Admin item writes clear the public listing at once (T-2865).
 *
 * `fetchItems` (apps/web/lib/content.ts) keeps the public listing in memory for 10 minutes outside
 * `next dev`, and the listing pages, `GET /api/items/listing` and `GET /api/items/engagement` read
 * it. The admin item routes wrote the item file and cleared nothing, so after an admin rejected or
 * deleted an approved item its page answered 404 at once while the listing kept showing it until
 * the next content sync or the end of the TTL, and a new or newly approved item was missing from
 * the listing for as long. The routes now call `invalidateContentCaches()` after a successful
 * write, as the category, tag and collection admin routes do.
 *
 * Before each item write the spec updates a collection of its own (`PUT
 * /api/admin/collections/{id}`, which already cleared the listing), then reads `GET
 * /api/items/listing` with no session: that read rebuilds the listing from the files and leaves
 * it in memory, and a hard check confirms what it holds. Then it writes as the admin (storage
 * state from global-setup.ts) and reads the listing again at once. Every item name carries a term
 * unique to the run, and the listing is searched for it (`q=`), so only this run's items count.
 * Single routes: create an approved item, reject it with `POST .../review`, approve it again with
 * `PUT`, delete it. Bulk route: create a pending item (not public), approve it, delete it. The
 * checks after the writes are soft, so a failure lists every stale step. The collection and any
 * item left are deleted at the end.
 *
 * The listing is cached only outside `next dev` (NODE_ENV=development turns the cache off), so
 * the spec shows the bug only against a production build: e2e.yml runs `next build` + `next start`
 * (CI=true), and so must a local run. Under `next dev` it passes before and after the fix.
 */
const ITEMS_PATH = '/api/admin/items';
const BULK_PATH = '/api/admin/items/bulk';
const COLLECTIONS_PATH = '/api/admin/collections';
const REJECTION_NOTES = 'E2E T-2865: not a fit for this directory';

test.describe('API: admin item writes clear the public listing cache', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	test('create, review, update, delete and bulk approve and delete show in /api/items/listing at once', async ({
		request,
		playwright,
		baseURL
	}) => {
		// Fifteen admin writes and twelve listing reads; the first request to each route compiles it
		// under `next dev`
		test.setTimeout(300_000);

		const anonymous = await playwright.request.newContext({
			baseURL,
			storageState: { cookies: [], origins: [] },
			timeout: 90_000
		});
		const term = `t2865-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		const single = { slug: `e2e-${term}-single`, name: `E2E single ${term}` };
		const bulk = { slug: `e2e-${term}-bulk`, name: `E2E bulk ${term}` };
		const collection = { id: `e2e-${term}`, name: `E2E T-2865 collection ${term}` };
		const created = new Set<string>();
		let collectionCreated = false;
		let refreshes = 0;

		/** The slugs of this run's items on the public listing, read with no session. */
		async function listed(): Promise<string[]> {
			const response = await anonymous.get(`/api/items/listing?lang=en&q=${encodeURIComponent(term)}`);
			expect(response.status(), 'GET /api/items/listing').toBe(200);
			const body = (await response.json()) as { items: { slug: string }[] };
			return body.items.map((item) => item.slug).sort();
		}

		/**
		 * Clears the listing through the collection route (it did so before the fix too), then reads
		 * it: the listing is rebuilt from the files and stays in memory for the next write.
		 */
		async function freshListing(): Promise<string[]> {
			refreshes += 1;
			const response = await request.put(`${COLLECTIONS_PATH}/${collection.id}`, {
				data: { description: `Listing cache fixture, refresh ${refreshes}` }
			});
			expect(response.status(), `PUT ${COLLECTIONS_PATH}/${collection.id}`).toBe(200);
			return listed();
		}

		async function create(fixture: { slug: string; name: string }, status: 'approved' | 'pending') {
			const response = await request.post(ITEMS_PATH, {
				data: {
					// The id routes find the item by id, so id and slug match
					id: fixture.slug,
					slug: fixture.slug,
					name: fixture.name,
					description: `Listing cache fixture (${status})`,
					source_url: `https://example.com/${fixture.slug}`,
					category: ['productivity'],
					tags: ['e2e'],
					status
				}
			});
			expect(response.status(), `POST ${ITEMS_PATH} ${fixture.slug}`).toBe(201);
			created.add(fixture.slug);
		}

		async function bulkAction(action: 'approve' | 'delete', slug: string) {
			const response = await request.post(BULK_PATH, { data: { action, ids: [slug] } });
			expect(response.status(), `POST ${BULK_PATH} ${action}`).toBe(200);
			const body = (await response.json()) as { summary: { successful: number; failed: number } };
			expect(body.summary, `POST ${BULK_PATH} ${action} summary`).toMatchObject({ successful: 1, failed: 0 });
			if (action === 'delete') created.delete(slug);
		}

		try {
			const createCollection = await request.post(COLLECTIONS_PATH, {
				data: { id: collection.id, name: collection.name, description: 'Listing cache fixture' }
			});
			expect(createCollection.status(), `POST ${COLLECTIONS_PATH}`).toBe(201);
			collectionCreated = true;

			await test.step('a created approved item is on the listing at once', async () => {
				expect(await freshListing(), 'listing before the create').toEqual([]);
				await create(single, 'approved');
				expect.soft(await listed(), 'listing right after the create').toEqual([single.slug]);
			});

			await test.step('a rejected item leaves the listing at once', async () => {
				expect(await freshListing(), 'listing before the reject').toEqual([single.slug]);
				const response = await request.post(`${ITEMS_PATH}/${single.slug}/review`, {
					data: { status: 'rejected', review_notes: REJECTION_NOTES }
				});
				expect(response.status(), 'POST review rejected').toBe(200);
				expect.soft(await listed(), 'listing right after the reject').toEqual([]);
			});

			await test.step('an item approved again with PUT is back on the listing at once', async () => {
				expect(await freshListing(), 'listing before the update').toEqual([]);
				const response = await request.put(`${ITEMS_PATH}/${single.slug}`, { data: { status: 'approved' } });
				expect(response.status(), 'PUT status approved').toBe(200);
				expect.soft(await listed(), 'listing right after the update').toEqual([single.slug]);
			});

			await test.step('a deleted item leaves the listing at once', async () => {
				expect(await freshListing(), 'listing before the delete').toEqual([single.slug]);
				const response = await request.delete(`${ITEMS_PATH}/${single.slug}`);
				expect(response.status(), `DELETE ${ITEMS_PATH}/${single.slug}`).toBe(200);
				created.delete(single.slug);
				expect.soft(await listed(), 'listing right after the delete').toEqual([]);
			});

			await test.step('a bulk approved item is on the listing at once, and leaves it on bulk delete', async () => {
				await create(bulk, 'pending');
				expect(await freshListing(), 'listing before the bulk approve (the item is pending)').toEqual([]);
				await bulkAction('approve', bulk.slug);
				expect.soft(await listed(), 'listing right after the bulk approve').toEqual([bulk.slug]);

				expect(await freshListing(), 'listing before the bulk delete').toEqual([bulk.slug]);
				await bulkAction('delete', bulk.slug);
				expect.soft(await listed(), 'listing right after the bulk delete').toEqual([]);
			});
		} finally {
			for (const slug of created) {
				await request.delete(`${ITEMS_PATH}/${slug}`).catch(() => undefined);
			}
			if (collectionCreated) {
				await request.delete(`${COLLECTIONS_PATH}/${collection.id}`).catch(() => undefined);
			}
			await anonymous.dispose();
		}
	});
});
