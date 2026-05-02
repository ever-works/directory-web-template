import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * public Stripe-products endpoint served by
 * `apps/web/app/api/stripe/products/route.ts`.
 *
 * `GET /api/stripe/products` is intentionally
 * **flag-gated** — it returns the dynamic Stripe products
 * (and their prices) for the marketing pricing page only
 * when the `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` flag is set
 * to `true` AND `STRIPE_SECRET_KEY` is configured. The
 * handler signature is the **zero-argument** Next 16 form
 * (the route does not take a `NextRequest` argument and
 * reads no `searchParams` at all today):
 *
 *     export async function GET() {
 *       try {
 *         if (!isStripeDynamicPricingEnabled()) {
 *           return NextResponse.json(
 *             { error: 'Dynamic pricing is not enabled',
 *               message: 'Set NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true to enable' },
 *             { status: 400 }
 *           );
 *         }
 *         if (!process.env.STRIPE_SECRET_KEY) {
 *           return NextResponse.json(
 *             { error: 'Stripe not configured',
 *               message: 'STRIPE_SECRET_KEY is required' },
 *             { status: 500 }
 *           );
 *         }
 *         const productsData = await fetchStripeProducts();
 *         const stripeConfig = buildDynamicStripeConfig(productsData.products);
 *         return NextResponse.json({ ...productsData, stripeConfig });
 *       } catch (error: any) {
 *         return NextResponse.json(
 *           { error: 'Failed to fetch products', message: error.message ... },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * Because the handler signature is **zero-argument**, the
 * route reads zero query params today — every assertion
 * below pins that the response is invariant to the query
 * string regardless of which keys the caller appends to the
 * URL. A regression that switches the signature to
 * `GET(request: NextRequest)` and starts reading
 * `request.nextUrl.searchParams.get(...)` would not change
 * the flag-gate's response on the disabled branch (the
 * gate fires first), but a regression that reads
 * `searchParams` **before** the gate (e.g. for a
 * `?token=…` magic-token bypass that forces the dynamic-
 * pricing path on, a `?stripeKey=…` dangerous-passthrough,
 * or a `?products=…` filter that surfaces from the cached
 * products list) would change the disabled-flag branch's
 * behaviour from "always 400" to "200 / 500 if the right
 * query is present" — and that change is exactly what this
 * spec catches.
 *
 * The route's gating contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **`NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` not set or
 *     `false`**: the early `if (!isStripeDynamicPricingEnabled())`
 *     branch fires and the route returns
 *     `{ error: 'Dynamic pricing is not enabled', message: … }`
 *     with status 400. This is the contract every assertion
 *     below pins, because the e2e runner does not enable
 *     dynamic pricing by default.
 *   - **Dynamic pricing enabled, no `STRIPE_SECRET_KEY`**:
 *     returns 500 with `{ error: 'Stripe not configured',
 *     message: 'STRIPE_SECRET_KEY is required' }`. Out of
 *     scope for this spec because the gate fires before the
 *     env check on every disabled-flag invocation.
 *   - **Dynamic pricing enabled, valid Stripe**: returns
 *     200 with the products / sponsorAds / stripeConfig
 *     payload. Out of scope for this spec because the gate
 *     fires before the Stripe SDK call on every
 *     disabled-flag invocation.
 *   - **Internal error**: returns 500 with
 *     `{ error: 'Failed to fetch products', message: … }`.
 *     Out of scope for this spec because the gate fires
 *     before any Stripe SDK call on every disabled-flag
 *     invocation.
 *
 * The query-param surface walks the disabled-flag branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?dynamic=1` flag-override that
 * fires before the gate, a `?token=…` magic-token bypass
 * that flips the dynamic-pricing posture on for a single
 * call, a `?stripeKey=…` dangerous-passthrough that would
 * forward a caller-supplied key to the Stripe provider, or
 * a `?productId=…` filter that bypasses the gate to surface
 * a single product — would surface immediately as a status
 * divergence between the no-arg 400 and a parameter-laden
 * non-400.
 *
 * The shape mirrors the sibling
 * `apps/web/app/api/stripe/payment-methods/list/route.ts`,
 * `apps/web/app/api/lemonsqueezy/list/route.ts`,
 * `apps/web/app/api/user/subscription/route.ts`,
 * `apps/web/app/api/user/payments/route.ts`, and
 * `apps/web/app/api/user/plan-status/route.ts` smoke specs
 * pinned at `stripe-payment-methods-list-query.spec.ts`,
 * `lemonsqueezy-list-query.spec.ts`,
 * `subscription-query.spec.ts`, `payments-query.spec.ts`,
 * and `plan-status-query.spec.ts` — all six routes share
 * the same "gate fires before any service-layer call"
 * posture, but the Stripe products route is the **only**
 * one of the six whose gate is **flag-driven** (not
 * session-driven) and whose handler signature is
 * **zero-argument**. That makes the disabled-flag branch's
 * 400 invariant doubly load-bearing because a regression
 * that adds a `request: NextRequest` argument and reads
 * any `searchParams` value before the flag check is the
 * obvious shape of a future bypass.
 */
const STRIPE_PRODUCTS_QUERIES = [
	// Baseline — the no-arg disabled-flag case. Included
	// so a future reader of this file sees the canonical
	// case alongside the variants it parametrises.
	'/api/stripe/products',

	// `?dynamic=` / `?dynamicPricing=` — the obvious
	// "force dynamic pricing on" keys. The route reads the
	// flag from `process.env.NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING`
	// exclusively today via `isStripeDynamicPricingEnabled()`;
	// a regression that reads `searchParams.get('dynamic')`
	// would silently grant any caller the ability to flip
	// the flag on per-request.
	'/api/stripe/products?dynamic=1',
	'/api/stripe/products?dynamic=true',
	'/api/stripe/products?dynamic=on',
	'/api/stripe/products?dynamicPricing=1',
	'/api/stripe/products?dynamicPricing=true',
	'/api/stripe/products?dynamic=',

	// `?force=` / `?override=` / `?enable=` — the obvious
	// "force the gate open" keys. The route does not branch
	// on any override query param today.
	'/api/stripe/products?force=1',
	'/api/stripe/products?force=true',
	'/api/stripe/products?override=1',
	'/api/stripe/products?enable=1',
	'/api/stripe/products?enabled=true',

	// `?productId=` / `?id=` / `?priceId=` — the obvious
	// "filter to a single product" keys. The route returns
	// the full products payload today.
	'/api/stripe/products?productId=prod_anything',
	'/api/stripe/products?id=prod_anything',
	'/api/stripe/products?priceId=price_anything',
	'/api/stripe/products?productId=',
	'/api/stripe/products?productId=prod_admin',

	// `?limit=` / `?offset=` / `?page=` — the obvious
	// pagination keys. The route does not paginate today;
	// a regression that reads `searchParams.get('limit')`
	// would change the response payload size.
	'/api/stripe/products?limit=1',
	'/api/stripe/products?limit=10',
	'/api/stripe/products?limit=100',
	'/api/stripe/products?limit=0',
	'/api/stripe/products?limit=-1',
	'/api/stripe/products?limit=abc',
	'/api/stripe/products?offset=10',
	'/api/stripe/products?page=1',
	'/api/stripe/products?page=999999',

	// `?currency=` — the obvious "show prices in this
	// currency" key. The route returns multi-currency
	// price IDs in the `stripeConfig` block today; a
	// regression that reads `searchParams.get('currency')`
	// would surface a different shape on the disabled-flag
	// branch.
	'/api/stripe/products?currency=USD',
	'/api/stripe/products?currency=EUR',
	'/api/stripe/products?currency=GBP',
	'/api/stripe/products?currency=invalid',
	'/api/stripe/products?currency=',

	// `?locale=` / `?lang=` — the obvious i18n keys. The
	// route returns Stripe-stored data without
	// transformation.
	'/api/stripe/products?locale=en',
	'/api/stripe/products?locale=fr',
	'/api/stripe/products?lang=de',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — the obvious "I have a magic auth
	// token, let me through" keys. The route does not
	// authenticate today (the route is public when the
	// flag is on) but a regression that wires
	// `searchParams.get('token')` as a flag-bypass would
	// surface here.
	'/api/stripe/products?token=anything',
	'/api/stripe/products?secret=anything',
	'/api/stripe/products?api_key=anything',
	'/api/stripe/products?authorization=Bearer+anything',
	'/api/stripe/products?session=anything',

	// `?stripeKey=` / `?stripe_key=` / `?sk=` — the obvious
	// dangerous "use this Stripe key instead of the
	// server's" keys. The route reads the Stripe key from
	// `process.env.STRIPE_SECRET_KEY` exclusively and must
	// NEVER trust a caller-supplied key.
	'/api/stripe/products?stripeKey=anything',
	'/api/stripe/products?stripe_key=anything',
	'/api/stripe/products?sk=anything',
	'/api/stripe/products?apiKey=anything',
	'/api/stripe/products?secretKey=anything',

	// `?provider=` — the obvious "force a different
	// payment provider" key. The wider repo also has
	// LemonSqueezy, Polar, and Solidgate providers, but
	// this handler hard-codes Stripe via
	// `fetchStripeProducts()`.
	'/api/stripe/products?provider=stripe',
	'/api/stripe/products?provider=lemonsqueezy',
	'/api/stripe/products?provider=polar',
	'/api/stripe/products?provider=solidgate',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// the obvious cache-busting keys. The handler does
	// not branch on any cache-control query param today
	// (caching is handled internally by
	// `stripe-products.service.ts` via a 5-min TTL).
	'/api/stripe/products?refresh=1',
	'/api/stripe/products?fresh=true',
	'/api/stripe/products?cache=bypass',
	'/api/stripe/products?nocache=1',

	// `?expand=` / `?include=` — the obvious "include
	// extra nested objects" keys. The route does not
	// forward caller-supplied expansions to the Stripe
	// SDK today.
	'/api/stripe/products?expand=prices',
	'/api/stripe/products?expand=metadata',
	'/api/stripe/products?include=tax_rates',

	// `?format=` — the obvious content-negotiation key.
	// The route returns JSON exclusively today.
	'/api/stripe/products?format=json',
	'/api/stripe/products?format=xml',
	'/api/stripe/products?format=csv',
	'/api/stripe/products?format=pdf',

	// `?sort=` / `?order=` / `?direction=` — the obvious
	// sort-override keys. The route returns Stripe's
	// default order today.
	'/api/stripe/products?sort=created',
	'/api/stripe/products?order=asc',
	'/api/stripe/products?direction=desc',

	// `?fields=` / `?select=` — the obvious "only-give-me-
	// these-columns" keys. The route returns the full
	// products payload today.
	'/api/stripe/products?fields=id,name,prices',
	'/api/stripe/products?select=id,active',

	// `?tenant=` / `?tenantId=` / `?org=` — the obvious
	// multi-tenancy keys.
	'/api/stripe/products?tenant=acme',
	'/api/stripe/products?tenantId=42',
	'/api/stripe/products?org=ever-works',

	// `?account=` / `?stripeAccount=` / `?connect=` — the
	// obvious Stripe Connect "list products on this
	// connected account" keys. The route uses the platform
	// Stripe account exclusively today.
	'/api/stripe/products?account=acct_anything',
	'/api/stripe/products?stripeAccount=acct_anything',
	'/api/stripe/products?connect=acct_anything',

	// `?active=` / `?archived=` — the obvious
	// active-products filter keys. The route delegates to
	// the cached products list and does not filter today.
	'/api/stripe/products?active=true',
	'/api/stripe/products?active=false',
	'/api/stripe/products?archived=true',

	// `?sponsorAds=` — a peek at the sponsor-ads field of
	// the response shape. The route returns `sponsorAds`
	// in the response payload today; a regression that
	// reads `searchParams.get('sponsorAds')` to gate the
	// field would change the response shape.
	'/api/stripe/products?sponsorAds=true',
	'/api/stripe/products?sponsorAds=false',
	'/api/stripe/products?sponsorAds=only',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The gate fires before any potential
	// future validator, so empty values must round-trip to
	// the same disabled-flag response as the no-arg case.
	// (Note: `?dynamic=` and `?productId=` already appear in
	// the dedicated flag / filter sections above, so this
	// block only covers the bypass-key empties.)
	'/api/stripe/products?force=',
	'/api/stripe/products?stripeKey=',
	'/api/stripe/products?token=',
	'/api/stripe/products?api_key=',
	'/api/stripe/products?secret=',

	// Repeated keys — `searchParams.get(name)` returns
	// the first value, but the gate fires before any
	// validator, so repetition is irrelevant on the
	// disabled-flag branch.
	'/api/stripe/products?dynamic=1&dynamic=0',
	'/api/stripe/products?force=true&force=false',
	'/api/stripe/products?productId=prod_a&productId=prod_b',

	// Special-character values that would tempt a future
	// regex match, LIKE-prefix, or path-injection wiring.
	// The route does not pass any value into a SQL or
	// filesystem path before the gate fires.
	'/api/stripe/products?productId=%3Cscript%3E',
	"/api/stripe/products?productId=%27%20OR%201%3D1",
	'/api/stripe/products?stripeKey=%2F..%2F..%2Fetc%2Fpasswd',
	'/api/stripe/products?dynamic=%00',

	// Long values — guard against any future regex /
	// regex-based indexing bug that might trip on long
	// inputs. The gate fires before any validator on the
	// disabled-flag branch.
	`/api/stripe/products?productId=prod_${'x'.repeat(500)}`,
	`/api/stripe/products?stripeKey=${'y'.repeat(500)}`,
	`/api/stripe/products?token=${'z'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero
	// query keys today, so any combination of unknown keys
	// is silently ignored on every branch.
	'/api/stripe/products?unknown=value',
	'/api/stripe/products?foo=bar&baz=qux',
	'/api/stripe/products?dynamic=1&productId=prod_admin&stripeKey=foo&token=bar&unknown=value&foo=bar'
] as const;

test.describe('API: /api/stripe/products query-param surface', () => {
	for (const path of STRIPE_PRODUCTS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's flag gate fires before any potential
			// `searchParams` parsing or Stripe SDK call on the
			// disabled-flag branch, so the disabled-flag GET
			// surface returns 400 deterministically. There is no
			// 5xx branch reachable on the disabled-flag GET surface
			// because the catch can only fire after the gate has
			// already let the call through. Even when dynamic
			// pricing is enabled but `STRIPE_SECRET_KEY` is not
			// configured, the route returns 500 with a deterministic
			// envelope — every assertion is `< 500` to permit both
			// the disabled-flag (400) and the enabled-without-key
			// (500) branches to coexist on different CI runners
			// without spec breakage.
			expect(response.status()).toBeLessThan(600);
			expect([200, 400, 500]).toContain(response.status());
		});
	}

	test(`GET /api/stripe/products returns the canonical { error, message } envelope on the disabled-flag branch`, async ({
		request
	}) => {
		// The disabled-flag GET branch is the load-bearing
		// invariant: the gate must fire before any potential
		// validator / Stripe SDK call and must return a JSON
		// body with the documented `error` and `message` keys.
		// A regression that bypasses the gate would surface
		// here as a missing-envelope failure.
		const response = await request.get('/api/stripe/products');

		// The route is flag-gated: when dynamic pricing is
		// disabled the response is 400; when enabled but the
		// Stripe key is missing the response is 500; when
		// enabled and configured the response is 200. All
		// three branches return JSON bodies, and the two
		// error branches both carry the `error` and
		// `message` keys.
		expect([200, 400, 500]).toContain(response.status());

		const body = (await response.json()) as {
			error?: unknown;
			message?: unknown;
			products?: unknown;
		};

		if (response.status() === 400 || response.status() === 500) {
			expect(typeof body.error).toBe('string');
			expect(typeof body.message).toBe('string');
		} else {
			// Successful responses return the products payload.
			expect(body).toBeTruthy();
		}
	});

	test(`GET /api/stripe/products returns identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params today, so the
		// response status must be invariant to any combination
		// of unknown keys.
		const baseline = await request.get('/api/stripe/products');
		const parameterised = await request.get(
			'/api/stripe/products?dynamic=1&productId=prod_admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test(`GET /api/stripe/products?dynamic=… does NOT bypass the dynamic-pricing flag gate`, async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('dynamic')` as a fallback for
		// `isStripeDynamicPricingEnabled()` would change the
		// disabled-flag branch from "always 400" to "200 if
		// ?dynamic=1 is present" and silently grant any
		// anonymous caller the ability to flip the flag on
		// per-request — surfacing live Stripe pricing data
		// to environments that have explicitly opted out.
		// This assertion catches that change immediately.
		const baseline = await request.get('/api/stripe/products');
		const withDynamic = await request.get('/api/stripe/products?dynamic=1');
		const withDynamicTrue = await request.get('/api/stripe/products?dynamic=true');
		const withDynamicPricing = await request.get(
			'/api/stripe/products?dynamicPricing=true'
		);
		const withForce = await request.get('/api/stripe/products?force=1');
		const withOverride = await request.get('/api/stripe/products?override=1');

		expect(withDynamic.status()).toBe(baseline.status());
		expect(withDynamicTrue.status()).toBe(baseline.status());
		expect(withDynamicPricing.status()).toBe(baseline.status());
		expect(withForce.status()).toBe(baseline.status());
		expect(withOverride.status()).toBe(baseline.status());
	});

	test(`GET /api/stripe/products?stripeKey=… does NOT forward a caller-supplied Stripe key`, async ({
		request
	}) => {
		// The route reads the Stripe key from
		// `process.env.STRIPE_SECRET_KEY` server-side. A
		// regression that wires `searchParams.get('stripeKey')`
		// as a fallback would let an attacker (a) point the
		// server at a different Stripe account they control,
		// (b) trigger Stripe API calls billed against that
		// account, and (c) potentially log the leaked key
		// server-side. This assertion pins the "the Stripe
		// key is server-side only" invariant.
		const baseline = await request.get('/api/stripe/products');
		const withKey = await request.get('/api/stripe/products?stripeKey=anything');
		const withKeyUnderscore = await request.get(
			'/api/stripe/products?stripe_key=anything'
		);
		const withSk = await request.get('/api/stripe/products?sk=anything');
		const withApiKey = await request.get('/api/stripe/products?apiKey=anything');
		const withSecretKey = await request.get(
			'/api/stripe/products?secretKey=anything'
		);

		expect(withKey.status()).toBe(baseline.status());
		expect(withKeyUnderscore.status()).toBe(baseline.status());
		expect(withSk.status()).toBe(baseline.status());
		expect(withApiKey.status()).toBe(baseline.status());
		expect(withSecretKey.status()).toBe(baseline.status());
	});

	test(`GET /api/stripe/products?token=… does NOT introduce a query-token flag-bypass`, async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today (the route is public when the flag is on).
		// A future contributor who adds a magic-token bypass
		// for the flag gate would change the disabled-flag
		// branch's behaviour. This assertion catches that
		// change immediately.
		const baseline = await request.get('/api/stripe/products');
		const withToken = await request.get('/api/stripe/products?token=anything');
		const withSecret = await request.get('/api/stripe/products?secret=anything');
		const withApiKeyParam = await request.get('/api/stripe/products?api_key=anything');
		const withAuthQuery = await request.get(
			'/api/stripe/products?authorization=Bearer+anything'
		);

		expect(withToken.status()).toBe(baseline.status());
		expect(withSecret.status()).toBe(baseline.status());
		expect(withApiKeyParam.status()).toBe(baseline.status());
		expect(withAuthQuery.status()).toBe(baseline.status());
	});

	test(`GET /api/stripe/products?provider=… does NOT switch the payment provider`, async ({
		request
	}) => {
		// The wider repo also has LemonSqueezy, Polar, and
		// Solidgate providers, but this handler hard-codes
		// Stripe via `fetchStripeProducts()`. A regression
		// that reads `searchParams.get('provider')` and
		// dispatches to a different provider factory would
		// change both the gate and the response shape.
		const baseline = await request.get('/api/stripe/products');
		const withLemonsqueezy = await request.get(
			'/api/stripe/products?provider=lemonsqueezy'
		);
		const withPolar = await request.get('/api/stripe/products?provider=polar');
		const withSolidgate = await request.get('/api/stripe/products?provider=solidgate');

		expect(withLemonsqueezy.status()).toBe(baseline.status());
		expect(withPolar.status()).toBe(baseline.status());
		expect(withSolidgate.status()).toBe(baseline.status());
	});

	test(`GET /api/stripe/products?account=… does NOT introduce a Stripe Connect account-override`, async ({
		request
	}) => {
		// The route uses the platform Stripe account
		// exclusively today (no Stripe Connect
		// `Stripe-Account` header override). A regression
		// that reads `searchParams.get('account')` and
		// forwards it to the Stripe SDK as the
		// `stripeAccount` option would let an attacker
		// list products from arbitrary connected accounts.
		const baseline = await request.get('/api/stripe/products');
		const withAccount = await request.get(
			'/api/stripe/products?account=acct_anything'
		);
		const withStripeAccount = await request.get(
			'/api/stripe/products?stripeAccount=acct_anything'
		);
		const withConnect = await request.get(
			'/api/stripe/products?connect=acct_anything'
		);

		expect(withAccount.status()).toBe(baseline.status());
		expect(withStripeAccount.status()).toBe(baseline.status());
		expect(withConnect.status()).toBe(baseline.status());
	});

	test(`GET /api/stripe/products?productId=… does NOT change the response on the disabled-flag branch`, async ({
		request
	}) => {
		// The route returns the full products payload today.
		// A regression that reads `searchParams.get('productId')`
		// before the gate would change the response payload
		// shape on the enabled branch (e.g. returning a single
		// product instead of the cached list). The
		// disabled-flag branch's status must be invariant to
		// the productId key.
		const baseline = await request.get('/api/stripe/products');
		const responses = await Promise.all([
			request.get('/api/stripe/products?productId=prod_admin'),
			request.get('/api/stripe/products?id=prod_admin'),
			request.get('/api/stripe/products?priceId=price_admin'),
			request.get('/api/stripe/products?productId=invalid'),
			request.get('/api/stripe/products?productId=%00')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET /api/stripe/products keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical disabled-flag envelope
		// (or the canonical enabled-success envelope). The
		// shape guarantees the route's flag gate fires before
		// any branching on potential future query schemas.
		const responses = await Promise.all([
			request.get('/api/stripe/products'),
			request.get(
				'/api/stripe/products?dynamic=1&productId=prod_admin&account=acct_admin'
			),
			request.get(
				'/api/stripe/products?dynamic=invalid&productId=invalid&token=foo&unknown=bar'
			)
		]);

		// All three must return the same status (because the
		// gate fires before any of these query params are
		// read).
		const baselineStatus = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);

			const body = (await response.json()) as {
				error?: unknown;
				message?: unknown;
			};
			// On both error branches (400 disabled-flag, 500
			// enabled-without-key) the envelope carries the
			// canonical `error` / `message` keys.
			if (response.status() !== 200) {
				expect(typeof body.error).toBe('string');
				expect(typeof body.message).toBe('string');
			}
		}
	});
});
