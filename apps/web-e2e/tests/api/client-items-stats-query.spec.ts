import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET / header surface** of
 * the client items-stats endpoint served by the
 * `GET` export of
 * `apps/web/app/api/client/items/stats/route.ts`.
 *
 * `GET /api/client/items/stats` is the **first per-
 * source-file GET smoke** the docs tree publishes
 * that pins the **`requireClientAuth()` helper-based
 * auth gate** with the **`'Unauthorized. Please sign
 * in to continue.'`** longer-message TWO-key
 * envelope. UNIQUE: a different auth-helper
 * abstraction than the bare `auth()` session lookup
 * used in every other per-source-file smoke; uses
 * the explicit `client-auth` utility helpers
 * (`requireClientAuth`, `serverErrorResponse`).
 *
 * Distinct from EVERY prior GET smoke:
 *
 *   - **`requireClientAuth()` helper-based auth
 *     gate** — UNIQUE: returns a discriminated union
 *     `{ success: false, response: NextResponse }`
 *     on failure or `{ success: true, userId:
 *     string }` on success. The FIRST per-source-
 *     file GET smoke pinning a discriminated-union
 *     auth-helper return contract.
 *   - **`'Unauthorized. Please sign in to
 *     continue.'`** 401 envelope message — UNIQUE:
 *     longer specific message naming the action
 *     ('Please sign in to continue'). Distinct from
 *     bare `'Unauthorized'`, `'Unauthorized. Admin
 *     access required.'` (admin-tree), and
 *     `'Authentication required'` (Stripe siblings).
 *   - **TWO-key 401 envelope** `{ success: false,
 *     error: 'Unauthorized. Please sign in to
 *     continue.' }`.
 *   - **TWO-key success payload** `{ success: true,
 *     stats: <statsObject> }` — UNIQUE: uses `stats`
 *     key (NOT `data` like most success payloads).
 *   - **`serverErrorResponse(error, 'Failed to
 *     fetch statistics')`** outer catch — UNIQUE
 *     helper distinct from `safeErrorResponse`.
 *   - **Zero-arg GET signature** — `export async
 *     function GET()` with NO `request` / `context`
 *     arguments.
 *
 *   1. **`requireClientAuth()`** — discriminated-
 *      union auth-helper.
 *   2. **`getClientItemRepository()`** — repository
 *      factory.
 *   3. **`clientItemRepository.getStatsByUser
 *      (userId)`** — load-bearing DB read.
 *   4. **Success payload** — `{ success: true,
 *      stats: { total, draft, pending, approved,
 *      rejected, deleted } }`.
 *   5. **Outer catch** — `serverErrorResponse(error,
 *      'Failed to fetch statistics')`.
 *   6. **Method-resolution surface** — the route
 *      exports ONLY `GET`. `POST` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const STATS_PATH = '/api/client/items/stats';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

test.describe('API: /api/client/items/stats GET surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${STATS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(STATS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${STATS_PATH} returns 401 with the longer-message TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.get(STATS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized. Please sign in to continue.');
	});

	test(`GET ${STATS_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.get(STATS_PATH);
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.stats).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`GET ${STATS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.get(STATS_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The post-auth messages must NEVER appear on
		// the unauth branch.
		expect(serialized).not.toContain('Failed to fetch statistics');
		// The success-branch keys must not leak.
		expect(serialized).not.toContain('"stats":');
		expect(serialized).not.toContain('total');
		expect(serialized).not.toContain('draft');
		expect(serialized).not.toContain('pending');
		expect(serialized).not.toContain('approved');
		expect(serialized).not.toContain('rejected');
	});

	test(`GET ${STATS_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.get(STATS_PATH);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.get(STATS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(STATS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.get(STATS_PATH, { headers: { Authorization: 'Bearer fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`GET ${STATS_PATH} cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET is the only exported method.
		const responses = await Promise.all([
			request.post(STATS_PATH),
			request.put(STATS_PATH),
			request.patch(STATS_PATH),
			request.delete(STATS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${STATS_PATH} clientItemRepository.getStatsByUser is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing DB read must NEVER
		// run on unauth. Pin that no stats fields are
		// leaked.
		const response = await request.get(STATS_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// Stats keys must not appear.
		expect(serialized).not.toContain('"total":');
		expect(serialized).not.toContain('"deleted":');
	});

	test(`GET ${STATS_PATH} cross-permutation status invariance`, async ({ request }) => {
		// The status MUST be stable across all header
		// permutations.
		const baseline = await request.get(STATS_PATH);
		const baselineStatus = baseline.status();

		for (const { headers } of HEADERS) {
			const response = await request.get(STATS_PATH, { headers });
			expect(response.status()).toBe(baselineStatus);
		}
	});
});
