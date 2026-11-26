import { test, expect, type APIRequestContext } from '@playwright/test';
import { ADMIN_STATE_FILE } from '../../helpers/test-data';

/**
 * The status and rejection-reason 400s of `PUT /api/admin/items/{id}`, sent as an admin
 * (`apps/web/app/api/admin/items/[id]/route.ts`, T-2809).
 *
 * #1193 and #1194 gave the route three rules that only source-wiring unit specs covered:
 *
 *   1. `status` must be one of `ITEM_STATUSES`, matched exactly, or the route answers 400
 *      before it reads the item. `published` would otherwise be stored as sent, and
 *      `Rejected` would skip the reason rule, which matches `rejected` exactly.
 *   2. Rejecting an item that is not rejected yet needs a `review_notes` reason of at least
 *      10 characters after trimming, as `POST /api/admin/items/{id}/review` does.
 *   3. `review_notes` sent for an item that stays rejected replaces the reason its submitter
 *      reads, so it cannot be blanked (`""`, `null`) or shortened (`"ok"`).
 *
 * Only requests that must fail are sent, and each case reads the item back to check that its
 * status and review_notes did not change, so the seeded items stay as they are for the other
 * admin specs (items-review.spec.ts approves or rejects the seeded pending item). A case whose
 * seeded item does not exist (the CI content stub has no rejected item) is skipped.
 */

const ITEMS_PATH = '/api/admin/items';
const ITEM_PATH = (id: string) => `${ITEMS_PATH}/${encodeURIComponent(id)}`;

/** No item has this id, so a 400 here proves the status rule answers before the item is read. */
const MISSING_ID = 'e2e-t2809-no-such-item';

const STATUS_ERROR = /^status must be one of: /;
// REJECTION_REASON_MIN_LENGTH in apps/web/lib/utils/review-notes.ts, pinned here so that lowering it fails the spec
const REASON_ERROR = /^Rejection reason is required \(minimum 10 characters\)$/;

type ItemRow = { id?: unknown; status?: unknown; review_notes?: unknown };
type ReviewState = { status: unknown; review_notes: unknown };

async function findItemId(request: APIRequestContext, status: 'pending' | 'rejected'): Promise<string | undefined> {
	const response = await request.get(`${ITEMS_PATH}?status=${status}`);
	expect(response.status(), `GET ${ITEMS_PATH}?status=${status} must serve an admin`).toBe(200);
	const body = (await response.json()) as { data?: ItemRow[] };
	const item = body.data?.find((row) => row.status === status && typeof row.id === 'string' && row.id !== '');
	return item?.id as string | undefined;
}

/** The two fields these rules guard: an item with no reason reads as `review_notes: null`. */
async function readReviewState(request: APIRequestContext, id: string): Promise<ReviewState> {
	const response = await request.get(ITEM_PATH(id));
	expect(response.status(), `GET ${ITEM_PATH(id)} must serve an admin`).toBe(200);
	const body = (await response.json()) as { data?: ItemRow };
	return { status: body.data?.status, review_notes: body.data?.review_notes ?? null };
}

async function expectPutRefused(request: APIRequestContext, id: string, data: Record<string, unknown>, error: RegExp) {
	const label = `PUT ${ITEM_PATH(id)} ${JSON.stringify(data)}`;
	const response = await request.put(ITEM_PATH(id), { data });
	expect(response.status(), label).toBe(400);
	const body = await response.json();
	expect(body.success, label).toBe(false);
	expect(body.error, label).toMatch(error);
	expect(body.data, `${label} must not answer with an item`).toBeUndefined();
}

test.describe('API: PUT /api/admin/items/{id} status and rejection-reason 400s (admin)', () => {
	test.use({ storageState: ADMIN_STATE_FILE });

	for (const status of ['published', 'Rejected']) {
		test(`a status of "${status}" is a 400 before the item is read`, async ({ request }) => {
			await expectPutRefused(request, MISSING_ID, { status }, STATUS_ERROR);

			// The refused PUT must not have created the item either.
			const after = await request.get(ITEM_PATH(MISSING_ID));
			expect(after.status(), `GET ${ITEM_PATH(MISSING_ID)} after the refused PUT`).toBe(404);
		});
	}

	test('rejecting a pending item needs a reason of 10 characters after trimming', async ({ request }) => {
		const id = await findItemId(request, 'pending');
		test.skip(!id, 'No seeded pending item to reject');

		for (const data of [
			{ status: 'rejected' },
			{ status: 'rejected', review_notes: 'Short' },
			// 12 characters sent, 5 once trimmed: the trimmed length is what counts
			{ status: 'rejected', review_notes: '   Short    ' },
			// 9 characters, one short of the minimum
			{ status: 'rejected', review_notes: 'Too short' }
		]) {
			const before = await readReviewState(request, id!);
			expect(before.status, `item ${id} must still be pending`).toBe('pending');

			await expectPutRefused(request, id!, data, REASON_ERROR);

			expect(
				await readReviewState(request, id!),
				`PUT ${JSON.stringify(data)} must leave the item's status and review_notes as they were`
			).toEqual(before);
		}
	});

	test("a rejected item's reason cannot be blanked or shortened", async ({ request }) => {
		const id = await findItemId(request, 'rejected');
		test.skip(!id, 'No seeded rejected item');

		for (const data of [
			{ review_notes: '' },
			{ review_notes: null },
			{ review_notes: 'ok' },
			// 9 characters, one short of the minimum
			{ review_notes: 'Too short' }
		]) {
			const before = await readReviewState(request, id!);
			expect(before.status, `item ${id} must still be rejected`).toBe('rejected');

			await expectPutRefused(request, id!, data, REASON_ERROR);

			expect(
				await readReviewState(request, id!),
				`PUT ${JSON.stringify(data)} must leave the item's status and review_notes as they were`
			).toEqual(before);
		}
	});
});
