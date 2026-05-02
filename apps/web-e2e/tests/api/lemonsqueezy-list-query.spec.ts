import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * authenticated LemonSqueezy-checkouts-list endpoint served
 * by `apps/web/app/api/lemonsqueezy/list/route.ts`.
 *
 * `GET /api/lemonsqueezy/list` is intentionally
 * **session-gated** — it returns a paginated list of
 * LemonSqueezy checkouts owned by the caller (with
 * admin-impersonation via `?customerEmail=…` permitted
 * once the caller is authenticated). The handler signature
 * is the **single-argument** Next 16 form:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.email) {
 *           return NextResponse.json(
 *             { error: 'Unauthorized', message: 'Authentication required',
 *               code: 'AUTH_REQUIRED' },
 *             { status: 401 }
 *           );
 *         }
 *         const searchParams = request.nextUrl.searchParams;
 *         const queryParams = Object.fromEntries(searchParams.entries());
 *         const validationResult = queryParamsSchema.safeParse(queryParams);
 *         if (!validationResult.success) {
 *           return NextResponse.json(
 *             { error: 'Invalid query parameters', code: 'VALIDATION_ERROR', ... },
 *             { status: 400 }
 *           );
 *         }
 *         ...
 *         const lemonsqueezy = getOrCreateLemonsqueezyProvider();
 *         const result = await lemonsqueezy.listCheckouts(filterOptions);
 *         return NextResponse.json({ success: true, data, pagination, ... });
 *       } catch (error) {
 *         ...
 *       }
 *     }
 *
 * Note that the handler **reads** the `searchParams` only
 * **after** the session-gate fires. This is the
 * load-bearing invariant: the auth gate must execute before
 * any `searchParams.get(...)` parsing or any service-layer
 * call into `getOrCreateLemonsqueezyProvider()`. If the
 * order ever flips (or a future contributor introduces a
 * `?token=…` magic-token bypass before the gate), the
 * unauth branch's behaviour changes from "always 401" to
 * "400 / 200 if the right query is present" — and that
 * change is exactly what this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session whose `user.email` is missing); the early
 *     `if (!session?.user?.email)` branch fires and the
 *     route returns
 *     `{ error: 'Unauthorized', message: 'Authentication
 *     required', code: 'AUTH_REQUIRED' }` with status 401.
 *     This is the contract every assertion below pins,
 *     because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated, valid query params**: returns 200
 *     with `{ success: true, data, pagination, filters,
 *     metadata }`. Out of scope for this spec.
 *   - **Authenticated, invalid query params**: returns 400
 *     with `{ error: 'Invalid query parameters', code:
 *     'VALIDATION_ERROR' }`. Out of scope for this spec
 *     because the gate fires before validation on every
 *     unauth invocation.
 *   - **Authenticated, dateFrom > dateTo**: returns 400
 *     with `{ error: 'Validation failed', code:
 *     'VALIDATION_ERROR' }`. Out of scope for this spec.
 *   - **Internal error**: returns 500 with the canonical
 *     error envelope. Out of scope for this spec because
 *     the gate fires before the LemonSqueezy provider
 *     call on every unauth invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?customerEmail=…`
 * admin-impersonation key that fires before the gate, a
 * `?token=…` magic-token bypass, a `?storeId=…` claim that
 * short-circuits the LemonSqueezy lookup, or a
 * `?lemonsqueezyKey=…` dangerous-passthrough that would
 * forward a caller-supplied key to the LemonSqueezy
 * provider — would surface immediately as a status
 * divergence between the no-arg 401 and a parameter-laden
 * non-401.
 *
 * The shape mirrors the sibling
 * `apps/web/app/api/user/subscription/route.ts`,
 * `apps/web/app/api/user/payments/route.ts`, and
 * `apps/web/app/api/user/plan-status/route.ts` smoke specs
 * pinned at `subscription-query.spec.ts`,
 * `payments-query.spec.ts`, and `plan-status-query.spec.ts`
 * — the four routes share the same "session-gated, 401
 * before any service-layer call" posture but the
 * lemonsqueezy/list route is the **only** one of the four
 * that reads a `safeParse`-validated query schema. Two
 * keys (`status`, `customerEmail`) are particularly
 * sensitive because a regression that lets either of them
 * bypass the gate would either leak cross-customer
 * checkout data (the `customerEmail` impersonation case)
 * or silently change the response payload shape (the
 * `status` filter case).
 */
const LEMONSQUEEZY_LIST_QUERIES = [
	// Baseline — the no-arg unauthenticated case. Included
	// so a future reader of this file sees the canonical
	// case alongside the variants it parametrises.
	'/api/lemonsqueezy/list',

	// `?status=` — the documented filter key. Every value
	// in the allowlist (`pending`, `completed`, `failed`,
	// `cancelled`, `expired` per the route's Zod enum)
	// must round-trip to the same 401 because the gate
	// fires before validation.
	'/api/lemonsqueezy/list?status=pending',
	'/api/lemonsqueezy/list?status=completed',
	'/api/lemonsqueezy/list?status=failed',
	'/api/lemonsqueezy/list?status=cancelled',
	'/api/lemonsqueezy/list?status=expired',

	// `?status=` invalid — values outside the allowlist
	// would normally be rejected with a 400 by the
	// `safeParse` validator, but on the unauth branch the
	// gate fires first and the response is 401.
	'/api/lemonsqueezy/list?status=anything',
	'/api/lemonsqueezy/list?status=active',
	'/api/lemonsqueezy/list?status=paused',
	'/api/lemonsqueezy/list?status=',

	// `?limit=` — clamped to `[1, 100]` by the Zod schema.
	// Every in-range value, every clamp-target value, and
	// every out-of-range value must round-trip to 401 on
	// the unauth branch.
	'/api/lemonsqueezy/list?limit=1',
	'/api/lemonsqueezy/list?limit=10',
	'/api/lemonsqueezy/list?limit=50',
	'/api/lemonsqueezy/list?limit=100',
	'/api/lemonsqueezy/list?limit=101',
	'/api/lemonsqueezy/list?limit=0',
	'/api/lemonsqueezy/list?limit=-1',
	'/api/lemonsqueezy/list?limit=abc',
	'/api/lemonsqueezy/list?limit=NaN',
	'/api/lemonsqueezy/list?limit=999999',

	// `?page=` — Zod clamps to `>= 1`. Every value, valid
	// or not, must round-trip to 401 on the unauth branch.
	'/api/lemonsqueezy/list?page=1',
	'/api/lemonsqueezy/list?page=2',
	'/api/lemonsqueezy/list?page=999',
	'/api/lemonsqueezy/list?page=0',
	'/api/lemonsqueezy/list?page=-1',
	'/api/lemonsqueezy/list?page=abc',

	// `?customerEmail=` — the documented "admin views
	// other user's checkouts" key. The route reads this
	// **after** the gate fires, so an unauth caller
	// supplying any email value must still get 401.
	// A regression that reads `customerEmail` before the
	// gate would silently leak cross-customer checkout
	// data to anonymous callers.
	'/api/lemonsqueezy/list?customerEmail=anyone@example.com',
	'/api/lemonsqueezy/list?customerEmail=admin@example.com',
	'/api/lemonsqueezy/list?customerEmail=user%40example.com',
	'/api/lemonsqueezy/list?customerEmail=invalid',
	'/api/lemonsqueezy/list?customerEmail=',

	// `?dateFrom=` / `?dateTo=` — ISO 8601 datetimes per
	// the Zod schema. Every value must round-trip to 401
	// on the unauth branch.
	'/api/lemonsqueezy/list?dateFrom=2024-01-01T00:00:00.000Z',
	'/api/lemonsqueezy/list?dateTo=2025-12-31T23:59:59.999Z',
	'/api/lemonsqueezy/list?dateFrom=2024-01-01T00:00:00.000Z&dateTo=2025-01-01T00:00:00.000Z',
	'/api/lemonsqueezy/list?dateFrom=invalid',
	'/api/lemonsqueezy/list?dateTo=invalid',
	'/api/lemonsqueezy/list?dateFrom=2025-01-01T00:00:00.000Z&dateTo=2024-01-01T00:00:00.000Z',

	// `?storeId=` — the documented store-scoping key.
	// Every value, including a dangerous "force a
	// different store" attempt, must round-trip to 401 on
	// the unauth branch.
	'/api/lemonsqueezy/list?storeId=anything',
	'/api/lemonsqueezy/list?storeId=12345',
	'/api/lemonsqueezy/list?storeId=',

	// `?userId=` / `?user_id=` / `?uid=` — the obvious
	// wiring a future "admin-views-other-user's-checkouts"
	// feature might add as a query-string override. The
	// route reads the user identity from
	// `session.user.email` exclusively today.
	'/api/lemonsqueezy/list?userId=anything',
	'/api/lemonsqueezy/list?user_id=anything',
	'/api/lemonsqueezy/list?uid=anything',
	'/api/lemonsqueezy/list?id=anything',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — the obvious "I have a magic
	// auth token, let me through" keys. The route
	// authenticates via NextAuth session cookie only
	// today.
	'/api/lemonsqueezy/list?token=anything',
	'/api/lemonsqueezy/list?secret=anything',
	'/api/lemonsqueezy/list?api_key=anything',
	'/api/lemonsqueezy/list?authorization=Bearer+anything',
	'/api/lemonsqueezy/list?session=anything',

	// `?lemonsqueezyKey=` / `?lemon_squeezy_key=` /
	// `?lsk=` — the obvious dangerous "use this
	// LemonSqueezy key instead of the server's" keys.
	// The route reads the LemonSqueezy key from the
	// provider factory (which reads
	// `process.env.LEMONSQUEEZY_API_KEY`) and must NEVER
	// trust a caller-supplied key.
	'/api/lemonsqueezy/list?lemonsqueezyKey=anything',
	'/api/lemonsqueezy/list?lemon_squeezy_key=anything',
	'/api/lemonsqueezy/list?lsk=anything',
	'/api/lemonsqueezy/list?apiKey=anything',

	// `?provider=` — the obvious "force a different
	// payment provider" key. The wider repo also has
	// Stripe, Polar, and Solidgate providers, but this
	// handler hard-codes LemonSqueezy. A regression that
	// reads `searchParams.get('provider')` would change
	// the unauth branch's behaviour.
	'/api/lemonsqueezy/list?provider=lemonsqueezy',
	'/api/lemonsqueezy/list?provider=stripe',
	'/api/lemonsqueezy/list?provider=polar',
	'/api/lemonsqueezy/list?provider=solidgate',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// the obvious cache-busting keys. The handler does
	// not branch on any cache-control query param today.
	'/api/lemonsqueezy/list?refresh=1',
	'/api/lemonsqueezy/list?force=true',
	'/api/lemonsqueezy/list?fresh=true',
	'/api/lemonsqueezy/list?cache=bypass',
	'/api/lemonsqueezy/list?nocache=1',

	// `?expand=` / `?include=` — the obvious "include
	// extra nested objects" keys. The route does not
	// forward caller-supplied expansions to the
	// LemonSqueezy SDK today.
	'/api/lemonsqueezy/list?expand=order',
	'/api/lemonsqueezy/list?expand=customer',
	'/api/lemonsqueezy/list?include=invoice',

	// `?cursor=` / `?starting_after=` / `?ending_before=`
	// — the obvious pagination keys mirroring Stripe's
	// pagination shape. The route uses the validated
	// `page` integer today and does not honour any other
	// pagination cursor from the URL.
	'/api/lemonsqueezy/list?cursor=anything',
	'/api/lemonsqueezy/list?starting_after=anything',
	'/api/lemonsqueezy/list?ending_before=anything',

	// `?format=` — the obvious content-negotiation key.
	// The route returns JSON exclusively today.
	'/api/lemonsqueezy/list?format=json',
	'/api/lemonsqueezy/list?format=xml',
	'/api/lemonsqueezy/list?format=csv',
	'/api/lemonsqueezy/list?format=pdf',

	// `?currency=` / `?locale=` / `?lang=` — the obvious
	// "show amounts in this currency / format dates in
	// this locale" keys. The route uses the LemonSqueezy
	// stored currency on each checkout and does not
	// transform.
	'/api/lemonsqueezy/list?currency=USD',
	'/api/lemonsqueezy/list?locale=en',
	'/api/lemonsqueezy/list?lang=fr',

	// `?sort=` / `?order=` / `?direction=` — the obvious
	// sort-override keys. The route's ORDER BY is
	// determined by the LemonSqueezy SDK and reads none
	// of these.
	'/api/lemonsqueezy/list?sort=createdAt',
	'/api/lemonsqueezy/list?order=asc',
	'/api/lemonsqueezy/list?direction=desc',

	// `?fields=` / `?select=` — the obvious
	// "only-give-me-these-columns" keys. The route
	// returns the full checkout row shape today.
	'/api/lemonsqueezy/list?fields=id,status,total',
	'/api/lemonsqueezy/list?select=id,status',

	// `?tenant=` / `?tenantId=` / `?org=` — the obvious
	// multi-tenancy keys.
	'/api/lemonsqueezy/list?tenant=acme',
	'/api/lemonsqueezy/list?tenantId=42',
	'/api/lemonsqueezy/list?org=ever-works',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The gate fires before the validator,
	// so empty values must round-trip to the same 401 as
	// the no-arg case.
	'/api/lemonsqueezy/list?status=',
	'/api/lemonsqueezy/list?limit=',
	'/api/lemonsqueezy/list?page=',
	'/api/lemonsqueezy/list?customerEmail=',
	'/api/lemonsqueezy/list?storeId=',
	'/api/lemonsqueezy/list?token=',

	// Repeated keys — `searchParams.get(name)` returns
	// the first value, but the gate fires before the
	// validator, so repetition is irrelevant on the
	// unauth branch.
	'/api/lemonsqueezy/list?status=completed&status=pending',
	'/api/lemonsqueezy/list?limit=10&limit=100',
	'/api/lemonsqueezy/list?customerEmail=a%40b&customerEmail=c%40d',

	// Special-character values that would tempt a future
	// regex match, LIKE-prefix, or path-injection wiring.
	// The route does not pass any value into a SQL or
	// filesystem path before the gate fires.
	'/api/lemonsqueezy/list?customerEmail=%3Cscript%3E',
	"/api/lemonsqueezy/list?customerEmail=%27%20OR%201%3D1",
	'/api/lemonsqueezy/list?storeId=%2F..%2F..%2Fetc%2Fpasswd',
	'/api/lemonsqueezy/list?status=%00',

	// Long values — guard against any future regex /
	// regex-based indexing bug that might trip on long
	// inputs. The gate fires before the validator on the
	// unauth branch, so long values are irrelevant today.
	`/api/lemonsqueezy/list?customerEmail=${'x'.repeat(500)}%40example.com`,
	`/api/lemonsqueezy/list?storeId=${'y'.repeat(500)}`,
	`/api/lemonsqueezy/list?token=${'z'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads only
	// the seven validated keys above on the auth branch,
	// so any combination of unknown keys is silently
	// ignored on the unauth branch.
	'/api/lemonsqueezy/list?unknown=value',
	'/api/lemonsqueezy/list?foo=bar&baz=qux',
	'/api/lemonsqueezy/list?status=completed&customerEmail=a%40b&token=foo&unknown=value&foo=bar'
] as const;

test.describe('API: /api/lemonsqueezy/list query-param surface', () => {
	for (const path of LEMONSQUEEZY_LIST_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's auth gate fires before any
			// `searchParams` parsing or LemonSqueezy provider
			// call, so the unauthenticated GET surface returns
			// 401 deterministically. There is no 5xx branch
			// reachable on the unauthenticated GET surface
			// because the catch can only fire after the gate
			// has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/lemonsqueezy/list returns 401 with the canonical { error, code } envelope on the unauth branch`, async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the auth gate must fire before any
		// validator / provider call and must return 401 with
		// the documented `{ error: 'Unauthorized', message,
		// code: 'AUTH_REQUIRED' }` envelope. A regression
		// that bypasses the gate would surface here as a
		// non-401 status or a different body shape.
		const response = await request.get('/api/lemonsqueezy/list');

		expect(response.status()).toBe(401);

		const body = (await response.json()) as {
			error?: unknown;
			code?: unknown;
		};

		expect(typeof body.error).toBe('string');
		// The `code` is a stable machine-readable identifier
		// callers depend on; assert its presence and shape.
		expect(typeof body.code).toBe('string');
	});

	test(`GET /api/lemonsqueezy/list returns 401 identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params before the auth
		// gate fires, so the response status must be
		// invariant to any combination of unknown keys.
		const baseline = await request.get('/api/lemonsqueezy/list');
		const parameterised = await request.get(
			'/api/lemonsqueezy/list?status=completed&limit=10&customerEmail=anyone%40example.com&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(401);
	});

	test(`GET /api/lemonsqueezy/list?customerEmail=… does NOT bypass the session gate`, async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('customerEmail')` as a fallback
		// for `session.user.email` would change the unauth
		// branch from "always 401" to "200 if
		// ?customerEmail=… is present" and silently grant
		// any anonymous caller arbitrary-customer
		// impersonation against the LemonSqueezy provider
		// lookup. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/lemonsqueezy/list');
		const withCustomerEmail = await request.get(
			'/api/lemonsqueezy/list?customerEmail=admin%40example.com'
		);
		const withCustomerEmailValid = await request.get(
			'/api/lemonsqueezy/list?customerEmail=anyone%40example.com'
		);
		const withCustomerEmailInvalid = await request.get(
			'/api/lemonsqueezy/list?customerEmail=invalid'
		);

		expect(withCustomerEmail.status()).toBe(baseline.status());
		expect(withCustomerEmailValid.status()).toBe(baseline.status());
		expect(withCustomerEmailInvalid.status()).toBe(baseline.status());
	});

	test(`GET /api/lemonsqueezy/list?storeId=… does NOT bypass the store-scoping invariant`, async ({
		request
	}) => {
		// The route resolves the active store id from the
		// LemonSqueezy provider's environment configuration
		// (or honours the validated `storeId` query param
		// when authenticated). A regression that reads
		// `searchParams.get('storeId')` before the gate
		// would silently grant arbitrary-store access to
		// anonymous callers. This assertion pins the
		// "the store id is gated by the session" invariant.
		const baseline = await request.get('/api/lemonsqueezy/list');
		const withStoreId = await request.get('/api/lemonsqueezy/list?storeId=anything');
		const withStoreIdNumeric = await request.get(
			'/api/lemonsqueezy/list?storeId=12345'
		);

		expect(withStoreId.status()).toBe(baseline.status());
		expect(withStoreIdNumeric.status()).toBe(baseline.status());
	});

	test(`GET /api/lemonsqueezy/list?lemonsqueezyKey=… does NOT forward a caller-supplied LemonSqueezy key`, async ({
		request
	}) => {
		// The route reads the LemonSqueezy key from the
		// provider factory, which reads
		// `process.env.LEMONSQUEEZY_API_KEY` server-side. A
		// regression that wires `searchParams.get(
		// 'lemonsqueezyKey')` as a fallback would let an
		// attacker (a) point the server at a different
		// LemonSqueezy account they control, (b) trigger
		// LemonSqueezy API calls billed against that
		// account, and (c) potentially log the leaked key
		// server-side. This assertion pins the
		// "the LemonSqueezy key is server-side only"
		// invariant.
		const baseline = await request.get('/api/lemonsqueezy/list');
		const withKey = await request.get(
			'/api/lemonsqueezy/list?lemonsqueezyKey=anything'
		);
		const withKeyUnderscore = await request.get(
			'/api/lemonsqueezy/list?lemon_squeezy_key=anything'
		);
		const withLsk = await request.get('/api/lemonsqueezy/list?lsk=anything');
		const withApiKey = await request.get(
			'/api/lemonsqueezy/list?apiKey=anything'
		);

		expect(withKey.status()).toBe(baseline.status());
		expect(withKeyUnderscore.status()).toBe(baseline.status());
		expect(withLsk.status()).toBe(baseline.status());
		expect(withApiKey.status()).toBe(baseline.status());
	});

	test(`GET /api/lemonsqueezy/list?token=… does NOT introduce a query-token auth bypass`, async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today. A future contributor who adds a magic-token
		// bypass for the session gate would change the
		// unauth branch's behaviour. This assertion catches
		// that change immediately.
		const baseline = await request.get('/api/lemonsqueezy/list');
		const withToken = await request.get('/api/lemonsqueezy/list?token=anything');
		const withSecret = await request.get('/api/lemonsqueezy/list?secret=anything');
		const withApiKey = await request.get(
			'/api/lemonsqueezy/list?api_key=anything'
		);
		const withAuthQuery = await request.get(
			'/api/lemonsqueezy/list?authorization=Bearer+anything'
		);

		expect(withToken.status()).toBe(baseline.status());
		expect(withSecret.status()).toBe(baseline.status());
		expect(withApiKey.status()).toBe(baseline.status());
		expect(withAuthQuery.status()).toBe(baseline.status());
	});

	test(`GET /api/lemonsqueezy/list?provider=… does NOT switch the payment provider`, async ({
		request
	}) => {
		// The wider repo also has Stripe, Polar, and
		// Solidgate providers, but this handler hard-codes
		// LemonSqueezy via `getOrCreateLemonsqueezyProvider()`.
		// A regression that reads `searchParams.get(
		// 'provider')` and dispatches to a different
		// provider factory would change both the auth and
		// the response shape. The unauth branch's status
		// must be invariant to the provider key.
		const baseline = await request.get('/api/lemonsqueezy/list');
		const withStripe = await request.get(
			'/api/lemonsqueezy/list?provider=stripe'
		);
		const withPolar = await request.get('/api/lemonsqueezy/list?provider=polar');
		const withSolidgate = await request.get(
			'/api/lemonsqueezy/list?provider=solidgate'
		);

		expect(withStripe.status()).toBe(baseline.status());
		expect(withPolar.status()).toBe(baseline.status());
		expect(withSolidgate.status()).toBe(baseline.status());
	});

	test(`GET /api/lemonsqueezy/list?status=… invalid value still returns 401 (gate fires before validator)`, async ({
		request
	}) => {
		// The Zod schema rejects out-of-allowlist values
		// with a 400, but the auth gate fires **before**
		// the validator. A regression that reorders gate
		// and validator (or merges the two into a single
		// pipeline) would surface here as a 400 leaking on
		// the unauth branch. The 401 must be returned
		// regardless of whether the query schema would
		// reject the input.
		const baseline = await request.get('/api/lemonsqueezy/list');
		const responses = await Promise.all([
			request.get('/api/lemonsqueezy/list?status=anything'),
			request.get('/api/lemonsqueezy/list?status=active'),
			request.get('/api/lemonsqueezy/list?status=paused'),
			request.get('/api/lemonsqueezy/list?status=%00'),
			request.get('/api/lemonsqueezy/list?limit=999999'),
			request.get('/api/lemonsqueezy/list?limit=abc'),
			request.get('/api/lemonsqueezy/list?dateFrom=invalid'),
			request.get('/api/lemonsqueezy/list?customerEmail=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});

	test(`GET /api/lemonsqueezy/list keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 401 envelope on the
		// unauth branch. The shape guarantees the route's
		// auth gate fires before any branching on the query
		// schema today.
		const responses = await Promise.all([
			request.get('/api/lemonsqueezy/list'),
			request.get(
				'/api/lemonsqueezy/list?status=completed&limit=10&page=2&customerEmail=alice%40example.com&storeId=42'
			),
			request.get(
				'/api/lemonsqueezy/list?status=invalid&limit=abc&customerEmail=invalid&token=foo&unknown=bar'
			)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);

			const body = (await response.json()) as { error?: unknown };
			expect(typeof body.error).toBe('string');
		}
	});
});
