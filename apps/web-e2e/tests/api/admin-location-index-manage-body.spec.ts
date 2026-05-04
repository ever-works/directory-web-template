import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the admin-only location-index management endpoint
 * served by the `POST` export of
 * `apps/web/app/api/admin/location-index/route.ts`.
 *
 * `POST /api/admin/location-index` is the **first POST
 * smoke** the docs tree publishes that uses the
 * **`checkAdminAuth()` helper** from
 * `@/lib/auth/admin-guard.ts` (the GET-sibling
 * `admin-location-index-query.spec.ts` already covers
 * the helper for the query endpoint; this is the first
 * POST smoke that does the same).
 *
 * It is also the **first action-enum-dispatched POST
 * smoke** the docs tree publishes that branches on a
 * `body.action === 'rebuild' | 'clear'` enum into TWO
 * distinct destructive operations on the same path:
 *
 *   - `'rebuild'` → calls `itemRepository.findAll()` +
 *     `service.rebuildIndex(items)` — the **heaviest
 *     service call across the entire admin tree**
 *     (re-indexes EVERY item with location data).
 *   - `'clear'` → calls `clearLocationIndex()` — a
 *     **destructive table-wipe** that drops every row
 *     from the location_index table.
 *
 * No prior POST smoke covers a destructive-operation
 * dispatcher of this shape.
 *
 *   1. **`checkAdminAuth()` helper call** that folds
 *      three branches into one helper:
 *        - `!session?.user` → 401 `{ success: false,
 *          error: 'Unauthorized' }`.
 *        - `!session.user.id` → 401 `{ success: false,
 *          error: 'User ID not found' }`.
 *        - `!userIsAdmin` → 403 `{ success: false,
 *          error: 'Insufficient permissions' }`.
 *      For an unauthenticated request, the FIRST
 *      branch fires returning 401 `{ success: false,
 *      error: 'Unauthorized' }` (canonical envelope
 *      with `success: false` AND short `'Unauthorized'`
 *      message — distinct from the bare-envelope
 *      family AND the canonical-longer-message family).
 *   2. **JSON body parse via `await request.json()`**
 *      AFTER the gate (inside the `try` block).
 *   3. **Action enum dispatch** —
 *        - `action === 'rebuild'` → 200 `{ success:
 *          true, data: <rebuildResult> }`.
 *        - `action === 'clear'` → 200 `{ success: true,
 *          data: { cleared: <count> } }`.
 *        - else → 400 `{ success: false, error:
 *          'Invalid action. Use "rebuild" or
 *          "clear".' }`.
 *   4. **`getLocationIndexService()` + `service.
 *      rebuildIndex(items)`** — the load-bearing
 *      rebuild path.
 *   5. **`clearLocationIndex()`** — the load-bearing
 *      destructive table-wipe path.
 *   6. **Outer catch** — `console.error` + 500
 *      `{ success: false, error: 'Internal server
 *      error' }`.
 *   7. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const LOCATION_INDEX_PATH = '/api/admin/location-index';

const ADMIN_LOCATION_INDEX_MANAGE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const ADMIN_LOCATION_INDEX_MANAGE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (invalid-action) if reachable)' },

	// Action-enum probes — all DESTRUCTIVE if reachable.
	{ data: { action: 'rebuild' }, label: 'rebuild action (would re-index all items if reachable)' },
	{ data: { action: 'clear' }, label: 'clear action (would wipe location_index table if reachable)' },

	// Invalid action probes.
	{ data: { action: 'invalid' }, label: 'invalid action string' },
	{ data: { action: '' }, label: 'empty action string' },
	{ data: { action: 'REBUILD' }, label: 'wrong-case action (uppercase)' },
	{ data: { action: 'rebuild ' }, label: 'trailing-whitespace action' },

	// Bypass attempts.
	{ data: { isAdmin: true, action: 'rebuild' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', action: 'rebuild' }, label: 'fabricated tenantId attempt' },
	{ data: { padding: 'x'.repeat(2_000), action: 'clear' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Invalid action. Use "rebuild" or "clear".',
	'Internal server error',
	'User ID not found',
	'Insufficient permissions'
] as const;

const FORBIDDEN_KEYS = ['data', 'cleared'] as const;

const CANONICAL_ENVELOPE_BARE_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/location-index POST body / header surface', () => {
	for (const { headers, label } of ADMIN_LOCATION_INDEX_MANAGE_HEADERS) {
		test(`POST ${LOCATION_INDEX_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(LOCATION_INDEX_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_LOCATION_INDEX_MANAGE_BODIES) {
		test(`POST ${LOCATION_INDEX_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(LOCATION_INDEX_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${LOCATION_INDEX_PATH} returns 401 with the canonical-envelope bare-message envelope`, async ({
		request
	}) => {
		// The unauthenticated POST branch is the load-
		// bearing invariant: `checkAdminAuth()` returns
		// 401 `{ success: false, error: 'Unauthorized' }`
		// from the `!session?.user` branch.
		const response = await request.post(LOCATION_INDEX_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: CANONICAL_ENVELOPE_BARE_401_MESSAGE });
	});

	test(`POST ${LOCATION_INDEX_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		// Strict envelope-shape assertion: the
		// canonical envelope is `{ success: false, error:
		// 'Unauthorized' }`. Both the `success: false`
		// key AND the bare `'Unauthorized'` message
		// must be present, and no other keys.
		const response = await request.post(LOCATION_INDEX_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
	});

	test(`POST ${LOCATION_INDEX_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branches return `{ success: true,
		// data: <result> }` with status 200. The unauth
		// branch must NEVER reach the dispatcher AND must
		// NEVER echo a `cleared` count from the destructive
		// branch.
		const response = await request.post(LOCATION_INDEX_PATH, { data: { action: 'rebuild' } });
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.success).toBe(false);
	});

	test(`POST ${LOCATION_INDEX_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LOCATION_INDEX_PATH),
			request.post(LOCATION_INDEX_PATH, { data: {} }),
			request.post(LOCATION_INDEX_PATH, { data: { action: 'rebuild' } }),
			request.post(LOCATION_INDEX_PATH, { data: { action: 'clear' } }),
			request.post(LOCATION_INDEX_PATH, { data: { action: 'invalid' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`POST ${LOCATION_INDEX_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(LOCATION_INDEX_PATH);
		const responses = await Promise.all([
			request.post(LOCATION_INDEX_PATH, { data: {} }),
			request.post(LOCATION_INDEX_PATH, { data: { action: 'rebuild' } }),
			request.post(LOCATION_INDEX_PATH, { data: { action: 'clear' } }),
			request.post(LOCATION_INDEX_PATH, { data: { isAdmin: true, action: 'rebuild' } }),
			request.post(LOCATION_INDEX_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(LOCATION_INDEX_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${LOCATION_INDEX_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(LOCATION_INDEX_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(LOCATION_INDEX_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(LOCATION_INDEX_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(LOCATION_INDEX_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(LOCATION_INDEX_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(LOCATION_INDEX_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(LOCATION_INDEX_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LOCATION_INDEX_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(LOCATION_INDEX_PATH),
			request.patch(LOCATION_INDEX_PATH),
			request.delete(LOCATION_INDEX_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LOCATION_INDEX_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LOCATION_INDEX_PATH, { data: 'not-json' }),
			request.post(LOCATION_INDEX_PATH, { data: '{ broken: json' }),
			request.post(LOCATION_INDEX_PATH, { data: '{"action":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LOCATION_INDEX_PATH} action-enum dispatch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch the dispatcher branches on
		// `body.action`. The unauth branch must NEVER
		// emit the 400 invalid-action message AND must
		// NEVER echo the `data` key.
		const responses = await Promise.all([
			request.post(LOCATION_INDEX_PATH, { data: { action: 'invalid' } }),
			request.post(LOCATION_INDEX_PATH, { data: { action: 'REBUILD' } }),
			request.post(LOCATION_INDEX_PATH, { data: { action: '' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Invalid action. Use "rebuild" or "clear".');
			expect(body.data).toBeUndefined();
		}
	});

	test(`POST ${LOCATION_INDEX_PATH} rebuild + clear destructive paths are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `service.rebuildIndex(items)` or
		// `clearLocationIndex()` before the gate would
		// surface here: the unauth response would echo
		// `data` (rebuild result) or `data.cleared`
		// (clear count) from the destructive branch.
		const responses = await Promise.all([
			request.post(LOCATION_INDEX_PATH, { data: { action: 'rebuild' } }),
			request.post(LOCATION_INDEX_PATH, { data: { action: 'clear' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).toBe(false);
			expect(body.error).toBe(CANONICAL_ENVELOPE_BARE_401_MESSAGE);
		}
	});
});
