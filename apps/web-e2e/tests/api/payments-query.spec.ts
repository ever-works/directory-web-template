import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * authenticated user-payments endpoint served by
 * `apps/web/app/api/user/payments/route.ts`.
 *
 * `GET /api/user/payments` is intentionally **session-gated**
 * — it returns the caller's full payment history (Stripe
 * invoices + subscription envelopes mapped onto the response
 * shape documented inline on the route's swagger block) by
 * resolving a Stripe customer id from the caller's
 * session-bearing user, then listing every invoice and
 * subscription on that customer. The handler signature is the
 * **zero-argument** Next 16 form:
 *
 *     export async function GET() {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.id) {
 *           return NextResponse.json(
 *             { error: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         const stripeProvider = initializeStripeProvider();
 *         const stripe = stripeProvider.getStripeInstance();
 *         const customerId = await stripeProvider.getCustomerId(...);
 *         if (!customerId) {
 *           return NextResponse.json([]);
 *         }
 *         try {
 *           const invoices = await stripe.invoices.list({...});
 *           const subscriptions = await stripe.subscriptions.list({...});
 *           return NextResponse.json([...]);
 *         } catch (stripeError) {
 *           return NextResponse.json(
 *             { error: '...' },
 *             { status: 500 }
 *           );
 *         }
 *       } catch (error) {
 *         ...
 *       }
 *     }
 *
 * Note that `GET` declares **no parameters at all** — not
 * `_request`, not `request: NextRequest`, not a `context`
 * object. The handler reads **zero** query parameters: there
 * is no `request.url`, `request.headers`, or
 * `searchParams.get(...)` access anywhere inside the function
 * body. The route therefore must be invariant to **any**
 * query parameter the caller appends — present, absent, empty,
 * repeated, special-character, or long.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session whose `user.id` is missing); the early
 *     `if (!session?.user?.id)` branch fires and the route
 *     returns `{ error: 'Unauthorized' }` with status 401.
 *     This is the contract every assertion below pins,
 *     because the e2e runner does not carry an authenticated
 *     session by default.
 *   - **Authenticated, no Stripe customer**: returns 200 with
 *     an empty array `[]`. Out of scope for this spec.
 *   - **Authenticated, with Stripe customer**: returns 200
 *     with the full `[{...payment record}, ...]` envelope.
 *     Out of scope for this spec.
 *   - **Stripe API failure**: returns 500 with
 *     `{ error: '...' }`. Out of scope for this spec because
 *     the gate fires before the Stripe call on every unauth
 *     invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec hits.
 * A regression that introduces query-string-based bypass
 * (e.g. a future `?customerId=...` admin-impersonation key,
 * a `?token=...` magic-token bypass, a `?status=paid`
 * filter-claim that short-circuits the Stripe lookup, a
 * `?stripeKey=...` dangerous-passthrough that would forward
 * a caller-supplied key to Stripe) would surface immediately
 * as a status divergence between the no-arg 401 and a
 * parameter-laden non-401.
 *
 * The shape mirrors the sibling
 * `apps/web/app/api/user/subscription/route.ts` smoke spec
 * pinned at `subscription-query.spec.ts` — the two routes
 * share the same `auth() → getCustomerId() → stripe.list()`
 * shape and the same zero-query-param contract, so the same
 * regression-pinning posture applies to both.
 */
const PAYMENTS_QUERIES = [
	// Baseline — the no-arg unauthenticated case. Included so
	// a future reader of this file sees the canonical case
	// alongside the variants it parametrises.
	'/api/user/payments',

	// `?userId=` / `?user_id=` / `?uid=` — the obvious wiring
	// a future "admin-views-other-user's-payments" feature
	// might add as an authenticated-admin override. The route
	// reads the user id from the session exclusively today.
	'/api/user/payments?userId=anything',
	'/api/user/payments?user_id=anything',
	'/api/user/payments?uid=anything',
	'/api/user/payments?id=anything',
	'/api/user/payments?userId=00000000-0000-0000-0000-000000000000',

	// `?customerId=` / `?customer=` / `?stripeCustomerId=` —
	// the obvious wiring for an "admin-views-customer's-payments"
	// or "service-to-service" feature. The route resolves the
	// customer id from the session-bound user record today via
	// `stripeProvider.getCustomerId(session.user)`; a regression
	// that reads `searchParams.get('customerId')` as a fallback
	// would silently grant arbitrary-customer access.
	'/api/user/payments?customerId=cus_anything',
	'/api/user/payments?customer=cus_anything',
	'/api/user/payments?stripeCustomerId=cus_anything',
	'/api/user/payments?stripe_customer=cus_anything',

	// `?invoiceId=` / `?invId=` — the obvious wiring for a
	// "fetch-this-specific-invoice" feature. The route returns
	// the full payment-history envelope today and does not
	// branch on any invoice-id key.
	'/api/user/payments?invoiceId=in_anything',
	'/api/user/payments?invId=in_anything',
	'/api/user/payments?invoice=in_anything',
	'/api/user/payments?invoice_id=in_anything',

	// `?subscriptionId=` / `?subId=` — the obvious wiring for
	// scoping payments to a particular subscription. The route
	// returns every invoice today and does not honour any
	// subscription-id filter from the URL.
	'/api/user/payments?subscriptionId=sub_anything',
	'/api/user/payments?subId=sub_anything',
	'/api/user/payments?sub_id=sub_anything',

	// `?status=` — the obvious "filter by payment status" key.
	// The route returns every invoice today and does not honour
	// any status filter from the URL.
	'/api/user/payments?status=paid',
	'/api/user/payments?status=pending',
	'/api/user/payments?status=draft',
	'/api/user/payments?status=open',
	'/api/user/payments?status=void',
	'/api/user/payments?status=uncollectible',

	// `?token=` / `?secret=` / `?api_key=` / `?authorization=` —
	// the obvious "I have a magic auth token, let me through"
	// keys. The route authenticates via NextAuth session cookie
	// only today.
	'/api/user/payments?token=anything',
	'/api/user/payments?secret=anything',
	'/api/user/payments?api_key=anything',
	'/api/user/payments?authorization=Bearer+anything',
	'/api/user/payments?session=anything',

	// `?stripeKey=` / `?stripe_key=` / `?sk=` — the obvious
	// dangerous "use this Stripe key instead of the server's"
	// keys. The route reads the Stripe key from
	// `initializeStripeProvider()` (which reads
	// `process.env.STRIPE_SECRET_KEY`) and must NEVER trust a
	// caller-supplied key.
	'/api/user/payments?stripeKey=sk_test_anything',
	'/api/user/payments?stripe_key=sk_test_anything',
	'/api/user/payments?sk=sk_test_anything',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` — the
	// obvious cache-busting keys. The handler does not branch
	// on any cache-control query param today.
	'/api/user/payments?refresh=1',
	'/api/user/payments?force=true',
	'/api/user/payments?fresh=true',
	'/api/user/payments?cache=bypass',
	'/api/user/payments?nocache=1',

	// `?expand=` / `?include=` — the obvious "include extra
	// nested objects" keys mirroring Stripe's own `expand[]=`
	// parameter shape. The route does not forward
	// caller-supplied expansions today.
	'/api/user/payments?expand=customer',
	'/api/user/payments?expand=lines.data.price.product',
	'/api/user/payments?include=subscription',
	'/api/user/payments?include=invoice_pdf',

	// `?limit=` / `?cursor=` / `?starting_after=` /
	// `?ending_before=` — the obvious pagination keys
	// mirroring Stripe's pagination shape. The route hard-codes
	// `limit: 100` today and does not honour any pagination
	// from the URL.
	'/api/user/payments?limit=10',
	'/api/user/payments?limit=1000',
	'/api/user/payments?starting_after=in_anything',
	'/api/user/payments?ending_before=in_anything',
	'/api/user/payments?cursor=anything',

	// `?format=` — the obvious content-negotiation key. The
	// route returns JSON exclusively today.
	'/api/user/payments?format=json',
	'/api/user/payments?format=xml',
	'/api/user/payments?format=csv',
	'/api/user/payments?format=pdf',

	// `?currency=` / `?locale=` / `?lang=` — the obvious "show
	// amounts in this currency / format dates in this locale"
	// keys. The route uses Stripe's stored currency on each
	// invoice and does not transform.
	'/api/user/payments?currency=eur',
	'/api/user/payments?locale=en',
	'/api/user/payments?lang=fr',

	// `?provider=` — the obvious "force a different payment
	// provider" key. The route hard-codes Stripe today (the
	// wider repo also has Polar, LemonSqueezy, and Solidgate
	// providers, but this handler only reads Stripe). A
	// regression that reads `searchParams.get('provider')`
	// would change the unauth branch's behaviour even before
	// the gate fires.
	'/api/user/payments?provider=stripe',
	'/api/user/payments?provider=polar',
	'/api/user/payments?provider=lemonsqueezy',
	'/api/user/payments?provider=solidgate',

	// `?date=` / `?from=` / `?to=` / `?after=` / `?before=` —
	// the obvious date-range filters. The route returns every
	// invoice today and does not honour any date-range filter
	// from the URL.
	'/api/user/payments?date=2024-01-01',
	'/api/user/payments?from=2024-01-01',
	'/api/user/payments?to=2024-12-31',
	'/api/user/payments?after=2024-01-01',
	'/api/user/payments?before=2024-12-31',

	// `?tenant=` / `?tenantId=` / `?org=` — the obvious
	// multi-tenancy keys.
	'/api/user/payments?tenant=acme',
	'/api/user/payments?tenantId=42',
	'/api/user/payments?org=ever-works',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The route reads zero keys, so empty values
	// must round-trip to the same response as the no-arg case.
	'/api/user/payments?userId=',
	'/api/user/payments?customerId=',
	'/api/user/payments?token=',
	'/api/user/payments?stripeKey=',
	'/api/user/payments?refresh=',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value, but the route never calls
	// `searchParams.get(...)` at all, so repetition is
	// irrelevant.
	'/api/user/payments?userId=foo&userId=bar',
	'/api/user/payments?customerId=cus_a&customerId=cus_b',
	'/api/user/payments?status=paid&status=pending',

	// Special-character values that would tempt a future
	// regex match, LIKE-prefix, or path-injection wiring. The
	// route does not pass any value into a SQL or filesystem
	// path, so they must remain pass-through ignored.
	'/api/user/payments?userId=%25',
	'/api/user/payments?customerId=%2F',
	'/api/user/payments?stripeKey=%5C',
	'/api/user/payments?userId=%27%20OR%201%3D1',
	'/api/user/payments?status=%3Cscript%3E',

	// Long values — guard against any future regex /
	// regex-based indexing bug that might trip on long inputs.
	// The route does not read the value into any parameter
	// today.
	`/api/user/payments?userId=${'x'.repeat(500)}`,
	`/api/user/payments?stripeKey=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero keys,
	// so any combination of unknown keys is silently ignored.
	'/api/user/payments?unknown=value',
	'/api/user/payments?foo=bar&baz=qux',
	'/api/user/payments?userId=alice&customerId=cus_x&unknown=value&foo=bar'
] as const;

test.describe('API: /api/user/payments query-param surface', () => {
	for (const path of PAYMENTS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's auth gate fires before any
			// service-layer call (no Stripe call on the unauth
			// branch), so the unauthenticated GET surface
			// returns 401 deterministically. There is no 5xx
			// branch reachable on the unauthenticated GET
			// surface because the catch can only fire after the
			// gate has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/user/payments returns 401 with the canonical { error } envelope on the unauth branch`, async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the auth gate must fire before any
		// Stripe / service-layer call and must return 401 with
		// the `{ error: 'Unauthorized' }` envelope. A
		// regression that bypasses the gate would surface here
		// as a non-401 status or a different body shape (an
		// `200 []` empty-history envelope, for instance).
		const response = await request.get('/api/user/payments');

		expect(response.status()).toBe(401);

		const body = (await response.json()) as { error?: unknown };

		expect(typeof body.error).toBe('string');
	});

	test(`GET /api/user/payments returns 401 identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params on the GET
		// surface, so the response status must be invariant to
		// any combination of unknown keys. Body content is not
		// asserted byte-identical because the error message
		// wording is allowed to evolve.
		const baseline = await request.get('/api/user/payments');
		const parameterised = await request.get(
			'/api/user/payments?userId=alice&customerId=cus_x&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(401);
	});

	test(`GET /api/user/payments?userId=… does NOT bypass the session gate`, async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `session.user.id` would change the unauth branch
		// from "always 401" to "200 if ?userId=… is present"
		// and silently grant any anonymous caller
		// arbitrary-user impersonation against the Stripe
		// customer lookup. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/user/payments');
		const withUserId = await request.get('/api/user/payments?userId=alice');
		const withUid = await request.get('/api/user/payments?uid=bob');
		const withId = await request.get(
			'/api/user/payments?id=00000000-0000-0000-0000-000000000000'
		);

		expect(withUserId.status()).toBe(baseline.status());
		expect(withUid.status()).toBe(baseline.status());
		expect(withId.status()).toBe(baseline.status());
	});

	test(`GET /api/user/payments?customerId=… does NOT bypass the customer-resolution step`, async ({
		request
	}) => {
		// The route resolves the Stripe customer id from the
		// session-bound user record today via
		// `stripeProvider.getCustomerId(session.user)`. A
		// regression that reads `searchParams.get('customerId')`
		// as a fallback would silently grant
		// arbitrary-customer access to anyone, including
		// unauthenticated callers. This assertion pins the
		// "the customer id is derived from the session, not
		// the URL" invariant.
		const baseline = await request.get('/api/user/payments');
		const withCustomerId = await request.get(
			'/api/user/payments?customerId=cus_anything'
		);
		const withCustomer = await request.get(
			'/api/user/payments?customer=cus_anything'
		);
		const withStripeCustomer = await request.get(
			'/api/user/payments?stripeCustomerId=cus_anything'
		);

		expect(withCustomerId.status()).toBe(baseline.status());
		expect(withCustomer.status()).toBe(baseline.status());
		expect(withStripeCustomer.status()).toBe(baseline.status());
	});

	test(`GET /api/user/payments?stripeKey=… does NOT forward a caller-supplied Stripe key`, async ({
		request
	}) => {
		// The route reads the Stripe key from
		// `initializeStripeProvider()`, which reads
		// `process.env.STRIPE_SECRET_KEY` server-side. A
		// regression that wires `searchParams.get('stripeKey')`
		// as a fallback would let an attacker (a) point the
		// server at a different Stripe account they control,
		// (b) trigger Stripe API calls billed against that
		// account, and (c) potentially log the leaked key
		// server-side. This assertion pins the "the Stripe key
		// is server-side only" invariant.
		const baseline = await request.get('/api/user/payments');
		const withStripeKey = await request.get(
			'/api/user/payments?stripeKey=sk_test_anything'
		);
		const withStripeKeyUnderscore = await request.get(
			'/api/user/payments?stripe_key=sk_test_anything'
		);
		const withSk = await request.get('/api/user/payments?sk=sk_test_anything');

		expect(withStripeKey.status()).toBe(baseline.status());
		expect(withStripeKeyUnderscore.status()).toBe(baseline.status());
		expect(withSk.status()).toBe(baseline.status());
	});

	test(`GET /api/user/payments?token=… does NOT introduce a query-token auth bypass`, async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today. A future contributor who adds a magic-token
		// bypass for the session gate would change the unauth
		// branch's behaviour. This assertion catches that
		// change immediately.
		const baseline = await request.get('/api/user/payments');
		const withToken = await request.get('/api/user/payments?token=anything');
		const withSecret = await request.get('/api/user/payments?secret=anything');
		const withApiKey = await request.get(
			'/api/user/payments?api_key=anything'
		);
		const withAuthQuery = await request.get(
			'/api/user/payments?authorization=Bearer+anything'
		);

		expect(withToken.status()).toBe(baseline.status());
		expect(withSecret.status()).toBe(baseline.status());
		expect(withApiKey.status()).toBe(baseline.status());
		expect(withAuthQuery.status()).toBe(baseline.status());
	});

	test(`GET /api/user/payments keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 401 envelope on the
		// unauth branch. The shape guarantees the route does
		// not branch on any query key today.
		const responses = await Promise.all([
			request.get('/api/user/payments'),
			request.get('/api/user/payments?userId=alice&customerId=cus_x'),
			request.get(
				'/api/user/payments?status=paid&token=foo&stripeKey=sk_x&unknown=bar'
			)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);

			const body = (await response.json()) as { error?: unknown };
			expect(typeof body.error).toBe('string');
		}
	});
});
