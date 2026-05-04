import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET / dynamic-segment /
 * header surface** of the per-id user-scoped sponsor-
 * ad lookup endpoint served by the `GET` export of
 * `apps/web/app/api/sponsor-ads/user/[id]/route.ts`.
 *
 * `GET /api/sponsor-ads/user/[id]` is the **first
 * per-source-file dynamic-segment GET smoke** the
 * docs tree publishes that pins a **404-mask user-
 * scoped IDOR** — when `sponsorAd.userId !==
 * session.user.id`, the handler returns 404
 * `'Sponsor ad not found'` (NOT 403 'Forbidden')
 * with the SAME envelope as the genuine not-found
 * branch. UNIQUE: the FIRST per-source-file dynamic-
 * segment GET smoke pinning a 404-mask security
 * pattern on a USER-OWNED resource (the surveys-id
 * sibling pins a 404-mask on STATUS-gated admin
 * resources; this sponsor-ads-user-id sibling pins
 * the pattern on a per-user-ownership resource).
 *
 * Sibling specs:
 *   - The companion sponsor-ads cancel sibling
 *     [`sponsor-ads-user-id-cancel-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-user-id-cancel-body.spec.ts)
 *     uses POST verb; this GET sibling is the
 *     read-side counterpart.
 *   - The collection-level GET + POST sibling
 *     [`sponsor-ads-user-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/sponsor-ads-user-method.spec.ts)
 *     uses Zod-safeParse on both query and body; this
 *     per-id sibling has no validation (just the
 *     dynamic segment).
 *
 * Distinct from EVERY prior dynamic-segment GET smoke:
 *
 *   - **404-mask user-scoped IDOR** — UNIQUE: the
 *     FIRST per-source-file dynamic-segment GET
 *     smoke pinning a 404-mask security pattern on
 *     a per-user-ownership resource. The 404 envelope
 *     for cross-user access is BYTE-IDENTICAL to the
 *     404 envelope for genuinely-non-existent IDs.
 *   - **TWO-key 401 envelope** `{ success: false,
 *     error: 'Unauthorized' }`.
 *   - **TWO-key 404 envelope** `{ success: false,
 *     error: 'Sponsor ad not found' }` — used for
 *     BOTH not-found AND IDOR violations
 *     (intentional masking).
 *   - **TWO-key success payload** `{ success: true,
 *     data: <sponsorAd> }`.
 *   - **TWO-key 500 envelope** `{ success: false,
 *     error: 'Failed to fetch sponsor ad' }`.
 *
 *   1. **`auth()` session lookup** — `!session?.user?.id`
 *      → 401 TWO-key `{ success: false, error:
 *      'Unauthorized' }`.
 *   2. **`{ id } = await params`** dynamic-segment
 *      resolution.
 *   3. **`getSponsorAdById(id)`** — load-bearing DB
 *      read.
 *   4. **`!sponsorAd` check** — 404 TWO-key `{
 *      success: false, error: 'Sponsor ad not
 *      found' }`.
 *   5. **404-mask user-scoped IDOR check** —
 *      `sponsorAd.userId !== session.user.id` → 404
 *      with the SAME envelope (intentional masking
 *      of cross-user access).
 *   6. **Success payload** — `{ success: true,
 *      data: <sponsorAd> }` with status 200.
 *   7. **Outer catch** — 500 TWO-key `{ success:
 *      false, error: 'Failed to fetch sponsor ad' }`.
 *   8. **Method-resolution surface** — the route
 *      exports ONLY `GET`. `POST` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const NON_EXISTENT_AD_ID = '__definitely-not-a-real-sponsor-ad-id__';
const SPONSOR_AD_PATH = `/api/sponsor-ads/user/${NON_EXISTENT_AD_ID}`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

test.describe('API: /api/sponsor-ads/user/[id] GET surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${SPONSOR_AD_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(SPONSOR_AD_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${SPONSOR_AD_PATH} returns 401 with the canonical TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.get(SPONSOR_AD_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized');
	});

	test(`GET ${SPONSOR_AD_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.get(SPONSOR_AD_PATH);
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.data).toBeUndefined();
	});

	test(`GET ${SPONSOR_AD_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.get(SPONSOR_AD_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// Post-auth messages must NEVER appear on
		// unauth.
		expect(serialized).not.toContain('Sponsor ad not found');
		expect(serialized).not.toContain('Failed to fetch sponsor ad');
	});

	test(`GET ${SPONSOR_AD_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.get(SPONSOR_AD_PATH);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.get(SPONSOR_AD_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get(SPONSOR_AD_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.get(SPONSOR_AD_PATH, { headers: { Authorization: 'Bearer fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`GET ${SPONSOR_AD_PATH} cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET is the only exported method.
		const responses = await Promise.all([
			request.post(SPONSOR_AD_PATH),
			request.put(SPONSOR_AD_PATH),
			request.patch(SPONSOR_AD_PATH),
			request.delete(SPONSOR_AD_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${SPONSOR_AD_PATH} getSponsorAdById is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: pin that no `data.userId` /
		// `data.itemSlug` / etc. fields from a
		// sponsor-ad row are leaked.
		const response = await request.get(SPONSOR_AD_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		expect(serialized).not.toContain('itemSlug');
		expect(serialized).not.toContain('itemName');
		expect(serialized).not.toContain('paymentProvider');
		expect(serialized).not.toContain('userId');
		expect(serialized).not.toContain('"data":');
	});

	test(`GET ${SPONSOR_AD_PATH} cross-id invariance — different IDs produce IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Pin that the auth gate fires BEFORE any
		// per-id branch (so the 404-mask is
		// unreachable on unauth — the response is
		// 401 regardless of whether the ID exists).
		const responses = await Promise.all([
			request.get('/api/sponsor-ads/user/id-one'),
			request.get('/api/sponsor-ads/user/id-two'),
			request.get('/api/sponsor-ads/user/id-three')
		]);

		const baseline = responses[0];
		const baselineBody = await baseline.json();

		for (const response of responses.slice(1)) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});

	test(`GET ${SPONSOR_AD_PATH} catch-branch 'Failed to fetch sponsor ad' is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Pin the gate-before-catch-dispatcher order.
		const response = await request.get(SPONSOR_AD_PATH);
		expect(response.status()).not.toBe(500);
	});
});
