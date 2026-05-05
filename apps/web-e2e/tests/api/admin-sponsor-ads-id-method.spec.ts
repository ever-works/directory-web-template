import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-id /
 * header surface** of the admin-only single-sponsor-ad CRUD
 * endpoint served by
 * `apps/web/app/api/admin/sponsor-ads/[id]/route.ts`.
 *
 * `GET /api/admin/sponsor-ads/{id}` and
 * `DELETE /api/admin/sponsor-ads/{id}` are the **first**
 * admin-tree routes the smoke layer covers as a
 * **GET + DELETE-only dual-method export** (no PUT — the
 * sponsor-ad write path is split across the sibling
 * `[id]/approve`, `[id]/reject`, and `[id]/cancel` action
 * routes which the smoke layer already covers separately).
 * They are also the **first** dual-method admin smoke that
 * combines:
 *   - a **canonical longer 401 envelope** on the
 *     unauth branch, AND
 *   - **divergent catch postures** between the two
 *     handlers — GET uses a bare `console.error` + 500
 *     `'Failed to fetch sponsor ad'` catch, while DELETE
 *     uses an `error.message === 'Sponsor ad not found'`
 *     → 404 narrow-match catch followed by a
 *     `safeErrorResponse(error, 'Failed to delete sponsor
 *     ad')` fallback. A regression that aligned the two
 *     handlers' catch postures would surface as the
 *     wrong envelope on the auth branch.
 *
 * Both handlers share:
 *   1. **Single-step inline `!session?.user?.isAdmin`
 *      gate** → 401 `{ success: false, error:
 *      'Unauthorized. Admin access required.' }`.
 *      Identical across `GET` and `DELETE`.
 *   2. **Canonical longer 401 message** matching the
 *      canonical-longer-envelope family.
 *   3. **`success: false` envelope key** on the 401
 *      branch with strict envelope-shape
 *      `Object.keys(body).sort() === ['error',
 *      'success']`.
 *   4. **Dynamic `[id]` segment** resolved AFTER the
 *      gate.
 *
 * Each handler also has its own divergent post-gate
 * surface:
 *
 *   GET:
 *     - No body parse.
 *     - `sponsorAdService.getSponsorAdWithUser(id)` → 404
 *       `'Sponsor ad not found'` if missing.
 *     - Success payload `{ success: true, data:
 *       <sponsorAd> }`.
 *     - Catch posture: `console.error('Error fetching
 *       sponsor ad:', error)` + 500
 *       `{ success: false, error: 'Failed to fetch
 *       sponsor ad' }`. Distinct from the
 *       `safeErrorResponse(...)` catch of every other
 *       admin GET smoke that uses the canonical longer
 *       envelope.
 *
 *   DELETE:
 *     - No body parse.
 *     - `sponsorAdService.deleteSponsorAd(id)` — calls
 *       directly, with no inline existence check (the
 *       service throws `'Sponsor ad not found'` on
 *       missing).
 *     - Catch posture: `error.message === 'Sponsor ad
 *       not found'` → 404 narrow-match (echoing the
 *       service-thrown message), else
 *       `safeErrorResponse(error, 'Failed to delete
 *       sponsor ad')` fallback. The first admin DELETE
 *       smoke where the catch chain begins with a
 *       narrow-match equality check on a service-
 *       thrown sentinel.
 *     - Success payload `{ success: true, message:
 *       'Sponsor ad deleted successfully' }` (NO `data`
 *       key — distinct from GET).
 *
 * Where the immediately-preceding sibling specs
 * (`admin-sponsor-ads-id-approve-method.spec.ts`,
 * `admin-sponsor-ads-id-reject-method.spec.ts`,
 * `admin-sponsor-ads-id-cancel-method.spec.ts`) walk the
 * three nested-`[id]/<action>` POST-only routes for the
 * sponsor-ad write path, this spec walks the leaf-`[id]`
 * GET + DELETE root route — closing the sponsor-ad-area
 * smoke coverage for the smoke layer.
 */
const SPONSOR_AD_IDS = [
	'ad_1',
	'ad_test',
	'ad-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const SPONSOR_AD_PATH = (id: string) => `/api/admin/sponsor-ads/${id}`;
const PROBE_ID = SPONSOR_AD_IDS[0];

const COMMON_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Cookie: 'authjs.session-token=fabricated' }, label: 'fabricated authjs session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Sponsor ad not found',
	'Failed to fetch sponsor ad',
	'Failed to delete sponsor ad',
	'Sponsor ad deleted successfully'
] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/sponsor-ads/[id] GET / DELETE method / id / header surface', () => {
	for (const id of SPONSOR_AD_IDS) {
		test(`GET ${SPONSOR_AD_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(SPONSOR_AD_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${SPONSOR_AD_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.delete(SPONSOR_AD_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${SPONSOR_AD_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(SPONSOR_AD_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${SPONSOR_AD_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(SPONSOR_AD_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${SPONSOR_AD_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.get(SPONSOR_AD_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`DELETE ${SPONSOR_AD_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.delete(SPONSOR_AD_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`GET / DELETE ${SPONSOR_AD_PATH(PROBE_ID)} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(SPONSOR_AD_PATH(PROBE_ID)),
			request.delete(SPONSOR_AD_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		}
	});

	test(`GET / DELETE ${SPONSOR_AD_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		const [getResponse, deleteResponse] = await Promise.all([
			request.get(SPONSOR_AD_PATH(PROBE_ID)),
			request.delete(SPONSOR_AD_PATH(PROBE_ID))
		]);

		const [getBody, deleteBody] = await Promise.all([getResponse.json(), deleteResponse.json()]);
		expect(getBody).toEqual(deleteBody);
	});

	test(`GET / DELETE ${SPONSOR_AD_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// GET success: { success: true, data: <sponsorAd> }.
		// DELETE success: { success: true, message: 'Sponsor ad deleted successfully' }.
		const responses = await Promise.all([
			request.get(SPONSOR_AD_PATH(PROBE_ID)),
			request.delete(SPONSOR_AD_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / DELETE ${SPONSOR_AD_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(SPONSOR_AD_PATH(PROBE_ID)),
			request.delete(SPONSOR_AD_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`GET / DELETE ${SPONSOR_AD_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(SPONSOR_AD_PATH(PROBE_ID));
		const deleteBaseline = await request.delete(SPONSOR_AD_PATH(PROBE_ID));

		const getResponses = await Promise.all(SPONSOR_AD_IDS.map((id) => request.get(SPONSOR_AD_PATH(id))));
		const deleteResponses = await Promise.all(SPONSOR_AD_IDS.map((id) => request.delete(SPONSOR_AD_PATH(id))));

		for (const response of getResponses) {
			expect(response.status()).toBe(getBaseline.status());
		}
		for (const response of deleteResponses) {
			expect(response.status()).toBe(deleteBaseline.status());
		}
	});

	test(`GET / DELETE ${SPONSOR_AD_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(SPONSOR_AD_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(SPONSOR_AD_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(SPONSOR_AD_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.delete(SPONSOR_AD_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(SPONSOR_AD_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(SPONSOR_AD_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${SPONSOR_AD_PATH(PROBE_ID)} cross-method probe (POST / PUT / PATCH) does NOT 5xx`, async ({ request }) => {
		// The route exports only `GET` and `DELETE`. POST /
		// PUT / PATCH must round-trip to a `< 500` status
		// (typically 405 Method Not Allowed).
		const responses = await Promise.all([
			request.post(SPONSOR_AD_PATH(PROBE_ID)),
			request.put(SPONSOR_AD_PATH(PROBE_ID)),
			request.patch(SPONSOR_AD_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / DELETE ${SPONSOR_AD_PATH(PROBE_ID)} service call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `sponsorAdService.getSponsorAdWithUser(...)` /
		// `sponsorAdService.deleteSponsorAd(...)` before
		// the gate would surface here.
		const responses = await Promise.all([
			request.get(SPONSOR_AD_PATH(PROBE_ID)),
			request.delete(SPONSOR_AD_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`DELETE ${SPONSOR_AD_PATH(PROBE_ID)} narrow-match catch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, the DELETE catch chain begins
		// with a narrow-match equality check on
		// `error.message === 'Sponsor ad not found'` that
		// returns 404 with the service-thrown sentinel
		// message. The unauth branch must NEVER reach this
		// catch step, so the unauth response must NEVER
		// echo the `'Sponsor ad not found'` message.
		const response = await request.delete(SPONSOR_AD_PATH(PROBE_ID));
		const body = await response.json();
		expect(body.error).not.toBe('Sponsor ad not found');
		expect(body.error).toBe(CANONICAL_401_MESSAGE);
	});

	test(`GET / DELETE ${SPONSOR_AD_PATH(PROBE_ID)} unauth response does NOT echo any of the per-handler catch messages`, async ({
		request
	}) => {
		// The two per-handler catches use distinct messages
		// (`'Failed to fetch sponsor ad'` vs `'Failed to
		// delete sponsor ad'`). A regression that swapped
		// them would surface as the wrong message echoing
		// on the auth branch; the unauth branch must NOT
		// echo either.
		const responses = await Promise.all([
			request.get(SPONSOR_AD_PATH(PROBE_ID)),
			request.delete(SPONSOR_AD_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Failed to fetch sponsor ad');
			expect(body.error).not.toBe('Failed to delete sponsor ad');
		}
	});
});
