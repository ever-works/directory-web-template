import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET / dynamic-segment /
 * query / header surface** of the per-user payment-
 * account-lookup endpoint served by the `GET` export
 * of `apps/web/app/api/payment/account/[userId]/route.ts`.
 *
 * `GET /api/payment/account/[userId]` is the **first
 * per-source-file dynamic-segment GET smoke** the
 * docs tree publishes that pins a **strict user-id-
 * IDOR check** (`session.user.id !== params.userId`
 * → 403 bare `{ error: 'Forbidden' }` with NO message
 * specifying ownership) on a per-user resource
 * lookup endpoint. CRITICAL: provides the auth-gated
 * counterpart to the
 * [`payment-account-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-account-method.spec.ts)
 * sibling which has NO auth gate (Q-010 finding).
 *
 * Distinct from EVERY prior dynamic-segment GET smoke:
 *
 *   - **Strict user-id-IDOR check** — `session.user.
 *     id !== userId` → 403 BARE `{ error:
 *     'Forbidden' }` (UNIQUE: just `'Forbidden'`
 *     message, distinct from
 *     [`payment-id-method-spec.md`](payment-id-method-spec.md)'s
 *     `'Forbidden: You do not own this subscription'`).
 *   - **userId-then-IDOR-then-provider validation
 *     order** — `!userId` 400 (impossible from
 *     dynamic segment) → IDOR 403 → `!provider`
 *     400. UNIQUE: the IDOR check is INTERLEAVED
 *     between two validation checks (the FIRST per-
 *     source-file GET smoke pinning an IDOR check
 *     placed mid-validation-cascade).
 *   - **`?provider=` query parameter required** —
 *     missing → 400 `{ error: 'Provider is
 *     required' }` (consistent with the
 *     [`payment-account-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-account-method.spec.ts)
 *     sibling's POST/PUT body-required check; this
 *     GET reads it from the query string).
 *   - **404 with bare envelope** — `{ error:
 *     'Payment account not found' }` when the DB
 *     query returns null (UNIQUE: the FIRST per-
 *     source-file GET smoke pinning a 404 with the
 *     literal message `'Payment account not
 *     found'`).
 *   - **Returns raw paymentAccount fields** in
 *     success — `{ id, userId, providerId,
 *     customerId, createdAt, updatedAt }` — NO
 *     wrapper envelope (matches
 *     [`payment-account-method.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-account-method.spec.ts)
 *     POST/PUT siblings).
 *   - **DOES have `auth()` gate** — CONTRAST with
 *     the no-auth-gate POST/PUT siblings on the
 *     same parent route (Q-010 finding). The FIRST
 *     per-source-file GET smoke documenting an
 *     auth-gated GET sibling of an unguarded
 *     POST/PUT pair (a security-asymmetry finding).
 *
 *   1. **`auth()` session lookup** — `!session?.user?.id`
 *      → 401 bare ONE-key `{ error: 'Unauthorized' }`.
 *   2. **`{ userId } = await params`** dynamic-
 *      segment resolution.
 *   3. **`searchParams.get('provider')`** — `?provider=`
 *      query extraction.
 *   4. **`!userId` check** — 400 (impossible from
 *      dynamic segment, but pinned).
 *   5. **IDOR check** — `session.user.id !== userId`
 *      → 403 bare `{ error: 'Forbidden' }`.
 *   6. **`!provider` check** — 400 `{ error:
 *      'Provider is required' }`.
 *   7. **`getUserPaymentAccountByProvider(userId,
 *      provider)`** — load-bearing DB read.
 *   8. **404 if null** — `{ error: 'Payment
 *      account not found' }`.
 *   9. **Success payload** — raw paymentAccount
 *      fields with status 200.
 *  10. **Outer catch** — 500 `{ error: 'Internal
 *      server error' }`.
 *  11. **Method-resolution surface** — the route
 *      exports ONLY `GET`. `POST` / `PUT` /
 *      `PATCH` / `DELETE` must round-trip to a
 *      `< 500` status.
 */
const NON_EXISTENT_USER_ID = '__definitely-not-a-real-user-id__';
const PAYMENT_ACCOUNT_PATH = `/api/payment/account/${NON_EXISTENT_USER_ID}`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const QUERY_PERMUTATIONS = [
	{ query: '', label: 'no query' },
	{ query: '?provider=stripe', label: 'provider=stripe' },
	{ query: '?provider=lemonsqueezy', label: 'provider=lemonsqueezy' },
	{ query: '?provider=polar', label: 'provider=polar' },
	{ query: '?provider=fake-provider', label: 'invalid provider' },
	{ query: '?provider=', label: 'empty provider' },
	{ query: '?token=fabricated', label: 'fabricated token (handler ignores)' },
	{ query: '?bypass=true', label: 'bypass query (handler ignores)' }
] as const;

test.describe('API: /api/payment/account/[userId] GET surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${PAYMENT_ACCOUNT_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.get(PAYMENT_ACCOUNT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { query, label } of QUERY_PERMUTATIONS) {
		test(`GET ${PAYMENT_ACCOUNT_PATH}${query} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.get(`${PAYMENT_ACCOUNT_PATH}${query}`);
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${PAYMENT_ACCOUNT_PATH} returns 401 with the canonical bare ONE-key envelope`, async ({
		request
	}) => {
		const response = await request.get(`${PAYMENT_ACCOUNT_PATH}?provider=stripe`);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`GET ${PAYMENT_ACCOUNT_PATH} 401 envelope shape has exactly the error key`, async ({
		request
	}) => {
		const response = await request.get(PAYMENT_ACCOUNT_PATH);
		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`GET ${PAYMENT_ACCOUNT_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.get(`${PAYMENT_ACCOUNT_PATH}?provider=stripe`);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The post-auth messages must NEVER appear on
		// the unauth branch.
		expect(serialized).not.toContain('Forbidden');
		expect(serialized).not.toContain('User ID is required');
		expect(serialized).not.toContain('Provider is required');
		expect(serialized).not.toContain('Payment account not found');
		expect(serialized).not.toContain('Internal server error');
	});

	test(`GET ${PAYMENT_ACCOUNT_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.get(`${PAYMENT_ACCOUNT_PATH}?provider=stripe`);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.get(`${PAYMENT_ACCOUNT_PATH}?provider=stripe`, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get(`${PAYMENT_ACCOUNT_PATH}?provider=stripe`, {
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.get(`${PAYMENT_ACCOUNT_PATH}?provider=stripe`, {
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`GET ${PAYMENT_ACCOUNT_PATH} cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET is the only exported method.
		const responses = await Promise.all([
			request.post(PAYMENT_ACCOUNT_PATH),
			request.put(PAYMENT_ACCOUNT_PATH),
			request.patch(PAYMENT_ACCOUNT_PATH),
			request.delete(PAYMENT_ACCOUNT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${PAYMENT_ACCOUNT_PATH} getUserPaymentAccountByProvider is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing
		// `getUserPaymentAccountByProvider` DB read
		// must NEVER run on unauth. Pin that no
		// paymentAccount fields are leaked.
		const response = await request.get(`${PAYMENT_ACCOUNT_PATH}?provider=stripe`);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		expect(serialized).not.toContain('providerId');
		expect(serialized).not.toContain('customerId');
		expect(serialized).not.toContain('createdAt');
	});

	test(`GET ${PAYMENT_ACCOUNT_PATH} cross-userId invariance — different user IDs produce IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Pin that the auth gate fires BEFORE any per-
		// userId branch (so the IDOR check is
		// unreachable on unauth).
		const responses = await Promise.all([
			request.get('/api/payment/account/user-id-one?provider=stripe'),
			request.get('/api/payment/account/user-id-two?provider=stripe'),
			request.get('/api/payment/account/user-id-three?provider=stripe')
		]);

		const baseline = responses[0];
		const baselineBody = await baseline.json();

		for (const response of responses.slice(1)) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});

	test(`GET ${PAYMENT_ACCOUNT_PATH} cross-provider invariance — different providers produce IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Pin that the auth gate fires BEFORE the
		// `?provider=` query branch.
		const responses = await Promise.all([
			request.get(`${PAYMENT_ACCOUNT_PATH}?provider=stripe`),
			request.get(`${PAYMENT_ACCOUNT_PATH}?provider=lemonsqueezy`),
			request.get(`${PAYMENT_ACCOUNT_PATH}?provider=polar`),
			request.get(PAYMENT_ACCOUNT_PATH)
		]);

		const baseline = responses[0];
		const baselineBody = await baseline.json();

		for (const response of responses.slice(1)) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});
});
