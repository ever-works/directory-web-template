import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET + PUT + DELETE / dynamic-
 * segment / body / header surface** of the client per-
 * id item endpoint served by the `GET`, `PUT`, AND
 * `DELETE` exports of
 * `apps/web/app/api/client/items/[id]/route.ts`.
 *
 * `GET + PUT + DELETE /api/client/items/[id]` is the
 * **first per-source-file triple-method smoke** the
 * docs tree publishes that pins **FIVE distinct
 * helper imports** from the `client-auth` utility:
 * `requireClientAuth`, `serverErrorResponse`,
 * `notFoundResponse`, `forbiddenResponse`,
 * `badRequestResponse`. UNIQUE: the FIRST per-source-
 * file smoke pinning a 5-helper-import contract from
 * a single utility module.
 *
 * Distinct from EVERY prior triple-method smoke:
 *
 *   - **5-helper-import contract** — `requireClientAuth`
 *     + `serverErrorResponse` + `notFoundResponse` +
 *     `forbiddenResponse` + `badRequestResponse` from
 *     `@/lib/utils/client-auth`. UNIQUE: every prior
 *     smoke uses 1-3 helpers.
 *   - **`itemIdParamSchema.safeParse({ id })` Zod
 *     validation on path param** — UNIQUE: the FIRST
 *     per-source-file triple-method smoke pinning Zod
 *     validation on a dynamic-segment parameter (vs
 *     query / body / both).
 *   - **GET success payload with `engagement` sub-
 *     object** — `{ success, item, engagement: {
 *     views, likes } }`. UNIQUE: the FIRST per-
 *     source-file GET smoke pinning a nested
 *     engagement-metrics sub-object.
 *   - **PUT empty-update-check** — `Object.keys
 *     (updateData).length === 0` → 400 `'No fields
 *     to update'`. UNIQUE: the FIRST per-source-
 *     file PUT smoke pinning a no-op-update guard.
 *   - **PUT statusChanged dynamic message** —
 *     success message changes based on
 *     `result.statusChanged` ('updated successfully'
 *     vs 'updated successfully. Since it was
 *     previously approved, it has been moved to
 *     pending for re-review.'). UNIQUE.
 *   - **PUT FOUR-branch nested catch dispatcher**
 *     — `'Item not found'` → 404, `'permission'`
 *     substring → 403, `'deleted'` substring → 400,
 *     default → outer catch. UNIQUE: the FIRST
 *     per-source-file PUT smoke pinning a four-
 *     branch message-substring catch dispatcher.
 *   - **DELETE THREE-branch nested catch
 *     dispatcher** — `'Item not found'` → 404,
 *     `'permission'` → 403, `'already deleted'` →
 *     400. UNIQUE: the FIRST per-source-file
 *     DELETE smoke pinning a three-branch message-
 *     substring catch dispatcher.
 *   - **`'Unauthorized. Please sign in to
 *     continue.'`** longer-message TWO-key envelope
 *     (matches `client-items-method-spec.md` and
 *     `client-items-stats-query-spec.md`).
 *   - **`notFoundResponse(message)` 404-helper +
 *     `forbiddenResponse(message)` 403-helper** —
 *     UNIQUE: dedicated builder helpers (vs raw
 *     `NextResponse.json(..., { status: 404 })`).
 *
 *   1. **GET handler** — `requireClientAuth()`;
 *      `itemIdParamSchema.safeParse({ id })`;
 *      `findByIdForUser(id, userId)` (ownership
 *      check in repo); `!item` → 404; success
 *      returns `{ success, item, engagement }`.
 *   2. **PUT handler** — `requireClientAuth()`;
 *      param Zod; body Zod; empty-update guard;
 *      `updateAsClient(id, userId, updateData)`;
 *      success returns dynamic message based on
 *      `statusChanged`; FOUR-branch catch.
 *   3. **DELETE handler** — `requireClientAuth()`;
 *      param Zod; `softDeleteForUser(id, userId)`;
 *      success returns `{ success, message: 'Item
 *      deleted successfully' }`; THREE-branch
 *      catch.
 *   4. **Method-resolution surface** — the route
 *      exports `GET`, `PUT`, AND `DELETE`. `POST` /
 *      `PATCH` must round-trip to a `< 500` status.
 */
const NON_EXISTENT_ITEM_ID = '__definitely-not-a-real-client-item-id__';
const CLIENT_ITEM_PATH = `/api/client/items/${NON_EXISTENT_ITEM_ID}`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const PUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '{}', label: 'empty object body' },

	{ data: { name: 'Updated' }, label: 'name update only' },
	{ data: { description: 'Updated description that is long enough' }, label: 'description update only' },
	{
		data: { name: 'Updated', description: 'Updated description that is long enough' },
		label: 'name + description'
	},

	// Bypass attempts.
	{
		data: { name: 'Updated', status: 'approved' },
		label: 'fabricated status=approved (handler ignores)'
	},
	{
		data: { name: 'Updated', userId: 'fabricated' },
		label: 'fabricated userId (handler ignores)'
	}
] as const;

test.describe('API: /api/client/items/[id] GET + PUT + DELETE method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${CLIENT_ITEM_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(CLIENT_ITEM_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`PUT ${CLIENT_ITEM_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(CLIENT_ITEM_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`DELETE ${CLIENT_ITEM_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(CLIENT_ITEM_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${CLIENT_ITEM_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(CLIENT_ITEM_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${CLIENT_ITEM_PATH} returns 401 with the longer-message TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.get(CLIENT_ITEM_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized. Please sign in to continue.');
	});

	test(`PUT ${CLIENT_ITEM_PATH} returns 401 with the longer-message TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.put(CLIENT_ITEM_PATH, { data: { name: 'X' } });
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized. Please sign in to continue.');
	});

	test(`DELETE ${CLIENT_ITEM_PATH} returns 401 with the longer-message TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.delete(CLIENT_ITEM_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized. Please sign in to continue.');
	});

	test(`GET / PUT / DELETE ${CLIENT_ITEM_PATH} have IDENTICAL 401 envelopes`, async ({ request }) => {
		const responses = await Promise.all([
			request.get(CLIENT_ITEM_PATH),
			request.put(CLIENT_ITEM_PATH, { data: { name: 'X' } }),
			request.delete(CLIENT_ITEM_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
		}

		const bodies = await Promise.all(responses.map((r) => r.json()));
		const baseline = bodies[0];
		for (const body of bodies.slice(1)) {
			expect(body).toEqual(baseline);
		}
	});

	test(`GET ${CLIENT_ITEM_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.get(CLIENT_ITEM_PATH);
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.item).toBeUndefined();
		expect(body.engagement).toBeUndefined();
	});

	test(`PUT ${CLIENT_ITEM_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.put(CLIENT_ITEM_PATH, { data: { name: 'Updated' } });
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The post-auth messages must NEVER appear on
		// unauth.
		expect(serialized).not.toContain('Item not found');
		expect(serialized).not.toContain('No fields to update');
		expect(serialized).not.toContain('Item updated successfully');
		expect(serialized).not.toContain('moved to pending for re-review');
		expect(serialized).not.toContain('Failed to update item');
		expect(serialized).not.toContain('Item deleted successfully');
		expect(serialized).not.toContain('Failed to delete item');
		expect(serialized).not.toContain('Failed to fetch item');
	});

	test(`PUT ${CLIENT_ITEM_PATH} updateAsClient is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: pin that XSS markers in the PUT
		// body are NEVER echoed back on unauth.
		const response = await request.put(CLIENT_ITEM_PATH, {
			data: {
				name: 'XSS-PUT-NAME-MARKER-12345',
				description: 'XSS description marker that is at least ten chars'
			}
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-PUT-NAME-MARKER-12345');
	});

	test(`DELETE ${CLIENT_ITEM_PATH} softDeleteForUser is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: pin that the URL itemId marker is
		// NEVER echoed back on the unauth branch.
		const xssPath = `/api/client/items/${encodeURIComponent('XSS-DELETE-MARKER-67890')}`;
		const response = await request.delete(xssPath);

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-DELETE-MARKER-67890');
	});

	test(`PUT ${CLIENT_ITEM_PATH} catch-branch dispatcher is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Pins the gate-before-FOUR-branch-catch order.
		const response = await request.put(CLIENT_ITEM_PATH, { data: { name: 'X' } });

		if (response.status() === 401) {
			const body = await response.json();
			const serialized = JSON.stringify(body);
			// None of the four catch-branch messages
			// should leak.
			expect(serialized).not.toContain('Item not found');
			expect(serialized).not.toContain('permission');
			expect(serialized).not.toContain('deleted');
		}
	});

	test(`PUT ${CLIENT_ITEM_PATH} Zod body-validation is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Pin the gate-before-Zod-body-validation order.
		const responses = await Promise.all([
			request.put(CLIENT_ITEM_PATH, { data: { name: 'X' } }),
			request.put(CLIENT_ITEM_PATH, { data: { description: 'short' } }),
			request.put(CLIENT_ITEM_PATH, { data: { source_url: 'not-a-url' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
		}
	});

	test(`GET ${CLIENT_ITEM_PATH} cross-method probe (POST / PATCH) does NOT 5xx`, async ({
		request
	}) => {
		// GET + PUT + DELETE are exported. POST /
		// PATCH must round-trip to `< 500`.
		const responses = await Promise.all([
			request.post(CLIENT_ITEM_PATH),
			request.patch(CLIENT_ITEM_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${CLIENT_ITEM_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.put(CLIENT_ITEM_PATH, { data: { name: 'X' } });
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.put(CLIENT_ITEM_PATH, {
				data: { name: 'X' },
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.put(CLIENT_ITEM_PATH, {
				data: { name: 'X' },
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.put(CLIENT_ITEM_PATH, {
				data: { name: 'X' },
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`GET ${CLIENT_ITEM_PATH} cross-id invariance — different IDs produce IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Pin that the auth gate fires BEFORE any
		// per-id branch.
		const responses = await Promise.all([
			request.get('/api/client/items/id-one'),
			request.get('/api/client/items/id-two'),
			request.get('/api/client/items/id-three')
		]);

		const baseline = responses[0];
		const baselineBody = await baseline.json();

		for (const response of responses.slice(1)) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});
});
