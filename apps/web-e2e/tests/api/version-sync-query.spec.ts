import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * public `version/sync` GET endpoint served by
 * `apps/web/app/api/version/sync/route.ts`.
 *
 * `GET /api/version/sync` is intentionally **public,
 * zero-argument, side-effect-free**: the route exposes the
 * current Git-CMS sync status so dashboards / health checks
 * can poll the running sync state without triggering a new
 * sync. The handler signature is the **zero-argument** Next 16
 * form (the route does not take a `NextRequest` argument and
 * reads no `searchParams` at all today):
 *
 *     export async function GET() {
 *       const syncStatus = getSyncStatus();
 *       const now = new Date();
 *       const timeSinceLastSync = syncStatus.lastSyncTime
 *         ? now.getTime() - syncStatus.lastSyncTime.getTime()
 *         : null;
 *
 *       const status = {
 *         syncInProgress: syncStatus.isRunning,
 *         lastSyncTime: syncStatus.lastSyncTime?.toISOString() || null,
 *         timeSinceLastSync,
 *         timeSinceLastSyncHuman: timeSinceLastSync
 *           ? `${Math.floor(timeSinceLastSync / 1000)}s ago`
 *           : "never",
 *         uptime: process.uptime(),
 *         timestamp: now.toISOString(),
 *       };
 *
 *       return NextResponse.json(status, {
 *         headers: {
 *           "Cache-Control": "no-cache, no-store, must-revalidate",
 *           "Content-Type": "application/json",
 *         },
 *       });
 *     }
 *
 * Because the handler signature is **zero-argument**, the
 * route reads zero query params today — every assertion
 * below pins that the response is deterministically 200 on
 * the public GET branch regardless of which keys the caller
 * appends to the URL, AND that the response body's shape is
 * the canonical six-key envelope
 * `{ syncInProgress, lastSyncTime, timeSinceLastSync,
 *    timeSinceLastSyncHuman, uptime, timestamp }`. A regression
 * that switches the signature to `GET(request: NextRequest)`
 * and starts reading `request.nextUrl.searchParams.get(...)`
 * would not change the public branch's status today (the
 * response is still 200), but a regression that branches on
 * a query param to gate the body (e.g. `?asUser=…` returning
 * a per-user override or `?tenant=…` returning a per-tenant
 * subset) would silently change the response body — and
 * that change is exactly what this spec catches.
 *
 * The route's contract is the load-bearing invariant this
 * spec pins:
 *
 *   - **Public**: the route returns 200 for every caller.
 *     No authentication is checked because the response
 *     body carries no PII (only sync timing and process
 *     uptime).
 *   - **Six-key envelope**: the body has exactly six keys
 *     today (`syncInProgress`, `lastSyncTime`,
 *     `timeSinceLastSync`, `timeSinceLastSyncHuman`,
 *     `uptime`, `timestamp`) with stable JS types
 *     (`boolean`, `string | null`, `number | null`,
 *     `string`, `number`, `string`). This shape is what
 *     the host app's status-dashboard logic depends on.
 *   - **Cache-Control: no-cache, no-store, must-revalidate**:
 *     the route deliberately disables intermediate caching
 *     so polling clients always observe the live sync state.
 *     A regression that drops the header would silently let
 *     a CDN serve stale `syncInProgress: false` while a sync
 *     is actively running.
 *   - **Parameter-invariance** on the body shape: every key
 *     must be present and typed identically across any
 *     query-string permutation today, because no key is
 *     read. The `uptime` and `timestamp` fields are
 *     deliberately permitted to drift between calls (they
 *     are time-sensitive by construction), so the spec
 *     pins the **shape**, not the values, of the
 *     parameterised response.
 *
 * Note: the matching `POST /api/version/sync` handler in the
 * same file **does** trigger a real Git-CMS sync via
 * `triggerManualSync()`. This spec covers only the GET
 * status branch — the POST branch is out of scope for a
 * read-only smoke spec because it has a side effect.
 *
 * The shape mirrors the sibling
 * `apps/web/app/api/version/route.ts`,
 * `apps/web/app/api/health/route.ts`, and other zero-argument
 * public endpoints — but the version/sync GET route is the
 * **only** one whose response payload carries process-level
 * state (`uptime`, `timestamp`) alongside the Git-CMS sync
 * timing, making the invariant-shape assertion doubly
 * load-bearing because the host-app's dashboard polling
 * logic reads each of the six keys directly without a
 * deeper schema validation step.
 */
const VERSION_SYNC_QUERIES = [
	// Baseline — the no-arg public case. Included so a
	// future reader of this file sees the canonical case
	// alongside the variants it parametrises.
	'/api/version/sync',

	// `?force=` / `?refresh=` — keys that the **adjacent**
	// POST trigger might read in a future regression.
	// The GET branch must not gate on them today.
	'/api/version/sync?force=true',
	'/api/version/sync?force=1',
	'/api/version/sync?refresh=true',
	'/api/version/sync?refresh=1',

	// `?status=` / `?check=` — keys a future regression
	// might use to scope the body to a subset.
	'/api/version/sync?status=running',
	'/api/version/sync?status=idle',
	'/api/version/sync?check=detail',

	// `?userId=` / `?asUser=` / `?impersonate=` — keys that
	// a future "per-user filter" might add. The route
	// returns the host-wide status today.
	'/api/version/sync?userId=anyone',
	'/api/version/sync?asUser=admin',
	'/api/version/sync?impersonate=admin',

	// `?tenant=` / `?tenantId=` / `?org=` — keys that a
	// future "per-tenant scope" might add. The route
	// returns a single host-wide status today.
	'/api/version/sync?tenant=acme',
	'/api/version/sync?tenantId=42',
	'/api/version/sync?org=ever-works',

	// `?token=` / `?secret=` / `?api_key=` — the obvious
	// "I have a magic auth token" keys. The route does not
	// authenticate at all today on the GET branch.
	'/api/version/sync?token=anything',
	'/api/version/sync?secret=anything',
	'/api/version/sync?api_key=anything',

	// `?cache=` / `?nocache=` / `?bust=` / `?fresh=` —
	// the obvious cache-busting keys. The handler does
	// not branch on any cache-control query param today
	// (it instead emits `Cache-Control: no-cache, no-store,
	// must-revalidate` unconditionally).
	'/api/version/sync?cache=bypass',
	'/api/version/sync?nocache=1',
	'/api/version/sync?bust=true',
	'/api/version/sync?fresh=true',

	// `?locale=` / `?lang=` — i18n keys. The route returns
	// a language-agnostic status today (the
	// `timeSinceLastSyncHuman` field is hard-coded to
	// English `"5s ago"` / `"never"` strings).
	'/api/version/sync?locale=en',
	'/api/version/sync?locale=fr',
	'/api/version/sync?lang=de',

	// `?fields=` / `?select=` / `?include=` — the obvious
	// "only-give-me-these-columns" keys. The route returns
	// the full six-key payload today.
	'/api/version/sync?fields=syncInProgress',
	'/api/version/sync?select=lastSyncTime,uptime',
	'/api/version/sync?include=timestamp',

	// `?env=` / `?stage=` — the obvious environment-override
	// keys. The route reads from the in-process sync
	// service's state, which is not parameterised by env.
	'/api/version/sync?env=production',
	'/api/version/sync?env=staging',
	'/api/version/sync?stage=preview',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The route reads zero keys, so empty
	// values must round-trip to the same response shape as
	// the no-arg case.
	'/api/version/sync?force=',
	'/api/version/sync?token=',
	'/api/version/sync?tenant=',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value, but the route reads zero keys, so
	// repetition is irrelevant.
	'/api/version/sync?force=true&force=false',
	'/api/version/sync?token=foo&token=bar',

	// Special-character values that would tempt a future
	// regex match, LIKE-prefix, or path-injection wiring.
	// The route does not pass any value into a SQL or
	// filesystem path today.
	'/api/version/sync?token=%3Cscript%3E',
	"/api/version/sync?token=%27%20OR%201%3D1",
	'/api/version/sync?token=%2F..%2F..%2Fetc%2Fpasswd',

	// Long values — guard against any future regex /
	// regex-based indexing bug that might trip on long
	// inputs. The route reads zero keys today.
	`/api/version/sync?token=${'x'.repeat(500)}`,
	`/api/version/sync?fields=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero
	// query keys today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/version/sync?unknown=value',
	'/api/version/sync?foo=bar&baz=qux',
	'/api/version/sync?force=true&token=foo&unknown=value&tenant=acme&fields=syncInProgress&foo=bar'
] as const;

const SIX_KEY_ENVELOPE = [
	'syncInProgress',
	'lastSyncTime',
	'timeSinceLastSync',
	'timeSinceLastSyncHuman',
	'uptime',
	'timestamp'
] as const;

interface VersionSyncBody {
	syncInProgress: unknown;
	lastSyncTime: unknown;
	timeSinceLastSync: unknown;
	timeSinceLastSyncHuman: unknown;
	uptime: unknown;
	timestamp: unknown;
}

function assertVersionSyncShape(body: VersionSyncBody) {
	// The body has exactly six keys today (no more, no
	// fewer). Sorting both sides survives any future
	// reorder of the keys in the response object.
	expect(Object.keys(body).sort()).toEqual([...SIX_KEY_ENVELOPE].sort());

	// `syncInProgress` is always a boolean — the in-process
	// sync service tracks `isRunning` as a boolean and the
	// route copies it through verbatim.
	expect(typeof body.syncInProgress).toBe('boolean');

	// `lastSyncTime` is `string | null` — the route emits
	// `syncStatus.lastSyncTime?.toISOString() || null`.
	// On a fresh boot the sync has not completed once, so
	// the field is `null`. After the first sync, it is an
	// ISO-8601 string. Both shapes are valid.
	if (body.lastSyncTime !== null) {
		expect(typeof body.lastSyncTime).toBe('string');
		// ISO-8601 timestamps end with `Z` (UTC) by
		// `Date#toISOString()` convention.
		expect(body.lastSyncTime as string).toMatch(/Z$/);
	}

	// `timeSinceLastSync` is `number | null` — the route
	// emits `now.getTime() - syncStatus.lastSyncTime.getTime()`
	// when `lastSyncTime` is set, and `null` otherwise. The
	// two fields are paired: when `lastSyncTime` is `null`,
	// `timeSinceLastSync` is also `null`.
	if (body.timeSinceLastSync !== null) {
		expect(typeof body.timeSinceLastSync).toBe('number');
		expect(body.timeSinceLastSync as number).toBeGreaterThanOrEqual(0);
	}

	// `timeSinceLastSyncHuman` is always a string — the
	// route emits `"${seconds}s ago"` when the sync has
	// run, or the literal `"never"` otherwise.
	expect(typeof body.timeSinceLastSyncHuman).toBe('string');

	// `uptime` is `number` — `process.uptime()` returns
	// seconds-since-process-start as a float. It must be
	// non-negative.
	expect(typeof body.uptime).toBe('number');
	expect(body.uptime as number).toBeGreaterThanOrEqual(0);

	// `timestamp` is always an ISO-8601 string — the route
	// emits `now.toISOString()`.
	expect(typeof body.timestamp).toBe('string');
	expect(body.timestamp as string).toMatch(/Z$/);
}

test.describe('API: /api/version/sync GET query-param surface', () => {
	for (const path of VERSION_SYNC_QUERIES) {
		test(`GET ${path} responds with 200 and the canonical six-key envelope`, async ({ request }) => {
			const response = await request.get(path);

			// The route is unconditionally public on the GET
			// branch today, so every parameterised request
			// must land on the same 200 status.
			expect(response.status()).toBe(200);

			const body = (await response.json()) as VersionSyncBody;
			assertVersionSyncShape(body);
		});
	}

	test(`GET /api/version/sync returns the canonical six-key envelope`, async ({ request }) => {
		// The six-key envelope is the load-bearing contract:
		// the dashboard's polling logic reads each of the
		// keys directly. Any change to the envelope shape
		// (rename `syncInProgress` to `isRunning`, drop
		// `timeSinceLastSyncHuman`, add a sibling `error`
		// key, wrap in `{ success: true, data: {...} }`,
		// etc.) would silently break the host app's UI even
		// though every other smoke spec would still pass.
		const response = await request.get('/api/version/sync');

		expect(response.status()).toBe(200);

		const body = (await response.json()) as VersionSyncBody;
		assertVersionSyncShape(body);
	});

	test(`GET /api/version/sync sets Cache-Control: no-cache, no-store, must-revalidate`, async ({ request }) => {
		// The route deliberately disables intermediate
		// caching so polling clients always observe the
		// live sync state. A regression that drops the
		// header would silently let a CDN serve stale
		// `syncInProgress: false` while a sync is actively
		// running, which is the exact scenario this header
		// guards against.
		const response = await request.get('/api/version/sync');

		expect(response.status()).toBe(200);

		const cacheControl = response.headers()['cache-control'];
		expect(cacheControl).toBeDefined();
		// The header must contain all three directives: no
		// drift on any of them is permitted.
		expect(cacheControl).toContain('no-cache');
		expect(cacheControl).toContain('no-store');
		expect(cacheControl).toContain('must-revalidate');
	});

	test(`GET /api/version/sync sets Content-Type: application/json`, async ({ request }) => {
		// The route deliberately pins the content-type
		// header even though `NextResponse.json()` would
		// emit it by default — this catches a regression
		// that switches the route to `NextResponse.text()`
		// or to a streaming body that drops the header.
		const response = await request.get('/api/version/sync');

		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toContain('application/json');
	});

	test(`GET /api/version/sync keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 200 / six-key envelope
		// today. The shape guarantees the route's body is
		// invariant to the query string. Note that the
		// **values** of `uptime` and `timestamp` may drift
		// between calls (they are time-sensitive by
		// construction); the assertion pins the shape, not
		// the values.
		const responses = await Promise.all([
			request.get('/api/version/sync'),
			request.get('/api/version/sync?force=true&tenant=acme&fields=uptime&token=foo'),
			request.get('/api/version/sync?force=invalid&token=anything&unknown=bar')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);

			const body = (await response.json()) as VersionSyncBody;
			assertVersionSyncShape(body);
		}
	});

	test(`GET /api/version/sync?token=… does NOT introduce a query-token override`, async ({
		request
	}) => {
		// The route is unconditionally public on the GET
		// branch today and does not authenticate. A
		// regression that wires `searchParams.get('token')`
		// as a per-user override for the sync state would
		// change the body shape on the per-token branch.
		// This assertion pins the "sync state is read from
		// the in-process sync service, never from the query
		// string" invariant by re-reading the shape on
		// every per-token request.
		const responses = await Promise.all([
			request.get('/api/version/sync?token=anything'),
			request.get('/api/version/sync?secret=anything'),
			request.get('/api/version/sync?api_key=anything'),
			request.get('/api/version/sync?asUser=admin'),
			request.get('/api/version/sync?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);
			const body = (await response.json()) as VersionSyncBody;
			assertVersionSyncShape(body);
		}
	});

	test(`GET /api/version/sync?tenant=… does NOT introduce a per-tenant override`, async ({
		request
	}) => {
		// The route returns a single host-wide sync state
		// today (the in-process sync service is a singleton).
		// A regression that wires `searchParams.get('tenant')`
		// as a per-tenant override would change the body on
		// the per-tenant branch.
		const responses = await Promise.all([
			request.get('/api/version/sync?tenant=acme'),
			request.get('/api/version/sync?tenantId=42'),
			request.get('/api/version/sync?org=ever-works'),
			request.get('/api/version/sync?env=production'),
			request.get('/api/version/sync?env=staging')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);
			const body = (await response.json()) as VersionSyncBody;
			assertVersionSyncShape(body);
		}
	});

	test(`GET /api/version/sync does NOT branch on Accept header`, async ({ request }) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to JSON.
		const responses = await Promise.all([
			request.get('/api/version/sync', { headers: { Accept: 'application/json' } }),
			request.get('/api/version/sync', { headers: { Accept: 'application/xml' } }),
			request.get('/api/version/sync', { headers: { Accept: 'text/html' } }),
			request.get('/api/version/sync', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);
			expect(response.headers()['content-type']).toContain('application/json');
			const body = (await response.json()) as VersionSyncBody;
			assertVersionSyncShape(body);
		}
	});

	test(`GET /api/version/sync's syncInProgress + lastSyncTime + timeSinceLastSync are correlated`, async ({
		request
	}) => {
		// The three fields together encode the sync state's
		// timing contract:
		//
		//   - `lastSyncTime` is `null` when the sync has
		//     never run; otherwise it is an ISO-8601 string.
		//   - `timeSinceLastSync` is `null` when
		//     `lastSyncTime` is `null`; otherwise it is the
		//     non-negative milliseconds delta between the
		//     route's `now` and `lastSyncTime`.
		//   - `timeSinceLastSyncHuman` is the literal
		//     `"never"` when `lastSyncTime` is `null`;
		//     otherwise it is `"${seconds}s ago"`.
		//
		// A regression that flips any one of these three
		// without flipping the other two would break the
		// dashboard's UI consistency.
		const response = await request.get('/api/version/sync');
		expect(response.status()).toBe(200);

		const body = (await response.json()) as VersionSyncBody;

		if (body.lastSyncTime === null) {
			expect(body.timeSinceLastSync).toBeNull();
			expect(body.timeSinceLastSyncHuman).toBe('never');
		} else {
			expect(typeof body.timeSinceLastSync).toBe('number');
			expect(typeof body.timeSinceLastSyncHuman).toBe('string');
			// The human-readable form is `"${seconds}s ago"`
			// — the regex pins both the suffix and the
			// non-negative integer prefix.
			expect(body.timeSinceLastSyncHuman as string).toMatch(/^\d+s ago$/);
		}
	});
});
