import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * version endpoints — the two no-arg GET handlers and the body-only
 * POST handler:
 *
 *   - `apps/web/app/api/version/route.ts` — `export async function
 *     GET()` (no `request` parameter); reads zero query params; runs
 *     `git log` against the cloned content repo and returns the head
 *     commit's metadata.
 *   - `apps/web/app/api/version/sync/route.ts` — exposes both `GET()`
 *     (no `request` parameter; reads zero query params; returns
 *     `getSyncStatus()`) and `POST(request: Request)` (reads the
 *     **body** for an optional `options` object; does **not** read
 *     the URL).
 *
 * The existing
 * [`version.spec.ts`](./version.spec.ts) covers the canonical happy
 * paths (no-arg GET on both, no-body POST on `/api/version/sync`);
 * this spec walks the **query-param surface** so a regression that
 * introduces a typo'd `request.nextUrl.searchParams.get(...)` call —
 * which a future "force a re-clone via `?refresh=true`" or
 * "filter sync by branch via `?branch=main`" wiring might tempt a
 * future contributor into adding — is caught immediately as a
 * non-200 / non-5xx response.
 *
 * The route signatures pin the contract:
 *
 *   - `GET /api/version` — `export async function GET()`. The
 *     handler has no `request` parameter, so any query string the
 *     caller appends is silently ignored. The response is one of:
 *       * `200` + `{ commit, date, message, author, repository,
 *         lastSync, branch, ... }` (success);
 *       * `200` + `{ commit: 'unknown', message: '...', ... }`
 *         (graceful degradation when the content repo is missing
 *         in CI environments);
 *       * `4xx` only if Next.js routing rejects the request (e.g.
 *         a malformed URL).
 *   - `GET /api/version/sync` — `export async function GET()`. The
 *     handler has no `request` parameter. The response is `200` +
 *     `{ syncInProgress, lastSyncTime, timeSinceLastSync,
 *     timeSinceLastSyncHuman, uptime, timestamp }`.
 *   - `POST /api/version/sync` — `export async function
 *     POST(request: Request)`. The handler reads `await
 *     request.json()` to get an optional `options` object. It does
 *     **not** read `request.nextUrl.searchParams`. Any query string
 *     the caller appends to the URL is silently ignored.
 *
 * Payload shape and `Content-Type` are intentionally not asserted on
 * the bulk loop because the response is the same envelope on both
 * branches (success and graceful-degrade). The single envelope-shape
 * assertions at the bottom pin the contract for each endpoint.
 */
const VERSION_QUERIES = [
	// Baseline — same paths as `version.spec.ts`. Included so the
	// query-param surface enumeration starts from the no-arg case.
	'/api/version',
	'/api/version/sync',

	// `?branch=` — the obvious key a future contributor might add
	// when wiring up "show me the version for a specific branch".
	// Today the route runs `git log` against `HEAD`, not against a
	// branch parameter; the key must remain ignored.
	'/api/version?branch=main',
	'/api/version?branch=develop',
	'/api/version?branch=feature/test',
	'/api/version/sync?branch=main',
	'/api/version/sync?branch=develop',

	// `?refresh=` / `?force=` / `?clone=` — the obvious keys a future
	// contributor might add when wiring up "force a re-sync from the
	// remote". Today GET `/api/version` reads the local clone and
	// GET `/api/version/sync` reads in-memory state; neither route
	// re-clones from the remote on a query-param trigger. POST
	// `/api/version/sync` is the only re-sync path. The keys must
	// remain ignored on GET.
	'/api/version?refresh=true',
	'/api/version?force=true',
	'/api/version?clone=true',
	'/api/version/sync?refresh=true',
	'/api/version/sync?force=true',

	// `?commit=` / `?sha=` / `?ref=` — the obvious keys a future
	// contributor might add when wiring up "show me the version at
	// a specific commit". Today the route returns HEAD only; the
	// keys must remain ignored.
	'/api/version?commit=abc1234',
	'/api/version?sha=abc1234567890abcdef',
	'/api/version?ref=v1.0.0',
	'/api/version/sync?commit=abc1234',

	// `?repository=` — the obvious key a future contributor might
	// add when wiring up "show me the version of a different
	// repository". Today the route reads `process.env.DATA_REPOSITORY`,
	// not a query parameter; the key must remain ignored.
	'/api/version?repository=https://github.com/example/repo.git',
	'/api/version/sync?repository=https://github.com/example/repo.git',

	// `?format=` — the obvious key a future contributor might add
	// when wiring up "respond with text/plain instead of JSON".
	// Today both GETs always respond with `application/json`; the
	// key must remain ignored.
	'/api/version?format=json',
	'/api/version?format=text',
	'/api/version?format=xml',
	'/api/version/sync?format=json',
	'/api/version/sync?format=text',

	// `?short=` / `?long=` — the obvious keys a future contributor
	// might add when wiring up "respond with a short commit hash"
	// or "include the full commit message". Today the route always
	// returns the 7-character short hash and the full subject line;
	// the keys must remain ignored.
	'/api/version?short=true',
	'/api/version?long=true',
	'/api/version?short=false',

	// `?locale=` / `?lang=` — the obvious i18n keys. Today the
	// version surface is locale-agnostic (commit metadata is the
	// same across all locales); the keys must remain ignored.
	'/api/version?locale=en',
	'/api/version?locale=fr',
	'/api/version?lang=de',
	'/api/version/sync?locale=en',

	// Empty values for any of the above keys. `searchParams.get(...)`
	// on `?key=` returns `''`, but the route never calls it — the
	// response must still be identical to the no-arg case.
	'/api/version?branch=',
	'/api/version?refresh=',
	'/api/version?commit=',
	'/api/version/sync?branch=',
	'/api/version/sync?refresh=',

	// Repeated keys — `searchParams.get(name)` would return the first
	// value, but the route never calls it. The response must remain
	// the no-arg case.
	'/api/version?branch=main&branch=develop',
	'/api/version?refresh=true&refresh=false',
	'/api/version/sync?branch=main&branch=develop',

	// Special-character values that would tempt a future shell-
	// quoting bug in a `git log` wrapper. The route uses
	// `isomorphic-git` (not a shell `git` invocation), so these
	// values cannot reach a shell; they must remain pass-through
	// ignored.
	'/api/version?branch=%25', // %
	'/api/version?branch=%2F', // /
	'/api/version?branch=%5C', // \
	'/api/version?branch=%27', // '
	'/api/version?branch=%3B', // ;
	'/api/version?branch=%26', // &
	'/api/version?branch=%24', // $
	'/api/version?branch=%60', // `

	// Long values — guard against any future buffer-overflow-style
	// regex / SHA-validation bug. The route does not read the value,
	// so this must pass through to the no-arg branch and respond
	// with the canonical 200 envelope.
	`/api/version?branch=${'b'.repeat(500)}`,
	`/api/version?commit=${'c'.repeat(500)}`,
	`/api/version/sync?branch=${'b'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The routes read
	// nothing from the request URL, so any combination of unknown
	// keys is silently ignored.
	'/api/version?unknown=value',
	'/api/version?foo=bar&baz=qux',
	'/api/version?branch=main&unknown=value&foo=bar',
	'/api/version/sync?unknown=value',
	'/api/version/sync?foo=bar&baz=qux'
] as const;

test.describe('API: /api/version + /api/version/sync query-param surface', () => {
	for (const path of VERSION_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/version always returns the canonical version envelope', async ({ request }) => {
		// The route's success path returns
		// `{ commit, date, message, author, repository, lastSync,
		// branch, ... }`. The graceful-degrade path (when the
		// content repo is missing in CI) returns the same envelope
		// with `commit: 'unknown'` and an explanatory `message`.
		// Both branches respond with status 200.
		const response = await request.get('/api/version');

		expect(response.status()).toBe(200);

		const body = (await response.json()) as { commit?: unknown; message?: unknown };

		expect(typeof body.commit).toBe('string');
		expect((body.commit as string).length).toBeGreaterThan(0);
		// `message` is a string in both the success branch (the
		// commit subject) and the graceful-degrade branch (the
		// "no content repo" notice). The contract is "always a
		// string".
		expect(typeof body.message).toBe('string');
	});

	test('GET /api/version responds identically with and without bogus query parameters', async ({ request }) => {
		// The handler signature is `export async function GET()` —
		// no `request` parameter, no `searchParams.get()` call. Any
		// query string the caller appends must be silently ignored,
		// and the status must remain 200. Body content is not
		// asserted byte-identical because `lastSync` is a moving
		// timestamp; the status-code invariant is the load-bearing
		// one for this contract.
		const baseline = await request.get('/api/version');
		const parameterised = await request.get(
			'/api/version?branch=main&refresh=true&commit=abc1234&format=json&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(200);
	});

	test('GET /api/version/sync always returns the canonical sync-status envelope', async ({ request }) => {
		// The route returns `{ syncInProgress, lastSyncTime,
		// timeSinceLastSync, timeSinceLastSyncHuman, uptime,
		// timestamp }`. There is no 5xx branch — the handler reads
		// in-memory state via `getSyncStatus()` which never throws.
		const response = await request.get('/api/version/sync');

		expect(response.status()).toBe(200);

		const body = (await response.json()) as {
			syncInProgress?: unknown;
			lastSyncTime?: unknown;
			timeSinceLastSyncHuman?: unknown;
			uptime?: unknown;
			timestamp?: unknown;
		};

		expect(typeof body.syncInProgress).toBe('boolean');
		// `lastSyncTime` is `string | null` — `null` on a fresh boot
		// before any sync has run, otherwise an ISO-8601 string.
		expect(['string', 'object']).toContain(typeof body.lastSyncTime);
		if (body.lastSyncTime !== null) {
			expect(typeof body.lastSyncTime).toBe('string');
		}
		expect(typeof body.timeSinceLastSyncHuman).toBe('string');
		expect(typeof body.uptime).toBe('number');
		expect(body.uptime as number).toBeGreaterThanOrEqual(0);
		expect(typeof body.timestamp).toBe('string');
	});

	test('GET /api/version/sync responds identically with and without bogus query parameters', async ({ request }) => {
		// Same `export async function GET()` signature as
		// `/api/version` — no request URL is read.
		const baseline = await request.get('/api/version/sync');
		const parameterised = await request.get('/api/version/sync?branch=main&refresh=true&format=json&unknown=value');

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(200);
	});

	test('POST /api/version/sync ignores query parameters', async ({ request }) => {
		// The handler signature is `export async function
		// POST(request: Request)` — the body is read via
		// `await request.json()`, but the URL is not parsed for
		// query parameters. Adding `?branch=main` to the POST URL
		// must not change the response status compared to a
		// no-query-string POST.
		const baseline = await request.post('/api/version/sync', { data: {} });
		const parameterised = await request.post('/api/version/sync?branch=main&refresh=true&unknown=value', {
			data: {}
		});

		expect(parameterised.status()).toBe(baseline.status());
		// The endpoint's contract is "must not 5xx". 200 is the
		// success path; 401/403 are environmentally-gated; 4xx
		// covers a future validation rejection.
		expect(parameterised.status()).toBeLessThan(500);
	});
});
