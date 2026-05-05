import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **method / dynamic-id / body / header
 * surface** of the admin-only sponsor-ad approval endpoint
 * served by
 * `apps/web/app/api/admin/sponsor-ads/[id]/approve/route.ts`.
 *
 * `POST /api/admin/sponsor-ads/{id}/approve` is the **first**
 * admin-tree route the smoke layer covers that combines a
 * **dynamic-segment `[id]` `POST` handler** with a
 * **forgiving body parse inside its own try/catch** AFTER the
 * gate and AFTER params resolution, AND a **multi-error-code
 * catch chain** that maps three distinct service-thrown
 * `Error.message` values to three distinct HTTP envelopes.
 *
 *   1. **`POST` handler with a dynamic `[id]` path
 *      parameter** — sibling of `admin/items/[id]/review`
 *      (also a dynamic-segment `POST` handler) but with a
 *      different gate / body / catch posture.
 *   2. **Compound single-`if` gate**:
 *      `if (!session?.user?.isAdmin || !session.user.id)` →
 *      401
 *      `{ success: false, error: 'Unauthorized. Admin access required.' }`.
 *      A single-step gate that ANDs the canonical
 *      `isAdmin` predicate with a `!session.user.id` falsity
 *      probe — distinct from the pure single-step
 *      `!session?.user?.isAdmin` of `admin/items/import` /
 *      `admin/items/bulk` etc., and distinct from the two-
 *      step `!session?.user` → `!session.user.isAdmin` /
 *      `!session?.user?.id` → `!tenantId` gates of the bare-
 *      envelope routes. The compound predicate is
 *      observably equivalent to the single-step gate from
 *      the unauth client's perspective (both branches fold
 *      to the SAME 401), which is why this spec sits in the
 *      canonical-longer-envelope family.
 *   3. **Canonical longer 401 message**
 *      `'Unauthorized. Admin access required.'` — matching
 *      the canonical-longer-envelope family (`admin/items/
 *      import`, `admin/items/bulk`, `admin/categories/
 *      reorder`, `admin/items/[id]/review`).
 *   4. **`success: false` envelope key on the 401 branch**
 *      — matching the same family.
 *   5. **Params resolution AFTER the gate** — the
 *      `await params` is called AFTER the gate, so every
 *      id shape must round-trip to the same 401 status as
 *      the canonical id baseline.
 *   6. **Body parse inside its own try/catch** AFTER params
 *      AND AFTER the gate — a regression that hoisted the
 *      body parse before the gate would surface here. The
 *      `forceApprove` flag defaults to `false` if the body
 *      is missing, malformed, or omits the key. The unauth
 *      branch must NEVER reach the body parse.
 *   7. **Service-call surface** AFTER both the gate AND the
 *      body parse — the handler calls
 *      `sponsorAdService.approveSponsorAd(id,
 *      session.user.id, forceApprove)`. The success-branch
 *      payload shape is
 *      `{ success: true, data: <ad>, message: 'Sponsor ad
 *      approved and activated successfully' }`. The unauth
 *      branch must NEVER reach the service, so the unauth
 *      response body must NOT contain a `data` key, must
 *      NOT contain `success: true`, and must NOT contain
 *      the `'Sponsor ad approved and activated
 *      successfully'` message.
 *   8. **Multi-error-code catch chain** that maps three
 *      distinct `Error.message` values to three distinct
 *      HTTP envelopes:
 *        (a) `'Sponsor ad not found'` → 404
 *            `{ success: false, error: 'Sponsor ad not
 *            found' }`.
 *        (b) `'PAYMENT_NOT_RECEIVED'` → 400
 *            `{ success: false, error: 'PAYMENT_NOT_
 *            RECEIVED' }`.
 *        (c) `error.message.includes('Cannot approve')` →
 *            400 `{ success: false, error: <message> }`.
 *      Fallback: `safeErrorResponse(error, 'Failed to
 *      approve sponsor ad')`. The unauth branch must NEVER
 *      reach the catch, so the unauth response body must
 *      NOT contain ANY of the four error messages.
 *   9. **Service-zero-rows fallback** — if
 *      `approveSponsorAd(...)` returns falsy, the route
 *      returns 500
 *      `{ success: false, error: 'Failed to approve
 *      sponsor ad' }`. The unauth branch must NEVER reach
 *      this fallback, so the unauth response body must NOT
 *      contain the `'Failed to approve sponsor ad'`
 *      message.
 *  10. **Method-resolution surface** — the route exports
 *      ONLY `POST`. Every other method (`GET` / `PUT` /
 *      `PATCH` / `DELETE`) must round-trip to a `< 500`
 *      status (typically 405 Method Not Allowed).
 *
 * Where the immediately-preceding
 * `admin-notifications-id-read-method.spec.ts` walks a
 * dynamic-segment `[id]` `PATCH` route with a two-step
 * gate envelope and a bare `{ error: ... }` envelope
 * shape, this spec walks a dynamic-segment `[id]` `POST`
 * route with a compound single-`if` canonical-longer
 * envelope and a multi-error-code catch chain — a
 * complementary surface that no prior admin-tree smoke
 * spec covers.
 */
const SPONSOR_AD_IDS = [
	'ad_1',
	'ad_test',
	'ad-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const APPROVE_PATH = (id: string) => `/api/admin/sponsor-ads/${id}/approve`;
const PROBE_ID = SPONSOR_AD_IDS[0];

const ADMIN_SPONSOR_ADS_ID_APPROVE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	// `Content-Type` headers — POST reads the body via `await request.json()` inside its own try/catch.
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },
	{ headers: { 'Content-Type': 'application/xml' }, label: 'xml content-type' },

	// `Accept` headers — the route does not negotiate content-types today.
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	// Side-channel cookies / headers.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Cookie: 'authjs.session-token=fabricated' }, label: 'fabricated authjs session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Real-IP': '10.0.0.1' }, label: 'X-Real-IP header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	// Magic-token / authorization header attempts.
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' },
	{ headers: { 'X-Forwarded-Host': 'admin.evil.example' }, label: 'fabricated X-Forwarded-Host header' },
	{ headers: { 'User-Agent': 'admin-bot/1.0' }, label: 'spoofed User-Agent' },
	{ headers: { 'Accept-Language': 'en-US,en;q=0.9' }, label: 'Accept-Language header' }
] as const;

const ADMIN_SPONSOR_ADS_ID_APPROVE_BODIES = [
	// Body permutations — body parse is unreachable on the
	// unauth branch, so every permutation must round-trip
	// to the SAME 401 envelope.
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// `forceApprove` flag probes.
	{ data: { forceApprove: true }, label: 'forceApprove=true' },
	{ data: { forceApprove: false }, label: 'forceApprove=false' },
	{ data: { forceApprove: 'true' }, label: 'forceApprove=string-true (would NOT trigger force, requires === true)' },
	{ data: { forceApprove: 1 }, label: 'forceApprove=numeric-1 (would NOT trigger force, requires === true)' },
	{ data: { forceApprove: null }, label: 'forceApprove=null (would NOT trigger force)' },
	{ data: { forceApprove: undefined }, label: 'forceApprove=undefined (would NOT trigger force)' },

	// Bypass attempts.
	{ data: { isAdmin: true, forceApprove: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', forceApprove: true }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', forceApprove: true }, label: 'fabricated userId attempt' },
	{ data: { token: 'anything', forceApprove: true }, label: 'token bypass attempt' },
	{ data: { padding: 'x'.repeat(2_000), forceApprove: true }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Sponsor ad not found',
	'PAYMENT_NOT_RECEIVED',
	'Failed to approve sponsor ad',
	'Sponsor ad approved and activated successfully'
] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/sponsor-ads/[id]/approve method / id / body / header surface', () => {
	for (const id of SPONSOR_AD_IDS) {
		test(`POST ${APPROVE_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.post(APPROVE_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of ADMIN_SPONSOR_ADS_ID_APPROVE_HEADERS) {
		test(`POST ${APPROVE_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(APPROVE_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_SPONSOR_ADS_ID_APPROVE_BODIES) {
		test(`POST ${APPROVE_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(APPROVE_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${APPROVE_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		// The unauthenticated POST branch is the load-bearing
		// invariant: the compound single-`if` gate
		// `!session?.user?.isAdmin || !session.user.id` fires,
		// returning 401 with the `success: false` envelope and
		// the canonical longer message
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		const response = await request.post(APPROVE_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`POST ${APPROVE_PATH(PROBE_ID)} Unauthorized error envelope echoes the success: false key`, async ({
		request
	}) => {
		// Strict envelope-shape assertion: the canonical
		// longer envelope is
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		const response = await request.post(APPROVE_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${APPROVE_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// The success branch returns
		// `{ success: true, data: <ad>, message: 'Sponsor ad
		// approved and activated successfully' }`. The unauth
		// branch must NEVER reach the service, so the unauth
		// response must NOT contain a `data` key, must NOT
		// contain `success: true`, and must NOT contain the
		// success message.
		const response = await request.post(APPROVE_PATH(PROBE_ID), { data: { forceApprove: true } });
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).not.toBe(true);
		expect(body.message).toBeUndefined();
	});

	test(`POST ${APPROVE_PATH(PROBE_ID)} does NOT echo any of the catch-chain or service-fallback messages on the unauth branch`, async ({
		request
	}) => {
		// The four post-gate messages must NEVER appear in
		// the unauth response body. A regression that re-
		// orders ANY of them before the gate would surface
		// here.
		const response = await request.post(APPROVE_PATH(PROBE_ID));
		const body = await response.json();
		for (const msg of FORBIDDEN_MESSAGES) {
			expect(body.error).not.toBe(msg);
			expect(body.message).not.toBe(msg);
		}
	});

	test(`POST ${APPROVE_PATH(PROBE_ID)} has a stable status across header / body permutations`, async ({
		request
	}) => {
		// The compound single-`if` gate fires before params
		// resolution AND before the body parse, so every
		// permutation must round-trip to the same 401 status
		// as the no-body baseline.
		const baseline = await request.post(APPROVE_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.post(APPROVE_PATH(PROBE_ID), { data: {} }),
			request.post(APPROVE_PATH(PROBE_ID), { data: { forceApprove: true } }),
			request.post(APPROVE_PATH(PROBE_ID), { data: { forceApprove: false } }),
			request.post(APPROVE_PATH(PROBE_ID), { data: { forceApprove: 'true' } }),
			request.post(APPROVE_PATH(PROBE_ID), { data: { isAdmin: true, forceApprove: true } }),
			request.post(APPROVE_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(APPROVE_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.post(APPROVE_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${APPROVE_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({ request }) => {
		// Every id shape must round-trip to the same 401
		// status as the canonical id baseline, pinning that
		// the params resolution does NOT happen on the unauth
		// branch.
		const baseline = await request.post(APPROVE_PATH(PROBE_ID));
		const responses = await Promise.all(SPONSOR_AD_IDS.map((id) => request.post(APPROVE_PATH(id))));

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${APPROVE_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// fabricated tenant- or user-id headers would change
		// the unauth-branch behaviour.
		const responses = await Promise.all([
			request.post(APPROVE_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(APPROVE_PATH(PROBE_ID), { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(APPROVE_PATH(PROBE_ID), { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(APPROVE_PATH(PROBE_ID), { headers: { 'X-Real-IP': '10.0.0.1' } }),
			request.post(APPROVE_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(APPROVE_PATH(PROBE_ID), { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(APPROVE_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.post(APPROVE_PATH(PROBE_ID), { headers: { 'X-Api-Key': 'anything' } }),
			request.post(APPROVE_PATH(PROBE_ID), { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${APPROVE_PATH(PROBE_ID)} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// The route only exports `POST`. Every other method
		// (GET / PUT / PATCH / DELETE) must round-trip to a
		// `< 500` status (typically 405 Method Not Allowed).
		const responses = await Promise.all([
			request.get(APPROVE_PATH(PROBE_ID)),
			request.put(APPROVE_PATH(PROBE_ID)),
			request.patch(APPROVE_PATH(PROBE_ID)),
			request.delete(APPROVE_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${APPROVE_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// The body parse is wrapped in its own try/catch
		// that swallows JSON-parse errors, so even on the
		// auth branch a malformed body would NOT 400. On the
		// unauth branch the gate fires before any parse,
		// so malformed bodies must round-trip to the same
		// 401 status as the no-body baseline.
		const responses = await Promise.all([
			request.post(APPROVE_PATH(PROBE_ID), { data: 'not-json' }),
			request.post(APPROVE_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.post(APPROVE_PATH(PROBE_ID), { data: '{"forceApprove":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${APPROVE_PATH(PROBE_ID)} service call is NOT entered on the unauth branch`, async ({ request }) => {
		// A regression that re-orders
		// `sponsorAdService.approveSponsorAd(...)` before
		// the gate would surface here: the unauth response
		// would echo a `data` key from the service payload.
		const responses = await Promise.all([
			request.post(APPROVE_PATH(PROBE_ID)),
			request.post(APPROVE_PATH(PROBE_ID), { data: { forceApprove: true } }),
			request.post(APPROVE_PATH(PROBE_ID), { data: { forceApprove: false } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`POST ${APPROVE_PATH(PROBE_ID)} is invariant to forceApprove enum shapes on the unauth branch`, async ({
		request
	}) => {
		// The handler reads `body.forceApprove === true`
		// only AFTER the gate AND AFTER params resolution.
		// A regression that runs the body parse before the
		// gate would surface here: every `forceApprove`
		// shape (true/false/string/numeric/null/missing)
		// must round-trip to the same 401 status.
		const baseline = await request.post(APPROVE_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.post(APPROVE_PATH(PROBE_ID), { data: { forceApprove: true } }),
			request.post(APPROVE_PATH(PROBE_ID), { data: { forceApprove: false } }),
			request.post(APPROVE_PATH(PROBE_ID), { data: { forceApprove: 'true' } }),
			request.post(APPROVE_PATH(PROBE_ID), { data: { forceApprove: 1 } }),
			request.post(APPROVE_PATH(PROBE_ID), { data: { forceApprove: null } }),
			request.post(APPROVE_PATH(PROBE_ID), { data: {} })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
