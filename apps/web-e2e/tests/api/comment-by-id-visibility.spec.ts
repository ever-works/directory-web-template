import { resolve } from 'path';
import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../../helpers/test-data';

/**
 * `GET /api/items/{slug}/comments/rating/{commentId}` answers only for a comment the public list
 * of that item shows (T-2856).
 *
 * The route needs no session and comment ids are public (the comments list returns them). It
 * read the comment by id alone, soft-deleted rows included, ignored the slug and answered with the
 * raw row, so anyone who saw a comment id could still read it after its author deleted it, through
 * any slug, and after its item was rejected.
 *
 * As the admin (storage state from global-setup.ts) the spec creates two approved items. As the
 * client user from global-setup.ts it posts two comments on the first one. With a request context
 * that has no cookies it reads the first comment by id (the control: 200, the same object as its
 * row in the comments list), then through the second item's slug and an unknown slug (404). The
 * client deletes the first comment and it reads it again (404). The admin rejects the first item
 * and the second comment, which answered 200 just before, answers 404. The items and the second
 * comment are deleted at the end.
 */
const ITEMS_PATH = '/api/admin/items';
const NOT_FOUND = { error: 'Comment not found' };

test.describe('API: GET comment by id hides deleted comments and comments of unpublished items', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	test('a deleted comment, a wrong slug and a rejected item answer 404', async ({ request, playwright, baseURL }) => {
		// Two creates, a review and two deletes as the admin, each first request compiling in dev
		test.setTimeout(240_000);

		// The first request to a route compiles it in dev, which can take longer than the 30 s default
		const anonymous = await playwright.request.newContext({
			baseURL,
			storageState: { cookies: [], origins: [] },
			timeout: 90_000
		});
		// The client user from global-setup.ts has a client profile, which comments need
		const client = await playwright.request.newContext({
			baseURL,
			storageState: resolve(__dirname, '../..', CLIENT_STATE_FILE),
			timeout: 90_000
		});
		const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		const commented = { slug: `e2e-t2856-commented-${suffix}`, name: `E2E T-2856 commented ${suffix}` };
		const other = { slug: `e2e-t2856-other-${suffix}`, name: `E2E T-2856 other ${suffix}` };
		const created: string[] = [];
		const live: string[] = [];

		const byId = (slug: string, id: string) => anonymous.get(`/api/items/${slug}/comments/rating/${id}`);

		try {
			await test.step('create two approved items as the admin', async () => {
				for (const item of [commented, other]) {
					const response = await request.post(ITEMS_PATH, {
						data: {
							// The DELETE route finds the item by id, so id and slug match
							id: item.slug,
							slug: item.slug,
							name: item.name,
							description: 'Comment by id visibility fixture',
							source_url: `https://example.com/${item.slug}`,
							category: ['productivity'],
							tags: ['e2e'],
							status: 'approved'
						}
					});
					expect(response.status(), `POST ${ITEMS_PATH} ${item.slug}`).toBe(201);
					created.push(item.slug);
				}
			});

			const [deleted, kept] = await test.step('the client posts two comments on the first item', async () => {
				const ids: string[] = [];
				for (const [index, content] of [`E2E T-2856 deleted ${suffix}`, `E2E T-2856 kept ${suffix}`].entries()) {
					const response = await client.post(`/api/items/${commented.slug}/comments`, {
						data: { content, rating: 3 + index }
					});
					expect(response.status(), `POST comments ${commented.slug}`).toBe(200);
					const id = (await response.json())?.comment?.id;
					expect(typeof id, 'the created comment has an id').toBe('string');
					ids.push(id);
					live.push(id);
				}
				return ids;
			});

			await test.step('a live comment answers through its own slug with the comments list fields', async () => {
				const list = await (await anonymous.get(`/api/items/${commented.slug}/comments`)).json();
				const row = list.comments.find((comment: { id: string }) => comment.id === deleted);
				expect(row, 'the comments list shows the comment').toBeTruthy();

				const response = await byId(commented.slug, deleted);
				expect(response.status(), `GET comment ${deleted} on ${commented.slug}`).toBe(200);
				const body = await response.json();
				// The same object as the list row: the author's public profile, no column the list leaves out
				expect.soft(body, 'the comment by id is its comments list row').toEqual(row);
				expect.soft(body.user?.name, 'the comment carries its author name').toBe('E2E Test Client');
			});

			await test.step('the comment does not answer through another slug', async () => {
				const otherSlug = await byId(other.slug, deleted);
				expect.soft(otherSlug.status(), `GET comment ${deleted} on ${other.slug} (another public item)`).toBe(404);
				expect.soft(await otherSlug.json(), `GET comment ${deleted} on ${other.slug} body`).toEqual(NOT_FOUND);

				const unknown = `e2e-t2856-unknown-${suffix}`;
				const unknownSlug = await byId(unknown, deleted);
				expect.soft(unknownSlug.status(), `GET comment ${deleted} on ${unknown} (no item)`).toBe(404);
				expect.soft(await unknownSlug.json(), `GET comment ${deleted} on ${unknown} body`).toEqual(NOT_FOUND);
			});

			await test.step('a comment its author deleted answers 404', async () => {
				const remove = await client.delete(`/api/items/${commented.slug}/comments/${deleted}`);
				expect(remove.status(), `DELETE comment ${deleted}`).toBe(204);
				live.splice(live.indexOf(deleted), 1);

				const response = await byId(commented.slug, deleted);
				expect.soft(response.status(), `GET comment ${deleted} (deleted)`).toBe(404);
				expect.soft(await response.json(), `GET comment ${deleted} (deleted) body`).toEqual(NOT_FOUND);
			});

			await test.step('a comment on an item that was rejected answers 404', async () => {
				// Control: the other comment answers while the item is public
				const before = await byId(commented.slug, kept);
				expect(before.status(), `GET comment ${kept} (item approved)`).toBe(200);

				const review = await request.post(`${ITEMS_PATH}/${commented.slug}/review`, {
					data: { status: 'rejected', review_notes: 'E2E T-2856: rejected after it got a comment' }
				});
				expect(review.status(), `POST ${ITEMS_PATH}/${commented.slug}/review`).toBe(200);

				const after = await byId(commented.slug, kept);
				expect.soft(after.status(), `GET comment ${kept} (item rejected)`).toBe(404);
				expect.soft(await after.json(), `GET comment ${kept} (item rejected) body`).toEqual(NOT_FOUND);
			});
		} finally {
			for (const slug of created) {
				const response = await request.delete(`${ITEMS_PATH}/${encodeURIComponent(slug)}`);
				expect.soft(response.status(), `DELETE ${ITEMS_PATH}/${slug}`).toBe(200);
			}
			// The comment DELETE does not look the item up, so it works once the item is gone
			for (const id of live) {
				const response = await client.delete(`/api/items/${commented.slug}/comments/${id}`);
				expect.soft(response.status(), `DELETE comment ${id}`).toBe(204);
			}
			await client.dispose();
			await anonymous.dispose();
		}
	});
});
