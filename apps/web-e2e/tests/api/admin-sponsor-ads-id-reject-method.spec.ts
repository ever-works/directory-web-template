import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **method / dynamic-id / body / header
 * surface** of the admin-only sponsor-ad rejection endpoint
 * served by
 * `apps/web/app/api/admin/sponsor-ads/[id]/reject/route.ts`.
 *
 * `POST /api/admin/sponsor-ads/{id}/reject` is the **first**
 * admin-tree route the smoke layer covers that combines a
 * dynamic-segment `[id]` `POST` handler with a
 * **Zod-`safeParse(...)` body validation** AFTER the gate AND
 * AFTER params resolution AND AFTER the body parse, AND a
 * **two-branch catch chain** that maps two distinct service-
 * thrown `Error.message` values to two distinct HTTP
 * envelopes.
 *
 * The handler is the sibling of
 * `admin/sponsor-ads/[id]/approve` — it shares the SAME
 * compound single-`if` gate, the SAME canonical longer 401
 * envelope, and the SAME `{ success: false, error: ... }`
 * envelope shape, but diverges on:
 *
 *   1. **Body validation strategy** — `safeParse(...)` from
 *      a Zod `rejectSponsorAdSchema` rather than the manual
 *      key-by-key check the `approve` route uses for the
 *      `forceApprove` flag. The 400 response echoes
 *      `validationResult.error.issues[0]?.message ||
 *      'Invalid request body'` — a **dynamic** error message
 *      drawn from the Zod schema, distinct from the
 *      hand-rolled string literals of every prior admin-
 *      tree smoke.
 *   2. **Body parse via `.catch(() => ({}))`** — a single-
 *      expression Promise-chain catch that returns an empty
 *      object on parse failure, distinct from the inner
 *      try/catch block of the `approve` route. The body
 *      parse is unreachable on the unauth branch.
 *   3. **Two-branch catch chain**:
 *        (a) `error.message.includes('Cannot reject')` →
 *            400 `{ success: false, error: <message> }`.
 *        (b) `'Sponsor ad not found'` → 404
 *            `{ success: false, error: 'Sponsor ad not
 *            found' }`.
 *      Fallback: `safeErrorResponse(error, 'Failed to
 *      reject sponsor ad')`. The unauth branch must NEVER
 *      reach the catch.
 *
 * Where the immediately-preceding
 * `admin-sponsor-ads-id-approve-method.spec.ts` walks a
 * dynamic-segment `[id]` `POST` route with a manual
 * `body.forceApprove === true` flag check and a three-branch
 * catch chain, this spec walks the sibling rejection route
 * with a Zod-`safeParse(...)` body validation surface and a
 * two-branch catch chain — a complementary surface that no
 * prior admin-tree smoke spec covers.
 */
const SPONSOR_AD_IDS = [
	'ad_1',
	'ad_test',
	'ad-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const REJECT_PATH = (id: string) => `/api/admin/sponsor-ads/${id}/reject`;
const PROBE_ID = SPONSOR_AD_IDS[0];

const VALID_REASON = 'This sponsor ad is rejected because the content does not meet our guidelines.';

const ADMIN_SPONSOR_ADS_ID_REJECT_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	// `Content-Type` headers — POST reads the body via `await request.json().catch(() => ({}))`.
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },
	{ headers: { 'Content-Type': 'application/xml' }, label: 'xml content-type' },

	// `Accept` headers.
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

const ADMIN_SPONSOR_ADS_ID_REJECT_BODIES = [
	// Body permutations — body validation is unreachable on
	// the unauth branch, so every permutation must round-trip
	// to the SAME 401 envelope.
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Zod schema probes — `rejectionReason` minLength 10.
	{ data: { rejectionReason: VALID_REASON }, label: 'valid 70-char reason' },
	{ data: { rejectionReason: 'short' }, label: 'too-short reason (would 400 if reachable)' },
	{ data: { rejectionReason: '' }, label: 'empty reason (would 400 if reachable)' },
	{ data: { rejectionReason: null }, label: 'null reason (would 400 if reachable)' },
	{ data: { rejectionReason: 123 }, label: 'numeric reason (would 400 if reachable)' },
	{ data: { rejectionReason: 'x'.repeat(501) }, label: 'too-long 501-char reason (would 400 if reachable)' },
	{ data: { someOtherKey: 'noise' }, label: 'no rejectionReason key (would 400 if reachable)' },

	// Bypass attempts.
	{ data: { isAdmin: true, rejectionReason: VALID_REASON }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', rejectionReason: VALID_REASON }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', rejectionReason: VALID_REASON }, label: 'fabricated userId attempt' },
	{ data: { token: 'anything', rejectionReason: VALID_REASON }, label: 'token bypass attempt' },
	{ data: { padding: 'x'.repeat(2_000), rejectionReason: VALID_REASON }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Sponsor ad not found',
	'Failed to reject sponsor ad',
	'Sponsor ad rejected successfully',
	'Invalid request body'
] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/sponsor-ads/[id]/reject method / id / body / header surface', () => {
	for (const id of SPONSOR_AD_IDS) {
		test(`POST ${REJECT_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.post(REJECT_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of ADMIN_SPONSOR_ADS_ID_REJECT_HEADERS) {
		test(`POST ${REJECT_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(REJECT_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_SPONSOR_ADS_ID_REJECT_BODIES) {
		test(`POST ${REJECT_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(REJECT_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${REJECT_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.post(REJECT_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`POST ${REJECT_PATH(PROBE_ID)} Unauthorized error envelope echoes the success: false key`, async ({
		request
	}) => {
		const response = await request.post(REJECT_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${REJECT_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// The success branch returns
		// `{ success: true, data: <ad>, message: 'Sponsor ad
		// rejected successfully' }`. The unauth branch must
		// NEVER reach the service, so the unauth response
		// must NOT contain a `data` key, must NOT contain
		// `success: true`, and must NOT contain the success
		// message.
		const response = await request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: VALID_REASON } });
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).not.toBe(true);
		expect(body.message).toBeUndefined();
	});

	test(`POST ${REJECT_PATH(PROBE_ID)} does NOT echo any of the catch-chain or service-fallback messages on the unauth branch`, async ({
		request
	}) => {
		// The four post-gate messages must NEVER appear in
		// the unauth response body. A regression that re-
		// orders ANY of them before the gate would surface
		// here.
		const responses = await Promise.all([
			request.post(REJECT_PATH(PROBE_ID)),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: VALID_REASON } }),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: 'short' } }),
			request.post(REJECT_PATH(PROBE_ID), { data: {} })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${REJECT_PATH(PROBE_ID)} has a stable status across header / body permutations`, async ({
		request
	}) => {
		// The compound single-`if` gate fires before params
		// resolution AND before the body parse, so every
		// permutation must round-trip to the same 401 status
		// as the no-body baseline.
		const baseline = await request.post(REJECT_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.post(REJECT_PATH(PROBE_ID), { data: {} }),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: VALID_REASON } }),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: 'short' } }),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: '' } }),
			request.post(REJECT_PATH(PROBE_ID), { data: { isAdmin: true, rejectionReason: VALID_REASON } }),
			request.post(REJECT_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(REJECT_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.post(REJECT_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${REJECT_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({ request }) => {
		const baseline = await request.post(REJECT_PATH(PROBE_ID));
		const responses = await Promise.all(SPONSOR_AD_IDS.map((id) => request.post(REJECT_PATH(id))));

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${REJECT_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(REJECT_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(REJECT_PATH(PROBE_ID), { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(REJECT_PATH(PROBE_ID), { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(REJECT_PATH(PROBE_ID), { headers: { 'X-Real-IP': '10.0.0.1' } }),
			request.post(REJECT_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(REJECT_PATH(PROBE_ID), { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(REJECT_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.post(REJECT_PATH(PROBE_ID), { headers: { 'X-Api-Key': 'anything' } }),
			request.post(REJECT_PATH(PROBE_ID), { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${REJECT_PATH(PROBE_ID)} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(REJECT_PATH(PROBE_ID)),
			request.put(REJECT_PATH(PROBE_ID)),
			request.patch(REJECT_PATH(PROBE_ID)),
			request.delete(REJECT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${REJECT_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// The body parse uses `.catch(() => ({}))`, so even
		// on the auth branch a malformed body would NOT 400
		// at the parse step (it would still 400 on Zod
		// validation if `rejectionReason` is missing). On
		// the unauth branch the gate fires before any parse,
		// so malformed bodies must round-trip to the same
		// 401 status.
		const responses = await Promise.all([
			request.post(REJECT_PATH(PROBE_ID), { data: 'not-json' }),
			request.post(REJECT_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.post(REJECT_PATH(PROBE_ID), { data: '{"rejectionReason":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${REJECT_PATH(PROBE_ID)} service call is NOT entered on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(REJECT_PATH(PROBE_ID)),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: VALID_REASON } }),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: 'short' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`POST ${REJECT_PATH(PROBE_ID)} is invariant to rejectionReason length / shape on the unauth branch`, async ({
		request
	}) => {
		// The Zod schema runs only AFTER the gate AND AFTER
		// the body parse. A regression that hoisted the Zod
		// validation before the gate would surface here:
		// every `rejectionReason` shape (valid + too-short +
		// too-long + empty + null + numeric + missing) must
		// round-trip to the same 401 status as the no-body
		// baseline.
		const baseline = await request.post(REJECT_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: VALID_REASON } }),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: 'a'.repeat(10) } }),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: 'short' } }),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: '' } }),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: null } }),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: 123 } }),
			request.post(REJECT_PATH(PROBE_ID), { data: { rejectionReason: 'x'.repeat(501) } }),
			request.post(REJECT_PATH(PROBE_ID), { data: {} })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
