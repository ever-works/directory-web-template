import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param / header surface** of the
 * **auth-gated** per-item vote-status endpoint served by the `GET`
 * export of `apps/web/app/api/items/[slug]/votes/status/route.ts`.
 *
 * `GET /api/items/[slug]/votes/status` is the **first non-admin
 * per-source-file query smoke** the docs tree publishes for an
 * **auth-gated** GET that returns the current user's vote record
 * (or `null`) for a specific item. Distinct from the public
 * `/api/items/[slug]/votes` GET (covered by
 * [`item-votes-query.spec.ts`](item-votes-query.spec.ts) +
 * [`item-votes-public.spec.ts`](item-votes-public.spec.ts)), this
 * endpoint requires `auth()` + a `getClientProfileByUserId(...)`
 * lookup before it will return any data.
 *
 * The handler signature is:
 *
 *     export async function GET(
 *       request: Request,
 *       context: { params: Promise<{ slug: string }> }
 *     )
 *
 * Note that `request` is **declared** but **never read** — the
 * handler awaits `auth()` first, then `context.params`, then calls
 * `getClientProfileByUserId(session.user.id)` and
 * `getVoteByUserIdAndItemId(clientProfile.id, slug)`. There is NO
 * `request.url`, `request.headers`, or `searchParams.get(...)`
 * access anywhere in the body. The route is therefore invariant
 * to **any** query parameter the caller appends — present, absent,
 * empty, repeated, special-character, or long. A regression that
 * introduces a `request.url`-based wiring (e.g. a future
 * `?asOf=<timestamp>` filter) would surface here as a status
 * divergence between the no-arg and parameter-laden branches.
 *
 * Gate sequence (auth-branch):
 *
 *   1. **`auth()` session lookup**.
 *   2. **`!session?.user?.id` gate** → 401 `{ error:
 *      'Authentication required' }`. NOTE: the message is
 *      `'Authentication required'` (matches the sibling
 *      `items/[slug]/comments/route.ts` POST), NOT `'Unauthorized'`.
 *   3. **`context.params` resolve**.
 *   4. **`getClientProfileByUserId(session.user.id)` lookup** —
 *      not found → 404 `{ error: 'Client profile not found' }`.
 *   5. **`getVoteByUserIdAndItemId(clientProfile.id, slug)`** —
 *      load-bearing data read.
 *   6. **Success payload** — `votes[0] || null` with status 200.
 *      The route may return an explicit `null` for the no-vote
 *      case — the only docs-tree per-source-file smoke that pins
 *      a `null`-or-record payload contract.
 *   7. **Outer catch** — `console.error` + 500 `{ error: 'Failed
 *      to fetch vote status' }`.
 *
 * The unauth branch is the only branch the e2e harness can pin
 * without a logged-in fixture, so the bulk-loop walks pin the
 * `< 500` envelope and the canonical-envelope assertions pin the
 * 401 `'Authentication required'` shape.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';
const STATUS_PATH = `/api/items/${NON_EXISTENT_SLUG}/votes/status`;

const ITEM_VOTES_STATUS_QUERIES = [
	// Baseline — no query string at all.
	'',

	// Pagination-shaped permutations. The route does not paginate, so
	// these must be silently discarded by the no-`request`-read handler.
	'?page=1',
	'?page=0',
	'?page=-1',
	'?limit=10',
	'?limit=0',
	'?limit=-1',
	'?limit=99999',
	'?page=1&limit=10',

	// Status-shaped permutations. The route does not filter by status
	// (the response is per-user, per-item), so these must be discarded.
	'?status=active',
	'?status=inactive',
	'?status=pending',
	'?status=archived',
	'?status=deleted',
	'?status=',
	'?status=ACTIVE',
	'?status=all',

	// Vote-type permutations. The route returns the existing record
	// regardless of any caller-supplied filter.
	'?type=up',
	'?type=down',
	'?type=UPVOTE',
	'?type=DOWNVOTE',
	'?type=',
	'?type=invalid',

	// Sort permutations the route does not read.
	'?sortBy=createdAt',
	'?sortBy=updatedAt',
	'?sortBy=voteType',
	'?sortBy=invalid',
	'?sortOrder=asc',
	'?sortOrder=desc',
	'?sortOrder=',
	'?sortOrder=random',

	// Identity-shaped impersonation permutations. The route only
	// trusts the session, so these must NOT change the unauth branch.
	'?userId=fabricated',
	'?userId=',
	'?userId=admin',
	'?userId=null',
	'?userId=undefined',
	'?clientProfileId=fabricated',

	// Magic-token bypass permutations.
	'?token=fabricated',
	'?token=',
	'?bypass=true',
	'?bypass=1',
	'?admin=true',
	'?isAdmin=true',

	// Slug-shaped permutations. The path slug is the only identifier
	// the handler reads from `context.params`; query-string slugs are
	// not consulted.
	'?slug=other',
	'?itemId=other',
	'?itemSlug=other',

	// Date-range permutations. The route does not filter by date.
	'?asOf=2024-01-01',
	'?from=2024-01-01',
	'?to=2024-12-31',
	'?asOf=invalid',

	// Repeated keys. Next.js routing collapses repeats deterministically;
	// the handler does not read any of them so the response must not 5xx.
	'?status=active&status=inactive',
	'?type=up&type=down',
	'?page=1&page=2',
	'?limit=10&limit=20',
	'?token=a&token=b',

	// Special-character permutations.
	'?q=%E2%9C%93',
	'?q=%00%01%02',
	'?q=' + 'a'.repeat(2000),
	'?%20=value',
	'?key=%20'
] as const;

test.describe('API: /api/items/[slug]/votes/status query-param surface (unauthenticated)', () => {
	for (const suffix of ITEM_VOTES_STATUS_QUERIES) {
		const path = `${STATUS_PATH}${suffix}`;
		test(`GET ${path} does not 5xx on the unauth branch`, async ({ request }) => {
			const response = await request.get(path);
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${STATUS_PATH} returns 401 with the canonical Authentication required envelope`, async ({
		request
	}) => {
		const response = await request.get(STATUS_PATH);
		// In environments that DO NOT have `DATABASE_URL` configured
		// the route still returns 401 because `auth()` is called
		// before any DB-dependent helper. The unauth branch is the
		// only one we can pin here.
		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Authentication required');
	});

	test(`GET ${STATUS_PATH} envelope shape has exactly the error key`, async ({ request }) => {
		// The unauth branch returns the bare `{ error: 'Authentication
		// required' }` envelope — no `success` key, no payload key. A
		// regression that wraps the unauth branch in the
		// `{ success: false, error }` envelope (used by the sibling
		// votes-cast POST) would surface here.
		const response = await request.get(STATUS_PATH);
		const body = await response.json();
		const keys = Object.keys(body).sort();
		expect(keys).toEqual(['error']);
	});

	test(`GET ${STATUS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders any of the post-auth helpers
		// before the auth gate would surface here. The unauth response
		// must NEVER echo any of the post-auth static messages.
		const response = await request.get(STATUS_PATH);
		const body = await response.json();
		const FORBIDDEN_POST_AUTH_MESSAGES = [
			'Client profile not found',
			'Failed to fetch vote status',
			'Internal server error'
		];
		for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
			expect(body.error).not.toBe(msg);
		}
	});

	test(`GET ${STATUS_PATH} does NOT echo a vote record on the unauth branch`, async ({ request }) => {
		// On the auth + has-vote branch the response is a vote record:
		// `{ id, userId, itemId, voteType, createdAt, updatedAt }`. The
		// unauth response must NEVER echo any of those keys.
		const response = await request.get(STATUS_PATH);
		const body = await response.json();
		const FORBIDDEN_RECORD_KEYS = ['id', 'userId', 'itemId', 'voteType', 'createdAt', 'updatedAt'];
		for (const key of FORBIDDEN_RECORD_KEYS) {
			expect(body[key]).toBeUndefined();
		}
	});

	test(`GET ${STATUS_PATH} response is NOT the literal null payload on the unauth branch`, async ({
		request
	}) => {
		// On the auth + no-vote branch the response is the literal
		// `null` payload (`votes[0] || null`). The unauth response
		// must be the 401 envelope, NOT `null`.
		const response = await request.get(STATUS_PATH);
		const body = await response.json();
		expect(body).not.toBeNull();
		expect(typeof body).toBe('object');
	});

	test(`GET ${STATUS_PATH} round-trips to a stable status across query permutations`, async ({
		request
	}) => {
		const baseline = await request.get(STATUS_PATH);
		const responses = await Promise.all([
			request.get(`${STATUS_PATH}?type=up`),
			request.get(`${STATUS_PATH}?status=active`),
			request.get(`${STATUS_PATH}?userId=fabricated`),
			request.get(`${STATUS_PATH}?token=anything`),
			request.get(`${STATUS_PATH}?page=1&limit=10`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${STATUS_PATH} does NOT branch on Accept header`, async ({ request }) => {
		const baseline = await request.get(STATUS_PATH);
		const responses = await Promise.all([
			request.get(STATUS_PATH, { headers: { Accept: 'application/json' } }),
			request.get(STATUS_PATH, { headers: { Accept: '*/*' } }),
			request.get(STATUS_PATH, { headers: { Accept: 'text/plain' } }),
			request.get(STATUS_PATH, { headers: { Accept: 'text/html' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${STATUS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.get(STATUS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(STATUS_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.get(STATUS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.get(STATUS_PATH, { headers: { 'X-Real-IP': '127.0.0.1' } }),
			request.get(STATUS_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.get(STATUS_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${STATUS_PATH} cross-method probe does NOT 5xx`, async ({ request }) => {
		// The route exports only GET. POST / PUT / PATCH / DELETE must
		// round-trip to a `< 500` status (typically a 405 from the
		// Next.js framework method-resolution layer).
		const responses = await Promise.all([
			request.post(STATUS_PATH),
			request.put(STATUS_PATH),
			request.patch(STATUS_PATH),
			request.delete(STATUS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${STATUS_PATH} client-profile lookup is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders `getClientProfileByUserId(...)`
		// before the auth gate would surface here: the unauth response
		// would echo `'Client profile not found'` (404) instead of the
		// 401 `'Authentication required'` envelope.
		const response = await request.get(STATUS_PATH);
		const body = await response.json();
		expect(response.status()).toBe(401);
		expect(body.error).not.toBe('Client profile not found');
	});

	test(`GET ${STATUS_PATH} vote-record read is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders `getVoteByUserIdAndItemId(...)`
		// before the auth gate would surface here: the unauth response
		// would echo a vote record OR the literal `null` payload OR
		// the 500 `'Failed to fetch vote status'` envelope.
		const response = await request.get(STATUS_PATH);
		const body = await response.json();
		expect(body).not.toBeNull();
		expect(body.error).not.toBe('Failed to fetch vote status');
	});
});
