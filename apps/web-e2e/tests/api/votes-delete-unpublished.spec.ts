import { resolve } from 'path';
import { test, expect } from '@playwright/test';
import { ADMIN_STATE_FILE, CLIENT_STATE_FILE } from '../../helpers/test-data';

/**
 * `DELETE /api/items/[slug]/votes` answers for an unpublished item as for an unknown slug (T-2864).
 *
 * The route checked only the session and the client profile, removed the caller's vote and sent
 * back the item's net votes. So a signed-in user got `{ success: true, count, userVote: null }`
 * for a draft, pending, rejected or soft-deleted item, and a nonzero count showed that the
 * unpublished slug exists and what its score is, which `GET .../votes` and `GET .../votes/count`
 * no longer show (T-2853, T-2857). It now answers 404 `Item not found` for any slug that names no
 * public item, as `POST .../votes` does, and touches no vote.
 *
 * As the admin (storage state from global-setup.ts) the spec creates an approved item and a
 * draft. As the client user from global-setup.ts, who has a client profile, it votes for the
 * approved item (the control), then sends `DELETE .../votes` for an unknown slug and the draft,
 * and, once the admin has rejected the approved item, for that item: each answers 404 with no
 * count. Then the admin approves the item again: its vote is still there (the refused DELETE
 * removed nothing), and `DELETE .../votes` removes it and answers the new count. The items are
 * deleted at the end.
 */
const ITEMS_PATH = '/api/admin/items';
const NOT_FOUND = { success: false, error: 'Item not found' };

test.describe('API: DELETE /api/items/[slug]/votes answers only for a public item', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	test('an unknown slug, a draft and a rejected item answer 404 with no count, and the vote is kept', async ({
		request,
		playwright,
		baseURL
	}) => {
		// Two creates, three reviews, two deletes and the vote routes, each first request compiling in dev
		test.setTimeout(300_000);

		// The client user from global-setup.ts has a client profile, which votes need
		const client = await playwright.request.newContext({
			baseURL,
			storageState: resolve(__dirname, '../..', CLIENT_STATE_FILE),
			timeout: 90_000
		});
		const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
		const approved = `e2e-t2864-approved-${suffix}`;
		const draft = `e2e-t2864-draft-${suffix}`;
		const unknown = `e2e-t2864-unknown-${suffix}`;
		const created: string[] = [];
		let voted = false;

		async function review(slug: string, status: 'approved' | 'rejected') {
			const response = await request.post(`${ITEMS_PATH}/${slug}/review`, {
				data:
					status === 'rejected'
						? { status, review_notes: 'E2E T-2864: rejected after it got a vote' }
						: { status }
			});
			return response.status();
		}

		async function removeVote(slug: string) {
			const response = await client.delete(`/api/items/${slug}/votes`);
			return { status: response.status(), body: await response.json() };
		}

		try {
			await test.step('create an approved item and a draft as the admin', async () => {
				for (const [slug, status] of [
					[approved, 'approved'],
					[draft, 'draft']
				] as const) {
					const response = await request.post(ITEMS_PATH, {
						data: {
							// The admin DELETE route finds the item by id, so id and slug match
							id: slug,
							slug,
							name: `E2E T-2864 ${status} ${suffix}`,
							description: `Vote removal fixture (${status})`,
							source_url: `https://example.com/${slug}`,
							category: ['productivity'],
							tags: ['e2e'],
							status
						}
					});
					expect(response.status(), `POST ${ITEMS_PATH} ${slug}`).toBe(201);
					created.push(slug);
				}
			});

			await test.step('the client votes for the approved item', async () => {
				const response = await client.post(`/api/items/${approved}/votes`, { data: { type: 'up' } });
				expect(response.status(), `POST votes ${approved}`).toBe(200);
				voted = true;
				expect(await response.json(), `POST votes ${approved} body`).toMatchObject({
					success: true,
					count: 1,
					userVote: 'up'
				});
			});

			await test.step('an unknown slug and the draft answer 404 Item not found', async () => {
				const unknownAnswer = await removeVote(unknown);
				expect.soft(unknownAnswer.status, `DELETE votes ${unknown} (unknown)`).toBe(404);
				expect.soft(unknownAnswer.body, `DELETE votes ${unknown} body`).toEqual(NOT_FOUND);

				const draftAnswer = await removeVote(draft);
				expect.soft(draftAnswer.status, `DELETE votes ${draft} (draft)`).toBe(404);
				expect.soft(draftAnswer.body, `DELETE votes ${draft} body`).toEqual(NOT_FOUND);
			});

			await test.step('the approved item answers 404 with no count once it is rejected', async () => {
				expect(await review(approved, 'rejected'), `POST ${ITEMS_PATH}/${approved}/review rejected`).toBe(200);

				const rejected = await removeVote(approved);
				expect.soft(rejected.status, `DELETE votes ${approved} (rejected)`).toBe(404);
				expect.soft(rejected.body, `DELETE votes ${approved} body (rejected)`).toEqual(NOT_FOUND);
				expect
					.soft(rejected.body, `DELETE votes ${approved} (rejected) shows no count`)
					.not.toHaveProperty('count');
			});

			await test.step('approved again, the item still has the vote, and DELETE removes it', async () => {
				expect(await review(approved, 'approved'), `POST ${ITEMS_PATH}/${approved}/review approved`).toBe(200);

				const votes = await client.get(`/api/items/${approved}/votes`);
				expect(votes.status(), `GET votes ${approved}`).toBe(200);
				expect(await votes.json(), 'the refused DELETE removed no vote').toEqual({
					success: true,
					count: 1,
					userVote: 'up'
				});

				const removed = await removeVote(approved);
				expect(removed.status, `DELETE votes ${approved} (approved again)`).toBe(200);
				expect(removed.body, `DELETE votes ${approved} body (approved again)`).toEqual({
					success: true,
					count: 0,
					userVote: null
				});
				voted = false;
			});
		} finally {
			// A vote can only be removed while its item is public: approve the item again first
			if (voted && created.includes(approved)) {
				expect
					.soft(await review(approved, 'approved'), `POST ${ITEMS_PATH}/${approved}/review (cleanup)`)
					.toBe(200);
				const response = await client.delete(`/api/items/${approved}/votes`);
				expect.soft(response.status(), `DELETE votes ${approved} (cleanup)`).toBe(200);
			}
			for (const slug of created) {
				const response = await request.delete(`${ITEMS_PATH}/${encodeURIComponent(slug)}`);
				expect.soft(response.status(), `DELETE ${ITEMS_PATH}/${slug}`).toBe(200);
			}
			await client.dispose();
		}
	});
});
