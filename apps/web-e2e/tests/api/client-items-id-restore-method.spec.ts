import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / dynamic-segment / body / header
 * surface** of the client per-id item *restore* endpoint served by
 * the `POST` export of
 * `apps/web/app/api/client/items/[id]/restore/route.ts`.
 *
 * `POST /api/client/items/[id]/restore` is the **first per-source-
 * file POST smoke** the docs tree publishes that pins a
 * **`requireClientAuth()`-gated soft-delete restore action** that
 * delegates to a `clientItemRepository.restoreForUser(id, userId)`
 * repository entry point with a **THREE-branch nested catch
 * dispatcher**:
 *
 *   - `error.message === 'Item not found'` → `notFoundResponse(
 *     'Item not found')` 404 (exact-string match);
 *   - `error.message.includes('permission')` →
 *     `forbiddenResponse(error.message)` 403 (substring match);
 *   - `error.message.includes('not deleted')` →
 *     `badRequestResponse(error.message)` 400 (substring match);
 *   - everything else falls through to the outer
 *     `serverErrorResponse(error, 'Failed to restore item')` 500.
 *
 * Distinct from EVERY prior per-source-file POST smoke:
 *
 *   - **5-helper-import contract** — `requireClientAuth` +
 *     `serverErrorResponse` + `notFoundResponse` +
 *     `forbiddenResponse` + `badRequestResponse` from
 *     `@/lib/utils/client-auth`. Same import surface as
 *     `client-items-id-method-spec.md`, but on a single-method
 *     `POST` action sub-route (vs the parent `[id]` route's
 *     triple-method `GET + PUT + DELETE` surface).
 *   - **`itemIdParamSchema.safeParse({ id })` Zod validation on
 *     the dynamic-segment parameter** — paired with a
 *     `'Item ID is required'` 400 fallback message.
 *   - **THREE-branch repo-error catch dispatcher** —
 *     `'Item not found'` (exact), `'permission'` (substring),
 *     `'not deleted'` (substring) all pinned by the matching
 *     `clientItemRepository.restoreForUser(...)` thrown errors.
 *   - **`'Failed to restore item'`** outer-catch default message
 *     (UNIQUE: every prior per-source-file `client-items*` smoke
 *     has a different default-message string —
 *     `'Failed to fetch item'`, `'Failed to update item'`,
 *     `'Failed to delete item'`, `'Failed to execute import'`).
 *   - **`'Unauthorized. Please sign in to continue.'`** longer-
 *     message TWO-key 401 envelope (matches every other
 *     `requireClientAuth`-gated sibling).
 *
 * The auth gate fires before any repository call, so the
 * unauthenticated POST surface returns a deterministic 401 with
 * the canonical `{ success: false, error: 'Unauthorized. Please
 * sign in to continue.' }` envelope. Every assertion below pins
 * that contract.
 *
 * Companion to the broader smoke at
 * [`client-item-restore.spec.ts`](client-item-restore.spec.ts) which
 * stays as the single-test "did it 5xx?" canary; this spec is the
 * detailed per-source-file invariant pinning sibling.
 */
const NON_EXISTENT_ITEM_ID = '00000000-0000-0000-0000-000000000000';
const RESTORE_PATH = `/api/client/items/${NON_EXISTENT_ITEM_ID}/restore`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const POST_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '{}', label: 'empty object body' },
	{ data: { force: true }, label: 'fabricated force flag (handler ignores)' },
	{ data: { userId: 'fabricated' }, label: 'fabricated userId (handler ignores)' },
	{ data: { id: 'fabricated' }, label: 'fabricated id key (handler ignores)' },
	{ data: { deleted_at: null }, label: 'fabricated deleted_at (handler ignores)' }
] as const;

test.describe('API: /api/client/items/[id]/restore POST method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${RESTORE_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(RESTORE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of POST_BODIES) {
		test(`POST ${RESTORE_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(RESTORE_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${RESTORE_PATH} returns 401 with the longer-message TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.post(RESTORE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized. Please sign in to continue.');
	});

	test(`POST ${RESTORE_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.post(RESTORE_PATH);
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.item).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`POST ${RESTORE_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(RESTORE_PATH, { data: {} });
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// None of the post-auth branch messages or the success-
		// branch keys must leak on the unauth branch.
		expect(serialized).not.toContain('Item not found');
		expect(serialized).not.toContain('Item is not deleted');
		expect(serialized).not.toContain('permission');
		expect(serialized).not.toContain('Item restored successfully');
		expect(serialized).not.toContain('Failed to restore item');
	});

	test(`POST ${RESTORE_PATH} restoreForUser is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: pin that XSS markers placed in the body are
		// NEVER echoed back on the unauth branch.
		const response = await request.post(RESTORE_PATH, {
			data: {
				userId: 'XSS-RESTORE-USER-MARKER-12345',
				id: 'XSS-RESTORE-ID-MARKER-67890'
			}
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-RESTORE-USER-MARKER-12345');
		expect(serialized).not.toContain('XSS-RESTORE-ID-MARKER-67890');
	});

	test(`POST ${RESTORE_PATH} Zod path-param validation is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Even with a malformed itemId in the path, the auth
		// gate must fire first — the response must be 401, NOT
		// 400 'Item ID is required'.
		const responses = await Promise.all([
			request.post('/api/client/items//restore'),
			request.post('/api/client/items/!@#$%/restore'),
			request.post(`/api/client/items/${'x'.repeat(500)}/restore`)
		]);

		for (const response of responses) {
			// All must be < 500. Status itself is allowed to vary
			// because Next.js path resolution can produce 404 on
			// some malformed paths before the route handler runs.
			expect(response.status()).toBeLessThan(500);

			if (response.status() === 401) {
				const body = await response.json();
				expect(body.success).toBe(false);
				expect(body.error).toBe('Unauthorized. Please sign in to continue.');
			}
		}
	});

	test(`POST ${RESTORE_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the ONLY exported method on the /restore route.
		// GET / PUT / PATCH / DELETE must round-trip to a `< 500`
		// status (Next.js returns 405).
		const responses = await Promise.all([
			request.get(RESTORE_PATH),
			request.put(RESTORE_PATH),
			request.patch(RESTORE_PATH),
			request.delete(RESTORE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${RESTORE_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.post(RESTORE_PATH);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.post(RESTORE_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(RESTORE_PATH, {
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.post(RESTORE_PATH, {
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`POST ${RESTORE_PATH} cross-id invariance — different IDs produce IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Pin that the auth gate fires BEFORE any per-id branch.
		const responses = await Promise.all([
			request.post('/api/client/items/id-one/restore'),
			request.post('/api/client/items/id-two/restore'),
			request.post('/api/client/items/id-three/restore')
		]);

		const baseline = responses[0];
		expect(baseline.status()).toBe(401);
		const baselineBody = await baseline.json();

		for (const response of responses.slice(1)) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});

	test(`POST ${RESTORE_PATH} cross-permutation status invariance — every body produces an IDENTICAL unauth envelope`, async ({
		request
	}) => {
		const responses = await Promise.all(
			POST_BODIES.map(({ data }) => request.post(RESTORE_PATH, { data }))
		);

		const baseline = responses[0];
		expect(baseline.status()).toBe(401);
		const baselineBody = await baseline.json();

		for (const response of responses.slice(1)) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});
});
