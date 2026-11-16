import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST + PUT body / header
 * surface** of the payment-account create / update
 * endpoint served by the `POST` AND `PUT` exports of
 * `apps/web/app/api/payment/account/route.ts`.
 *
 * Both methods are admin-only (the `/api/admin` guard:
 * 401 with `{ success: false, error: "Unauthorized" }` for
 * an anonymous caller, 403 for a signed-in non-admin, both
 * checked BEFORE the body is read). The earlier
 * no-auth-gate finding was closed by PR #1115, which
 * left signed-in owners able to repoint their own row;
 * that is closed by the admin-only guard.
 * These specs run anonymously, so every POST / PUT is
 * expected to stop at the 401; the field-validation
 * cascade ('Provider is required', 'Unsupported
 * provider', 'User ID is required', ...) is only
 * reachable with a session.
 *
 * Method-resolution surface: the route exports `POST`
 * AND `PUT`. `GET` / `PATCH` / `DELETE` must
 * round-trip to a `< 500` status.
 */
const PAYMENT_ACCOUNT_PATH = '/api/payment/account';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes: fabricated credentials must not
	// get past the auth gate.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const POST_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '{}', label: 'empty object body' },

	// Required-field cascade probes.
	{ data: { provider: 'stripe' }, label: 'provider only (missing userId + customerId)' },
	{ data: { provider: 'stripe', userId: 'u' }, label: 'provider + userId (missing customerId)' },
	{
		data: { provider: 'stripe', userId: 'u', customerId: 'c' },
		label: 'all required fields'
	},

	{ data: { provider: 'lemonsqueezy', userId: 'u', customerId: 'c' }, label: 'lemonsqueezy provider' },
	{ data: { provider: 'polar', userId: 'u', customerId: 'c' }, label: 'polar provider' }
] as const;

const PUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '{}', label: 'empty object body' },

	// Required-field cascade probes (PUT has FOUR
	// required fields).
	{ data: { id: 'a' }, label: 'id only (missing rest)' },
	{ data: { id: 'a', provider: 'stripe' }, label: 'id + provider (missing userId + customerId)' },
	{ data: { id: 'a', provider: 'stripe', userId: 'u' }, label: 'three of four (missing customerId)' },
	{
		data: { id: 'a', provider: 'stripe', userId: 'u', customerId: 'c' },
		label: 'all four required fields'
	}
] as const;

test.describe('API: /api/payment/account POST + PUT method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${PAYMENT_ACCOUNT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(PAYMENT_ACCOUNT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`PUT ${PAYMENT_ACCOUNT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(PAYMENT_ACCOUNT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of POST_BODIES) {
		test(`POST ${PAYMENT_ACCOUNT_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(PAYMENT_ACCOUNT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${PAYMENT_ACCOUNT_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.put(PAYMENT_ACCOUNT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${PAYMENT_ACCOUNT_PATH} returns 401 for an anonymous caller`, async ({ request }) => {
		// Anonymous callers used to be able to write any user's
		// payment account; the session check now runs first.
		const response = await request.post(PAYMENT_ACCOUNT_PATH, {
			data: { provider: 'stripe', userId: 'u', customerId: 'c' }
		});
		expect(response.status()).toBe(401);
		expect((await response.json()).error).toBe('Unauthorized');
	});

	test(`PUT ${PAYMENT_ACCOUNT_PATH} returns 401 for an anonymous caller`, async ({ request }) => {
		const response = await request.put(PAYMENT_ACCOUNT_PATH, {
			data: { id: 'a', provider: 'stripe', userId: 'u', customerId: 'c' }
		});
		expect(response.status()).toBe(401);
		expect((await response.json()).error).toBe('Unauthorized');
	});

	test(`POST ${PAYMENT_ACCOUNT_PATH} does not accept fabricated credentials`, async ({ request }) => {
		// Fabricated session cookies, bearer tokens and user-id
		// headers must all stop at the same 401 as a bare request.
		const data = { provider: 'stripe', userId: 'u', customerId: 'c' };
		const responses = await Promise.all([
			request.post(PAYMENT_ACCOUNT_PATH, { data, headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(PAYMENT_ACCOUNT_PATH, { data, headers: { Authorization: 'Bearer fabricated' } }),
			request.post(PAYMENT_ACCOUNT_PATH, { data, headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
		}
	});

	test(`POST + PUT ${PAYMENT_ACCOUNT_PATH} check the session before validating the body`, async ({ request }) => {
		// The session check runs before the body is read, so an
		// anonymous caller learns nothing from the field cascade.
		const responses = await Promise.all([
			request.post(PAYMENT_ACCOUNT_PATH, { data: {} }),
			request.post(PAYMENT_ACCOUNT_PATH, { data: { provider: 'stripe' } }),
			request.post(PAYMENT_ACCOUNT_PATH, { data: { provider: 'not-a-provider', userId: 'u', customerId: 'c' } }),
			request.put(PAYMENT_ACCOUNT_PATH, { data: {} })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			expect((await response.json()).error).toBe('Unauthorized');
		}
	});

	test(`POST ${PAYMENT_ACCOUNT_PATH} error envelope carries an error key`, async ({
		request
	}) => {
		const response = await request.post(PAYMENT_ACCOUNT_PATH, { data: {} });
		const body = await response.json();
		// Don't pin the exact envelope shape — admin-guard returns
		// `{ success: false, error }` but the JSDoc documents a bare `{ error }`.
		expect(body.error).toBeTruthy();
	});

	test(`POST ${PAYMENT_ACCOUNT_PATH} cross-method probe (GET / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// The route exports POST + PUT. GET / PATCH /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.get(PAYMENT_ACCOUNT_PATH),
			request.patch(PAYMENT_ACCOUNT_PATH),
			request.delete(PAYMENT_ACCOUNT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${PAYMENT_ACCOUNT_PATH} catch-branch generic 500 message is NOT echoed for malformed bodies`, async ({
		request
	}) => {
		// The catch returns 500 with `'Internal server
		// error'`. For a non-existent userId / provider
		// the DB call may fail. Pin that the response
		// does NOT 5xx.
		const response = await request.post(PAYMENT_ACCOUNT_PATH, {
			data: { provider: 'stripe', userId: '__not-real__', customerId: '__not-real__' }
		});

		expect(response.status()).toBeLessThan(500);
	});
});
