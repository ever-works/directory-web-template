import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the auth-gated
 * user-profile location endpoint served by
 * `apps/web/app/api/user/profile/location/route.ts`.
 *
 * `GET /api/user/profile/location` is the **session-derived**
 * location-settings lookup — the handler signature is
 * `export async function GET()` (no `request` parameter), reads
 * zero query keys, and returns one of:
 *
 *   - `200` + `{ defaultLatitude, defaultLongitude, defaultCity,
 *     defaultCountry, locationPrivacy }` when the session resolves
 *     a `clientProfileId` and `getClientProfileById(...)` finds a
 *     row;
 *   - `404` + `{ error: 'Profile not found' }` when the session
 *     resolves a `clientProfileId` but the row has been deleted
 *     out from under it;
 *   - `401` + `{ error: 'Unauthorized' }` when there is no
 *     authenticated session, or the session has no
 *     `clientProfileId`;
 *   - `500` + `{ error: 'Internal server error' }` when the
 *     repository call rejects.
 *
 * The single happy-path entry (`/api/user/profile/location`) is
 * exercised implicitly via session-bearing flows in the client
 * suite. This spec adds the **query-param surface** so a regression
 * that introduces a `request.nextUrl.searchParams.get(...)` call —
 * which a future "look up another user's location via `?userId=...`"
 * or "filter the response shape via `?include=privacy,coordinates`"
 * wiring might tempt a future contributor into adding — is caught
 * immediately as a non-401-or-200 / non-5xx response, and so a
 * regression that drops the `{ error: 'Unauthorized' }` envelope on
 * the unauthenticated branch (e.g. by accidentally returning a
 * `null`-bodied 401) shows up as a typed envelope-shape failure
 * here.
 *
 * The route contract is deliberately permissive:
 *
 *   - **Zero** query keys are read. Any query string the caller
 *     appends must be silently ignored.
 *   - The unauthenticated path returns a 401 with a typed
 *     `{ error }` body.
 *   - The success path returns a 200 with the five-key location
 *     payload.
 *   - The catch path returns a 500 with `{ error: 'Internal server
 *     error' }`.
 *
 * These tests run **without** an authenticated session, which means
 * the expected status under normal operation is 401. The bulk loop
 * therefore asserts `status < 500` (covering 401 success and any
 * legitimate 200 / 4xx the route may evolve to) rather than a
 * strict equality, the same posture every other `*-query.spec.ts`
 * smoke spec uses to guard the "no `request` parameter, no
 * `searchParams.get()` call" contract against escape via
 * session-aware redirects.
 */
const PROFILE_LOCATION_QUERIES = [
	// Baseline — no query params. Without an authenticated session
	// the route returns 401 + `{ error: 'Unauthorized' }`. This entry
	// exists so the query-param surface enumeration starts from the
	// no-arg case, the same way every other `*-query.spec.ts` smoke
	// spec in this directory does.
	'/api/user/profile/location',

	// `?userId=` — the obvious key a future contributor might add
	// when wiring up "look up another user's location settings".
	// Today the route reads `session.user.clientProfileId`; the key
	// must remain ignored, and the unauthenticated branch must not
	// leak any data.
	'/api/user/profile/location?userId=00000000-0000-0000-0000-000000000000',
	'/api/user/profile/location?userId=demo-user',
	'/api/user/profile/location?userId=alice@example.com',

	// `?clientProfileId=` — the second-most-obvious variant of the
	// same idea. Mirrors the column the handler reads from the
	// session today; a contributor might be tempted to surface it
	// as a query key on a "look up another profile" mutation.
	'/api/user/profile/location?clientProfileId=00000000-0000-0000-0000-000000000000',
	'/api/user/profile/location?clientProfileId=demo',

	// `?id=` — the generic "look up by id" variant. Mirrors the
	// `[id]` parameter every admin route uses; must remain ignored
	// on this self-lookup endpoint.
	'/api/user/profile/location?id=00000000-0000-0000-0000-000000000000',
	'/api/user/profile/location?id=demo',

	// `?include=` — the obvious key a future contributor might add
	// when wiring up "include the privacy preference / coordinates /
	// reverse-geocoded city under the response envelope". Today the
	// route returns all five fields together; the key must remain
	// ignored.
	'/api/user/profile/location?include=privacy',
	'/api/user/profile/location?include=privacy,coordinates',
	'/api/user/profile/location?include=privacy,coordinates,city',
	'/api/user/profile/location?include=*',

	// `?fields=` / `?select=` — the obvious GraphQL-style projection
	// keys. Today the route returns every field together; the keys
	// must remain ignored.
	'/api/user/profile/location?fields=defaultLatitude,defaultLongitude',
	'/api/user/profile/location?fields=defaultCity,defaultCountry',
	'/api/user/profile/location?select=locationPrivacy',

	// `?expand=` — the alternative spelling of `include` used by some
	// REST APIs. Must remain ignored.
	'/api/user/profile/location?expand=privacy',
	'/api/user/profile/location?expand=coordinates',

	// `?refresh=` / `?force=` / `?fresh=` — the obvious keys a future
	// contributor might add when wiring up "bust the cache for this
	// lookup". Today the route hits the database directly via
	// `getClientProfileById`; the keys must remain ignored.
	'/api/user/profile/location?refresh=true',
	'/api/user/profile/location?force=true',
	'/api/user/profile/location?fresh=true',
	'/api/user/profile/location?refresh=1',

	// `?format=` — the obvious key a future contributor might add
	// when wiring up "respond with text/plain instead of JSON".
	// Today the route always responds with `application/json`; the
	// key must remain ignored.
	'/api/user/profile/location?format=json',
	'/api/user/profile/location?format=text',
	'/api/user/profile/location?format=xml',

	// `?locale=` / `?lang=` — the obvious i18n keys. Today the
	// stored `defaultCity` / `defaultCountry` are the user's own
	// raw inputs (locale-agnostic); the keys must remain ignored.
	'/api/user/profile/location?locale=en',
	'/api/user/profile/location?locale=fr',
	'/api/user/profile/location?locale=de',
	'/api/user/profile/location?locale=ar',
	'/api/user/profile/location?lang=en',
	'/api/user/profile/location?lang=zh',

	// `?privacy=` — the obvious key a future contributor might add
	// when wiring up "filter to only the privacy-preference field".
	// Today the route returns the full envelope; the key must remain
	// ignored.
	'/api/user/profile/location?privacy=public',
	'/api/user/profile/location?privacy=private',
	'/api/user/profile/location?privacy=friends',

	// Empty values for any of the above keys.
	// `searchParams.get(...)` on `?key=` returns `''`, but the route
	// never calls it — the response must still be identical to the
	// no-arg case.
	'/api/user/profile/location?userId=',
	'/api/user/profile/location?id=',
	'/api/user/profile/location?include=',
	'/api/user/profile/location?fields=',
	'/api/user/profile/location?refresh=',
	'/api/user/profile/location?format=',
	'/api/user/profile/location?locale=',

	// Repeated keys — `searchParams.get(name)` would return the
	// first value, but the route never calls it. The response must
	// remain the no-arg case.
	'/api/user/profile/location?userId=demo&userId=other',
	'/api/user/profile/location?include=privacy&include=coordinates',
	'/api/user/profile/location?refresh=true&refresh=false',

	// Special-character values that would tempt a future SQL injection
	// wrapper around `getClientProfileById`. The route does not read
	// the value, so these characters cannot reach the database; the
	// request must still pass through to the session-derived branch.
	"/api/user/profile/location?userId=%27%20OR%201%3D1--", // ' OR 1=1--
	'/api/user/profile/location?userId=%3Cscript%3E', // <script>
	'/api/user/profile/location?userId=%2E%2E%2F', // ../
	'/api/user/profile/location?userId=%00', // null byte

	// Long values — guard against any future buffer-overflow-style
	// regex / UUID-validation bug. The route does not read the value,
	// so this must pass through to the session-derived branch and
	// respond with the canonical envelope.
	`/api/user/profile/location?userId=${'u'.repeat(500)}`,
	`/api/user/profile/location?include=${'i'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The route reads
	// nothing from the request URL, so any combination of unknown
	// keys is silently ignored.
	'/api/user/profile/location?unknown=value',
	'/api/user/profile/location?foo=bar&baz=qux',
	'/api/user/profile/location?userId=demo&unknown=value&foo=bar',
	'/api/user/profile/location?nocache=1&t=1735689600000',
] as const;

test.describe('API: /api/user/profile/location query-param surface', () => {
	for (const path of PROFILE_LOCATION_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route can legitimately return:
			//   - 200 (authenticated branch — only reachable from
			//     session-bearing test runs);
			//   - 401 (unauthenticated branch — the expected status
			//     for this anonymous smoke spec);
			//   - 404 (authenticated but profile row missing — also
			//     unreachable from this anonymous spec, listed here
			//     for completeness);
			//   - any other 4xx the route may evolve to add (e.g. a
			//     future rate-limit gate).
			// Anything 5xx is a regression — either the route gained
			// a `searchParams.get()` call that throws, or the catch
			// branch's envelope drifted from the contract.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/user/profile/location returns the canonical typed envelope on the unauthenticated branch', async ({
		request,
	}) => {
		// Without a session cookie the route returns
		// `{ error: 'Unauthorized' }` with status 401. This pins the
		// "unauthenticated branch always returns the
		// `{ error: '...' }` envelope shape" contract — a regression
		// that swaps the envelope to `null` (without the `error`
		// key) or to `{ message: 'Unauthorized' }` would break any
		// admin-tool client that destructures `body.error` for
		// display.
		const response = await request.get('/api/user/profile/location');

		expect(response.status()).toBe(401);

		const body = (await response.json()) as { error?: unknown };

		// The envelope's load-bearing key must be present even on the
		// unauthenticated branch.
		expect(body).toHaveProperty('error');
		expect(typeof body.error).toBe('string');
	});

	test('GET /api/user/profile/location responds identically with and without bogus query parameters', async ({
		request,
	}) => {
		// The handler signature is `export async function GET()` —
		// no `request` parameter, no `searchParams.get()` call. Any
		// query string the caller appends must be silently ignored,
		// and the status / envelope shape must remain identical.
		const baseline = await request.get('/api/user/profile/location');
		const parameterised = await request.get(
			'/api/user/profile/location?userId=demo&include=privacy,coordinates&format=json&refresh=true&unknown=value',
		);

		expect(parameterised.status()).toBe(baseline.status());

		const baselineBody = (await baseline.json()) as { error?: unknown };
		const parameterisedBody = (await parameterised.json()) as { error?: unknown };

		// Both responses must carry the `error` key — the envelope
		// shape is identical regardless of the query string. Value
		// comparison is safe here because the unauthenticated branch's
		// error string is a fixed literal (`'Unauthorized'`), not a
		// session-dependent payload.
		expect(parameterisedBody).toHaveProperty('error');
		expect(baselineBody).toHaveProperty('error');
		expect(parameterisedBody.error).toEqual(baselineBody.error);
	});

	test('GET /api/user/profile/location rejects path traversal attempts in query values without crashing', async ({
		request,
	}) => {
		// The route never reads query values, but a future regression
		// that introduces `request.nextUrl.searchParams.get('userId')`
		// and forwards it to `getClientProfileById()` without UUID
		// validation would be both a SQL injection surface AND a
		// path-traversal surface (depending on the repository
		// implementation). The smoke is "the route must not 5xx on
		// values containing `..`, `'`, `<script>`, or `%00`" — a 500
		// here would mean a `searchParams.get()` call landed and is
		// throwing on the value.
		const traversalAttempts = [
			"/api/user/profile/location?userId=%27%20OR%201%3D1--",
			'/api/user/profile/location?userId=%3Cscript%3Ealert(1)%3C%2Fscript%3E',
			'/api/user/profile/location?userId=..%2F..%2F..%2Fetc%2Fpasswd',
			'/api/user/profile/location?userId=%00null%00byte',
		];

		for (const path of traversalAttempts) {
			const response = await request.get(path);
			expect(response.status()).toBeLessThan(500);
		}
	});
});
