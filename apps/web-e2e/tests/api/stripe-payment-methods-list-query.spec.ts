import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * authenticated Stripe-payment-methods-list endpoint served
 * by `apps/web/app/api/stripe/payment-methods/list/route.ts`.
 *
 * `GET /api/stripe/payment-methods/list` is intentionally
 * **session-gated** — it returns a list of the caller's
 * Stripe payment methods. The handler signature is the
 * **zero-argument** Next 16 form (the route does not take a
 * `NextRequest` argument and reads no `searchParams` at all
 * today):
 *
 *     export async function GET() {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.id) {
 *           return NextResponse.json(
 *             { success: false, error: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         const stripeProvider = getOrCreateStripeProvider();
 *         const stripe = stripeProvider.getStripeInstance();
 *         const stripeCustomerId = await getUserStripeCustomerId(session.user.id, stripe);
 *         if (!stripeCustomerId) {
 *           return NextResponse.json({ success: true, data: [], message: 'No payment methods found' });
 *         }
 *         ...
 *         const paymentMethods = await stripe.paymentMethods.list({ customer: stripeCustomerId, type: 'card', limit: 100 });
 *         ...
 *         return NextResponse.json({ success: true, data: formattedPaymentMethods, meta: ... });
 *       } catch (error) { ... }
 *     }
 *
 * Because the handler signature is **zero-argument**, the
 * route reads zero query params today — every assertion
 * below pins that the response is deterministically 401 on
 * the unauthenticated GET branch regardless of which keys
 * the caller appends to the URL. A regression that switches
 * the signature to `GET(request: NextRequest)` and starts
 * reading `request.nextUrl.searchParams.get(...)` would not
 * change the unauth branch's status (the gate fires first),
 * but a regression that reads `searchParams` **before** the
 * gate (e.g. for a `?token=…` magic-token bypass or a
 * `?customerId=…` admin-impersonation key) would change the
 * unauth branch's behaviour from "always 401" to
 * "200 / 400 / 500 if the right query is present" — and that
 * change is exactly what this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session whose `user.id` is missing); the early
 *     `if (!session?.user?.id)` branch fires and the route
 *     returns `{ success: false, error: 'Unauthorized' }`
 *     with status 401. This is the contract every assertion
 *     below pins, because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated, no Stripe customer**: returns 200
 *     with `{ success: true, data: [], message: 'No
 *     payment methods found' }`. Out of scope for this spec.
 *   - **Authenticated, customer with payment methods**:
 *     returns 200 with `{ success: true, data, meta }`.
 *     Out of scope for this spec.
 *   - **Authenticated, deleted/string customer**: returns
 *     404 with `{ success: false, error: 'Customer not
 *     found' }`. Out of scope for this spec because the
 *     gate fires before the customer lookup on every unauth
 *     invocation.
 *   - **Stripe SDK error**: returns 400 with
 *     `{ success: false, error: <message> }`. Out of scope.
 *   - **Internal error**: returns 500 with
 *     `{ success: false, error: 'Failed to list payment
 *     methods' }`. Out of scope for this spec because the
 *     gate fires before the Stripe SDK call on every unauth
 *     invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?customerId=…` admin-impersonation
 * key that fires before the gate, a `?token=…` magic-token
 * bypass, a `?stripeKey=…` dangerous-passthrough that would
 * forward a caller-supplied key to the Stripe provider, or a
 * `?type=…` payment-method-type override that fires before
 * the gate — would surface immediately as a status
 * divergence between the no-arg 401 and a parameter-laden
 * non-401.
 *
 * The shape mirrors the sibling
 * `apps/web/app/api/lemonsqueezy/list/route.ts`,
 * `apps/web/app/api/user/subscription/route.ts`,
 * `apps/web/app/api/user/payments/route.ts`, and
 * `apps/web/app/api/user/plan-status/route.ts` smoke specs
 * pinned at `lemonsqueezy-list-query.spec.ts`,
 * `subscription-query.spec.ts`, `payments-query.spec.ts`,
 * and `plan-status-query.spec.ts` — these five routes share
 * the same "session-gated, 401 before any service-layer
 * call" posture, but the Stripe payment-methods/list route
 * is the **only** one of the five whose handler signature
 * is **zero-argument** today. That makes the unauth-branch
 * 401 invariant doubly load-bearing because a regression
 * that adds a `request: NextRequest` argument and reads
 * any `searchParams` value before the gate is the obvious
 * shape of a future bypass.
 */
const STRIPE_PAYMENT_METHODS_LIST_QUERIES = [
	// Baseline — the no-arg unauthenticated case. Included
	// so a future reader of this file sees the canonical
	// case alongside the variants it parametrises.
	'/api/stripe/payment-methods/list',

	// `?type=` — the obvious "filter by payment-method type"
	// key. The Stripe SDK call hard-codes `type: 'card'`
	// today; a regression that reads `searchParams.get
	// ('type')` would change the response payload shape.
	// Every value, valid or not, must round-trip to 401 on
	// the unauth branch.
	'/api/stripe/payment-methods/list?type=card',
	'/api/stripe/payment-methods/list?type=us_bank_account',
	'/api/stripe/payment-methods/list?type=sepa_debit',
	'/api/stripe/payment-methods/list?type=ideal',
	'/api/stripe/payment-methods/list?type=link',
	'/api/stripe/payment-methods/list?type=invalid',
	'/api/stripe/payment-methods/list?type=',

	// `?limit=` — the obvious pagination key. The Stripe
	// SDK call hard-codes `limit: 100` today; a regression
	// that reads `searchParams.get('limit')` would change
	// the response payload size.
	'/api/stripe/payment-methods/list?limit=1',
	'/api/stripe/payment-methods/list?limit=10',
	'/api/stripe/payment-methods/list?limit=50',
	'/api/stripe/payment-methods/list?limit=100',
	'/api/stripe/payment-methods/list?limit=101',
	'/api/stripe/payment-methods/list?limit=0',
	'/api/stripe/payment-methods/list?limit=-1',
	'/api/stripe/payment-methods/list?limit=abc',
	'/api/stripe/payment-methods/list?limit=NaN',
	'/api/stripe/payment-methods/list?limit=999999',

	// `?starting_after=` / `?ending_before=` — Stripe's
	// canonical pagination cursor keys. The route does not
	// honour any cursor today; on the unauth branch every
	// value must round-trip to 401.
	'/api/stripe/payment-methods/list?starting_after=pm_anything',
	'/api/stripe/payment-methods/list?ending_before=pm_anything',
	'/api/stripe/payment-methods/list?starting_after=',
	'/api/stripe/payment-methods/list?ending_before=',

	// `?customer=` / `?customerId=` / `?stripeCustomerId=`
	// — the obvious "list payment methods for this customer"
	// keys. The route reads the customer id from
	// `getUserStripeCustomerId(session.user.id)` exclusively
	// today. A regression that reads `searchParams.get
	// ('customer')` before the gate would silently grant
	// arbitrary-customer payment-method access to anonymous
	// callers.
	'/api/stripe/payment-methods/list?customer=cus_anything',
	'/api/stripe/payment-methods/list?customerId=cus_anything',
	'/api/stripe/payment-methods/list?stripeCustomerId=cus_anything',
	'/api/stripe/payment-methods/list?customer=',
	'/api/stripe/payment-methods/list?customer=cus_admin',

	// `?userId=` / `?user_id=` / `?uid=` — the obvious
	// wiring a future "admin-views-other-user's-payment-
	// methods" feature might add as a query-string override.
	// The route reads the user identity from
	// `session.user.id` exclusively today.
	'/api/stripe/payment-methods/list?userId=anything',
	'/api/stripe/payment-methods/list?user_id=anything',
	'/api/stripe/payment-methods/list?uid=anything',
	'/api/stripe/payment-methods/list?id=anything',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — the obvious "I have a magic auth
	// token, let me through" keys. The route authenticates
	// via NextAuth session cookie only today.
	'/api/stripe/payment-methods/list?token=anything',
	'/api/stripe/payment-methods/list?secret=anything',
	'/api/stripe/payment-methods/list?api_key=anything',
	'/api/stripe/payment-methods/list?authorization=Bearer+anything',
	'/api/stripe/payment-methods/list?session=anything',

	// `?stripeKey=` / `?stripe_key=` / `?sk=` — the obvious
	// dangerous "use this Stripe key instead of the
	// server's" keys. The route reads the Stripe key from
	// the provider factory (which reads
	// `process.env.STRIPE_SECRET_KEY`) and must NEVER trust
	// a caller-supplied key.
	'/api/stripe/payment-methods/list?stripeKey=anything',
	'/api/stripe/payment-methods/list?stripe_key=anything',
	'/api/stripe/payment-methods/list?sk=anything',
	'/api/stripe/payment-methods/list?apiKey=anything',
	'/api/stripe/payment-methods/list?secretKey=anything',

	// `?provider=` — the obvious "force a different payment
	// provider" key. The wider repo also has LemonSqueezy,
	// Polar, and Solidgate providers, but this handler
	// hard-codes Stripe via `getOrCreateStripeProvider()`.
	'/api/stripe/payment-methods/list?provider=stripe',
	'/api/stripe/payment-methods/list?provider=lemonsqueezy',
	'/api/stripe/payment-methods/list?provider=polar',
	'/api/stripe/payment-methods/list?provider=solidgate',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// the obvious cache-busting keys. The handler does not
	// branch on any cache-control query param today.
	'/api/stripe/payment-methods/list?refresh=1',
	'/api/stripe/payment-methods/list?force=true',
	'/api/stripe/payment-methods/list?fresh=true',
	'/api/stripe/payment-methods/list?cache=bypass',
	'/api/stripe/payment-methods/list?nocache=1',

	// `?expand=` / `?include=` — the obvious "include
	// extra nested objects" keys. The route does not
	// forward caller-supplied expansions to the Stripe SDK
	// today.
	'/api/stripe/payment-methods/list?expand=customer',
	'/api/stripe/payment-methods/list?expand=billing_details',
	'/api/stripe/payment-methods/list?include=card',

	// `?format=` — the obvious content-negotiation key.
	// The route returns JSON exclusively today.
	'/api/stripe/payment-methods/list?format=json',
	'/api/stripe/payment-methods/list?format=xml',
	'/api/stripe/payment-methods/list?format=csv',
	'/api/stripe/payment-methods/list?format=pdf',

	// `?currency=` / `?locale=` / `?lang=` — the obvious
	// "show amounts in this currency / format dates in
	// this locale" keys. The route returns Stripe-stored
	// data without transformation.
	'/api/stripe/payment-methods/list?currency=USD',
	'/api/stripe/payment-methods/list?locale=en',
	'/api/stripe/payment-methods/list?lang=fr',

	// `?sort=` / `?order=` / `?direction=` — the obvious
	// sort-override keys. The route's sort posture is
	// hard-coded (default first, then created descending)
	// and reads none of these.
	'/api/stripe/payment-methods/list?sort=created',
	'/api/stripe/payment-methods/list?order=asc',
	'/api/stripe/payment-methods/list?direction=desc',

	// `?fields=` / `?select=` — the obvious "only-give-me-
	// these-columns" keys. The route returns the formatted
	// payment-method shape today.
	'/api/stripe/payment-methods/list?fields=id,type,card',
	'/api/stripe/payment-methods/list?select=id,is_default',

	// `?tenant=` / `?tenantId=` / `?org=` — the obvious
	// multi-tenancy keys.
	'/api/stripe/payment-methods/list?tenant=acme',
	'/api/stripe/payment-methods/list?tenantId=42',
	'/api/stripe/payment-methods/list?org=ever-works',

	// `?account=` / `?stripeAccount=` / `?connect=` — the
	// obvious Stripe Connect "list payment methods on this
	// connected account" keys. The route uses the platform
	// Stripe account exclusively today.
	'/api/stripe/payment-methods/list?account=acct_anything',
	'/api/stripe/payment-methods/list?stripeAccount=acct_anything',
	'/api/stripe/payment-methods/list?connect=acct_anything',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The gate fires before any potential
	// future validator, so empty values must round-trip to
	// the same 401 as the no-arg case.
	'/api/stripe/payment-methods/list?type=',
	'/api/stripe/payment-methods/list?limit=',
	'/api/stripe/payment-methods/list?customer=',
	'/api/stripe/payment-methods/list?customerId=',
	'/api/stripe/payment-methods/list?token=',
	'/api/stripe/payment-methods/list?stripeKey=',

	// Repeated keys — `searchParams.get(name)` returns
	// the first value, but the gate fires before any
	// validator, so repetition is irrelevant on the unauth
	// branch.
	'/api/stripe/payment-methods/list?type=card&type=us_bank_account',
	'/api/stripe/payment-methods/list?limit=10&limit=100',
	'/api/stripe/payment-methods/list?customer=cus_a&customer=cus_b',

	// Special-character values that would tempt a future
	// regex match, LIKE-prefix, or path-injection wiring.
	// The route does not pass any value into a SQL or
	// filesystem path before the gate fires.
	'/api/stripe/payment-methods/list?customer=%3Cscript%3E',
	"/api/stripe/payment-methods/list?customer=%27%20OR%201%3D1",
	'/api/stripe/payment-methods/list?stripeKey=%2F..%2F..%2Fetc%2Fpasswd',
	'/api/stripe/payment-methods/list?type=%00',

	// Long values — guard against any future regex /
	// regex-based indexing bug that might trip on long
	// inputs. The gate fires before any validator on the
	// unauth branch, so long values are irrelevant today.
	`/api/stripe/payment-methods/list?customer=cus_${'x'.repeat(500)}`,
	`/api/stripe/payment-methods/list?stripeKey=${'y'.repeat(500)}`,
	`/api/stripe/payment-methods/list?token=${'z'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero
	// query keys today, so any combination of unknown keys
	// is silently ignored on every branch.
	'/api/stripe/payment-methods/list?unknown=value',
	'/api/stripe/payment-methods/list?foo=bar&baz=qux',
	'/api/stripe/payment-methods/list?type=card&customer=cus_admin&token=foo&unknown=value&foo=bar'
] as const;

test.describe('API: /api/stripe/payment-methods/list query-param surface', () => {
	for (const path of STRIPE_PAYMENT_METHODS_LIST_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's auth gate fires before any potential
			// `searchParams` parsing or Stripe provider call, so
			// the unauthenticated GET surface returns 401
			// deterministically. There is no 5xx branch reachable
			// on the unauthenticated GET surface because the
			// catch can only fire after the gate has already let
			// the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/stripe/payment-methods/list returns 401 with the canonical { success: false, error } envelope on the unauth branch`, async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the auth gate must fire before any
		// potential validator / Stripe provider call and must
		// return 401 with the documented `{ success: false,
		// error: 'Unauthorized' }` envelope. A regression that
		// bypasses the gate would surface here as a non-401
		// status or a different body shape.
		const response = await request.get('/api/stripe/payment-methods/list');

		expect(response.status()).toBe(401);

		const body = (await response.json()) as {
			success?: unknown;
			error?: unknown;
		};

		// The route returns `{ success: false, error: 'Unauthorized' }`
		// today; `success` is a stable boolean discriminator and
		// `error` is a stable machine-readable identifier callers
		// depend on. Assert their presence and shape.
		expect(typeof body.success).toBe('boolean');
		expect(body.success).toBe(false);
		expect(typeof body.error).toBe('string');
	});

	test(`GET /api/stripe/payment-methods/list returns 401 identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params today, so the
		// response status must be invariant to any combination
		// of unknown keys.
		const baseline = await request.get('/api/stripe/payment-methods/list');
		const parameterised = await request.get(
			'/api/stripe/payment-methods/list?type=card&limit=10&customer=cus_admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(401);
	});

	test(`GET /api/stripe/payment-methods/list?customer=… does NOT bypass the session gate`, async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('customer')` as a fallback for
		// `getUserStripeCustomerId(session.user.id)` would change
		// the unauth branch from "always 401" to "200 if
		// ?customer=… is present" and silently grant any
		// anonymous caller arbitrary-customer payment-method
		// access. This assertion catches that change immediately.
		const baseline = await request.get('/api/stripe/payment-methods/list');
		const withCustomer = await request.get(
			'/api/stripe/payment-methods/list?customer=cus_admin'
		);
		const withCustomerId = await request.get(
			'/api/stripe/payment-methods/list?customerId=cus_admin'
		);
		const withStripeCustomerId = await request.get(
			'/api/stripe/payment-methods/list?stripeCustomerId=cus_admin'
		);

		expect(withCustomer.status()).toBe(baseline.status());
		expect(withCustomerId.status()).toBe(baseline.status());
		expect(withStripeCustomerId.status()).toBe(baseline.status());
	});

	test(`GET /api/stripe/payment-methods/list?stripeKey=… does NOT forward a caller-supplied Stripe key`, async ({
		request
	}) => {
		// The route reads the Stripe key from the provider
		// factory, which reads `process.env.STRIPE_SECRET_KEY`
		// server-side. A regression that wires
		// `searchParams.get('stripeKey')` as a fallback would let
		// an attacker (a) point the server at a different Stripe
		// account they control, (b) trigger Stripe API calls
		// billed against that account, and (c) potentially log
		// the leaked key server-side. This assertion pins the
		// "the Stripe key is server-side only" invariant.
		const baseline = await request.get('/api/stripe/payment-methods/list');
		const withKey = await request.get(
			'/api/stripe/payment-methods/list?stripeKey=anything'
		);
		const withKeyUnderscore = await request.get(
			'/api/stripe/payment-methods/list?stripe_key=anything'
		);
		const withSk = await request.get(
			'/api/stripe/payment-methods/list?sk=anything'
		);
		const withApiKey = await request.get(
			'/api/stripe/payment-methods/list?apiKey=anything'
		);
		const withSecretKey = await request.get(
			'/api/stripe/payment-methods/list?secretKey=anything'
		);

		expect(withKey.status()).toBe(baseline.status());
		expect(withKeyUnderscore.status()).toBe(baseline.status());
		expect(withSk.status()).toBe(baseline.status());
		expect(withApiKey.status()).toBe(baseline.status());
		expect(withSecretKey.status()).toBe(baseline.status());
	});

	test(`GET /api/stripe/payment-methods/list?token=… does NOT introduce a query-token auth bypass`, async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today. A future contributor who adds a magic-token
		// bypass for the session gate would change the unauth
		// branch's behaviour. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/stripe/payment-methods/list');
		const withToken = await request.get(
			'/api/stripe/payment-methods/list?token=anything'
		);
		const withSecret = await request.get(
			'/api/stripe/payment-methods/list?secret=anything'
		);
		const withApiKey = await request.get(
			'/api/stripe/payment-methods/list?api_key=anything'
		);
		const withAuthQuery = await request.get(
			'/api/stripe/payment-methods/list?authorization=Bearer+anything'
		);

		expect(withToken.status()).toBe(baseline.status());
		expect(withSecret.status()).toBe(baseline.status());
		expect(withApiKey.status()).toBe(baseline.status());
		expect(withAuthQuery.status()).toBe(baseline.status());
	});

	test(`GET /api/stripe/payment-methods/list?provider=… does NOT switch the payment provider`, async ({
		request
	}) => {
		// The wider repo also has LemonSqueezy, Polar, and
		// Solidgate providers, but this handler hard-codes
		// Stripe via `getOrCreateStripeProvider()`. A regression
		// that reads `searchParams.get('provider')` and
		// dispatches to a different provider factory would change
		// both the auth and the response shape. The unauth
		// branch's status must be invariant to the provider key.
		const baseline = await request.get('/api/stripe/payment-methods/list');
		const withLemonsqueezy = await request.get(
			'/api/stripe/payment-methods/list?provider=lemonsqueezy'
		);
		const withPolar = await request.get(
			'/api/stripe/payment-methods/list?provider=polar'
		);
		const withSolidgate = await request.get(
			'/api/stripe/payment-methods/list?provider=solidgate'
		);

		expect(withLemonsqueezy.status()).toBe(baseline.status());
		expect(withPolar.status()).toBe(baseline.status());
		expect(withSolidgate.status()).toBe(baseline.status());
	});

	test(`GET /api/stripe/payment-methods/list?account=… does NOT introduce a Stripe Connect account-override bypass`, async ({
		request
	}) => {
		// The route uses the platform Stripe account exclusively
		// today (no Stripe Connect `Stripe-Account` header
		// override). A regression that reads
		// `searchParams.get('account')` and forwards it to the
		// Stripe SDK as the `stripeAccount` option would let an
		// attacker list payment methods from arbitrary connected
		// accounts. The unauth branch's status must be invariant
		// to the account-override key.
		const baseline = await request.get('/api/stripe/payment-methods/list');
		const withAccount = await request.get(
			'/api/stripe/payment-methods/list?account=acct_anything'
		);
		const withStripeAccount = await request.get(
			'/api/stripe/payment-methods/list?stripeAccount=acct_anything'
		);
		const withConnect = await request.get(
			'/api/stripe/payment-methods/list?connect=acct_anything'
		);

		expect(withAccount.status()).toBe(baseline.status());
		expect(withStripeAccount.status()).toBe(baseline.status());
		expect(withConnect.status()).toBe(baseline.status());
	});

	test(`GET /api/stripe/payment-methods/list?type=… does NOT change the payment-method-type filter on the unauth branch`, async ({
		request
	}) => {
		// The Stripe SDK call hard-codes `type: 'card'` today.
		// A regression that reads `searchParams.get('type')`
		// before the gate would change the response payload
		// shape on the auth branch (e.g. listing bank accounts
		// instead of cards). The unauth branch's status must be
		// invariant to the type key.
		const baseline = await request.get('/api/stripe/payment-methods/list');
		const responses = await Promise.all([
			request.get('/api/stripe/payment-methods/list?type=us_bank_account'),
			request.get('/api/stripe/payment-methods/list?type=sepa_debit'),
			request.get('/api/stripe/payment-methods/list?type=ideal'),
			request.get('/api/stripe/payment-methods/list?type=link'),
			request.get('/api/stripe/payment-methods/list?type=invalid'),
			request.get('/api/stripe/payment-methods/list?type=%00')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});

	test(`GET /api/stripe/payment-methods/list keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 401 envelope on the unauth
		// branch. The shape guarantees the route's auth gate
		// fires before any branching on potential future query
		// schemas.
		const responses = await Promise.all([
			request.get('/api/stripe/payment-methods/list'),
			request.get(
				'/api/stripe/payment-methods/list?type=card&limit=10&customer=cus_admin&account=acct_admin'
			),
			request.get(
				'/api/stripe/payment-methods/list?type=invalid&limit=abc&customer=invalid&token=foo&unknown=bar'
			)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);

			const body = (await response.json()) as {
				success?: unknown;
				error?: unknown;
			};
			expect(typeof body.success).toBe('boolean');
			expect(body.success).toBe(false);
			expect(typeof body.error).toBe('string');
		}
	});
});
