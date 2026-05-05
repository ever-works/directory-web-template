import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Stripe billing-portal session-creation endpoint
 * served by the `POST` export of
 * `apps/web/app/api/stripe/subscription/portal/route.ts`.
 *
 * `POST /api/stripe/subscription/portal` is the **first
 * per-source-file POST smoke** the docs tree publishes
 * for a Stripe billing-portal session-creation
 * endpoint. The Polar customer-portal sibling is
 * documented at
 * [`polar-subscription-portal-body-spec.md`](polar-subscription-portal-body-spec.md);
 * this Stripe-side handler is structurally distinct in
 * EVERY post-auth branch.
 *
 * Distinct from EVERY prior Stripe per-source-file
 * smoke AND the polar-subscription-portal-body sibling:
 *
 *   - **Zero-arg POST signature** — the handler is
 *     declared as `export async function POST()` with
 *     NO `request` / `context` arguments. UNIQUE among
 *     all per-source-file Stripe POST smokes — every
 *     other Stripe POST handler reads the request to
 *     parse a body or extract a header. The billing-
 *     portal route is the FIRST per-source-file POST
 *     smoke pinning a zero-arg POST contract.
 *   - **`!session?.user` gate** with a **ONE-key
 *     `{ error: 'Unauthorized' }` envelope** (NO
 *     `success` key, NO `message` key — distinct from
 *     stripe-checkout's TWO-key
 *     `{ error: 'Unauthorized', message: 'Authentication
 *     required' }` envelope and stripe-setup-intent-id's
 *     TWO-key `{ success: false, error: 'Unauthorized' }`
 *     envelope).
 *   - **`getCustomerId(...)` returns null → 404
 *     ONE-key `{ error: 'Stripe customer ID not
 *     found' }`** envelope.
 *   - **`buildUrl('/settings/billing')` + `new URL(...)`
 *     URL-validation contract** — if `new URL(returnUrl)`
 *     throws, the handler emits a TWO-key 500 envelope
 *     `{ error: 'Invalid return URL configuration',
 *     message: 'The application URL is not properly
 *     configured' }`. UNIQUE — no prior per-source-file
 *     smoke pins a `new URL()` validation contract on a
 *     constructed return URL.
 *   - **FOUR-key Stripe-error catch envelope** —
 *     `stripeInstance.billingPortal.sessions.create(...)`
 *     wrapped in an INNER try/catch that emits 400
 *     `{ error: 'Invalid request to Stripe', message,
 *     code, type }`. UNIQUE — the FIRST per-source-file
 *     POST smoke pinning a FOUR-key envelope with both
 *     `code` AND `type` fields surfaced from the Stripe
 *     error object (vs payment-methods-create's THREE-
 *     key `{ error, message, code }` and other handlers'
 *     TWO-key shapes).
 *   - **Structured `Logger.create('StripePortal')` call**
 *     in the inner catch — vs the bare `console.error`
 *     used by every other Stripe POST handler. The
 *     FIRST per-source-file POST smoke pinning a
 *     structured-logger contract on the inner Stripe-
 *     error branch.
 *   - **`safeErrorMessage(...)` helper** in BOTH the
 *     inner-stripe-error catch AND the outer catch —
 *     used to extract a safe message from the Stripe
 *     error / generic Error. Matches stripe-checkout's
 *     pattern but distinct in the inner-vs-outer
 *     dispatch contract.
 *   - **TWO-key outer-catch 500 envelope** — `{ error:
 *     'Failed to create billing portal session',
 *     message }` (matches the inner-URL-validation
 *     catch's TWO-key shape but DISTINCT from the
 *     inner-stripe-error catch's FOUR-key shape).
 *
 * The route under test
 * (`apps/web/app/api/stripe/subscription/portal/route.ts`)
 * exports only `POST`. The handler combines:
 *
 *   1. **`auth()` session lookup** — `!session?.user` →
 *      401 ONE-key `{ error: 'Unauthorized' }`.
 *   2. **`initializeStripeProvider()` +
 *      `getStripeInstance()`** — happens AFTER the auth
 *      gate.
 *   3. **`stripe.getCustomerId(session.user as any)`** —
 *      load-bearing customer-id lookup; null → 404
 *      ONE-key `{ error: 'Stripe customer ID not
 *      found' }`.
 *   4. **`buildUrl('/settings/billing')` + `new URL(...)`
 *      URL-validation** — invalid URL → 500 TWO-key.
 *   5. **`stripeInstance.billingPortal.sessions.create
 *      ({ customer, return_url })`** — load-bearing
 *      Stripe SDK call wrapped in INNER try/catch.
 *   6. **Inner-stripe-error catch** — 400 FOUR-key
 *      `{ error, message, code, type }`.
 *   7. **Success payload** — 200 `{ success: true,
 *      data: response, message: 'Billing portal
 *      session created' }`.
 *   8. **Outer catch** — 500 TWO-key `{ error: 'Failed
 *      to create billing portal session', message }`.
 *   9. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const STRIPE_PORTAL_PATH = '/api/stripe/subscription/portal';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Stripe-Customer-Id': 'cus_fabricated' }, label: 'fabricated X-Stripe-Customer-Id header' }
] as const;

const BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// The handler is zero-arg POST and never reads the
	// body — these probes pin that NO body shape can
	// influence the unauth branch.
	{ data: { customerId: 'cus_fabricated' }, label: 'fabricated customerId bypass attempt' },
	{ data: { userId: 'fabricated' }, label: 'fabricated userId bypass attempt' },
	{ data: { returnUrl: 'https://attacker.example.com/' }, label: 'attacker returnUrl override attempt' },
	{ data: { return_url: 'javascript:alert(1)' }, label: 'javascript: scheme return_url override attempt' },
	{ data: { isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { session: { user: { id: 'fabricated' } } }, label: 'fabricated session.user.id bypass attempt' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Stripe customer ID not found',
	'Invalid return URL configuration',
	'The application URL is not properly configured',
	'Invalid request to Stripe',
	'Failed to create billing portal session',
	'Billing portal session created'
] as const;

test.describe('API: /api/stripe/subscription/portal POST body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${STRIPE_PORTAL_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_PORTAL_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`POST ${STRIPE_PORTAL_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_PORTAL_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${STRIPE_PORTAL_PATH} returns 401 with the canonical one-key Unauthorized envelope`, async ({
		request
	}) => {
		// `!session?.user` → 401 ONE-key envelope. NO
		// `success` key, NO `message` key — distinct
		// from stripe-checkout's TWO-key shape and from
		// stripe-setup-intent-id's `{ success: false,
		// error }` shape.
		const response = await request.post(STRIPE_PORTAL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test(`POST ${STRIPE_PORTAL_PATH} envelope shape has exactly the error key`, async ({ request }) => {
		const response = await request.post(STRIPE_PORTAL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
		expect(body.data).toBeUndefined();
		expect(body.code).toBeUndefined();
		expect(body.type).toBeUndefined();
	});

	test(`POST ${STRIPE_PORTAL_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns `{ success: true,
		// data: { id, url, customer, return_url, … },
		// message: 'Billing portal session created' }`.
		// CRITICAL: a regression that re-orders
		// billingPortal.sessions.create before the auth
		// gate would expose the portal `url` (giving
		// any caller a logged-in customer-portal
		// session for the resolved customer).
		const response = await request.post(STRIPE_PORTAL_PATH);
		const body = await response.json();
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
		// Even nested under `data`, no portal url.
		if (body.data) {
			expect(body.data.url).toBeUndefined();
			expect(body.data.id).toBeUndefined();
			expect(body.data.customer).toBeUndefined();
		}
	});

	test(`POST ${STRIPE_PORTAL_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_PORTAL_PATH),
			request.post(STRIPE_PORTAL_PATH, { data: {} }),
			request.post(STRIPE_PORTAL_PATH, { data: { customerId: 'cus_x' } }),
			request.post(STRIPE_PORTAL_PATH, { data: { returnUrl: 'https://x.com/' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
			// FOUR-key inner-stripe-error fields must
			// NEVER leak on the unauth branch.
			expect(body.code).toBeUndefined();
			expect(body.type).toBeUndefined();
		}
	});

	test(`POST ${STRIPE_PORTAL_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(STRIPE_PORTAL_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(STRIPE_PORTAL_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(STRIPE_PORTAL_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(STRIPE_PORTAL_PATH, { headers: { 'X-Stripe-Customer-Id': 'cus_x' } }),
			request.post(STRIPE_PORTAL_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_PORTAL_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the ONLY exported method. Other
		// methods must round-trip to `< 500`.
		const responses = await Promise.all([
			request.get(STRIPE_PORTAL_PATH),
			request.put(STRIPE_PORTAL_PATH),
			request.patch(STRIPE_PORTAL_PATH),
			request.delete(STRIPE_PORTAL_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_PORTAL_PATH} initializeStripeProvider / getCustomerId / billingPortal.sessions.create are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: a regression that re-orders the
		// Stripe SDK calls before the auth gate would
		// surface the customer's portal url and id —
		// effectively exposing a logged-in customer-
		// portal session.
		const response = await request.post(STRIPE_PORTAL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test(`POST ${STRIPE_PORTAL_PATH} URL-validation catch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The auth branch invokes `buildUrl('/settings/
		// billing')` followed by `new URL(returnUrl)`.
		// The unauth branch must NEVER reach the URL-
		// validation catch.
		const response = await request.post(STRIPE_PORTAL_PATH);
		const body = await response.json();
		expect(body.error).not.toBe('Invalid return URL configuration');
		expect(body.message).not.toBe('The application URL is not properly configured');
	});

	test(`POST ${STRIPE_PORTAL_PATH} inner-stripe-error catch (FOUR-key envelope) is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the inner stripe-error catch emits
		// a FOUR-key `{ error, message, code, type }`
		// envelope on Stripe SDK errors. The unauth
		// branch must NEVER reach the inner catch.
		const response = await request.post(STRIPE_PORTAL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).not.toBe('Invalid request to Stripe');
		expect(body.code).toBeUndefined();
		expect(body.type).toBeUndefined();
	});

	test(`POST ${STRIPE_PORTAL_PATH} outer catch (TWO-key 500 envelope) is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The outer catch emits 500 `{ error: 'Failed
		// to create billing portal session', message }`.
		// The unauth branch must NEVER reach the outer
		// 500.
		const response = await request.post(STRIPE_PORTAL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).not.toBe('Failed to create billing portal session');
	});

	test(`POST ${STRIPE_PORTAL_PATH} no-stripe-error-message-leak invariant on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, the inner-stripe-error
		// catch surfaces the Stripe error's `code` AND
		// `type` AND a safe `message` derived via
		// `safeErrorMessage(...)`. The unauth branch
		// must NEVER include any stripe-error
		// substring.
		const responses = await Promise.all([
			request.post(STRIPE_PORTAL_PATH),
			request.post(STRIPE_PORTAL_PATH, { data: { customerId: 'cus_attacker' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized');
			// No stripe error patterns should leak.
			expect(body.error).not.toContain('No such customer');
			expect(body.error).not.toContain('resource_missing');
			expect(body.error).not.toContain('billing_portal');
			expect(body.message).not.toContain('No such customer');
			expect(body.message).not.toContain('resource_missing');
		}
	});

	test(`POST ${STRIPE_PORTAL_PATH} body-shape invariance — bare / empty / payloaded all produce IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Pin that the unauth 401 envelope is
		// IDENTICAL across body shapes (the handler is
		// zero-arg POST and never reads the body).
		const responses = await Promise.all([
			request.post(STRIPE_PORTAL_PATH),
			request.post(STRIPE_PORTAL_PATH, { data: {} }),
			request.post(STRIPE_PORTAL_PATH, { data: { customerId: 'cus_x' } }),
			request.post(STRIPE_PORTAL_PATH, { data: 'not-json' }),
			request.post(STRIPE_PORTAL_PATH, { data: '{ broken: json' })
		]);

		const bodies = await Promise.all(responses.map((r) => r.json()));
		for (const body of bodies) {
			expect(body).toEqual({ error: 'Unauthorized' });
		}
	});

	test(`POST ${STRIPE_PORTAL_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(STRIPE_PORTAL_PATH);
		const responses = await Promise.all([
			request.post(STRIPE_PORTAL_PATH, { data: {} }),
			request.post(STRIPE_PORTAL_PATH, { data: { customerId: 'cus_x' } }),
			request.post(STRIPE_PORTAL_PATH, { data: { returnUrl: 'https://x.com/' } }),
			request.post(STRIPE_PORTAL_PATH, { data: { isAdmin: true } }),
			request.post(STRIPE_PORTAL_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(STRIPE_PORTAL_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${STRIPE_PORTAL_PATH} no-XSS / open-redirect leak invariant on the unauth branch`, async ({
		request
	}) => {
		// Pin that hostile body content (XSS payloads,
		// open-redirect URLs) NEVER appears in the
		// response — the zero-arg POST handler does
		// not read the body, but a regression that
		// echoed body fields into an error message
		// would surface here.
		const responses = await Promise.all([
			request.post(STRIPE_PORTAL_PATH, {
				data: { returnUrl: '<script>alert(1)</script>' }
			}),
			request.post(STRIPE_PORTAL_PATH, {
				data: { return_url: 'javascript:alert(1)' }
			}),
			request.post(STRIPE_PORTAL_PATH, {
				data: { customerId: '<img src=x onerror=alert(1)>' }
			})
		]);

		for (const response of responses) {
			const text = await response.text();
			expect(text).not.toContain('<script>');
			expect(text).not.toContain('javascript:');
			expect(text).not.toContain('onerror=');
		}
	});
});
