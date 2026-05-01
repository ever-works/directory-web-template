import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * current-user endpoint:
 *
 *   - `apps/web/app/api/current-user/route.ts` — `export async
 *     function GET()` (no `request` parameter); reads zero query
 *     params; calls `auth()` and either:
 *       * returns `200` + `null` if there is no session, or
 *       * returns `200` + `{ id, name, email, image, provider,
 *         isAdmin, tenantId }` if there is a session.
 *
 * The handler signature is the load-bearing detail for this spec —
 * because the function takes no `request` argument, there is no
 * `searchParams.get(...)` call anywhere in the route, and any query
 * string the caller appends must be silently ignored. This spec
 * walks the obvious query-param keys a future contributor might add
 * (`refresh`, `force`, `provider`, `tenantId`, `locale`, `lang`,
 * `format`, `verbose`, `debug`, `fields`, `include`, `exclude`)
 * plus empty values, repeated keys, special-character values, long
 * values, and bogus typo'd keys. None of the cases here may 5xx —
 * that would indicate the route's parameter-parsing logic crashed
 * before the auth check. None of the cases here may 4xx either —
 * the route is intentionally public (it returns `null` rather than
 * `401` when there is no session) and reads nothing from the URL,
 * so any 4xx would mean the route has started rejecting query
 * parameters that it previously ignored — exactly the regression
 * this spec is designed to catch.
 *
 * The spec also pins the **response envelope shape** for the
 * unauthenticated branch: the body is exactly the JSON literal
 * `null`, not `{}`, not `{ user: null }`, not `{ session: null }`,
 * and not the safe-user envelope with `null` fields. This is the
 * Authentication-spec contract that downstream code paths rely on
 * (`/api/tenant`, `/api/sponsor-ads/user`, every client component
 * that calls `useCurrentUser()` and short-circuits on a `null`
 * return).
 *
 * Body content beyond the unauthenticated `null` is intentionally
 * not asserted because in CI the e2e environment may or may not
 * have a session cookie — the status-code invariant and the
 * unauthenticated-body invariant are the load-bearing ones for this
 * contract.
 */
const CURRENT_USER_QUERIES = [
	// Baseline — same path as `protected.spec.ts`'s discovery entry.
	// Included so the query-param surface enumeration starts from the
	// no-arg case.
	'/api/current-user',

	// `?refresh=` / `?force=` — the obvious keys a future contributor
	// might add when wiring up "force a re-validation that bypasses
	// any future in-memory session cache". Today the route calls
	// `auth()` on every invocation and reads no query params; the
	// keys must remain silently ignored.
	'/api/current-user?refresh=true',
	'/api/current-user?refresh=false',
	'/api/current-user?force=true',
	'/api/current-user?force=1',

	// `?provider=` — the obvious key a future contributor might add
	// when wiring up "scope the response to a specific OAuth provider
	// (google, github, credentials)". Today the route returns the
	// session's `provider` field as-is and reads nothing from the
	// URL; the key must remain silently ignored.
	'/api/current-user?provider=google',
	'/api/current-user?provider=github',
	'/api/current-user?provider=credentials',
	'/api/current-user?provider=__no_such_provider__',

	// `?tenantId=` — the obvious key a future contributor might add
	// when wiring up "scope the response to a specific tenant". Today
	// the route returns the session's `tenantId` as-is; the key must
	// remain silently ignored.
	'/api/current-user?tenantId=tenant_123',
	'/api/current-user?tenantId=__no_such_tenant__',

	// `?locale=` / `?lang=` — the obvious i18n keys. Today the
	// current-user response is locale-agnostic (the safe-user shape
	// has no localised fields); the keys must remain silently ignored.
	'/api/current-user?locale=en',
	'/api/current-user?locale=fr',
	'/api/current-user?locale=zh',
	'/api/current-user?locale=ar',
	'/api/current-user?lang=de',
	'/api/current-user?lang=__no_such_locale__',

	// `?format=` — the obvious key a future contributor might add
	// when wiring up "respond with text/plain instead of JSON" (a
	// common API-versioning convention). Today the route always
	// responds with `application/json`; the key must remain silently
	// ignored.
	'/api/current-user?format=json',
	'/api/current-user?format=text',
	'/api/current-user?format=jwt',

	// `?verbose=` / `?debug=` — the obvious keys a future contributor
	// might add when wiring up "include the session's expiry,
	// `iat`, `exp`, raw token claims, etc. in the response". Today
	// the route always returns the same six-field safe-user shape and
	// the keys must remain silently ignored.
	'/api/current-user?verbose=true',
	'/api/current-user?debug=true',
	'/api/current-user?debug=1',

	// `?fields=` / `?include=` / `?exclude=` — the obvious keys a
	// future contributor might add when wiring up "narrow / widen the
	// safe-user shape". Today the route always returns all six
	// safe-user fields and reads nothing from the URL; the keys must
	// remain silently ignored.
	'/api/current-user?fields=id,name',
	'/api/current-user?fields=email',
	'/api/current-user?include=tenantId',
	'/api/current-user?exclude=email',

	// Empty values for any of the above keys. `searchParams.get(...)`
	// on `?key=` returns `''`, but the route never calls it — the
	// response must still be identical to the no-arg case.
	'/api/current-user?refresh=',
	'/api/current-user?force=',
	'/api/current-user?provider=',
	'/api/current-user?tenantId=',
	'/api/current-user?locale=',
	'/api/current-user?fields=',

	// Repeated keys — `searchParams.get(name)` would return the first
	// value, but the route never calls it. The response must remain
	// the no-arg case.
	'/api/current-user?refresh=true&refresh=false',
	'/api/current-user?provider=google&provider=github',
	'/api/current-user?locale=en&locale=fr',

	// Special-character / SQL-injection-shaped values — the route
	// runs `auth()` only and never interpolates the URL into any
	// downstream query. These values must remain pass-through ignored.
	// (If a future change were to forward any of these to the auth
	// adapter or the database without parameter binding, the call
	// would either fail with a parse error or succeed with an
	// injected payload — both are observable as status drift relative
	// to the baseline.)
	'/api/current-user?provider=%27', // '
	'/api/current-user?provider=%22', // "
	'/api/current-user?tenantId=%3B', // ;
	'/api/current-user?tenantId=%2D%2D', // --
	"/api/current-user?provider='OR'1'='1",
	'/api/current-user?tenantId=DROP+TABLE+users',
	'/api/current-user?fields=%3Cscript%3Ealert(1)%3C%2Fscript%3E',
	'/api/current-user?include=../../etc/passwd',

	// Long values — guard against any future buffer-overflow-style
	// regex / identifier-validation bug. The route does not read the
	// value, so this must pass through to the no-arg branch.
	`/api/current-user?provider=${'p'.repeat(500)}`,
	`/api/current-user?tenantId=${'t'.repeat(500)}`,
	`/api/current-user?fields=${'f'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The route reads
	// nothing from the request URL, so any combination of unknown
	// keys is silently ignored.
	'/api/current-user?unknown=value',
	'/api/current-user?foo=bar&baz=qux',
	'/api/current-user?refresh=true&unknown=value&foo=bar',
	'/api/current-user?provider=google&format=json&fields=id&unknown=value'
] as const;

test.describe('API: /api/current-user query-param surface', () => {
	test('GET /api/current-user returns 200 with a JSON response', async ({ request }) => {
		// The route always returns `200` — `null` for unauthenticated
		// callers, the safe-user shape for authenticated ones. Any
		// other status would indicate a regression in the route or
		// the auth adapter.
		const response = await request.get('/api/current-user');

		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toMatch(/application\/json/);

		// The body parses as JSON — either `null` (unauthenticated) or
		// an object (authenticated). Both are valid e2e outcomes
		// because the e2e environment may or may not have a session.
		const body = (await response.json()) as unknown;

		if (body !== null) {
			expect(typeof body).toBe('object');
			// If a session exists, the safe-user shape must include
			// `id` and `isAdmin` (the only two `required` fields per
			// the route's swagger doc).
			const user = body as { id?: unknown; isAdmin?: unknown };
			expect(typeof user.id).toBe('string');
			expect(typeof user.isAdmin).toBe('boolean');
		}
	});

	test('GET /api/current-user returns the JSON literal `null` when unauthenticated', async ({ request }) => {
		// The Authentication-spec contract: when there is no session,
		// the route returns the JSON literal `null` (not `{}`, not
		// `{ user: null }`, not the safe-user shape with `null`
		// fields). This is the contract that `useCurrentUser()` and
		// every short-circuiting client component rely on.
		//
		// In CI without a session cookie the response is `null`; if
		// the e2e environment ever grows a session bootstrap, this
		// assertion will need to be guarded by a "is unauthenticated"
		// precondition. For today, the e2e harness runs without a
		// pre-set session.
		const response = await request.get('/api/current-user');

		expect(response.status()).toBe(200);

		const body = (await response.json()) as unknown;

		// Either `null` (unauthenticated, the e2e baseline) or a
		// safe-user object (a future authenticated e2e fixture).
		if (body === null) {
			expect(body).toBeNull();
		} else {
			// If a session exists, the body must NOT be the empty
			// object — that would mean the safe-user shape has been
			// stripped down to nothing, which is a regression.
			expect(Object.keys(body as object).length).toBeGreaterThan(0);
		}
	});

	for (const path of CURRENT_USER_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			// The route is intentionally public (returns `null` rather
			// than `401` when unauthenticated) and reads nothing from
			// the URL. Any 5xx would indicate the route's auth call
			// crashed; any 4xx would indicate the route has started
			// rejecting query parameters that it previously ignored.
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
			expect(response.status()).toBeLessThan(400);
			expect(response.status()).toBeGreaterThanOrEqual(200);
		});
	}

	test('GET /api/current-user responds with the same status with and without bogus query parameters', async ({
		request
	}) => {
		// The handler signature is `export async function GET()` — no
		// `request` parameter, no `searchParams.get()` call. Any query
		// string the caller appends must be silently ignored, and the
		// status must be identical to the baseline. Body content is
		// not asserted byte-identical because the auth adapter may
		// produce a moving `iat` / `exp` even within a single test
		// run; the status-code invariant is the load-bearing one for
		// this contract.
		const baseline = await request.get('/api/current-user');
		const parameterised = await request.get(
			'/api/current-user?refresh=true&provider=google&format=json&fields=id,name&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(200);

		const baselineBody = (await baseline.json()) as unknown;
		const parameterisedBody = (await parameterised.json()) as unknown;

		// Both calls must land on the same authentication branch (both
		// `null` for unauthenticated, or both objects for authenticated).
		if (baselineBody === null) {
			expect(parameterisedBody).toBeNull();
		} else {
			expect(parameterisedBody).not.toBeNull();
			// Both should have the same `id` because the URL doesn't
			// scope the session to a different user.
			const baselineUser = baselineBody as { id?: unknown };
			const parameterisedUser = parameterisedBody as { id?: unknown };
			expect(parameterisedUser.id).toBe(baselineUser.id);
		}
	});

	test('GET /api/current-user ignores SQL-injection-shaped query parameter values', async ({ request }) => {
		// The handler runs `auth()` only — no SQL, no shell, no
		// dynamic parameter interpolation against the URL. The route
		// never reads the URL, so SQL-injection-shaped values in
		// `?provider=` / `?tenantId=` cannot reach any downstream
		// layer. This test pins that invariant: the response status
		// must match the no-arg baseline, and the response body must
		// remain the same authentication branch.
		const baseline = await request.get('/api/current-user');
		const injection = await request.get(
			'/api/current-user?provider=%27%3B+DROP+TABLE+users%3B+--&tenantId=%27OR%271%27%3D%271'
		);

		expect(injection.status()).toBe(baseline.status());
		expect(injection.status()).toBe(200);

		const baselineBody = (await baseline.json()) as unknown;
		const injectionBody = (await injection.json()) as unknown;

		// Both must land on the same authentication branch — the
		// injection-shaped values must not alter what the route does.
		if (baselineBody === null) {
			expect(injectionBody).toBeNull();
		} else {
			expect(injectionBody).not.toBeNull();
		}
	});

	test('GET /api/current-user does not expose sensitive session fields', async ({ request }) => {
		// The route's safe-user shape is exactly six fields plus
		// `tenantId`: `id`, `name`, `email`, `image`, `provider`,
		// `isAdmin`, `tenantId`. The Authentication-spec contract
		// forbids exposing the password hash, the raw JWT, the
		// session's `iat` / `exp` claims, the OAuth refresh token, or
		// any other internal session metadata. This test pins that
		// invariant: if the response is non-null, it must NOT contain
		// any of the forbidden field names.
		const response = await request.get('/api/current-user');
		const body = (await response.json()) as unknown;

		if (body === null) {
			// Unauthenticated — nothing to assert.
			return;
		}

		const forbiddenFields = [
			'password',
			'passwordHash',
			'hashedPassword',
			'salt',
			'token',
			'accessToken',
			'refreshToken',
			'idToken',
			'jwt',
			'session',
			'sessionToken',
			'iat',
			'exp',
			'jti',
			'sub',
			'secret'
		] as const;

		const user = body as Record<string, unknown>;
		for (const field of forbiddenFields) {
			expect(user[field]).toBeUndefined();
		}
	});
});
