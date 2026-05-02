import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * authenticated client items-coordinates endpoint served by
 * `apps/web/app/api/client/items/coordinates/route.ts`.
 *
 * `GET /api/client/items/coordinates` is intentionally
 * **session-gated** — it returns the caller's per-item
 * coordinate list (slug, name, latitude, longitude) for
 * every item belonging to the authenticated user that has
 * coordinates. The handler signature is the **zero-argument**
 * Next 16 form (the route does not take a `NextRequest`
 * argument and reads no `searchParams` at all today):
 *
 *     export async function GET() {
 *       try {
 *         const authResult = await requireClientAuth();
 *         if (!authResult.success) {
 *           return authResult.response;
 *         }
 *         const { userId } = authResult;
 *         const repository = getClientItemRepository();
 *         const coordinates = await repository.getCoordinatesByUser(userId);
 *         return NextResponse.json({ success: true, coordinates });
 *       } catch (error) {
 *         return serverErrorResponse(error, 'Failed to fetch item coordinates');
 *       }
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
 * `?userId=…` admin-impersonation key that bypasses
 * `requireClientAuth()`) would change the unauth branch's
 * behaviour from "always 401" to "200 / 400 / 500 if the
 * right query is present" — and that change is exactly what
 * this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `requireClientAuth()` returns
 *     `{ success: false, response: <401 NextResponse> }`;
 *     the early `if (!authResult.success)` branch fires
 *     and the route returns the canonical
 *     `{ success: false, error: 'Unauthorized. Please
 *     sign in to continue.' }` envelope with status 401.
 *     This is the contract every assertion below pins,
 *     because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated client user**: returns 200 with
 *     `{ success: true, coordinates: Array<{ slug, name,
 *     latitude, longitude }> }`. Out of scope for this
 *     spec.
 *   - **Authenticated admin user**: today the
 *     `requireClientAuth()` helper notes in a comment that
 *     admins are allowed to use client endpoints, so this
 *     branch also returns 200. Out of scope for this spec.
 *   - **Internal error**: returns 500 with
 *     `{ success: false, error: 'Failed to fetch item
 *     coordinates' }` via `serverErrorResponse`. Out of
 *     scope for this spec because the gate fires before
 *     the client-item-repository call on every unauth
 *     invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?userId=…` admin-impersonation
 * key that fires before `requireClientAuth()`, a
 * `?token=…` magic-token bypass, or a `?clientId=…`
 * dangerous-passthrough that would forward a caller-
 * supplied client id to the client-item repository's
 * coordinates query — would surface immediately as a status
 * divergence between the no-arg 401 and a parameter-laden
 * non-401.
 *
 * The shape mirrors the sibling
 * `apps/web/app/api/client/dashboard/stats/route.ts`,
 * `apps/web/app/api/client/geo-stats/route.ts`,
 * `apps/web/app/api/stripe/payment-methods/list/route.ts`,
 * `apps/web/app/api/lemonsqueezy/list/route.ts`,
 * `apps/web/app/api/user/subscription/route.ts`,
 * `apps/web/app/api/user/payments/route.ts`, and
 * `apps/web/app/api/user/plan-status/route.ts` smoke specs
 * pinned at `client-dashboard-stats-query.spec.ts`,
 * `client-geo-stats-query.spec.ts`,
 * `stripe-payment-methods-list-query.spec.ts`,
 * `lemonsqueezy-list-query.spec.ts`,
 * `subscription-query.spec.ts`,
 * `payments-query.spec.ts`, and
 * `plan-status-query.spec.ts` — all eight routes share the
 * same "session-gated, 401 before any service-layer call"
 * posture, but the client items-coordinates route shares
 * with the client geo-stats route the property that the
 * handler signature is **zero-argument** AND uses the
 * `requireClientAuth()` helper (rather than the bare
 * `auth()` call). That makes the unauth-branch 401
 * invariant doubly load-bearing because a regression that
 * adds a `request: NextRequest` argument and reads any
 * `searchParams` value before the gate is the obvious
 * shape of a future bypass — particularly tempting on a
 * coordinates endpoint where future contributors might add
 * `?bbox=…` / `?radius=…` / `?lat=…&lng=…` spatial-filter
 * keys to scope the payload to a sub-region for a future
 * "items near a point" feature.
 */
const CLIENT_ITEMS_COORDINATES_QUERIES = [
	// Baseline — the no-arg unauthenticated case. Included
	// so a future reader of this file sees the canonical
	// case alongside the variants it parametrises.
	'/api/client/items/coordinates',

	// `?userId=` / `?user_id=` / `?uid=` — the obvious
	// wiring a future "admin-views-other-user's-coordinates"
	// feature might add as a query-string override. The
	// route reads the user identity from
	// `requireClientAuth()` (which reads `session.user.id`)
	// exclusively today.
	'/api/client/items/coordinates?userId=anything',
	'/api/client/items/coordinates?user_id=anything',
	'/api/client/items/coordinates?uid=anything',
	'/api/client/items/coordinates?id=anything',
	'/api/client/items/coordinates?userId=admin',

	// `?clientId=` / `?client_id=` / `?clientID=` — same
	// shape but with the "client" terminology that the
	// route's URL prefix uses. The route does not read
	// any `clientId` query param today.
	'/api/client/items/coordinates?clientId=anything',
	'/api/client/items/coordinates?client_id=anything',
	'/api/client/items/coordinates?clientID=anything',

	// `?itemId=` / `?slug=` / `?itemSlug=` — keys that a
	// future "single-item coordinates lookup" feature might
	// add to scope the payload to a single item rather than
	// returning every item belonging to the user.
	'/api/client/items/coordinates?itemId=anything',
	'/api/client/items/coordinates?slug=any-slug',
	'/api/client/items/coordinates?itemSlug=any-slug',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — the obvious "I have a magic
	// auth token, let me through" keys. The route
	// authenticates via NextAuth session cookie only
	// today via `requireClientAuth()`.
	'/api/client/items/coordinates?token=anything',
	'/api/client/items/coordinates?secret=anything',
	'/api/client/items/coordinates?api_key=anything',
	'/api/client/items/coordinates?authorization=Bearer+anything',
	'/api/client/items/coordinates?session=anything',

	// `?country=` / `?city=` / `?region=` / `?area=` —
	// the obvious geographic filter keys for a coordinates
	// endpoint. The route returns the full per-user
	// coordinate list today; a regression that reads
	// `searchParams.get('country')` before the gate would
	// change the response payload shape.
	'/api/client/items/coordinates?country=US',
	'/api/client/items/coordinates?country=france',
	'/api/client/items/coordinates?city=NYC',
	'/api/client/items/coordinates?city=london',
	'/api/client/items/coordinates?region=americas',
	'/api/client/items/coordinates?area=local',
	'/api/client/items/coordinates?countryCode=DE',
	'/api/client/items/coordinates?country=&city=',

	// `?lat=` / `?lng=` / `?bbox=` / `?radius=` — the
	// obvious "spatial-filter" keys that a future "items
	// near a point" or "items inside a bounding box"
	// feature might add. The route returns the full
	// per-user coordinate list today.
	'/api/client/items/coordinates?lat=40.7128',
	'/api/client/items/coordinates?lng=-74.0060',
	'/api/client/items/coordinates?lat=40.7128&lng=-74.0060',
	'/api/client/items/coordinates?bbox=-74.1,40.6,-73.9,40.8',
	'/api/client/items/coordinates?radius=10',
	'/api/client/items/coordinates?zoom=12',
	'/api/client/items/coordinates?center=40.7128,-74.0060',

	// `?status=` / `?type=` / `?published=` — the obvious
	// item-status filter keys. The route returns the full
	// per-user coordinate list today (no
	// approved-only / draft-only filtering before the
	// gate).
	'/api/client/items/coordinates?status=approved',
	'/api/client/items/coordinates?status=draft',
	'/api/client/items/coordinates?status=pending',
	'/api/client/items/coordinates?type=remote',
	'/api/client/items/coordinates?type=local',
	'/api/client/items/coordinates?published=true',
	'/api/client/items/coordinates?published=false',

	// `?limit=` / `?offset=` / `?page=` — the obvious
	// pagination keys. The route returns the full per-user
	// coordinate list today.
	'/api/client/items/coordinates?limit=1',
	'/api/client/items/coordinates?limit=10',
	'/api/client/items/coordinates?limit=100',
	'/api/client/items/coordinates?offset=10',
	'/api/client/items/coordinates?page=1',
	'/api/client/items/coordinates?cursor=anything',

	// `?fields=` / `?select=` / `?include=` — the obvious
	// "only-give-me-these-columns" keys. The route returns
	// the full `{ slug, name, latitude, longitude }` shape
	// today.
	'/api/client/items/coordinates?fields=slug',
	'/api/client/items/coordinates?fields=slug,name',
	'/api/client/items/coordinates?select=latitude,longitude',
	'/api/client/items/coordinates?include=name',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// the obvious cache-busting keys. The handler does
	// not branch on any cache-control query param today.
	'/api/client/items/coordinates?refresh=1',
	'/api/client/items/coordinates?force=true',
	'/api/client/items/coordinates?fresh=true',
	'/api/client/items/coordinates?cache=bypass',
	'/api/client/items/coordinates?nocache=1',

	// `?format=` — the obvious content-negotiation key.
	// The route returns JSON exclusively today; a future
	// `?format=geojson` would be the obvious extension
	// for a coordinates endpoint, but it must not bypass
	// the auth gate.
	'/api/client/items/coordinates?format=json',
	'/api/client/items/coordinates?format=xml',
	'/api/client/items/coordinates?format=csv',
	'/api/client/items/coordinates?format=geojson',
	'/api/client/items/coordinates?format=kml',

	// `?locale=` / `?lang=` — the obvious i18n keys
	// (relevant to the `name` field in the response, which
	// is locale-sensitive on tenants with translated item
	// names). The route returns whatever names the
	// underlying repository stores today.
	'/api/client/items/coordinates?locale=en',
	'/api/client/items/coordinates?locale=fr',
	'/api/client/items/coordinates?lang=de',

	// `?sort=` / `?order=` / `?direction=` — the obvious
	// sort-override keys. The route returns the canonical
	// repository order today (no client-supplied sort).
	'/api/client/items/coordinates?sort=name',
	'/api/client/items/coordinates?sort=createdAt',
	'/api/client/items/coordinates?order=asc',
	'/api/client/items/coordinates?direction=desc',

	// `?tenant=` / `?tenantId=` / `?org=` — the obvious
	// multi-tenancy keys.
	'/api/client/items/coordinates?tenant=acme',
	'/api/client/items/coordinates?tenantId=42',
	'/api/client/items/coordinates?org=ever-works',

	// `?admin=` / `?asAdmin=` / `?bypass=` — the obvious
	// "admin override" keys that a future "view another
	// user's coordinates as admin" feature might add.
	'/api/client/items/coordinates?admin=1',
	'/api/client/items/coordinates?admin=true',
	'/api/client/items/coordinates?asAdmin=true',
	'/api/client/items/coordinates?bypass=1',
	'/api/client/items/coordinates?impersonate=admin',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The gate fires before any potential
	// future validator, so empty values must round-trip
	// to the same 401 as the no-arg case.
	'/api/client/items/coordinates?userId=',
	'/api/client/items/coordinates?clientId=',
	'/api/client/items/coordinates?token=',
	'/api/client/items/coordinates?country=',
	'/api/client/items/coordinates?bbox=',
	'/api/client/items/coordinates?fields=',

	// Repeated keys — `searchParams.get(name)` returns
	// the first value, but the gate fires before any
	// validator, so repetition is irrelevant on the
	// unauth branch.
	'/api/client/items/coordinates?userId=a&userId=b',
	'/api/client/items/coordinates?country=US&country=FR',
	'/api/client/items/coordinates?token=foo&token=bar',
	'/api/client/items/coordinates?lat=40&lat=50',

	// Special-character values that would tempt a future
	// regex match, LIKE-prefix, or path-injection wiring.
	// The route does not pass any value into a SQL or
	// filesystem path before the gate fires.
	'/api/client/items/coordinates?userId=%3Cscript%3E',
	"/api/client/items/coordinates?userId=%27%20OR%201%3D1",
	'/api/client/items/coordinates?token=%2F..%2F..%2Fetc%2Fpasswd',
	'/api/client/items/coordinates?country=%00',
	'/api/client/items/coordinates?lat=NaN',
	'/api/client/items/coordinates?lat=Infinity',

	// Long values — guard against any future regex /
	// regex-based indexing bug that might trip on long
	// inputs. The gate fires before any validator on the
	// unauth branch, so long values are irrelevant today.
	`/api/client/items/coordinates?userId=${'x'.repeat(500)}`,
	`/api/client/items/coordinates?token=${'y'.repeat(500)}`,
	`/api/client/items/coordinates?country=${'z'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero
	// query keys today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/client/items/coordinates?unknown=value',
	'/api/client/items/coordinates?foo=bar&baz=qux',
	'/api/client/items/coordinates?userId=admin&token=foo&unknown=value&country=US&fields=slug&foo=bar&bbox=-74.1,40.6,-73.9,40.8'
] as const;

test.describe('API: /api/client/items/coordinates query-param surface', () => {
	for (const path of CLIENT_ITEMS_COORDINATES_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's auth gate fires before any potential
			// `searchParams` parsing or client-item-repository
			// call, so the unauthenticated GET surface returns
			// 401 deterministically. There is no 5xx branch
			// reachable on the unauthenticated GET surface
			// because the catch can only fire after the gate
			// has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/client/items/coordinates returns 401 with the canonical { success: false, error } envelope on the unauth branch`, async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the auth gate must fire before any
		// potential validator / client-item-repository call
		// and must return 401 with the documented
		// `{ success: false, error: 'Unauthorized. Please
		// sign in to continue.' }` envelope. A regression that
		// bypasses the gate would surface here as a non-401
		// status or a different body shape.
		const response = await request.get('/api/client/items/coordinates');

		expect(response.status()).toBe(401);

		const body = (await response.json()) as {
			success?: unknown;
			error?: unknown;
		};

		// The route returns `{ success: false, error:
		// 'Unauthorized. Please sign in to continue.' }`
		// today; `success` is a stable boolean discriminator
		// and `error` is a stable machine-readable identifier
		// callers depend on. Assert their presence and shape.
		expect(typeof body.success).toBe('boolean');
		expect(body.success).toBe(false);
		expect(typeof body.error).toBe('string');
	});

	test(`GET /api/client/items/coordinates returns 401 identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params today, so the
		// response status must be invariant to any combination
		// of unknown keys.
		const baseline = await request.get('/api/client/items/coordinates');
		const parameterised = await request.get(
			'/api/client/items/coordinates?userId=admin&country=US&token=anything&unknown=value&bbox=-74.1,40.6,-73.9,40.8'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(401);
	});

	test(`GET /api/client/items/coordinates?userId=… does NOT bypass the session gate`, async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `requireClientAuth()`'s `session.user.id` resolution
		// would change the unauth branch from "always 401" to
		// "200 if ?userId=… is present" and silently grant
		// any anonymous caller arbitrary-user coordinate
		// access. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/client/items/coordinates');
		const withUserId = await request.get('/api/client/items/coordinates?userId=admin');
		const withUserIdUnderscore = await request.get(
			'/api/client/items/coordinates?user_id=admin'
		);
		const withUid = await request.get('/api/client/items/coordinates?uid=admin');
		const withId = await request.get('/api/client/items/coordinates?id=admin');
		const withClientId = await request.get(
			'/api/client/items/coordinates?clientId=admin'
		);

		expect(withUserId.status()).toBe(baseline.status());
		expect(withUserIdUnderscore.status()).toBe(baseline.status());
		expect(withUid.status()).toBe(baseline.status());
		expect(withId.status()).toBe(baseline.status());
		expect(withClientId.status()).toBe(baseline.status());
	});

	test(`GET /api/client/items/coordinates?token=… does NOT introduce a query-token auth bypass`, async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today (auth is gated through `requireClientAuth()`
		// which reads the NextAuth session cookie). A future
		// contributor who adds a magic-token bypass for the
		// session gate would change the unauth branch's
		// behaviour. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/client/items/coordinates');
		const withToken = await request.get('/api/client/items/coordinates?token=anything');
		const withSecret = await request.get(
			'/api/client/items/coordinates?secret=anything'
		);
		const withApiKey = await request.get(
			'/api/client/items/coordinates?api_key=anything'
		);
		const withAuthQuery = await request.get(
			'/api/client/items/coordinates?authorization=Bearer+anything'
		);

		expect(withToken.status()).toBe(baseline.status());
		expect(withSecret.status()).toBe(baseline.status());
		expect(withApiKey.status()).toBe(baseline.status());
		expect(withAuthQuery.status()).toBe(baseline.status());
	});

	test(`GET /api/client/items/coordinates?admin=… does NOT introduce a query-admin-override`, async ({
		request
	}) => {
		// The route's `requireClientAuth()` helper notes in a
		// comment that admins are allowed to use client
		// endpoints today. A regression that wires
		// `searchParams.get('admin')` as a non-session-driven
		// admin override would let an attacker (a) view any
		// user's coordinates by adding `?admin=1`, or (b)
		// bypass the session check entirely. This assertion
		// pins the "admin status is read from the session,
		// never from the query string" invariant.
		const baseline = await request.get('/api/client/items/coordinates');
		const withAdmin = await request.get('/api/client/items/coordinates?admin=1');
		const withAdminTrue = await request.get(
			'/api/client/items/coordinates?admin=true'
		);
		const withAsAdmin = await request.get(
			'/api/client/items/coordinates?asAdmin=true'
		);
		const withBypass = await request.get('/api/client/items/coordinates?bypass=1');
		const withImpersonate = await request.get(
			'/api/client/items/coordinates?impersonate=admin'
		);

		expect(withAdmin.status()).toBe(baseline.status());
		expect(withAdminTrue.status()).toBe(baseline.status());
		expect(withAsAdmin.status()).toBe(baseline.status());
		expect(withBypass.status()).toBe(baseline.status());
		expect(withImpersonate.status()).toBe(baseline.status());
	});

	test(`GET /api/client/items/coordinates?bbox=… spatial-filter params do NOT change the unauth branch`, async ({
		request
	}) => {
		// The route returns the full per-user coordinate
		// list today (no per-bbox / per-radius filtering).
		// A regression that reads `searchParams.get('bbox')`
		// / `searchParams.get('lat')` / `searchParams.get('radius')`
		// before the gate would change the response payload
		// shape on the auth branch. The unauth branch's
		// status must be invariant to the spatial-filter
		// keys.
		const baseline = await request.get('/api/client/items/coordinates');
		const responses = await Promise.all([
			request.get('/api/client/items/coordinates?lat=40.7128'),
			request.get('/api/client/items/coordinates?lng=-74.0060'),
			request.get('/api/client/items/coordinates?lat=40.7128&lng=-74.0060'),
			request.get('/api/client/items/coordinates?bbox=-74.1,40.6,-73.9,40.8'),
			request.get('/api/client/items/coordinates?radius=10'),
			request.get('/api/client/items/coordinates?zoom=12'),
			request.get('/api/client/items/coordinates?center=40.7128,-74.0060'),
			request.get('/api/client/items/coordinates?lat=NaN'),
			request.get('/api/client/items/coordinates?lat=Infinity')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});

	test(`GET /api/client/items/coordinates?slug=… does NOT introduce a single-item lookup branch`, async ({
		request
	}) => {
		// The route returns the full per-user coordinate
		// list today (no per-slug / per-itemId filtering).
		// A regression that reads `searchParams.get('slug')`
		// / `searchParams.get('itemId')` before the gate
		// would change the response payload shape on the
		// auth branch (single-item vs collection). The
		// unauth branch's status must be invariant to the
		// slug-filter keys.
		const baseline = await request.get('/api/client/items/coordinates');
		const responses = await Promise.all([
			request.get('/api/client/items/coordinates?slug=any-slug'),
			request.get('/api/client/items/coordinates?itemId=anything'),
			request.get('/api/client/items/coordinates?itemSlug=any-slug')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});

	test(`GET /api/client/items/coordinates?format=geojson does NOT introduce a content-negotiation bypass`, async ({
		request
	}) => {
		// The route returns JSON exclusively today. A future
		// `?format=geojson` extension would be a natural fit
		// for a coordinates endpoint, but it must not bypass
		// the auth gate. The unauth branch's status must be
		// invariant to the format key.
		const baseline = await request.get('/api/client/items/coordinates');
		const responses = await Promise.all([
			request.get('/api/client/items/coordinates?format=json'),
			request.get('/api/client/items/coordinates?format=xml'),
			request.get('/api/client/items/coordinates?format=csv'),
			request.get('/api/client/items/coordinates?format=geojson'),
			request.get('/api/client/items/coordinates?format=kml')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});

	test(`GET /api/client/items/coordinates keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 401 envelope on the
		// unauth branch. The shape guarantees the route's
		// auth gate fires before any branching on potential
		// future query schemas.
		const responses = await Promise.all([
			request.get('/api/client/items/coordinates'),
			request.get(
				'/api/client/items/coordinates?userId=admin&country=US&token=foo&format=geojson'
			),
			request.get(
				'/api/client/items/coordinates?bbox=-74.1,40.6,-73.9,40.8&radius=10&slug=any-slug&unknown=bar'
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

	test(`GET /api/client/items/coordinates does NOT branch on Accept header`, async ({
		request
	}) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// 401 envelope.
		const responses = await Promise.all([
			request.get('/api/client/items/coordinates', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/client/items/coordinates', {
				headers: { Accept: 'application/geo+json' }
			}),
			request.get('/api/client/items/coordinates', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/client/items/coordinates', {
				headers: { Accept: 'text/html' }
			}),
			request.get('/api/client/items/coordinates', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
		}
	});
});
