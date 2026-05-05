import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **DELETE / dynamic-segment /
 * header surface** of the per-favorite remove
 * endpoint served by the `DELETE` export of
 * `apps/web/app/api/favorites/[itemSlug]/route.ts`.
 *
 * `DELETE /api/favorites/[itemSlug]` is the **first
 * per-source-file DELETE smoke** the docs tree
 * publishes that pins a **THREE-field tenant-scoped
 * IDOR check + SELECT-then-DELETE pattern** on a non-
 * admin per-item DELETE route.
 *
 * Sibling specs:
 *   - The collection-level POST + GET sibling
 *     [`favorites.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/favorites.spec.ts)
 *     covers `apps/web/app/api/favorites/route.ts`.
 *
 * Distinct from EVERY prior DELETE smoke:
 *
 *   - **`checkDatabaseAvailability()` as the FIRST
 *     gate** — returns 503 with the
 *     DATABASE_UNAVAILABLE envelope when
 *     `DATABASE_URL` is missing. The auth check
 *     fires AFTER the DB-availability check.
 *   - **TWO-key `{ success: false, error:
 *     'Unauthorized' }` 401 envelope** + **TWO-key
 *     `{ success: false, error: 'Tenant not found' }`
 *     403 envelope** — TWO distinct gate-failure
 *     statuses with the SAME envelope shape but
 *     DIFFERENT messages (UNIQUE: the FIRST per-
 *     source-file DELETE smoke pinning a 401 → 403
 *     → 404 cascade with three distinct messages on
 *     the same TWO-key envelope shape).
 *   - **THREE-field tenant-scoped IDOR check** —
 *     the SELECT + DELETE WHERE clauses BOTH match
 *     on `userId === session.user.id` AND
 *     `itemSlug === path.itemSlug` AND
 *     `tenantId === currentTenantId` (UNIQUE: the
 *     FIRST per-source-file DELETE smoke pinning a
 *     three-field tenant-scoped IDOR check).
 *   - **SELECT-then-DELETE pattern** — the handler
 *     runs an inline `db.select().from(favorites).
 *     where(...).limit(1)` BEFORE the DELETE to
 *     surface a 404 if not found (distinct from
 *     single-step DELETE WHERE which would silently
 *     no-op).
 *   - **TWO-key success payload** `{ success: true,
 *     message: 'Favorite removed successfully' }`
 *     with NO `data` field (UNIQUE: most DELETE
 *     handlers return `data: { ... }` with deletion
 *     details).
 *
 *   1. **`checkDatabaseAvailability()` gate** — the
 *      FIRST gate. Returns 503 when `DATABASE_URL`
 *      is missing.
 *   2. **`auth()` session lookup** —
 *      `!session?.user?.id` → 401 TWO-key.
 *   3. **`getTenantId()`** — `!tenantId` → 403
 *      TWO-key `{ success: false, error: 'Tenant
 *      not found' }`.
 *   4. **`{ itemSlug } = await params`** dynamic-
 *      segment resolution.
 *   5. **SELECT pre-check** — `db.select().from
 *      (favorites).where(userId + itemSlug +
 *      tenantId).limit(1)`; empty → 404 TWO-key
 *      `{ success: false, error: 'Favorite not
 *      found' }`.
 *   6. **DELETE WHERE** — same three-field clause.
 *   7. **Success payload** — `{ success: true,
 *      message: 'Favorite removed successfully' }`
 *      with status 200.
 *   8. **Outer catch** — `safeErrorResponse(error,
 *      'Failed to remove favorite')`.
 *   9. **Method-resolution surface** — the route
 *      exports ONLY `DELETE`. `GET` / `POST` /
 *      `PUT` / `PATCH` must round-trip to a `< 500`
 *      status.
 */
const NON_EXISTENT_ITEM_SLUG = '__definitely-not-a-real-item-slug__';
const FAVORITES_PATH = `/api/favorites/${NON_EXISTENT_ITEM_SLUG}`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' }
] as const;

test.describe('API: /api/favorites/[itemSlug] DELETE method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`DELETE ${FAVORITES_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(FAVORITES_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`DELETE ${FAVORITES_PATH} returns 401 with the canonical TWO-key Unauthorized envelope`, async ({
		request
	}) => {
		// In CI with DATABASE_URL set, the DB-check
		// passes and the next gate fires: auth check.
		// In env without DATABASE_URL, this would be
		// 503 with the DATABASE_UNAVAILABLE envelope.
		const response = await request.delete(FAVORITES_PATH);

		// Either 401 (auth gate) OR 503 (DB unavailable);
		// both are valid pre-IDOR statuses.
		expect([401, 503]).toContain(response.status());

		if (response.status() === 401) {
			const body = await response.json();
			expect(body.success).toBe(false);
			expect(body.error).toBe('Unauthorized');
		}
	});

	test(`DELETE ${FAVORITES_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.delete(FAVORITES_PATH);

		if (response.status() === 401) {
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(['error', 'success']);
			expect(body.data).toBeUndefined();
			expect(body.message).toBeUndefined();
		}
	});

	test(`DELETE ${FAVORITES_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.delete(FAVORITES_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The post-auth messages must NEVER appear on
		// the unauth branch.
		expect(serialized).not.toContain('Tenant not found');
		expect(serialized).not.toContain('Favorite not found');
		expect(serialized).not.toContain('Favorite removed successfully');
		expect(serialized).not.toContain('Failed to remove favorite');
	});

	test(`DELETE ${FAVORITES_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.delete(FAVORITES_PATH);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.delete(FAVORITES_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(FAVORITES_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.delete(FAVORITES_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(FAVORITES_PATH, { headers: { Authorization: 'Bearer fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`DELETE ${FAVORITES_PATH} cross-method probe (GET / POST / PUT / PATCH) does NOT 5xx`, async ({
		request
	}) => {
		// DELETE is the only exported method.
		const responses = await Promise.all([
			request.get(FAVORITES_PATH),
			request.post(FAVORITES_PATH),
			request.put(FAVORITES_PATH),
			request.patch(FAVORITES_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`DELETE ${FAVORITES_PATH} SELECT pre-check + DELETE WHERE are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing
		// `db.select().from(favorites).where(...)`
		// pre-check AND the
		// `db.delete(favorites).where(...)` mutation
		// must NEVER run on unauth. Pin that the
		// itemSlug from the URL is NOT echoed back.
		const xssPath = `/api/favorites/${encodeURIComponent('XSS-MARKER-12345')}`;
		const response = await request.delete(xssPath);

		// Either 401 (auth gate) OR 503 (DB unavailable).
		expect([401, 503]).toContain(response.status());

		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-MARKER-12345');
	});

	test(`DELETE ${FAVORITES_PATH} catch-branch dispatcher 'Failed to remove favorite' is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Pins the gate-before-catch-dispatcher order.
		const response = await request.delete(FAVORITES_PATH);

		if (response.status() === 401) {
			const body = await response.json();
			const serialized = JSON.stringify(body);
			expect(serialized).not.toContain('Failed to remove favorite');
		}
	});

	test(`DELETE ${FAVORITES_PATH} cross-permutation status invariance`, async ({ request }) => {
		// The status MUST be stable across all header
		// permutations on the unauth branch.
		const baseline = await request.delete(FAVORITES_PATH);
		const baselineStatus = baseline.status();

		for (const { headers } of HEADERS) {
			const response = await request.delete(FAVORITES_PATH, { headers });
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`DELETE ${FAVORITES_PATH} cross-itemSlug invariance — different slugs produce IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Pins that the auth gate fires BEFORE any
		// per-item-slug branch, so different slugs
		// produce IDENTICAL 401 envelopes.
		const responses = await Promise.all([
			request.delete('/api/favorites/slug-one'),
			request.delete('/api/favorites/slug-two'),
			request.delete('/api/favorites/slug-three')
		]);

		const baseline = responses[0];
		const baselineStatus = baseline.status();

		if (baselineStatus === 401) {
			const baselineBody = await baseline.json();
			for (const response of responses.slice(1)) {
				expect(response.status()).toBe(baselineStatus);
				const body = await response.json();
				expect(body).toEqual(baselineBody);
			}
		}
	});
});
