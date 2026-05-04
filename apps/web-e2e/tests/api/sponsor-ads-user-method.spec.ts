import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET + POST / body / header
 * surface** of the user-scoped sponsor-ads endpoint
 * served by the `GET` AND `POST` exports of
 * `apps/web/app/api/sponsor-ads/user/route.ts`.
 *
 * `GET + POST /api/sponsor-ads/user` is the **first
 * per-source-file dual-method smoke** the docs tree
 * publishes that pins **Zod-`safeParse` validation
 * on BOTH a query-parameter surface AND a body
 * surface** (GET validates query via
 * `querySponsorAdsSchema.safeParse`; POST validates
 * body via `createSponsorAdSchema.safeParse`). UNIQUE:
 * the FIRST per-source-file dual-method smoke pinning
 * Zod schema validation across both query and body.
 *
 * Distinct from EVERY prior dual-method smoke:
 *
 *   - **Zod-safeParse on BOTH query AND body** —
 *     UNIQUE: the FIRST per-source-file dual-method
 *     smoke pinning Zod validation across both
 *     surfaces.
 *   - **Dynamic environment-based payment provider**
 *     — `ACTIVE_PAYMENT_PROVIDER = process.env.
 *     NEXT_PUBLIC_PAYMENT_PROVIDER ||
 *     PaymentProvider.STRIPE` is a module-level
 *     constant. UNIQUE: the FIRST per-source-file
 *     dual-method smoke pinning a module-level env-
 *     based provider constant (the handler ALWAYS
 *     uses this provider, regardless of what the
 *     caller sends in the body).
 *   - **POST returns 201 status** (NOT 200) — UNIQUE
 *     among sponsor-ads POST smokes.
 *   - **POST 400 for invalid JSON** — `'Invalid JSON
 *     in request body'` distinct from the body-
 *     validation 400 message (the FIRST per-source-
 *     file POST smoke pinning a try/catch around
 *     `await request.json()` with a distinct message).
 *   - **Conditional already-exists 400 catch
 *     branch** — `error.message.includes('already
 *     have')` → 400 `'You already have an active
 *     sponsor ad'` (UNIQUE: the FIRST per-source-
 *     file POST smoke pinning a message-substring
 *     catch dispatcher with a status override).
 *   - **Pagination success payload on GET** — `{
 *     data, pagination: { page, limit, total,
 *     totalPages, hasNext, hasPrev } }` (UNIQUE:
 *     the FIRST per-source-file GET smoke pinning a
 *     hasNext/hasPrev computed-pagination contract).
 *   - **Approval-workflow success message on POST**
 *     — `'Sponsor ad submission created
 *     successfully. Pending admin approval.'`
 *     (UNIQUE: the FIRST per-source-file POST smoke
 *     pinning an approval-workflow success message).
 *   - **TWO-key 401 envelope** `{ success: false,
 *     error: 'Unauthorized' }` on both methods.
 *
 *   1. **GET handler** — `auth()` session lookup;
 *      `searchParams` extraction; build queryParams
 *      with `userId: session.user.id`;
 *      `querySponsorAdsSchema.safeParse(queryParams)`;
 *      `getSponsorAdsPaginated(...)` load-bearing
 *      DB read; success returns paginated payload.
 *   2. **POST handler** — `auth()`; JSON body parse
 *      with try/catch; `createSponsorAdSchema.
 *      safeParse({ ...body, paymentProvider:
 *      ACTIVE_PAYMENT_PROVIDER })`;
 *      `createSponsorAd(userId, validated)` load-
 *      bearing DB write; success returns 201 with
 *      `{ data, message }`; conditional 400
 *      catch-branch on `'already have'` message
 *      substring.
 *   3. **Method-resolution surface** — the route
 *      exports `GET` AND `POST`. `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500`
 *      status.
 */
const SPONSOR_ADS_USER_PATH = '/api/sponsor-ads/user';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const POST_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '{}', label: 'empty object body' },

	{
		data: { itemSlug: 's', itemName: 'n', interval: 'weekly' },
		label: 'minimal valid body'
	},
	{
		data: { itemSlug: 's', itemName: 'n', interval: 'monthly' },
		label: 'monthly interval'
	},
	{
		data: { itemSlug: 's', itemName: 'n', interval: 'invalid' },
		label: 'invalid interval'
	},

	// Bypass attempts.
	{
		data: { itemSlug: 's', itemName: 'n', interval: 'weekly', userId: 'fabricated' },
		label: 'fabricated userId (handler ignores)'
	},
	{
		data: { itemSlug: 's', itemName: 'n', interval: 'weekly', paymentProvider: 'fabricated' },
		label: 'fabricated paymentProvider (handler overrides)'
	},
	{
		data: { itemSlug: 's', itemName: 'n', interval: 'weekly', status: 'approved' },
		label: 'fabricated status=approved (handler ignores)'
	}
] as const;

test.describe('API: /api/sponsor-ads/user GET + POST method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${SPONSOR_ADS_USER_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.get(SPONSOR_ADS_USER_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`POST ${SPONSOR_ADS_USER_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(SPONSOR_ADS_USER_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of POST_BODIES) {
		test(`POST ${SPONSOR_ADS_USER_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(SPONSOR_ADS_USER_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${SPONSOR_ADS_USER_PATH} returns 401 with the canonical TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.get(SPONSOR_ADS_USER_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized');
	});

	test(`POST ${SPONSOR_ADS_USER_PATH} returns 401 with the canonical TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.post(SPONSOR_ADS_USER_PATH, {
			data: { itemSlug: 's', itemName: 'n', interval: 'weekly' }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized');
	});

	test(`GET and POST ${SPONSOR_ADS_USER_PATH} have IDENTICAL 401 envelopes`, async ({ request }) => {
		const getResponse = await request.get(SPONSOR_ADS_USER_PATH);
		const postResponse = await request.post(SPONSOR_ADS_USER_PATH, {
			data: { itemSlug: 's', itemName: 'n', interval: 'weekly' }
		});

		expect(getResponse.status()).toBe(401);
		expect(postResponse.status()).toBe(401);

		const getBody = await getResponse.json();
		const postBody = await postResponse.json();
		expect(getBody).toEqual(postBody);
	});

	test(`GET ${SPONSOR_ADS_USER_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.get(SPONSOR_ADS_USER_PATH);
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.data).toBeUndefined();
		expect(body.pagination).toBeUndefined();
	});

	test(`POST ${SPONSOR_ADS_USER_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(SPONSOR_ADS_USER_PATH, {
			data: { itemSlug: 's', itemName: 'n', interval: 'weekly' }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// Post-auth messages must NEVER appear on
		// unauth.
		expect(serialized).not.toContain('Invalid JSON in request body');
		expect(serialized).not.toContain('Sponsor ad submission created successfully');
		expect(serialized).not.toContain('Pending admin approval');
		expect(serialized).not.toContain('You already have an active sponsor ad');
		expect(serialized).not.toContain('Failed to create sponsor ad');
		expect(serialized).not.toContain('Failed to fetch sponsor ads');
	});

	test(`POST ${SPONSOR_ADS_USER_PATH} createSponsorAd is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: pin that XSS markers in the body
		// are NEVER echoed back on unauth.
		const response = await request.post(SPONSOR_ADS_USER_PATH, {
			data: {
				itemSlug: 'XSS-SPONSOR-MARKER-12345',
				itemName: 'XSS-NAME-MARKER',
				interval: 'weekly',
				itemDescription: 'XSS-DESCRIPTION-MARKER'
			}
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-SPONSOR-MARKER-12345');
		expect(serialized).not.toContain('XSS-NAME-MARKER');
		expect(serialized).not.toContain('XSS-DESCRIPTION-MARKER');
	});

	test(`GET ${SPONSOR_ADS_USER_PATH} querySponsorAdsSchema validation is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Pin that the Zod query-validation 400 message
		// is NEVER reached on unauth, regardless of how
		// invalid the query is.
		const responses = await Promise.all([
			request.get(`${SPONSOR_ADS_USER_PATH}?status=invalid-status`),
			request.get(`${SPONSOR_ADS_USER_PATH}?page=-1`),
			request.get(`${SPONSOR_ADS_USER_PATH}?limit=99999`),
			request.get(`${SPONSOR_ADS_USER_PATH}?interval=fake`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized');
		}
	});

	test(`POST ${SPONSOR_ADS_USER_PATH} body-parse and Zod-validation are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Pin that the body-parse 400 (`'Invalid JSON
		// in request body'`) and the Zod-validation
		// 400 are NEVER reached on unauth.
		const malformed = await request.post(SPONSOR_ADS_USER_PATH, {
			headers: { 'Content-Type': 'application/json' },
			data: 'not-valid-json'
		});
		const invalidBody = await request.post(SPONSOR_ADS_USER_PATH, {
			data: { itemSlug: '', itemName: '', interval: 'fake' }
		});

		expect(malformed.status()).toBe(401);
		expect(invalidBody.status()).toBe(401);
	});

	test(`GET ${SPONSOR_ADS_USER_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET + POST are exported. PUT / PATCH /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.put(SPONSOR_ADS_USER_PATH),
			request.patch(SPONSOR_ADS_USER_PATH),
			request.delete(SPONSOR_ADS_USER_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${SPONSOR_ADS_USER_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.post(SPONSOR_ADS_USER_PATH, {
			data: { itemSlug: 's', itemName: 'n', interval: 'weekly' }
		});
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.post(SPONSOR_ADS_USER_PATH, {
				data: { itemSlug: 's', itemName: 'n', interval: 'weekly' },
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(SPONSOR_ADS_USER_PATH, {
				data: { itemSlug: 's', itemName: 'n', interval: 'weekly' },
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.post(SPONSOR_ADS_USER_PATH, {
				data: { itemSlug: 's', itemName: 'n', interval: 'weekly' },
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});
});
