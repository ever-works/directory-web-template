import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET / header surface** of
 * the authenticated user-scoped sponsor-ad statistics
 * endpoint served by the `GET` export of
 * `apps/web/app/api/sponsor-ads/user/stats/route.ts`.
 *
 * `GET /api/sponsor-ads/user/stats` is the **first per-
 * source-file GET smoke** the docs tree publishes that
 * pins a **THREE-bucket nested-stats success payload**
 * — `{ success: true, stats: { overview: {...},
 * byInterval: {...}, revenue: {...} } }`. Each bucket
 * has its own required-keys contract:
 *
 *   - `overview` — `{ total, pendingPayment, pending,
 *     active, rejected, expired, cancelled }` (SEVEN
 *     status-bucket counts).
 *   - `byInterval` — `{ weekly, monthly }` (TWO
 *     billing-interval counts).
 *   - `revenue` — `{ totalRevenue, weeklyRevenue,
 *     monthlyRevenue }` (THREE revenue rollups in
 *     minor currency units).
 *
 * UNIQUE — every prior per-source-file GET stats smoke
 * pins a flat shallow stats key set; this is the FIRST
 * that pins a THREE-bucket nested-stats invariant where
 * the `stats` object is a triple-nested aggregate.
 *
 * Distinct from EVERY prior session-gated GET smoke:
 *
 *   - **THREE-bucket nested-stats success payload** —
 *     `{ success: true, stats: { overview, byInterval,
 *     revenue } }`. UNIQUE — the FIRST per-source-file
 *     GET smoke pinning a triple-nested aggregate
 *     stats payload.
 *   - **Bare `auth()` session lookup** — distinct from
 *     the `requireClientAuth()` discriminated-union
 *     helper used by `client-items-stats-query` and
 *     other client-tree siblings.
 *   - **TWO-key 401 envelope** `{ success: false,
 *     error: 'Unauthorized' }` — same shape as the
 *     `sponsor-ads/user` parent route; distinct from
 *     the bare ONE-key envelope used by
 *     `user-payments` and `subscription` siblings.
 *   - **TWO-key success payload** `{ success: true,
 *     stats }` — uses `stats` key (NOT `data`).
 *   - **Service-call delegation** —
 *     `sponsorAdService.getSponsorAdStatsByUser(session.
 *     user.id)` is the ONLY post-auth load-bearing
 *     call (no DB-helper layer between auth and
 *     service like the repository factories used in
 *     client-tree siblings).
 *   - **TWO-key 500 catch envelope** `{ success:
 *     false, error: 'Failed to fetch sponsor ad
 *     stats' }` — distinct catch message from the
 *     parent `/sponsor-ads/user` route's `'Failed to
 *     fetch sponsor ads'` and `'Failed to create
 *     sponsor ad'` messages (NO 's' on `stat` —
 *     `stats`).
 *   - **Zero-arg GET signature** — `export async
 *     function GET()` with NO `request` / `context`
 *     arguments.
 *
 *   1. **`auth()` session lookup** — `!session?.user?.id`
 *      → 401 TWO-key `{ success: false, error:
 *      'Unauthorized' }`.
 *   2. **`sponsorAdService.getSponsorAdStatsByUser(userId)`**
 *      — load-bearing service call returning the
 *      THREE-bucket aggregate.
 *   3. **Success payload** — `{ success: true, stats:
 *      { overview, byInterval, revenue } }`.
 *   4. **Outer catch** — 500 `{ success: false,
 *      error: 'Failed to fetch sponsor ad stats' }`.
 *   5. **Method-resolution surface** — the route
 *      exports ONLY `GET`. `POST` / `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const STATS_PATH = '/api/sponsor-ads/user/stats';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

test.describe('API: /api/sponsor-ads/user/stats GET header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${STATS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(STATS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${STATS_PATH} returns 401 with the canonical TWO-key envelope`, async ({ request }) => {
		const response = await request.get(STATS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized');
	});

	test(`GET ${STATS_PATH} 401 envelope shape has exactly success and error keys`, async ({ request }) => {
		// Strict TWO-key envelope-shape assertion: NO
		// `stats`, NO `data`, NO `message` leak.
		const response = await request.get(STATS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.stats).toBeUndefined();
		expect(body.data).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`GET ${STATS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.get(STATS_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The 500 catch message must NEVER appear on the
		// unauth branch.
		expect(serialized).not.toContain('Failed to fetch sponsor ad stats');
	});

	test(`GET ${STATS_PATH} sponsorAdService.getSponsorAdStatsByUser is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: pin that the THREE-bucket aggregate
		// keys NEVER leak on the unauth branch — neither
		// the bucket names nor the inner status / interval
		// / revenue keys.
		const response = await request.get(STATS_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// Bucket names must not appear.
		expect(serialized).not.toContain('overview');
		expect(serialized).not.toContain('byInterval');
		expect(serialized).not.toContain('revenue');

		// Overview-bucket inner keys (status counts).
		expect(serialized).not.toContain('pendingPayment');
		expect(serialized).not.toContain('rejected');
		expect(serialized).not.toContain('expired');
		expect(serialized).not.toContain('cancelled');

		// Interval-bucket inner keys.
		expect(serialized).not.toContain('weekly');
		expect(serialized).not.toContain('monthly');

		// Revenue-bucket inner keys.
		expect(serialized).not.toContain('totalRevenue');
		expect(serialized).not.toContain('weeklyRevenue');
		expect(serialized).not.toContain('monthlyRevenue');
	});

	test(`GET ${STATS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const baseline = await request.get(STATS_PATH);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.get(STATS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(STATS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.get(STATS_PATH, { headers: { Authorization: 'Bearer fabricated' } }),
			request.get(STATS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } })
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

	test(`GET ${STATS_PATH} catch-branch dispatcher is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The 500 catch must NEVER fire on unauth.
		const response = await request.get(STATS_PATH);
		expect(response.status()).not.toBe(500);

		if (response.status() === 401) {
			const body = await response.json();
			const serialized = JSON.stringify(body);
			expect(serialized).not.toContain('Failed to fetch');
		}
	});

	test(`GET ${STATS_PATH} cross-permutation status invariance`, async ({ request }) => {
		// The status MUST be stable across all header
		// permutations on the unauth branch.
		const baseline = await request.get(STATS_PATH);
		const baselineStatus = baseline.status();

		for (const { headers } of HEADERS) {
			const response = await request.get(STATS_PATH, { headers });
			expect(response.status()).toBe(baselineStatus);
		}
	});
});
