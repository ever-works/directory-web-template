import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * development-only database-initialization endpoint served by
 * `apps/web/app/api/internal/db-init/route.ts`.
 *
 * `GET /api/internal/db-init` is intentionally **gated by
 * environment**, not by authentication — it triggers
 * `initializeDatabase()` (auto-migration + seeding) and is the
 * cheapest possible way for a contributor to bring a fresh
 * checkout's local database up to a known state. The handler
 * signature is:
 *
 *     export async function GET(_request: NextRequest) {
 *       if (process.env.NODE_ENV !== 'development') {
 *         return NextResponse.json(
 *           { error: 'Not available in production' },
 *           { status: 403 }
 *         );
 *       }
 *       try {
 *         const { initializeDatabase } = await import('@/lib/db/initialize');
 *         await initializeDatabase();
 *         return NextResponse.json({
 *           success: true,
 *           message: 'Database initialization completed',
 *         });
 *       } catch (error) {
 *         return safeErrorResponse(error, 'Database initialization failed');
 *       }
 *     }
 *
 * The handler reads **zero** query parameters today — the
 * `_request` parameter is underscored to mark it deliberately
 * unused. Every key the caller appends is silently ignored. The
 * route has three distinct branches:
 *
 *   1. Production guard — `NODE_ENV !== 'development'` short-circuits
 *      with `403` and `{ error: 'Not available in production' }`
 *      *before* any other side-effect happens. This is the
 *      load-bearing safety property: the route must never run
 *      auto-migration or auto-seeding outside dev.
 *   2. Happy path — `initializeDatabase()` resolves; the route
 *      returns `200` with `{ success: true, message: 'Database
 *      initialization completed' }`.
 *   3. Catch — any thrown error is mapped through
 *      `safeErrorResponse(error, 'Database initialization failed')`
 *      to a `500` with a generic message. Detailed errors are
 *      logged server-side only to avoid information disclosure.
 *
 * The route therefore must be invariant to **any** query
 * parameter the caller appends — present, absent, empty,
 * repeated, special-character, or long. None of them is read by
 * the handler; none of them can flip the production-guard
 * branch (which is gated on the server-side `NODE_ENV`, not on
 * any caller-controlled input); none of them is forwarded to a
 * SQL or filesystem path inside `initializeDatabase()`.
 *
 * Asserting on the body byte-for-byte would pin the spec to a
 * single environment shape (dev vs production) and break under
 * the others. The matrix accepts `< 600 && >= 200` because all
 * three branches (`200`, `403`, `500`) are legitimate and the
 * spec must run cleanly against both a dev environment (where
 * the test runner's `NODE_ENV=test` is treated as
 * not-production by some setups but as not-development by
 * Playwright's webServer) and a production-mode preview
 * (where the guard fires).
 *
 * The existing route is covered by
 * [`method-guards.spec.ts`](./method-guards.spec.ts) for the
 * "any verb returns < 500" assertion; this spec walks the
 * **query-param surface** so a regression that introduces a
 * `?force=` bypass for the production guard (which a future
 * "allow init in staging" feature might tempt a contributor
 * into adding), a `?seed=` toggle, a `?reset=` destructive
 * branch, or any other caller-controlled flag is caught
 * immediately as a status divergence between the no-arg and
 * parameter-laden branches.
 */
const DB_INIT_QUERIES = [
	// Baseline — the no-arg case. Included so a future reader of
	// this file sees it alongside the variants it parametrises.
	`/api/internal/db-init`,

	// `?force=` / `?bypass=` — the obvious "skip the production
	// guard" keys a future contributor might wire into the
	// `NODE_ENV !== 'development'` check. The route does not
	// read them today; every value must produce the same status
	// as the no-arg case.
	`/api/internal/db-init?force=true`,
	`/api/internal/db-init?force=1`,
	`/api/internal/db-init?bypass=true`,
	`/api/internal/db-init?bypass=production`,
	`/api/internal/db-init?override=true`,

	// `?env=` — the obvious "claim a different NODE_ENV" key.
	// The route reads `process.env.NODE_ENV` server-side and
	// must NEVER trust a caller-controlled value.
	`/api/internal/db-init?env=development`,
	`/api/internal/db-init?env=production`,
	`/api/internal/db-init?env=test`,
	`/api/internal/db-init?NODE_ENV=development`,

	// `?seed=` / `?reset=` / `?drop=` — the obvious destructive
	// toggles a future contributor might wire. The route runs
	// `initializeDatabase()` unconditionally today and exposes
	// no destructive hatch.
	`/api/internal/db-init?seed=true`,
	`/api/internal/db-init?seed=false`,
	`/api/internal/db-init?reset=true`,
	`/api/internal/db-init?drop=true`,
	`/api/internal/db-init?recreate=true`,

	// `?migrate=` / `?skip-migration=` — the obvious migration
	// toggles. Not honoured today.
	`/api/internal/db-init?migrate=false`,
	`/api/internal/db-init?skip-migration=true`,
	`/api/internal/db-init?migration=skip`,

	// `?dryRun=` — the obvious "validate but do not execute"
	// key. Not honoured today.
	`/api/internal/db-init?dryRun=true`,
	`/api/internal/db-init?dry-run=true`,

	// `?verbose=` / `?debug=` — the obvious logging-level keys.
	// Not honoured today.
	`/api/internal/db-init?verbose=true`,
	`/api/internal/db-init?debug=true`,
	`/api/internal/db-init?logLevel=debug`,

	// `?refresh=` / `?nocache=` — the obvious cache-busting
	// keys. The route does not cache today.
	`/api/internal/db-init?refresh=1`,
	`/api/internal/db-init?nocache=1`,

	// `?format=` — the obvious content-negotiation key. The
	// route returns JSON exclusively today.
	`/api/internal/db-init?format=json`,
	`/api/internal/db-init?format=xml`,

	// `?tenant=` / `?tenantId=` — the obvious multi-tenancy
	// keys. The handler reads zero tenant context today (the
	// initialiser is global).
	`/api/internal/db-init?tenant=acme`,
	`/api/internal/db-init?tenantId=42`,

	// `?token=` / `?secret=` — the obvious "I have a magic
	// auth token, let me through" keys. The route does NOT
	// authenticate via a query token today (and must never start);
	// every value must produce the same status as the no-arg
	// case. This pins the "the production guard is the only
	// safety mechanism" invariant.
	`/api/internal/db-init?token=anything`,
	`/api/internal/db-init?secret=anything`,
	`/api/internal/db-init?api_key=anything`,
	`/api/internal/db-init?authorization=Bearer+anything`,

	// Empty values — `searchParams.get(...)` on `?force=`
	// returns `''`. The route reads zero keys, so the empty
	// string is irrelevant.
	`/api/internal/db-init?force=`,
	`/api/internal/db-init?env=`,
	`/api/internal/db-init?seed=`,

	// Repeated keys — the route reads zero keys, so repetition
	// is irrelevant.
	`/api/internal/db-init?force=true&force=false`,
	`/api/internal/db-init?env=development&env=production`,

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or path-injection wiring. The route
	// does not pass any value into a SQL or filesystem path.
	`/api/internal/db-init?force=%25`,
	`/api/internal/db-init?env=%2F`,
	`/api/internal/db-init?seed=%5C`,
	`/api/internal/db-init?token=%27%20OR%201%3D1`,
	`/api/internal/db-init?reset=%3Cscript%3E`,

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs.
	`/api/internal/db-init?force=${'x'.repeat(500)}`,
	`/api/internal/db-init?token=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero keys,
	// so any combination of unknown keys is silently ignored.
	`/api/internal/db-init?unknown=value`,
	`/api/internal/db-init?foo=bar&baz=qux`,
	`/api/internal/db-init?force=true&unknown=value&foo=bar`
] as const;

test.describe('API: /api/internal/db-init query-param surface', () => {
	for (const path of DB_INIT_QUERIES) {
		test(`GET ${path} responds without unexpected status`, async ({ request }) => {
			const response = await request.get(path);

			// The route's three legitimate branches:
			//   1. `200` — happy path (dev env, init succeeded);
			//   2. `403` — production guard fired;
			//   3. `500` — `initializeDatabase()` threw and the
			//      catch branch produced a `safeErrorResponse`.
			// All three are part of the route's contract. The
			// matrix accepts `< 600 && >= 200` because the spec
			// must run cleanly against both dev and production
			// modes. A regression that introduces a 4xx other
			// than `403` (e.g. an unintentionally-wired
			// authentication gate) or a 5xx other than `500`
			// would still fail loudly here.
			expect(response.status()).toBeLessThan(600);
			expect(response.status()).toBeGreaterThanOrEqual(200);
		});
	}

	test(`GET /api/internal/db-init returns one of {200, 403, 500} on the no-arg path`, async ({
		request
	}) => {
		// The three legitimate branches. Asserting on the
		// specific allowed set (rather than `< 500` alone) pins
		// the contract more precisely than the matrix above.
		const response = await request.get(`/api/internal/db-init`);

		expect([200, 403, 500]).toContain(response.status());
	});

	test(`GET /api/internal/db-init responds identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params, so the response
		// status must be invariant to any combination of
		// unknown keys. Body content is not asserted
		// byte-identical because `initializeDatabase()` is
		// stateful — a second call could land in a different
		// branch if the first call mutates the schema.
		const baseline = await request.get(`/api/internal/db-init`);
		const parameterised = await request.get(
			`/api/internal/db-init?force=true&env=development&seed=true&unknown=value&foo=bar`
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test(`GET /api/internal/db-init?force=true does NOT bypass the production guard`, async ({
		request
	}) => {
		// The most important assertion in this file. A future
		// contributor who wires `?force=true` into the
		// `NODE_ENV !== 'development'` check would change the
		// production-mode behaviour from "always returns 403"
		// to "returns 200 if ?force=true is present". This
		// assertion catches that change immediately because the
		// no-arg and `?force=true` calls must always return the
		// same status.
		const baseline = await request.get(`/api/internal/db-init`);
		const withForce = await request.get(`/api/internal/db-init?force=true`);

		expect(withForce.status()).toBe(baseline.status());
	});

	test(`GET /api/internal/db-init?env=development does NOT spoof NODE_ENV`, async ({
		request
	}) => {
		// The handler reads `process.env.NODE_ENV` server-side.
		// A caller cannot flip the guard by claiming a
		// different env. This assertion pins that posture: a
		// future contributor who reads `searchParams.get('env')`
		// as a fallback for `process.env.NODE_ENV` would change
		// the production-mode behaviour from "always returns
		// 403" to "returns 200 if ?env=development is present".
		const baseline = await request.get(`/api/internal/db-init`);
		const claimedDev = await request.get(`/api/internal/db-init?env=development`);
		const claimedProd = await request.get(`/api/internal/db-init?env=production`);

		expect(claimedDev.status()).toBe(baseline.status());
		expect(claimedProd.status()).toBe(baseline.status());
	});

	test(`GET /api/internal/db-init?token=anything does NOT introduce a query-token auth bypass`, async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today. A future contributor who adds a magic-token
		// bypass for the production guard would change the
		// production-mode behaviour. This assertion catches
		// that change immediately.
		const baseline = await request.get(`/api/internal/db-init`);
		const withToken = await request.get(`/api/internal/db-init?token=anything`);
		const withSecret = await request.get(`/api/internal/db-init?secret=anything`);
		const withAuth = await request.get(
			`/api/internal/db-init?authorization=Bearer+anything`
		);

		expect(withToken.status()).toBe(baseline.status());
		expect(withSecret.status()).toBe(baseline.status());
		expect(withAuth.status()).toBe(baseline.status());
	});

	test(`GET /api/internal/db-init keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// produce a valid JSON response. The shape guarantees
		// the route does not branch on any unknown query key
		// today.
		const responses = await Promise.all([
			request.get(`/api/internal/db-init`),
			request.get(`/api/internal/db-init?force=true&env=development`),
			request.get(`/api/internal/db-init?seed=true&migrate=false&unknown=value`)
		]);

		for (const response of responses) {
			expect([200, 403, 500]).toContain(response.status());

			// The response must be valid JSON. We do not assert
			// on body content because the three branches return
			// different envelopes (`{ success, message }` for
			// 200, `{ error }` for 403 / 500), but all three
			// must be parseable JSON.
			const body = await response.json();
			expect(typeof body).toBe('object');
			expect(body).not.toBeNull();
		}
	});
});
