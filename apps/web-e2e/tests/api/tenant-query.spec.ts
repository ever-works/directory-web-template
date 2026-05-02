import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the auth-gated
 * current-tenant endpoint served by
 * `apps/web/app/api/tenant/route.ts`.
 *
 * `GET /api/tenant` is the **session-derived** tenant lookup — the
 * handler signature is `export async function GET()` (no `request`
 * parameter), reads zero query keys, and returns one of:
 *
 *   - `200` + `{ tenant: { ... } }` when the session resolves a
 *     `user.tenantId` and `getTenantById(tenantId)` finds a row;
 *   - `200` + `{ tenant: null }` when the session resolves a user
 *     but the user has no `tenantId` attached;
 *   - `401` + `{ tenant: null }` when there is no authenticated
 *     session;
 *   - `500` + `{ error: 'Internal server error' }` when the
 *     repository call rejects.
 *
 * The single happy-path entry (`/api/tenant`) is exercised
 * implicitly via session-bearing flows in the admin / client suites.
 * This spec adds the **query-param surface** so a regression that
 * introduces a `request.nextUrl.searchParams.get(...)` call — which
 * a future "look up a different tenant via `?tenantId=...`" or
 * "filter the response shape via `?include=members,settings`" wiring
 * might tempt a future contributor into adding — is caught
 * immediately as a non-401-or-200 / non-5xx response, and so a
 * regression that drops the `{ tenant: null }` envelope on the
 * unauthenticated branch (e.g. by accidentally returning
 * `NextResponse.json(null, { status: 401 })`) shows up as a typed
 * envelope-shape failure here.
 *
 * The route contract is deliberately permissive:
 *
 *   - **Zero** query keys are read. Any query string the caller
 *     appends must be silently ignored.
 *   - The unauthenticated path returns a 401 with a typed
 *     `{ tenant: null }` body.
 *   - The success path returns a 200 with `{ tenant: ... }`.
 *   - The catch path returns a 500 with `{ error: 'Internal server
 *     error' }`.
 *
 * These tests run **without** an authenticated session, which means
 * the expected status under normal operation is 401. The bulk loop
 * therefore asserts `status < 500` (covering 401 success and any
 * legitimate 200 / 4xx the unauthenticated branch may evolve to)
 * rather than a strict equality, the same posture every other
 * `*-query.spec.ts` smoke spec uses to guard the
 * "no `request` parameter, no `searchParams.get()` call" contract
 * against escape via session-aware redirects.
 */
const TENANT_QUERIES = [
	// Baseline — no query params. Without an authenticated session
	// the route returns 401 + `{ tenant: null }`. This entry exists
	// so the query-param surface enumeration starts from the no-arg
	// case, the same way every other `*-query.spec.ts` smoke spec
	// in this directory does.
	'/api/tenant',

	// `?tenantId=` — the obvious key a future contributor might add
	// when wiring up "look up a tenant other than the session
	// tenant". Today the route reads `session.user.tenantId`; the
	// key must remain ignored.
	'/api/tenant?tenantId=00000000-0000-0000-0000-000000000000',
	'/api/tenant?tenantId=demo',
	'/api/tenant?tenantId=acme-co',

	// `?id=` — the second-most-obvious variant of the same idea.
	// Mirrors the `[id]` parameter every admin route uses; must
	// remain ignored on this self-lookup endpoint.
	'/api/tenant?id=00000000-0000-0000-0000-000000000000',
	'/api/tenant?id=demo',

	// `?slug=` — a plausible identifier a future contributor might
	// switch to once tenants gain human-readable slugs. Must remain
	// ignored.
	'/api/tenant?slug=demo',
	'/api/tenant?slug=acme-co',

	// `?include=` — the obvious key a future contributor might add
	// when wiring up "include members / settings / billing under
	// the tenant envelope". Today the route returns the raw row
	// from `getTenantById`; the key must remain ignored.
	'/api/tenant?include=members',
	'/api/tenant?include=members,settings',
	'/api/tenant?include=members,settings,billing',
	'/api/tenant?include=*',

	// `?fields=` / `?select=` — the obvious GraphQL-style projection
	// keys. Today the route returns every column from the tenants
	// table; the keys must remain ignored.
	'/api/tenant?fields=id,name',
	'/api/tenant?fields=id,name,createdAt',
	'/api/tenant?select=id,name',

	// `?expand=` — the alternative spelling of `include` used by
	// some REST APIs. Must remain ignored.
	'/api/tenant?expand=members',
	'/api/tenant?expand=settings',

	// `?refresh=` / `?force=` / `?fresh=` — the obvious keys a
	// future contributor might add when wiring up "bust the
	// cache for this lookup". Today the route hits the database
	// directly via `getTenantById`; the keys must remain ignored.
	'/api/tenant?refresh=true',
	'/api/tenant?force=true',
	'/api/tenant?fresh=true',
	'/api/tenant?refresh=1',

	// `?format=` — the obvious key a future contributor might add
	// when wiring up "respond with text/plain instead of JSON".
	// Today the route always responds with `application/json`; the
	// key must remain ignored.
	'/api/tenant?format=json',
	'/api/tenant?format=text',
	'/api/tenant?format=xml',

	// `?locale=` / `?lang=` — the obvious i18n keys. Today the
	// tenant envelope is locale-agnostic (tenant `name` is the same
	// across all locales); the keys must remain ignored.
	'/api/tenant?locale=en',
	'/api/tenant?locale=fr',
	'/api/tenant?locale=de',
	'/api/tenant?locale=ar',
	'/api/tenant?lang=en',
	'/api/tenant?lang=zh',

	// Empty values for any of the above keys. `searchParams.get(...)`
	// on `?key=` returns `''`, but the route never calls it — the
	// response must still be identical to the no-arg case.
	'/api/tenant?tenantId=',
	'/api/tenant?id=',
	'/api/tenant?include=',
	'/api/tenant?fields=',
	'/api/tenant?refresh=',
	'/api/tenant?format=',
	'/api/tenant?locale=',

	// Repeated keys — `searchParams.get(name)` would return the first
	// value, but the route never calls it. The response must remain
	// the no-arg case.
	'/api/tenant?tenantId=demo&tenantId=acme',
	'/api/tenant?include=members&include=settings',
	'/api/tenant?refresh=true&refresh=false',

	// Special-character values that would tempt a future SQL
	// injection wrapper around `getTenantById`. The route does not
	// read the value, so these characters cannot reach the
	// database; the request must still pass through to the
	// session-derived branch.
	'/api/tenant?tenantId=%27%20OR%201%3D1--', // ' OR 1=1--
	'/api/tenant?tenantId=%3Cscript%3E', // <script>
	'/api/tenant?tenantId=%2E%2E%2F', // ../
	'/api/tenant?tenantId=%00', // null byte

	// Long values — guard against any future buffer-overflow-style
	// regex / UUID-validation bug. The route does not read the value,
	// so this must pass through to the session-derived branch and
	// respond with the canonical envelope.
	`/api/tenant?tenantId=${'t'.repeat(500)}`,
	`/api/tenant?include=${'i'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The route reads
	// nothing from the request URL, so any combination of unknown
	// keys is silently ignored.
	'/api/tenant?unknown=value',
	'/api/tenant?foo=bar&baz=qux',
	'/api/tenant?tenantId=demo&unknown=value&foo=bar',
	'/api/tenant?nocache=1&t=1735689600000'
] as const;

test.describe('API: /api/tenant query-param surface', () => {
	for (const path of TENANT_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route can legitimately return:
			//   - 200 (authenticated branch — only reachable from
			//     session-bearing test runs);
			//   - 401 (unauthenticated branch — the expected status
			//     for this anonymous smoke spec);
			//   - any other 4xx the route may evolve to add (e.g. a
			//     future rate-limit gate).
			// Anything 5xx is a regression — either the route gained
			// a `searchParams.get()` call that throws, or the catch
			// branch's envelope drifted from the contract.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/tenant returns the canonical typed envelope on the unauthenticated branch', async ({ request }) => {
		// Without a session cookie the route returns
		// `{ tenant: null }` with status 401. This pins the
		// "unauthenticated branch always returns the
		// `{ tenant: null }` envelope shape" contract — a
		// regression that swaps the envelope to `null` (without the
		// `tenant` key) or to `{ error: 'Unauthorized' }` would
		// break clients that destructure `body.tenant`.
		const response = await request.get('/api/tenant');

		expect(response.status()).toBe(401);

		const body = (await response.json()) as { tenant?: unknown };

		// The envelope's load-bearing key must be present even on
		// the unauthenticated branch — clients destructure
		// `const { tenant } = await fetch('/api/tenant').then(r =>
		// r.json())` without a status-code check on the cold path.
		expect(body).toHaveProperty('tenant');
		expect(body.tenant).toBeNull();
	});

	test('GET /api/tenant responds identically with and without bogus query parameters', async ({ request }) => {
		// The handler signature is `export async function GET()` —
		// no `request` parameter, no `searchParams.get()` call. Any
		// query string the caller appends must be silently ignored,
		// and the status / envelope shape must remain identical.
		const baseline = await request.get('/api/tenant');
		const parameterised = await request.get(
			'/api/tenant?tenantId=demo&include=members,settings&format=json&refresh=true&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());

		const baselineBody = (await baseline.json()) as { tenant?: unknown };
		const parameterisedBody = (await parameterised.json()) as { tenant?: unknown };

		// Both responses must carry the `tenant` key — the
		// envelope shape is identical regardless of the query
		// string. Value comparison would over-pin (a moving
		// `lastLogin` or `updatedAt` would create flakes) so the
		// shape-equivalence is the load-bearing assertion.
		expect(parameterisedBody).toHaveProperty('tenant');
		expect(baselineBody).toHaveProperty('tenant');
		expect(parameterisedBody.tenant).toEqual(baselineBody.tenant);
	});

	test('GET /api/tenant rejects path traversal attempts in query values without crashing', async ({ request }) => {
		// The route never reads query values, but a future
		// regression that introduces `request.nextUrl.searchParams.
		// get('tenantId')` and forwards it to `getTenantById()`
		// without UUID validation would be both a SQL injection
		// surface AND a path-traversal surface (depending on the
		// repository implementation). The smoke is "the route must
		// not 5xx on values containing `..`, `'`, `<script>`, or
		// `%00`" — a 500 here would mean a `searchParams.get()`
		// call landed and is throwing on the value.
		const traversalAttempts = [
			'/api/tenant?tenantId=%27%20OR%201%3D1--',
			'/api/tenant?tenantId=%3Cscript%3Ealert(1)%3C%2Fscript%3E',
			'/api/tenant?tenantId=..%2F..%2F..%2Fetc%2Fpasswd',
			'/api/tenant?tenantId=%00null%00byte'
		];

		for (const path of traversalAttempts) {
			const response = await request.get(path);
			expect(response.status()).toBeLessThan(500);
		}
	});
});
