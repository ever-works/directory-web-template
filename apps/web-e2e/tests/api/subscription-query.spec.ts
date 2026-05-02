import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * authenticated user-subscription endpoint served by
 * `apps/web/app/api/user/subscription/route.ts`.
 *
 * `GET /api/user/subscription` is intentionally **session-gated**
 * — it returns the caller's full subscription envelope (active
 * subscription details + complete subscription history) by
 * resolving a Stripe customer id from the caller's session-bearing
 * user, then listing every subscription on that customer. The
 * handler signature is the **zero-argument** Next 16 form:
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
 *           return NextResponse.json({
 *             hasActiveSubscription: false,
 *             message: 'No Stripe customer found'
 *           });
 *         }
 *         try {
 *           const subscriptions = await stripe.subscriptions.list({...});
 *           return NextResponse.json({...});
 *         } catch (stripeError) {
 *           return NextResponse.json(
 *             { error: 'Failed to fetch subscription data from Stripe' },
 *             { status: 500 }
 *           );
 *         }
 *       } catch (error) {
 *         ...
 *       }
 *     }
 *
 * Note that `GET` declares **no parameters at all** — not
 * `_request`, not `request: NextRequest`, not a `context` object.
 * The handler reads **zero** query parameters: there is no
 * `request.url`, `request.headers`, or `searchParams.get(...)`
 * access anywhere inside the function body. The route therefore
 * must be invariant to **any** query parameter the caller appends
 * — present, absent, empty, repeated, special-character, or long.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a session
 *     whose `user.id` is missing); the early
 *     `if (!session?.user?.id)` branch fires and the route
 *     returns `{ error: 'Unauthorized' }` with status 401. This
 *     is the contract every assertion below pins, because the
 *     e2e runner does not carry an authenticated session by
 *     default.
 *   - **Authenticated, no Stripe customer**: returns 200 with
 *     `{ hasActiveSubscription: false, message: 'No Stripe
 *     customer found' }`. Out of scope for this spec.
 *   - **Authenticated, with Stripe customer**: returns 200 with
 *     the full `{ hasActiveSubscription, currentSubscription,
 *     subscriptionHistory }` envelope. Out of scope for this
 *     spec.
 *   - **Stripe API failure**: returns 500 with
 *     `{ error: 'Failed to fetch subscription data from Stripe' }`.
 *     Out of scope for this spec because the gate fires before
 *     the Stripe call on every unauth invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec hits. A
 * regression that introduces query-string-based bypass (e.g. a
 * future `?customerId=...` admin-impersonation key, a
 * `?token=...` magic-token bypass, a `?status=active` claim
 * that short-circuits the Stripe lookup, a `?stripeKey=...`
 * dangerous-passthrough that would forward a caller-supplied
 * key to Stripe) would surface immediately as a status
 * divergence between the no-arg 401 and a parameter-laden
 * non-401.
 */
const SUBSCRIPTION_QUERIES = [
	// Baseline — the no-arg unauthenticated case. Included so a
	// future reader of this file sees the canonical case
	// alongside the variants it parametrises.
	'/api/user/subscription',

	// `?userId=` / `?user_id=` / `?uid=` — the obvious wiring a
	// future "admin-views-other-user's-subscription" feature
	// might add as an authenticated-admin override. The route
	// reads the user id from the session exclusively today.
	'/api/user/subscription?userId=anything',
	'/api/user/subscription?user_id=anything',
	'/api/user/subscription?uid=anything',
	'/api/user/subscription?id=anything',
	'/api/user/subscription?userId=00000000-0000-0000-0000-000000000000',

	// `?customerId=` / `?customer=` / `?stripeCustomerId=` —
	// the obvious wiring for an "admin-views-customer's-subscription"
	// or "service-to-service" feature. The route resolves the
	// customer id from the session-bound user record today
	// via `stripeProvider.getCustomerId(session.user)`; a
	// regression that reads `searchParams.get('customerId')` as
	// a fallback would silently grant arbitrary-customer access.
	'/api/user/subscription?customerId=cus_anything',
	'/api/user/subscription?customer=cus_anything',
	'/api/user/subscription?stripeCustomerId=cus_anything',
	'/api/user/subscription?stripe_customer=cus_anything',

	// `?subscriptionId=` / `?subId=` — the obvious wiring for a
	// "fetch-this-specific-subscription" feature. The route
	// returns the full subscription envelope today and does not
	// branch on any subscription-id key.
	'/api/user/subscription?subscriptionId=sub_anything',
	'/api/user/subscription?subId=sub_anything',
	'/api/user/subscription?sub_id=sub_anything',

	// `?status=` — the obvious "filter by subscription status"
	// key. The route returns every subscription today and does
	// not honour any status filter from the URL.
	'/api/user/subscription?status=active',
	'/api/user/subscription?status=trialing',
	'/api/user/subscription?status=canceled',
	'/api/user/subscription?status=past_due',
	'/api/user/subscription?status=unpaid',

	// `?token=` / `?secret=` / `?api_key=` / `?authorization=` —
	// the obvious "I have a magic auth token, let me through"
	// keys. The route authenticates via NextAuth session cookie
	// only today.
	'/api/user/subscription?token=anything',
	'/api/user/subscription?secret=anything',
	'/api/user/subscription?api_key=anything',
	'/api/user/subscription?authorization=Bearer+anything',
	'/api/user/subscription?session=anything',

	// `?stripeKey=` / `?stripe_key=` / `?sk=` — the obvious
	// dangerous "use this Stripe key instead of the server's"
	// keys. The route reads the Stripe key from
	// `initializeStripeProvider()` (which reads
	// `process.env.STRIPE_SECRET_KEY`) and must NEVER trust a
	// caller-supplied key.
	'/api/user/subscription?stripeKey=sk_test_anything',
	'/api/user/subscription?stripe_key=sk_test_anything',
	'/api/user/subscription?sk=sk_test_anything',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` — the
	// obvious cache-busting keys. The handler does not branch
	// on any cache-control query param today.
	'/api/user/subscription?refresh=1',
	'/api/user/subscription?force=true',
	'/api/user/subscription?fresh=true',
	'/api/user/subscription?cache=bypass',
	'/api/user/subscription?nocache=1',

	// `?expand=` / `?include=` — the obvious "include extra
	// nested objects" keys mirroring Stripe's own
	// `expand[]=` parameter shape. The route hard-codes
	// `expand: ['data.default_payment_method']` today and does
	// not forward caller-supplied expansions.
	'/api/user/subscription?expand=customer',
	'/api/user/subscription?expand=items.data.price.product',
	'/api/user/subscription?include=invoice',
	'/api/user/subscription?include=upcoming_invoice',

	// `?limit=` / `?cursor=` / `?starting_after=` /
	// `?ending_before=` — the obvious pagination keys
	// mirroring Stripe's pagination shape. The route hard-codes
	// `limit: 100` today and does not honour any pagination
	// from the URL.
	'/api/user/subscription?limit=10',
	'/api/user/subscription?limit=1000',
	'/api/user/subscription?starting_after=sub_anything',
	'/api/user/subscription?ending_before=sub_anything',
	'/api/user/subscription?cursor=anything',

	// `?format=` — the obvious content-negotiation key. The
	// route returns JSON exclusively today.
	'/api/user/subscription?format=json',
	'/api/user/subscription?format=xml',
	'/api/user/subscription?format=csv',

	// `?currency=` / `?locale=` / `?lang=` — the obvious "show
	// amounts in this currency / format dates in this locale"
	// keys. The route uses Stripe's stored currency on each
	// subscription and does not transform.
	'/api/user/subscription?currency=eur',
	'/api/user/subscription?locale=en',
	'/api/user/subscription?lang=fr',

	// `?provider=` — the obvious "force a different payment
	// provider" key. The route hard-codes Stripe today (the
	// wider repo also has Polar, LemonSqueezy, and Solidgate
	// providers, but this handler only reads Stripe). A
	// regression that reads `searchParams.get('provider')`
	// would change the unauth branch's behaviour even before
	// the gate fires.
	'/api/user/subscription?provider=stripe',
	'/api/user/subscription?provider=polar',
	'/api/user/subscription?provider=lemonsqueezy',
	'/api/user/subscription?provider=solidgate',

	// `?tenant=` / `?tenantId=` / `?org=` — the obvious
	// multi-tenancy keys.
	'/api/user/subscription?tenant=acme',
	'/api/user/subscription?tenantId=42',
	'/api/user/subscription?org=ever-works',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The route reads zero keys, so empty values
	// must round-trip to the same response as the no-arg case.
	'/api/user/subscription?userId=',
	'/api/user/subscription?customerId=',
	'/api/user/subscription?token=',
	'/api/user/subscription?stripeKey=',
	'/api/user/subscription?refresh=',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value, but the route never calls
	// `searchParams.get(...)` at all, so repetition is
	// irrelevant.
	'/api/user/subscription?userId=foo&userId=bar',
	'/api/user/subscription?customerId=cus_a&customerId=cus_b',
	'/api/user/subscription?status=active&status=canceled',

	// Special-character values that would tempt a future
	// regex match, LIKE-prefix, or path-injection wiring.
	// The route does not pass any value into a SQL or
	// filesystem path, so they must remain pass-through
	// ignored.
	'/api/user/subscription?userId=%25',
	'/api/user/subscription?customerId=%2F',
	'/api/user/subscription?stripeKey=%5C',
	'/api/user/subscription?userId=%27%20OR%201%3D1',
	'/api/user/subscription?status=%3Cscript%3E',

	// Long values — guard against any future regex /
	// regex-based indexing bug that might trip on long
	// inputs. The route does not read the value into any
	// parameter today.
	`/api/user/subscription?userId=${'x'.repeat(500)}`,
	`/api/user/subscription?stripeKey=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero keys,
	// so any combination of unknown keys is silently ignored.
	'/api/user/subscription?unknown=value',
	'/api/user/subscription?foo=bar&baz=qux',
	'/api/user/subscription?userId=alice&customerId=cus_x&unknown=value&foo=bar'
] as const;

test.describe('API: /api/user/subscription query-param surface', () => {
	for (const path of SUBSCRIPTION_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's auth gate fires before any
			// service-layer call (no Stripe call on the unauth
			// branch), so the unauthenticated GET surface returns
			// 401 deterministically. There is no 5xx branch
			// reachable on the unauthenticated GET surface
			// because the catch can only fire after the gate has
			// already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/user/subscription returns 401 with the canonical { error } envelope on the unauth branch`, async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the auth gate must fire before any
		// Stripe / service-layer call and must return 401 with
		// the `{ error: 'Unauthorized' }` envelope. A regression
		// that bypasses the gate would surface here as a
		// non-401 status or a different body shape (`200`
		// `{ hasActiveSubscription: false, ... }`, for
		// instance).
		const response = await request.get('/api/user/subscription');

		expect(response.status()).toBe(401);

		const body = (await response.json()) as { error?: unknown };

		expect(typeof body.error).toBe('string');
	});

	test(`GET /api/user/subscription returns 401 identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params on the GET surface,
		// so the response status must be invariant to any
		// combination of unknown keys. Body content is not
		// asserted byte-identical because the error message
		// wording is allowed to evolve.
		const baseline = await request.get('/api/user/subscription');
		const parameterised = await request.get(
			'/api/user/subscription?userId=alice&customerId=cus_x&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(401);
	});

	test(`GET /api/user/subscription?userId=… does NOT bypass the session gate`, async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `session.user.id` would change the unauth branch from
		// "always 401" to "200 if ?userId=… is present" and
		// silently grant any anonymous caller arbitrary-user
		// impersonation against the Stripe customer lookup. This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/user/subscription');
		const withUserId = await request.get('/api/user/subscription?userId=alice');
		const withUid = await request.get('/api/user/subscription?uid=bob');
		const withId = await request.get(
			'/api/user/subscription?id=00000000-0000-0000-0000-000000000000'
		);

		expect(withUserId.status()).toBe(baseline.status());
		expect(withUid.status()).toBe(baseline.status());
		expect(withId.status()).toBe(baseline.status());
	});

	test(`GET /api/user/subscription?customerId=… does NOT bypass the customer-resolution step`, async ({
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
		const baseline = await request.get('/api/user/subscription');
		const withCustomerId = await request.get(
			'/api/user/subscription?customerId=cus_anything'
		);
		const withCustomer = await request.get(
			'/api/user/subscription?customer=cus_anything'
		);
		const withStripeCustomer = await request.get(
			'/api/user/subscription?stripeCustomerId=cus_anything'
		);

		expect(withCustomerId.status()).toBe(baseline.status());
		expect(withCustomer.status()).toBe(baseline.status());
		expect(withStripeCustomer.status()).toBe(baseline.status());
	});

	test(`GET /api/user/subscription?stripeKey=… does NOT forward a caller-supplied Stripe key`, async ({
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
		// server-side. This assertion pins the
		// "the Stripe key is server-side only" invariant.
		const baseline = await request.get('/api/user/subscription');
		const withStripeKey = await request.get(
			'/api/user/subscription?stripeKey=sk_test_anything'
		);
		const withStripeKeyUnderscore = await request.get(
			'/api/user/subscription?stripe_key=sk_test_anything'
		);
		const withSk = await request.get('/api/user/subscription?sk=sk_test_anything');

		expect(withStripeKey.status()).toBe(baseline.status());
		expect(withStripeKeyUnderscore.status()).toBe(baseline.status());
		expect(withSk.status()).toBe(baseline.status());
	});

	test(`GET /api/user/subscription?token=… does NOT introduce a query-token auth bypass`, async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today. A future contributor who adds a magic-token
		// bypass for the session gate would change the unauth
		// branch's behaviour. This assertion catches that
		// change immediately.
		const baseline = await request.get('/api/user/subscription');
		const withToken = await request.get('/api/user/subscription?token=anything');
		const withSecret = await request.get('/api/user/subscription?secret=anything');
		const withApiKey = await request.get(
			'/api/user/subscription?api_key=anything'
		);
		const withAuthQuery = await request.get(
			'/api/user/subscription?authorization=Bearer+anything'
		);

		expect(withToken.status()).toBe(baseline.status());
		expect(withSecret.status()).toBe(baseline.status());
		expect(withApiKey.status()).toBe(baseline.status());
		expect(withAuthQuery.status()).toBe(baseline.status());
	});

	test(`GET /api/user/subscription keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 401 envelope on the
		// unauth branch. The shape guarantees the route does
		// not branch on any query key today.
		const responses = await Promise.all([
			request.get('/api/user/subscription'),
			request.get('/api/user/subscription?userId=alice&customerId=cus_x'),
			request.get(
				'/api/user/subscription?status=active&token=foo&stripeKey=sk_x&unknown=bar'
			)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);

			const body = (await response.json()) as { error?: unknown };
			expect(typeof body.error).toBe('string');
		}
	});
});
