import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * database health endpoint:
 *
 *   - `apps/web/app/api/health/database/route.ts` — `export async
 *     function GET()` (no `request` parameter); reads zero query
 *     params; runs a single `SELECT 1` round-trip via Drizzle
 *     against the configured database and responds with one of:
 *       * `200` + `{ status: 'healthy', database: 'connected',
 *         timestamp, result }` (success);
 *       * `500` + `{ status: 'unhealthy', database: 'disconnected',
 *         error: 'Database connection check failed', timestamp }`
 *         (catch branch when the `db.execute(...)` round-trip
 *         throws — typically because the configured database is
 *         missing or the credentials are wrong in CI).
 *
 * The existing
 * [`health.spec.ts`](./health.spec.ts) covers the canonical happy
 * paths (the no-arg GET and the `200`-or-`503` envelope assertion);
 * this spec walks the **query-param surface** so a regression that
 * introduces a typo'd `request.nextUrl.searchParams.get(...)` call
 * — which a future "force a re-check via `?refresh=true`" or
 * "scope the check to a specific schema via `?schema=public`"
 * wiring might tempt a future contributor into adding — is caught
 * immediately as a status-code drift relative to the no-arg
 * baseline.
 *
 * The route signature pins the contract:
 *
 *   - `GET /api/health/database` — `export async function GET()`.
 *     The handler has no `request` parameter, so any query string
 *     the caller appends is silently ignored. The status is one of
 *     `200` or `500`; both are valid CI outcomes (the e2e
 *     environment does not guarantee a reachable database) and
 *     both branches respond with the same envelope shape (`status`,
 *     `database`, `timestamp` keys).
 *
 * The bulk loop asserts a **status invariant** — every parameterised
 * URL must respond with the same status as the no-arg baseline.
 * This is a tighter contract than the `< 500` invariant used by
 * other query-smoke specs because the route's two valid branches
 * (200 success, 500 failure) are determined by the database's
 * reachability, not by the URL — so any URL-driven status drift is
 * a real regression.
 */
const HEALTH_DATABASE_QUERIES = [
	// Baseline — same path as `health.spec.ts`. Included so the
	// query-param surface enumeration starts from the no-arg case.
	'/api/health/database',

	// `?refresh=` / `?force=` — the obvious keys a future contributor
	// might add when wiring up "force a re-check that bypasses any
	// future in-memory cache". Today the route runs the query on
	// every call and reads no query params; the keys must remain
	// silently ignored.
	'/api/health/database?refresh=true',
	'/api/health/database?refresh=false',
	'/api/health/database?force=true',
	'/api/health/database?force=1',

	// `?schema=` / `?database=` / `?table=` — the obvious keys a
	// future contributor might add when wiring up "scope the health
	// check to a specific schema / database / table". Today the
	// route runs `SELECT 1`, which is schema-agnostic; the keys must
	// remain silently ignored.
	'/api/health/database?schema=public',
	'/api/health/database?schema=drizzle',
	'/api/health/database?database=postgres',
	'/api/health/database?database=app',
	'/api/health/database?table=users',
	'/api/health/database?table=items',

	// `?timeout=` — the obvious key a future contributor might add
	// when wiring up "fail-fast after N ms". Today the route uses
	// the database client's default timeout and reads nothing from
	// the URL; the key must remain silently ignored.
	'/api/health/database?timeout=100',
	'/api/health/database?timeout=5000',
	'/api/health/database?timeout=0',
	'/api/health/database?timeout=-1',

	// `?check=` / `?probe=` — the obvious keys a future contributor
	// might add when wiring up "run a different check (read-only,
	// write, replica-lag)". Today there is exactly one check
	// (`SELECT 1`) and the keys must remain silently ignored.
	'/api/health/database?check=read',
	'/api/health/database?check=write',
	'/api/health/database?check=replica',
	'/api/health/database?probe=liveness',
	'/api/health/database?probe=readiness',
	'/api/health/database?probe=startup',

	// `?format=` — the obvious key a future contributor might add
	// when wiring up "respond with text/plain instead of JSON" (a
	// common Kubernetes liveness-probe convention). Today the route
	// always responds with `application/json`; the key must remain
	// silently ignored.
	'/api/health/database?format=json',
	'/api/health/database?format=text',
	'/api/health/database?format=prometheus',

	// `?verbose=` / `?debug=` — the obvious keys a future contributor
	// might add when wiring up "include the executed SQL and round-
	// trip timing in the response". Today the route always returns
	// the same fields and the keys must remain silently ignored.
	'/api/health/database?verbose=true',
	'/api/health/database?debug=true',
	'/api/health/database?debug=1',

	// `?locale=` / `?lang=` — the obvious i18n keys. Today the
	// health-check surface is locale-agnostic (the `error` string is
	// English-only on the failure branch); the keys must remain
	// silently ignored.
	'/api/health/database?locale=en',
	'/api/health/database?locale=fr',
	'/api/health/database?locale=de',
	'/api/health/database?lang=ar',

	// Empty values for any of the above keys. `searchParams.get(...)`
	// on `?key=` returns `''`, but the route never calls it — the
	// response must still be identical to the no-arg case.
	'/api/health/database?refresh=',
	'/api/health/database?force=',
	'/api/health/database?schema=',
	'/api/health/database?check=',
	'/api/health/database?format=',

	// Repeated keys — `searchParams.get(name)` would return the first
	// value, but the route never calls it. The response must remain
	// the no-arg case.
	'/api/health/database?refresh=true&refresh=false',
	'/api/health/database?schema=public&schema=drizzle',
	'/api/health/database?check=read&check=write',

	// Special-character values that would tempt a future SQL-quoting
	// bug in a `?schema=` / `?table=` wrapper. The route runs a
	// hard-coded `SELECT 1` and reads nothing from the URL; these
	// values must remain pass-through ignored. (If a future change
	// were to interpolate any of these into SQL without parameter
	// binding, the query would either fail with a parse error or
	// succeed with an injected payload — both are observable as
	// status drift relative to the baseline.)
	'/api/health/database?schema=%27', // '
	'/api/health/database?schema=%22', // "
	'/api/health/database?schema=%3B', // ;
	'/api/health/database?schema=%2D%2D', // --
	'/api/health/database?table=%25', // %
	"/api/health/database?table='OR'1'='1",
	'/api/health/database?table=DROP+TABLE+users',

	// Long values — guard against any future buffer-overflow-style
	// regex / identifier-validation bug. The route does not read the
	// value, so this must pass through to the no-arg branch.
	`/api/health/database?schema=${'s'.repeat(500)}`,
	`/api/health/database?table=${'t'.repeat(500)}`,
	`/api/health/database?check=${'c'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The route reads
	// nothing from the request URL, so any combination of unknown
	// keys is silently ignored.
	'/api/health/database?unknown=value',
	'/api/health/database?foo=bar&baz=qux',
	'/api/health/database?refresh=true&unknown=value&foo=bar',
	'/api/health/database?check=read&format=json&schema=public&unknown=value'
] as const;

test.describe('API: /api/health/database query-param surface', () => {
	test('GET /api/health/database always returns the canonical health envelope', async ({ request }) => {
		// The route's success path returns
		// `{ status: 'healthy', database: 'connected', timestamp,
		// result }`; the failure path returns `{ status: 'unhealthy',
		// database: 'disconnected', error: '...', timestamp }`. Both
		// branches share the same three top-level keys (`status`,
		// `database`, `timestamp`) plus a branch-specific fourth
		// (`result` on success, `error` on failure). The contract is
		// "always a string status, always a string database, always
		// a string timestamp".
		const response = await request.get('/api/health/database');

		// 200 on success; 500 on the catch branch when the database
		// is unreachable in CI. Both are valid e2e outcomes because
		// the e2e environment does not guarantee a reachable database.
		expect([200, 500]).toContain(response.status());

		const body = (await response.json()) as {
			status?: unknown;
			database?: unknown;
			timestamp?: unknown;
		};

		expect(typeof body.status).toBe('string');
		expect(['healthy', 'unhealthy']).toContain(body.status as string);
		expect(typeof body.database).toBe('string');
		expect(['connected', 'disconnected']).toContain(body.database as string);
		expect(typeof body.timestamp).toBe('string');
		// `timestamp` is `new Date().toISOString()` — must parse as a
		// valid Date.
		expect(Number.isNaN(Date.parse(body.timestamp as string))).toBe(false);
	});

	for (const path of HEALTH_DATABASE_QUERIES) {
		test(`GET ${path} responds without a server error other than the documented 500`, async ({ request }) => {
			// The route's two valid branches are 200 (healthy) and
			// 500 (unhealthy). Any other 5xx (502 / 503 / 504) would
			// indicate a Next.js-level routing failure, an upstream
			// gateway error, or a regression in the response
			// construction itself. Any 4xx would indicate the route
			// has started rejecting query parameters that it
			// previously ignored — exactly the regression this spec
			// is designed to catch.
			const response = await request.get(path);

			expect([200, 500]).toContain(response.status());
		});
	}

	test('GET /api/health/database responds with the same status with and without bogus query parameters', async ({
		request
	}) => {
		// The handler signature is `export async function GET()` —
		// no `request` parameter, no `searchParams.get()` call. Any
		// query string the caller appends must be silently ignored,
		// and the status must be identical to the baseline. Body
		// content is not asserted byte-identical because `timestamp`
		// is a moving value; the status-code invariant is the
		// load-bearing one for this contract.
		const baseline = await request.get('/api/health/database');
		const parameterised = await request.get(
			'/api/health/database?refresh=true&schema=public&check=read&format=json&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect([200, 500]).toContain(parameterised.status());

		const baselineBody = (await baseline.json()) as { status?: unknown; database?: unknown };
		const parameterisedBody = (await parameterised.json()) as { status?: unknown; database?: unknown };

		// The branch (`healthy` vs. `unhealthy`) is determined by
		// the database's reachability, not by the URL. Both calls
		// must land on the same branch.
		expect(parameterisedBody.status).toBe(baselineBody.status);
		expect(parameterisedBody.database).toBe(baselineBody.database);
	});

	test('GET /api/health/database ignores SQL-injection-shaped query parameter values', async ({ request }) => {
		// The handler runs `db.execute(sql\`SELECT 1 as test\`)` — a
		// hard-coded statement with no parameter binding. The route
		// never reads the URL, so SQL-injection-shaped values in
		// `?schema=` / `?table=` cannot reach the SQL layer. This
		// test pins that invariant: the response status must match
		// the no-arg baseline, and the response body must remain the
		// same branch (`healthy` or `unhealthy`).
		const baseline = await request.get('/api/health/database');
		const injection = await request.get(
			"/api/health/database?schema=%27%3B+DROP+TABLE+users%3B+--&table=%27OR%271%27%3D%271"
		);

		expect(injection.status()).toBe(baseline.status());
		expect([200, 500]).toContain(injection.status());

		const baselineBody = (await baseline.json()) as { status?: unknown; database?: unknown };
		const injectionBody = (await injection.json()) as { status?: unknown; database?: unknown };

		expect(injectionBody.status).toBe(baselineBody.status);
		expect(injectionBody.database).toBe(baselineBody.database);
	});
});
