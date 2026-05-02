import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-gated item-stats endpoint served by
 * `apps/web/app/api/admin/items/stats/route.ts`.
 *
 * `GET /api/admin/items/stats` is **admin-gated** via
 * `auth()` + the `session.user.isAdmin` bit. The handler
 * reads three query params (`search`, `categories`, `tags`)
 * **after** the gate fires, so the unauthenticated branch
 * always returns 401 with `{ success: false, error: "Unauthorized. Admin access required." }`
 * regardless of which keys the caller appends:
 *
 *     export async function GET(request: Request) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: "Unauthorized. Admin access required." },
 *             { status: 401 }
 *           );
 *         }
 *         const { searchParams } = new URL(request.url);
 *         const search = searchParams.get('search') || undefined;
 *         const categoriesParam = searchParams.get('categories');
 *         const tagsParam = searchParams.get('tags');
 *         const categories = categoriesParam ? categoriesParam.split(',').filter(Boolean) : undefined;
 *         const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : undefined;
 *         const stats = await itemRepository.getStats({ search, categories, tags });
 *         return NextResponse.json({ success: true, data: stats });
 *       } catch (error) {
 *         return safeErrorResponse(error, 'Failed to fetch item stats');
 *       }
 *     }
 *
 * The route's three documented query params (`search`,
 * `categories`, `tags`) are read **after** the admin gate,
 * so every call from this spec — which carries no
 * authenticated session — round-trips to the same 401
 * regardless of the query string. A regression that reads
 * any query param before the gate (e.g. a future
 * `?asAdmin=true` admin-impersonation key, a `?token=…`
 * magic-token bypass, a `?as=admin` admin-override, or any
 * other dangerous-passthrough that bypasses
 * `session?.user?.isAdmin`) would change the unauth branch's
 * behaviour from "always 401" to "200 / 400 / 500 if the
 * right query is present" — and that change is exactly what
 * this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without an `isAdmin` user); the route returns
 *     401 with the canonical error envelope. This is the
 *     contract every assertion below pins, because the e2e
 *     runner does not carry an authenticated session by
 *     default.
 *   - **Authenticated non-admin user**: `session.user.isAdmin`
 *     is `false`; the route returns the same 401. Out of
 *     scope for this spec.
 *   - **Authenticated admin user**: returns 200 with
 *     `{ success: true, data: { total, draft, pending, approved, rejected } }`
 *     after the `itemRepository.getStats(...)` call
 *     completes. Out of scope for this spec because the
 *     gate fires before the repository call on every unauth
 *     invocation.
 *   - **Internal error**: returns 500 with
 *     `{ success: false, error: 'Failed to fetch item stats' }`
 *     via `safeErrorResponse`. Out of scope for this spec
 *     because the gate fires before any repository call on
 *     every unauth invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec hits.
 * A regression that introduces query-string-based bypass —
 * e.g. a future `?asAdmin=true` admin-impersonation key
 * that fires before `auth()`, a `?token=…` magic-token
 * bypass, or a `?userId=…` dangerous-passthrough that would
 * forward a caller-supplied user id to a future "view
 * another admin's item-stats" feature — would surface
 * immediately as a status divergence between the no-arg 401
 * and a parameter-laden non-401.
 *
 * The shape mirrors the sibling
 * `admin-dashboard-stats-query.spec.ts`,
 * `admin-geo-analytics-query.spec.ts`,
 * `client-dashboard-stats-query.spec.ts`,
 * `client-geo-stats-query.spec.ts`,
 * `client-items-coordinates-query.spec.ts`,
 * `stripe-payment-methods-list-query.spec.ts`,
 * `lemonsqueezy-list-query.spec.ts`,
 * `subscription-query.spec.ts`,
 * `payments-query.spec.ts`, and
 * `plan-status-query.spec.ts` smoke specs — all share the
 * same "session-or-admin gated, 401/403 before any
 * service-layer call" posture, but the admin items stats
 * route is unique in that the handler signature is
 * `GET(request: Request)` (not `GET()` — it does take a
 * request argument, unlike `admin/dashboard/stats` and
 * `admin/geo-analytics` which are zero-argument). The
 * deeper `admin-protected-extra.spec.ts` smoke also covers
 * this route at the broad `< 500` level; this spec adds the
 * deep query-surface walk on top of that.
 */
const ADMIN_ITEMS_STATS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/items/stats',

	// `?search=` — the route's documented free-text filter.
	// The route reads `searchParams.get('search')` after the
	// gate today, so any value must round-trip to the same
	// 401 on the unauth branch.
	'/api/admin/items/stats?search=test',
	'/api/admin/items/stats?search=hello%20world',
	'/api/admin/items/stats?search=',
	"/api/admin/items/stats?search=%27%20OR%201%3D1",
	'/api/admin/items/stats?search=%3Cscript%3E',
	`/api/admin/items/stats?search=${'x'.repeat(500)}`,

	// `?categories=` — the route's documented
	// comma-delimited categories filter. The route reads
	// `categoriesParam.split(',').filter(Boolean)` after the
	// gate.
	'/api/admin/items/stats?categories=tools',
	'/api/admin/items/stats?categories=tools,services',
	'/api/admin/items/stats?categories=tools,services,products',
	'/api/admin/items/stats?categories=',
	'/api/admin/items/stats?categories=,,,',
	'/api/admin/items/stats?categories=tools,,services',
	"/api/admin/items/stats?categories=%27%20OR%201%3D1",
	`/api/admin/items/stats?categories=${Array(20).fill('cat').join(',')}`,

	// `?tags=` — the route's documented comma-delimited
	// tags filter. Symmetric with `?categories=`.
	'/api/admin/items/stats?tags=react',
	'/api/admin/items/stats?tags=react,nextjs',
	'/api/admin/items/stats?tags=react,nextjs,typescript',
	'/api/admin/items/stats?tags=',
	'/api/admin/items/stats?tags=,,,',
	"/api/admin/items/stats?tags=%27%20OR%201%3D1",

	// Combinations of the three documented filters.
	'/api/admin/items/stats?search=test&categories=tools&tags=react',
	'/api/admin/items/stats?search=&categories=&tags=',
	'/api/admin/items/stats?search=hello&categories=tools,services&tags=react,nextjs,typescript',

	// `?userId=` / `?adminId=` / `?as=` — admin-impersonation
	// keys a future contributor might add. The route reads
	// the admin identity from `session.user.isAdmin` exclusively
	// today.
	'/api/admin/items/stats?userId=anything',
	'/api/admin/items/stats?user_id=anything',
	'/api/admin/items/stats?adminId=anything',
	'/api/admin/items/stats?as=admin',
	'/api/admin/items/stats?asAdmin=true',
	'/api/admin/items/stats?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/items/stats?token=anything',
	'/api/admin/items/stats?secret=anything',
	'/api/admin/items/stats?api_key=anything',
	'/api/admin/items/stats?authorization=Bearer+anything',
	'/api/admin/items/stats?session=anything',
	'/api/admin/items/stats?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-override
	// keys.
	'/api/admin/items/stats?bypass=1',
	'/api/admin/items/stats?admin=1',
	'/api/admin/items/stats?admin=true',
	'/api/admin/items/stats?override=true',
	'/api/admin/items/stats?force=true',

	// `?status=` — workflow-state filter keys for a future
	// contributor. The route returns the full status
	// distribution today (`total`, `draft`, `pending`,
	// `approved`, `rejected`) without caller-supplied
	// status filtering.
	'/api/admin/items/stats?status=draft',
	'/api/admin/items/stats?status=pending',
	'/api/admin/items/stats?status=approved',
	'/api/admin/items/stats?status=rejected',
	'/api/admin/items/stats?status=ALL',
	'/api/admin/items/stats?status=',

	// `?from=` / `?to=` / `?since=` / `?until=` — time-range
	// filter keys for a future contributor.
	'/api/admin/items/stats?from=2024-01-01',
	'/api/admin/items/stats?to=2026-12-31',
	'/api/admin/items/stats?since=2024-01-01T00:00:00Z',
	'/api/admin/items/stats?until=2026-12-31T23:59:59Z',
	'/api/admin/items/stats?from=invalid-date',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys. The route returns the full envelope
	// (`total`, `draft`, `pending`, `approved`, `rejected`)
	// today.
	'/api/admin/items/stats?fields=total',
	'/api/admin/items/stats?fields=total,draft,pending',
	'/api/admin/items/stats?select=approved',
	'/api/admin/items/stats?include=rejected',
	'/api/admin/items/stats?exclude=draft',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// cache-busting keys.
	'/api/admin/items/stats?refresh=1',
	'/api/admin/items/stats?fresh=true',
	'/api/admin/items/stats?cache=bypass',
	'/api/admin/items/stats?nocache=1',

	// `?format=` — content-negotiation key. The route
	// returns JSON exclusively today.
	'/api/admin/items/stats?format=json',
	'/api/admin/items/stats?format=csv',
	'/api/admin/items/stats?format=xml',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/items/stats?locale=en',
	'/api/admin/items/stats?locale=fr',
	'/api/admin/items/stats?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-tenancy
	// keys.
	'/api/admin/items/stats?tenant=acme',
	'/api/admin/items/stats?tenantId=42',
	'/api/admin/items/stats?org=ever-works',

	// `?groupBy=` / `?aggregate=` — aggregation keys for a
	// future contributor.
	'/api/admin/items/stats?groupBy=status',
	'/api/admin/items/stats?groupBy=category',
	'/api/admin/items/stats?aggregate=count',
	'/api/admin/items/stats?aggregate=sum',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value, but the gate fires before any validator,
	// so repetition is irrelevant on the unauth branch.
	'/api/admin/items/stats?search=a&search=b',
	'/api/admin/items/stats?categories=tools&categories=services',
	'/api/admin/items/stats?tags=react&tags=nextjs',

	// Long values — guard against any future regex / regex-
	// based indexing bug that might trip on long inputs.
	`/api/admin/items/stats?search=${'x'.repeat(500)}`,
	`/api/admin/items/stats?categories=${'y'.repeat(500)}`,
	`/api/admin/items/stats?tags=${'z'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads three
	// documented keys today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/admin/items/stats?unknown=value',
	'/api/admin/items/stats?foo=bar&baz=qux',
	'/api/admin/items/stats?userId=admin&token=foo&unknown=value&search=test&categories=tools&tags=react&fields=total&foo=bar'
] as const;

test.describe('API: /api/admin/items/stats query-param surface', () => {
	for (const path of ADMIN_ITEMS_STATS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's admin gate fires before any
			// `searchParams` parsing or `itemRepository.getStats`
			// call, so the unauthenticated GET surface returns a
			// 4xx (typically 401) deterministically. There is no
			// 5xx branch reachable on the unauthenticated GET
			// surface because the catch can only fire after the
			// gate has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/items/stats returns a 401 on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the admin gate must fire before any
		// `searchParams` parsing or repository call. The status
		// must be exactly 401 (the route hard-codes the 401
		// status in the gate's NextResponse.json call). Either
		// way the response must NOT echo any item statistics
		// — every consuming client depends on the early-return.
		const response = await request.get('/api/admin/items/stats');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
	});

	test('GET /api/admin/items/stats has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads three documented query params today
		// after the gate, so the response status must be
		// invariant to any combination of known and unknown
		// keys. A regression that reads any query param before
		// the gate would surface here as a status divergence
		// between the no-arg baseline and the parameterised
		// variant.
		const baseline = await request.get('/api/admin/items/stats');
		const parameterised = await request.get(
			'/api/admin/items/stats?search=test&categories=tools,services&tags=react,nextjs&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/items/stats?search=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('search')` as a side-channel for a
		// "preview as a search query" feature that bypasses
		// the admin gate would change the unauth branch from
		// "always 401" to "200 if ?search=… is present" and
		// silently grant any anonymous caller arbitrary
		// item-stats access. This assertion catches that
		// change immediately.
		const baseline = await request.get('/api/admin/items/stats');
		const responses = await Promise.all([
			request.get('/api/admin/items/stats?search=test'),
			request.get('/api/admin/items/stats?search='),
			request.get('/api/admin/items/stats?search=anything'),
			request.get(`/api/admin/items/stats?search=${'x'.repeat(500)}`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/stats?categories=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?categories=` filter is the route's documented
		// comma-delimited categories filter. The route's
		// `categoriesParam.split(',').filter(Boolean)` parsing
		// only fires after the gate. A regression that reads
		// the parameter before the gate would change the
		// unauth branch's behaviour. This assertion catches
		// that change immediately.
		const baseline = await request.get('/api/admin/items/stats');
		const responses = await Promise.all([
			request.get('/api/admin/items/stats?categories=tools'),
			request.get('/api/admin/items/stats?categories=tools,services'),
			request.get('/api/admin/items/stats?categories='),
			request.get('/api/admin/items/stats?categories=,,,'),
			request.get('/api/admin/items/stats?categories=tools,,services')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/stats?tags=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// Symmetric with the `?categories=` assertion above.
		const baseline = await request.get('/api/admin/items/stats');
		const responses = await Promise.all([
			request.get('/api/admin/items/stats?tags=react'),
			request.get('/api/admin/items/stats?tags=react,nextjs'),
			request.get('/api/admin/items/stats?tags='),
			request.get('/api/admin/items/stats?tags=,,,')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/stats?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven admin resolution would
		// change the unauth branch from "always 401" to "200 if
		// ?userId=… is present" and silently grant any
		// anonymous caller arbitrary-user item-stats access.
		// This assertion catches that change immediately.
		const baseline = await request.get('/api/admin/items/stats');
		const responses = await Promise.all([
			request.get('/api/admin/items/stats?userId=admin'),
			request.get('/api/admin/items/stats?user_id=admin'),
			request.get('/api/admin/items/stats?adminId=admin'),
			request.get('/api/admin/items/stats?as=admin'),
			request.get('/api/admin/items/stats?asAdmin=true'),
			request.get('/api/admin/items/stats?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/stats?token=… does NOT introduce a query-token auth bypass', async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today (auth is gated through `auth()` which reads the
		// NextAuth session cookie and the admin role bit on the
		// session user). A future contributor who adds a
		// magic-token bypass for the admin gate would change
		// the unauth branch's behaviour. This assertion
		// catches that change immediately.
		const baseline = await request.get('/api/admin/items/stats');
		const responses = await Promise.all([
			request.get('/api/admin/items/stats?token=anything'),
			request.get('/api/admin/items/stats?secret=anything'),
			request.get('/api/admin/items/stats?api_key=anything'),
			request.get('/api/admin/items/stats?authorization=Bearer+anything'),
			request.get('/api/admin/items/stats?session=anything'),
			request.get('/api/admin/items/stats?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/stats?bypass=… does NOT introduce a query-admin-override', async ({
		request
	}) => {
		// The route's admin guard does not branch on any
		// query-string admin override today. A regression that
		// wires `searchParams.get('bypass')` /
		// `searchParams.get('admin')` /
		// `searchParams.get('override')` as a non-session-driven
		// admin bypass would let an attacker elevate to admin
		// from any anonymous session. This assertion pins the
		// "admin status is read from the session, never from
		// the query string" invariant.
		const baseline = await request.get('/api/admin/items/stats');
		const responses = await Promise.all([
			request.get('/api/admin/items/stats?bypass=1'),
			request.get('/api/admin/items/stats?admin=1'),
			request.get('/api/admin/items/stats?admin=true'),
			request.get('/api/admin/items/stats?override=true'),
			request.get('/api/admin/items/stats?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/stats?status=… status-filter params do NOT change the unauth branch', async ({
		request
	}) => {
		// The route returns the full status distribution
		// today (`total`, `draft`, `pending`, `approved`,
		// `rejected`) without caller-supplied status filtering.
		// A regression that reads `searchParams.get('status')`
		// before the gate would change the response payload
		// shape on the auth branch. The unauth branch's status
		// must be invariant to the status-filter keys.
		const baseline = await request.get('/api/admin/items/stats');
		const responses = await Promise.all([
			request.get('/api/admin/items/stats?status=draft'),
			request.get('/api/admin/items/stats?status=pending'),
			request.get('/api/admin/items/stats?status=approved'),
			request.get('/api/admin/items/stats?status=rejected'),
			request.get('/api/admin/items/stats?status=ALL'),
			request.get('/api/admin/items/stats?status=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/stats?from=…&to=… time-range params do NOT change the unauth branch', async ({
		request
	}) => {
		// The route returns the full canonical distribution
		// today (no caller-supplied time-range filtering). A
		// regression that reads `searchParams.get('from')` /
		// `searchParams.get('to')` before the gate would
		// change the response payload shape. The unauth
		// branch's status must be invariant to the time-range
		// keys.
		const baseline = await request.get('/api/admin/items/stats');
		const responses = await Promise.all([
			request.get('/api/admin/items/stats?from=2024-01-01'),
			request.get('/api/admin/items/stats?to=2026-12-31'),
			request.get('/api/admin/items/stats?since=2024-01-01T00:00:00Z'),
			request.get('/api/admin/items/stats?until=2026-12-31T23:59:59Z'),
			request.get('/api/admin/items/stats?from=invalid-date')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/stats?format=… does NOT introduce a content-negotiation bypass', async ({
		request
	}) => {
		// The route returns JSON exclusively today. A future
		// `?format=csv` extension would be a natural fit for a
		// stats data-export flow, but it must not bypass the
		// auth gate. The unauth branch's status must be
		// invariant to the format key.
		const baseline = await request.get('/api/admin/items/stats');
		const responses = await Promise.all([
			request.get('/api/admin/items/stats?format=json'),
			request.get('/api/admin/items/stats?format=csv'),
			request.get('/api/admin/items/stats?format=xml')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/stats keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth branch.
		// The shape guarantees the route's admin gate fires
		// before any branching on the documented `search` /
		// `categories` / `tags` query params or any potential
		// future query schemas.
		const responses = await Promise.all([
			request.get('/api/admin/items/stats'),
			request.get(
				'/api/admin/items/stats?search=test&categories=tools,services&tags=react,nextjs&format=csv'
			),
			request.get(
				'/api/admin/items/stats?userId=admin&token=foo&from=2024-01-01&to=2026-12-31&status=approved&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/items/stats does NOT branch on Accept header', async ({
		request
	}) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// status on the unauth branch.
		const baseline = await request.get('/api/admin/items/stats');
		const responses = await Promise.all([
			request.get('/api/admin/items/stats', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/items/stats', {
				headers: { Accept: 'text/csv' }
			}),
			request.get('/api/admin/items/stats', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/admin/items/stats', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/stats?categories=,,, empty-only comma payloads do NOT bypass the gate', async ({
		request
	}) => {
		// The route's documented behaviour for `?categories=`
		// is to `split(',').filter(Boolean)` after the gate, so
		// an all-empty comma payload (`,,,`) reduces to an
		// empty array (no filter). A regression that handles
		// the parsing before the gate could surface a divergent
		// status on the unauth branch. This assertion catches
		// that change immediately.
		const baseline = await request.get('/api/admin/items/stats');
		const responses = await Promise.all([
			request.get('/api/admin/items/stats?categories=,,,'),
			request.get('/api/admin/items/stats?categories=,'),
			request.get('/api/admin/items/stats?tags=,,,'),
			request.get('/api/admin/items/stats?tags=,')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
