import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **method / dynamic-id / body / header
 * surface** of the admin-only sponsor-ad cancellation endpoint
 * served by
 * `apps/web/app/api/admin/sponsor-ads/[id]/cancel/route.ts`.
 *
 * `POST /api/admin/sponsor-ads/{id}/cancel` is the **first**
 * admin-tree route the smoke layer covers that combines:
 *   - a dynamic-segment `[id]` `POST` handler with a
 *     **pure single-step `!session?.user?.isAdmin` gate**
 *     (NOT the compound `!isAdmin || !id` gate of the
 *     sibling `approve` / `reject` routes), AND
 *   - a Zod-`safeParse(...)` body validation against an
 *     **optional-only** schema (`cancelReason` has only
 *     `maxLength: 500` and is NOT required), AND
 *   - a **reverse-ordered two-branch catch chain** that
 *     puts the not-found 404 branch BEFORE the
 *     `Cannot cancel` 400 branch — distinct from the
 *     sibling `reject` route which puts `Cannot reject`
 *     400 BEFORE `Sponsor ad not found` 404.
 *
 * The handler shares the SAME canonical longer 401 envelope
 * and the SAME `{ success: false, error: ... }` envelope
 * shape with every prior canonical-longer-envelope smoke,
 * but pins these three divergences:
 *
 *   1. **Pure single-step `!session?.user?.isAdmin` gate**
 *      — a single-step gate that ONLY checks `isAdmin`,
 *      distinct from the compound `!isAdmin || !id` gate
 *      of the sibling `approve` / `reject` routes. The
 *      gate envelope is observably the same on the unauth
 *      branch.
 *   2. **Optional-only Zod schema** — `cancelReason` is
 *      OPTIONAL with a `maxLength: 500` constraint only.
 *      A missing / undefined / null `cancelReason` would
 *      pass validation on the auth branch (whereas the
 *      sibling `reject` route requires `rejectionReason`
 *      with `minLength: 10`). The unauth branch must
 *      NEVER reach the validation step regardless.
 *   3. **Reverse-ordered two-branch catch chain**:
 *        (a) `'Sponsor ad not found'` → 404 — fires
 *            FIRST.
 *        (b) `error.message.includes('Cannot cancel')` →
 *            400 — fires SECOND.
 *      Fallback: `safeErrorResponse(error, 'Failed to
 *      cancel sponsor ad')`. The unauth branch must
 *      NEVER reach the catch.
 *
 * Where the immediately-preceding
 * `admin-sponsor-ads-id-reject-method.spec.ts` walks the
 * sibling rejection route with a required-`rejectionReason`
 * Zod schema and a `'Cannot reject'`-first two-branch
 * catch chain, this spec walks the cancellation route with
 * an optional-`cancelReason` Zod schema and a `'Sponsor ad
 * not found'`-first two-branch catch chain — a
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

const CANCEL_PATH = (id: string) => `/api/admin/sponsor-ads/${id}/cancel`;
const PROBE_ID = SPONSOR_AD_IDS[0];

const VALID_REASON = 'Cancelling because the campaign is over.';

const ADMIN_SPONSOR_ADS_ID_CANCEL_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },
	{ headers: { 'Content-Type': 'application/xml' }, label: 'xml content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Cookie: 'authjs.session-token=fabricated' }, label: 'fabricated authjs session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Real-IP': '10.0.0.1' }, label: 'X-Real-IP header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' },
	{ headers: { 'X-Forwarded-Host': 'admin.evil.example' }, label: 'fabricated X-Forwarded-Host header' },
	{ headers: { 'User-Agent': 'admin-bot/1.0' }, label: 'spoofed User-Agent' },
	{ headers: { 'Accept-Language': 'en-US,en;q=0.9' }, label: 'Accept-Language header' }
] as const;

const ADMIN_SPONSOR_ADS_ID_CANCEL_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would pass validation if reachable, cancelReason optional)' },

	// Zod schema probes — `cancelReason` is OPTIONAL maxLength 500.
	{ data: { cancelReason: VALID_REASON }, label: 'valid 40-char reason' },
	{ data: { cancelReason: '' }, label: 'empty reason (would pass on auth branch, cancelReason optional)' },
	{ data: { cancelReason: null }, label: 'null reason (would pass on auth branch, cancelReason optional)' },
	{ data: { cancelReason: undefined }, label: 'undefined reason (would pass on auth branch, cancelReason optional)' },
	{ data: { cancelReason: 'x'.repeat(501) }, label: 'too-long 501-char reason (would 400 if reachable)' },
	{ data: { cancelReason: 123 }, label: 'numeric reason (would 400 if reachable)' },

	// Bypass attempts.
	{ data: { isAdmin: true, cancelReason: VALID_REASON }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', cancelReason: VALID_REASON }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', cancelReason: VALID_REASON }, label: 'fabricated userId attempt' },
	{ data: { token: 'anything', cancelReason: VALID_REASON }, label: 'token bypass attempt' },
	{ data: { padding: 'x'.repeat(2_000), cancelReason: VALID_REASON }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Sponsor ad not found',
	'Failed to cancel sponsor ad',
	'Sponsor ad cancelled successfully',
	'Invalid request body'
] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/sponsor-ads/[id]/cancel method / id / body / header surface', () => {
	for (const id of SPONSOR_AD_IDS) {
		test(`POST ${CANCEL_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.post(CANCEL_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of ADMIN_SPONSOR_ADS_ID_CANCEL_HEADERS) {
		test(`POST ${CANCEL_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(CANCEL_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_SPONSOR_ADS_ID_CANCEL_BODIES) {
		test(`POST ${CANCEL_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(CANCEL_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${CANCEL_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.post(CANCEL_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`POST ${CANCEL_PATH(PROBE_ID)} Unauthorized error envelope echoes the success: false key`, async ({
		request
	}) => {
		const response = await request.post(CANCEL_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
	});

	test(`POST ${CANCEL_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// The success branch returns
		// `{ success: true, data: <ad>, message: 'Sponsor ad
		// cancelled successfully' }`. The unauth branch must
		// NEVER reach the service.
		const response = await request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: VALID_REASON } });
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).not.toBe(true);
		expect(body.message).toBeUndefined();
	});

	test(`POST ${CANCEL_PATH(PROBE_ID)} does NOT echo any of the catch-chain or service-fallback messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(CANCEL_PATH(PROBE_ID)),
			request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: VALID_REASON } }),
			request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: 'x'.repeat(501) } }),
			request.post(CANCEL_PATH(PROBE_ID), { data: {} })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${CANCEL_PATH(PROBE_ID)} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(CANCEL_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.post(CANCEL_PATH(PROBE_ID), { data: {} }),
			request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: VALID_REASON } }),
			request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: 'x'.repeat(501) } }),
			request.post(CANCEL_PATH(PROBE_ID), { data: { isAdmin: true, cancelReason: VALID_REASON } }),
			request.post(CANCEL_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(CANCEL_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.post(CANCEL_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${CANCEL_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({ request }) => {
		const baseline = await request.post(CANCEL_PATH(PROBE_ID));
		const responses = await Promise.all(SPONSOR_AD_IDS.map((id) => request.post(CANCEL_PATH(id))));

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${CANCEL_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CANCEL_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(CANCEL_PATH(PROBE_ID), { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(CANCEL_PATH(PROBE_ID), { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(CANCEL_PATH(PROBE_ID), { headers: { 'X-Real-IP': '10.0.0.1' } }),
			request.post(CANCEL_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(CANCEL_PATH(PROBE_ID), { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(CANCEL_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.post(CANCEL_PATH(PROBE_ID), { headers: { 'X-Api-Key': 'anything' } }),
			request.post(CANCEL_PATH(PROBE_ID), { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CANCEL_PATH(PROBE_ID)} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(CANCEL_PATH(PROBE_ID)),
			request.put(CANCEL_PATH(PROBE_ID)),
			request.patch(CANCEL_PATH(PROBE_ID)),
			request.delete(CANCEL_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CANCEL_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// The body parse uses `.catch(() => ({}))`, so even
		// on the auth branch a malformed body would NOT 400
		// at the parse step. On the unauth branch the gate
		// fires before any parse.
		const responses = await Promise.all([
			request.post(CANCEL_PATH(PROBE_ID), { data: 'not-json' }),
			request.post(CANCEL_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.post(CANCEL_PATH(PROBE_ID), { data: '{"cancelReason":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CANCEL_PATH(PROBE_ID)} service call is NOT entered on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CANCEL_PATH(PROBE_ID)),
			request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: VALID_REASON } }),
			request.post(CANCEL_PATH(PROBE_ID), { data: {} })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`POST ${CANCEL_PATH(PROBE_ID)} is invariant to cancelReason length / shape on the unauth branch`, async ({
		request
	}) => {
		// `cancelReason` is OPTIONAL with maxLength 500. On
		// the auth branch every shape (missing / empty /
		// null / undefined / short / 500-char-boundary)
		// would pass validation, while a 501-char or numeric
		// shape would 400. On the unauth branch every shape
		// must round-trip to the same 401 status.
		const baseline = await request.post(CANCEL_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.post(CANCEL_PATH(PROBE_ID), { data: {} }),
			request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: '' } }),
			request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: null } }),
			request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: VALID_REASON } }),
			request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: 'x'.repeat(500) } }),
			request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: 'x'.repeat(501) } }),
			request.post(CANCEL_PATH(PROBE_ID), { data: { cancelReason: 123 } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
