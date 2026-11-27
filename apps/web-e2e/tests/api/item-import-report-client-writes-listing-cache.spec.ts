import { resolve } from 'path';
import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../../helpers/test-data';

/**
 * Item import, report removal and client item writes clear the public listing at once (T-2872).
 *
 * `fetchItems` (apps/web/lib/content.ts) keeps the public listing in memory for 10 minutes outside
 * `next dev`, and the listing pages, `GET /api/items/listing` and `GET /api/items/engagement` read
 * it. T-2865 made the admin item routes clear it after a write; these writes still cleared nothing:
 * `POST /api/admin/items/import` (approved rows, or the update strategy on approved items), a
 * report resolved as content removed (`PUT /api/admin/reports/{id}`), and a client's `PUT` and
 * `DELETE /api/client/items/{id}` and `POST .../restore`. So for up to 10 minutes the listing left
 * out imported items, showed an imported item's old name, and kept an item that was removed,
 * deleted or moved back to pending by its owner's edit (a card linking to a 404). They now call
 * `invalidateContentCaches()` after a successful write.
 *
 * Before each write the spec updates a collection of its own (`PUT /api/admin/collections/{id}`,
 * which already cleared the listing), then reads `GET /api/items/listing` with no session: that
 * read rebuilds the listing from the files and leaves it in memory, and a hard check confirms what
 * it holds. Then it writes and reads the listing again at once. Every item name carries a term
 * unique to the run, and the listing is searched for it (`q=`), so only this run's items count.
 * As the admin (storage state from global-setup.ts): import an approved row, then import it again
 * with the update strategy and a new name. As the client user from global-setup.ts: submit an item
 * (the admin approves it, which T-2865 made clear the listing), edit it, delete it, restore it, and
 * report it; the admin resolves the report as content removed. The checks after the writes are
 * soft, so a failure lists every stale step. The collection and any item left are deleted at the
 * end.
 *
 * The listing is cached only outside `next dev` (NODE_ENV=development turns the cache off), so the
 * spec shows the bug only against a production build: e2e.yml runs `next build` + `next start`
 * (CI=true), and so must a local run. Under `next dev` it passes before and after the fix.
 */
const ITEMS_PATH = '/api/admin/items';
const IMPORT_PATH = '/api/admin/items/import';
const COLLECTIONS_PATH = '/api/admin/collections';
const CLIENT_ITEMS_PATH = '/api/client/items';

type Listed = { slug: string; name: string };

test.describe('API: item import, report removal and client item writes clear the public listing cache', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	test('import, update import, client edit, delete and restore, and report removal show in /api/items/listing at once', async ({
		request,
		playwright,
		baseURL
	}) => {
		// About twenty writes and fourteen listing reads; the first request to each route compiles it
		// under `next dev`
		test.setTimeout(360_000);

		const anonymous = await playwright.request.newContext({
			baseURL,
			storageState: { cookies: [], origins: [] },
			timeout: 90_000
		});
		// The client user from global-setup.ts has a client profile, which reports need
		const client = await playwright.request.newContext({
			baseURL,
			storageState: resolve(__dirname, '../..', CLIENT_STATE_FILE),
			timeout: 90_000
		});
		const term = `t2872-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		const imported = { slug: `e2e-${term}-imported`, name: `E2E imported ${term}` };
		const renamed = `E2E imported renamed ${term}`;
		const collection = { id: `e2e-${term}`, name: `E2E T-2872 collection ${term}` };
		const created = new Set<string>();
		let collectionCreated = false;
		let refreshes = 0;

		/** This run's items on the public listing, read with no session. */
		async function listed(): Promise<Listed[]> {
			const response = await anonymous.get(`/api/items/listing?lang=en&q=${encodeURIComponent(term)}`);
			expect(response.status(), 'GET /api/items/listing').toBe(200);
			const body = (await response.json()) as { items: Listed[] };
			return body.items.map(({ slug, name }) => ({ slug, name })).sort((a, b) => a.slug.localeCompare(b.slug));
		}

		/**
		 * Clears the listing through the collection route (it did so before the fix too), then reads
		 * it: the listing is rebuilt from the files and stays in memory for the next write.
		 */
		async function freshListing(): Promise<Listed[]> {
			refreshes += 1;
			const response = await request.put(`${COLLECTIONS_PATH}/${collection.id}`, {
				data: { description: `Listing cache fixture, refresh ${refreshes}` }
			});
			expect(response.status(), `PUT ${COLLECTIONS_PATH}/${collection.id}`).toBe(200);
			return listed();
		}

		async function runImport(name: string, duplicateStrategy: 'skip' | 'update') {
			const response = await request.post(IMPORT_PATH, {
				data: {
					// A row as the validate step returns it
					rows: [
						{
							rowIndex: 0,
							valid: true,
							errors: [],
							warnings: [],
							data: {
								name,
								slug: imported.slug,
								description: 'Listing cache fixture (imported)',
								source_url: `https://example.com/${imported.slug}`,
								category: ['productivity'],
								tags: ['e2e'],
								collections: [],
								featured: false,
								images: []
							}
						}
					],
					options: { duplicateStrategy, defaultStatus: 'approved' }
				}
			});
			expect(response.status(), `POST ${IMPORT_PATH} (${duplicateStrategy})`).toBe(200);
			return ((await response.json()) as { result: { created: number; updated: number } }).result;
		}

		async function approve(id: string) {
			const response = await request.post(`${ITEMS_PATH}/${id}/review`, { data: { status: 'approved' } });
			expect(response.status(), `POST ${ITEMS_PATH}/${id}/review approved`).toBe(200);
		}

		try {
			const createCollection = await request.post(COLLECTIONS_PATH, {
				data: { id: collection.id, name: collection.name, description: 'Listing cache fixture' }
			});
			expect(createCollection.status(), `POST ${COLLECTIONS_PATH}`).toBe(201);
			collectionCreated = true;

			await test.step('an item an admin imports as approved is on the listing at once', async () => {
				expect(await freshListing(), 'listing before the import').toEqual([]);
				const result = await runImport(imported.name, 'skip');
				expect(result, 'import result').toMatchObject({ created: 1, updated: 0 });
				created.add(imported.slug);
				expect
					.soft(await listed(), 'listing right after the import')
					.toEqual([{ slug: imported.slug, name: imported.name }]);
			});

			await test.step('an item the update strategy renames shows its new name at once', async () => {
				expect(await freshListing(), 'listing before the update import').toEqual([
					{ slug: imported.slug, name: imported.name }
				]);
				const result = await runImport(renamed, 'update');
				expect(result, 'update import result').toMatchObject({ created: 0, updated: 1 });
				expect
					.soft(await listed(), 'listing right after the update import')
					.toEqual([{ slug: imported.slug, name: renamed }]);
			});

			// The imported item is done with: drop it so only the client item counts from here on
			const removeImported = await request.delete(`${ITEMS_PATH}/${imported.slug}`);
			expect(removeImported.status(), `DELETE ${ITEMS_PATH}/${imported.slug}`).toBe(200);
			created.delete(imported.slug);

			const owned = await test.step('the client submits an item and the admin approves it', async () => {
				const response = await client.post(CLIENT_ITEMS_PATH, {
					data: {
						name: `E2E client ${term}`,
						description: 'Listing cache fixture (client item)',
						source_url: `https://example.com/e2e-${term}-client`,
						category: ['productivity'],
						tags: ['e2e']
					}
				});
				expect(response.status(), `POST ${CLIENT_ITEMS_PATH}`).toBe(201);
				const item = ((await response.json()) as { item: Listed & { id: string } }).item;
				created.add(item.id);
				await approve(item.id);
				expect(await listed(), 'listing after the approval').toEqual([{ slug: item.slug, name: item.name }]);
				return { id: item.id, slug: item.slug, name: item.name };
			});
			const ownedListed = [{ slug: owned.slug, name: owned.name }];

			await test.step('an approved item its owner edits leaves the listing at once (it is pending again)', async () => {
				expect(await freshListing(), 'listing before the client edit').toEqual(ownedListed);
				const response = await client.put(`${CLIENT_ITEMS_PATH}/${owned.id}`, {
					data: { description: 'Listing cache fixture (client item, edited)' }
				});
				expect(response.status(), `PUT ${CLIENT_ITEMS_PATH}/${owned.id}`).toBe(200);
				expect(((await response.json()) as { statusChanged: boolean }).statusChanged, 'moved to pending').toBe(
					true
				);
				expect.soft(await listed(), 'listing right after the client edit').toEqual([]);
			});

			await test.step('an approved item its owner deletes leaves the listing at once', async () => {
				await approve(owned.id);
				expect(await freshListing(), 'listing before the client delete').toEqual(ownedListed);
				const response = await client.delete(`${CLIENT_ITEMS_PATH}/${owned.id}`);
				expect(response.status(), `DELETE ${CLIENT_ITEMS_PATH}/${owned.id}`).toBe(200);
				expect.soft(await listed(), 'listing right after the client delete').toEqual([]);
			});

			await test.step('an approved item its owner restores is back on the listing at once', async () => {
				expect(await freshListing(), 'listing before the client restore').toEqual([]);
				const response = await client.post(`${CLIENT_ITEMS_PATH}/${owned.id}/restore`);
				expect(response.status(), `POST ${CLIENT_ITEMS_PATH}/${owned.id}/restore`).toBe(200);
				expect.soft(await listed(), 'listing right after the client restore').toEqual(ownedListed);
			});

			await test.step('an item removed through a report leaves the listing at once', async () => {
				expect(await freshListing(), 'listing before the report removal').toEqual(ownedListed);
				const report = await client.post('/api/reports', {
					data: { contentType: 'item', contentId: owned.id, reason: 'spam', details: 'E2E T-2872 fixture' }
				});
				expect(report.status(), 'POST /api/reports').toBe(200);
				const reportId = ((await report.json()) as { report: { id: string } }).report.id;

				const resolveReport = await request.put(`/api/admin/reports/${reportId}`, {
					data: { status: 'resolved', resolution: 'content_removed', reviewNote: 'E2E T-2872: removed' }
				});
				expect(resolveReport.status(), `PUT /api/admin/reports/${reportId}`).toBe(200);
				expect(
					((await resolveReport.json()) as { moderationResult: { success: boolean } }).moderationResult,
					'content removed'
				).toMatchObject({ success: true });
				created.delete(owned.id);
				expect.soft(await listed(), 'listing right after the report removal').toEqual([]);
			});
		} finally {
			for (const id of created) {
				await request.delete(`${ITEMS_PATH}/${id}`).catch(() => undefined);
			}
			if (collectionCreated) {
				await request.delete(`${COLLECTIONS_PATH}/${collection.id}`).catch(() => undefined);
			}
			await anonymous.dispose();
			await client.dispose();
		}
	});
});
