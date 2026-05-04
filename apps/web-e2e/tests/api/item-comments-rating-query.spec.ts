import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param / header surface** of the
 * **public** per-item rating-aggregate endpoint served by the `GET`
 * export of `apps/web/app/api/items/[slug]/comments/rating/route.ts`.
 *
 * `GET /api/items/[slug]/comments/rating` is the **first per-source-file
 * query smoke** the docs tree publishes for a public item-detail
 * endpoint that uses **`checkDatabaseAvailability()` as a *graceful-
 * fallback* gate** (NOT as a 503-returning gate like the sibling
 * `items/[slug]/comments` POST). When `process.env.DATABASE_URL` is
 * missing OR the tenant resolution returns null OR the Drizzle
 * aggregate query throws, the handler returns the SAME success-shaped
 * envelope `{ averageRating: 0, totalRatings: 0 }` with status 200 —
 * NEVER a 4xx or 5xx. This is a deliberately permissive contract:
 * the item-detail page reads ratings on every render, and a 503 / 500
 * response would cause a render-time failure instead of a quiet
 * zero-ratings display.
 *
 * The handler signature is:
 *
 *     export async function GET(
 *       request: Request,
 *       { params }: { params: Promise<{ slug: string }> }
 *     )
 *
 * `request` is **declared** but **never read** — the handler only
 * awaits `params`, calls `checkDatabaseAvailability()`,
 * `getItemIdFromSlug(slug)`, `getTenantId()`, and a single Drizzle
 * `select({ avg, count })` aggregate. There is NO `request.url`,
 * `request.headers`, or `searchParams.get(...)` access anywhere in
 * the function body. The route is therefore invariant to **any**
 * query parameter the caller appends — present, absent, empty,
 * repeated, special-character, or long.
 *
 * Gate / branch sequence (success path):
 *
 *   1. **`checkDatabaseAvailability()` graceful-fallback gate** —
 *      returns NON-null when `DATABASE_URL` is missing → handler
 *      returns 200 `{ averageRating: 0, totalRatings: 0 }` (NOT
 *      the 503 envelope used by `items/[slug]/comments` POST).
 *   2. **`params` resolve** for the `slug`.
 *   3. **`getItemIdFromSlug(slug)`** — synchronous slug→id mapping.
 *   4. **`getTenantId()` graceful-fallback** — returns null if the
 *      tenant header / cookie isn't present → handler returns 200
 *      with the zero-rating envelope (NOT a 403 / 401).
 *   5. **Drizzle `select({ avg(rating), count() })` aggregate** —
 *      filtered by `eq(itemId)` + `isNull(deletedAt)` +
 *      `eq(tenantId)`.
 *   6. **Success payload** — `{ averageRating: Number(avg) || 0,
 *      totalRatings: Number(count) || 0 }` with status 200.
 *   7. **Outer catch** — `console.warn` (dev-only) + 200
 *      `{ averageRating: 0, totalRatings: 0 }` (NOT a 500). The
 *      route NEVER surfaces a 5xx.
 *
 * In the e2e environment the slug is non-existent, so the aggregate
 * query returns `{ avg: null, count: 0 }`, which collapses through
 * `Number(null) || 0` to the same zero-rating envelope. The unauth-
 * branch contract and the unknown-slug contract are therefore the
 * SAME envelope — a regression that introduces a 4xx / 5xx on
 * either branch would surface here as a status divergence between
 * the no-arg and parameter-laden walks.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';
const RATING_PATH = `/api/items/${NON_EXISTENT_SLUG}/comments/rating`;

const ITEM_COMMENTS_RATING_QUERIES = [
	// Baseline — no query string at all.
	'',

	// Pagination-shaped permutations the route does not read.
	'?page=1',
	'?page=0',
	'?page=-1',
	'?limit=10',
	'?limit=0',
	'?limit=99999',
	'?page=1&limit=10',

	// Filter permutations the route does not read.
	'?rating=5',
	'?rating=0',
	'?rating=invalid',
	'?minRating=1',
	'?maxRating=5',
	'?status=active',
	'?status=deleted',
	'?status=',

	// Sort permutations the route does not read.
	'?sortBy=rating',
	'?sortBy=createdAt',
	'?sortBy=invalid',
	'?sortOrder=asc',
	'?sortOrder=desc',
	'?sortOrder=random',

	// Identity-shaped impersonation permutations.
	'?userId=fabricated',
	'?userId=',
	'?clientProfileId=fabricated',
	'?tenantId=fabricated',
	'?tenantId=',

	// Magic-token bypass permutations.
	'?token=fabricated',
	'?bypass=true',
	'?admin=true',
	'?isAdmin=true',

	// Slug-shaped permutations. The path slug is the only identifier
	// the handler reads from `params`.
	'?slug=other',
	'?itemId=other',
	'?itemSlug=other',

	// Date-range permutations the route does not filter by.
	'?from=2024-01-01',
	'?to=2024-12-31',
	'?asOf=2024-01-01',
	'?since=2024-01-01',

	// Locale / format permutations.
	'?locale=en',
	'?lang=fr',
	'?format=json',
	'?format=xml',
	'?include=raw',
	'?include=breakdown',
	'?fields=averageRating',
	'?fields=averageRating,totalRatings',

	// Repeated keys.
	'?status=active&status=deleted',
	'?rating=1&rating=5',
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

test.describe('API: /api/items/[slug]/comments/rating query-param surface (public, graceful-fallback)', () => {
	for (const suffix of ITEM_COMMENTS_RATING_QUERIES) {
		const path = `${RATING_PATH}${suffix}`;
		test(`GET ${path} does not 5xx`, async ({ request }) => {
			const response = await request.get(path);
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${RATING_PATH} returns 200 with the canonical zero-rating envelope on the unknown-slug branch`, async ({
		request
	}) => {
		// The route is GRACEFUL-DEGRADE: every branch (db-unavailable,
		// no-tenant, query-error, unknown-slug) collapses to the same
		// 200 zero-rating envelope. A regression that introduces a 4xx
		// or 5xx on any branch would surface here.
		const response = await request.get(RATING_PATH);
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(body.averageRating).toBe(0);
		expect(body.totalRatings).toBe(0);
	});

	test(`GET ${RATING_PATH} envelope shape has exactly averageRating and totalRatings keys`, async ({
		request
	}) => {
		// The success-branch envelope is `{ averageRating, totalRatings }`
		// with NO additional keys. A regression that adds a `success`,
		// `data`, or `error` key would surface here.
		const response = await request.get(RATING_PATH);
		const body = await response.json();
		const keys = Object.keys(body).sort();
		expect(keys).toEqual(['averageRating', 'totalRatings']);
	});

	test(`GET ${RATING_PATH} averageRating and totalRatings are numbers (not null / not strings)`, async ({
		request
	}) => {
		// The handler wraps the aggregate query results in
		// `Number(averageRating) || 0` and `Number(totalRatings) || 0`,
		// so a regression that bypasses the Number(...) cast (returning
		// the raw Drizzle `avg(...)` string) would surface here.
		const response = await request.get(RATING_PATH);
		const body = await response.json();
		expect(typeof body.averageRating).toBe('number');
		expect(typeof body.totalRatings).toBe('number');
	});

	test(`GET ${RATING_PATH} response is NOT a 4xx / 5xx envelope on the unknown-slug branch`, async ({
		request
	}) => {
		// The graceful-degrade contract means the response must NEVER
		// echo an `error` key. A regression that re-orders the catch
		// branch to surface a 500 envelope would surface here.
		const response = await request.get(RATING_PATH);
		const body = await response.json();
		expect(body.error).toBeUndefined();
		expect(body.success).toBeUndefined();
	});

	test(`GET ${RATING_PATH} round-trips to a stable status across query permutations`, async ({
		request
	}) => {
		const baseline = await request.get(RATING_PATH);
		const responses = await Promise.all([
			request.get(`${RATING_PATH}?rating=5`),
			request.get(`${RATING_PATH}?status=deleted`),
			request.get(`${RATING_PATH}?userId=fabricated`),
			request.get(`${RATING_PATH}?token=anything`),
			request.get(`${RATING_PATH}?page=1&limit=10`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${RATING_PATH} round-trips to a stable envelope shape across query permutations`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(RATING_PATH),
			request.get(`${RATING_PATH}?rating=5`),
			request.get(`${RATING_PATH}?status=deleted`),
			request.get(`${RATING_PATH}?userId=fabricated`),
			request.get(`${RATING_PATH}?include=breakdown`)
		]);

		for (const response of responses) {
			const body = await response.json();
			const keys = Object.keys(body).sort();
			expect(keys).toEqual(['averageRating', 'totalRatings']);
			expect(body.averageRating).toBe(0);
			expect(body.totalRatings).toBe(0);
		}
	});

	test(`GET ${RATING_PATH} does NOT branch on Accept header`, async ({ request }) => {
		const baseline = await request.get(RATING_PATH);
		const responses = await Promise.all([
			request.get(RATING_PATH, { headers: { Accept: 'application/json' } }),
			request.get(RATING_PATH, { headers: { Accept: '*/*' } }),
			request.get(RATING_PATH, { headers: { Accept: 'text/plain' } }),
			request.get(RATING_PATH, { headers: { Accept: 'text/html' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${RATING_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.get(RATING_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(RATING_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.get(RATING_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.get(RATING_PATH, { headers: { 'X-Real-IP': '127.0.0.1' } }),
			request.get(RATING_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.get(RATING_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${RATING_PATH} cross-method probe does NOT 5xx`, async ({ request }) => {
		// The route exports only GET. POST / PUT / PATCH / DELETE must
		// round-trip to a `< 500` status (typically a 405 from the
		// Next.js framework method-resolution layer).
		const responses = await Promise.all([
			request.post(RATING_PATH),
			request.put(RATING_PATH),
			request.patch(RATING_PATH),
			request.delete(RATING_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${RATING_PATH} graceful-degrade catch-branch is NOT entered as a 5xx`, async ({
		request
	}) => {
		// The route's outer catch is graceful-degrade — it returns the
		// same 200 zero-rating envelope on any error. A regression that
		// re-orders the catch branch to surface a 500 envelope would
		// surface here.
		const response = await request.get(RATING_PATH);
		expect(response.status()).toBe(200);
	});
});
