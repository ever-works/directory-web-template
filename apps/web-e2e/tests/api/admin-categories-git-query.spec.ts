import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only Git-repository-status / categories endpoint
 * served by
 * `apps/web/app/api/admin/categories/git/route.ts`.
 *
 * `GET /api/admin/categories/git` is the **first**
 * admin-tree route the smoke layer covers that documents
 * a unique combination of FOUR distinct contracts:
 *
 *   1. **Zero-argument `GET()` handler signature** — the
 *      route does not take a `NextRequest` argument and
 *      reads no `searchParams` at all today. Distinct
 *      from every other admin-tree route's
 *      `GET(request: NextRequest)` posture (and from the
 *      bare `Request`-typed reports route's posture).
 *      Same posture as the notifications route.
 *   2. **Bare `{ error: '...' }` envelope** (NOT the
 *      `{ success: false, error: '...' }` shape every
 *      other admin-gated route emits) — a single-key
 *      envelope without the `success` discriminant. The
 *      ONLY admin-tree GET route that combines the
 *      bare-envelope shape with a role-context-specific
 *      `'Unauthorized. Admin access required.'` message
 *      (the settings route uses the bare envelope with a
 *      bare `'Unauthorized'` message; the admin-categories
 *      route uses the canonical envelope with the role-
 *      context-specific message).
 *   3. **GitHub-API-backed service** via
 *      `createCategoryGitService(gitConfig)` — distinct
 *      from every other admin-tree route's drizzle / DB
 *      posture and from the tags/all / categories/all
 *      routes' Git-CMS file-system reader posture. The
 *      service makes live HTTPS calls to the GitHub API
 *      using the configured `GITHUB_TOKEN` /
 *      `DATA_REPOSITORY` environment variables.
 *   4. **Three distinct configuration-error 500 envelopes**
 *      after the gate — one for each of the three
 *      configuration prerequisites (`DATA_REPOSITORY` not
 *      set, invalid `DATA_REPOSITORY` format,
 *      `GITHUB_TOKEN` not set). Each emits the canonical
 *      `{ success: false, error: '...' }` envelope (NOT
 *      the bare envelope) — a deliberate inconsistency
 *      between the unauth-branch and the post-auth
 *      configuration-error branches that the route's
 *      handler structure makes invariant. Out of scope
 *      for the unauth-branch contract this spec pins.
 *
 * The handler:
 *
 *     export async function GET() {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json(
 *             { error: 'Unauthorized. Admin access required.' },
 *             { status: 401 }
 *           );
 *         }
 *         const dataRepo = process.env.DATA_REPOSITORY;
 *         if (!dataRepo) {
 *           return NextResponse.json(
 *             { success: false, error: 'DATA_REPOSITORY not configured. …' },
 *             { status: 500 }
 *           );
 *         }
 *         const match = dataRepo.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
 *         if (!match) { return …; }
 *         const gitConfig = { owner, repo, token: process.env.GITHUB_TOKEN, branch: process.env.GITHUB_BRANCH || 'main' };
 *         if (!gitConfig.token) { return …; }
 *         const gitService = await createCategoryGitService(gitConfig);
 *         const status = await gitService.getStatus();
 *         const categories = await gitService.readCategories();
 *         return NextResponse.json({ success: true, status, categories, message: '…' });
 *       } catch (error) {
 *         return safeErrorResponse(error, 'Failed to get Git repository status');
 *       }
 *     }
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: the route returns 401 with
 *     the bare `{ error: 'Unauthorized. Admin access required.' }`
 *     envelope.
 *   - **Authenticated user, missing `isAdmin`**: same 401
 *     branch.
 *   - **Admin, `DATA_REPOSITORY` not set**: 500 with
 *     `{ success: false, error: 'DATA_REPOSITORY not configured. …' }`.
 *     Out of scope.
 *   - **Admin, invalid `DATA_REPOSITORY` format**: 500
 *     with `{ success: false, error: 'Invalid DATA_REPOSITORY format. …' }`.
 *     Out of scope.
 *   - **Admin, `GITHUB_TOKEN` not set**: 500 with
 *     `{ success: false, error: 'GitHub token not configured. …' }`.
 *     Out of scope.
 *   - **Admin, valid configuration**: 200 with
 *     `{ success: true, status, categories, message }`.
 *     Out of scope.
 *   - **Internal error during Git API call**: the catch
 *     routes through `safeErrorResponse(...)` to a 500.
 *     Out of scope.
 *
 * The shape mirrors the sibling admin-gated query-smoke
 * specs but the unique combination of contracts above
 * makes this route distinct.
 */
const ADMIN_CATEGORIES_GIT_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/categories/git',

	// `?repo=` / `?branch=` / `?token=` — Git-service-
	// configuration override keys for a future
	// contributor (the route reads from
	// `process.env.DATA_REPOSITORY` /
	// `process.env.GITHUB_TOKEN` /
	// `process.env.GITHUB_BRANCH` exclusively today).
	'/api/admin/categories/git?repo=anything',
	'/api/admin/categories/git?branch=main',
	'/api/admin/categories/git?branch=develop',
	'/api/admin/categories/git?owner=ever-co',
	'/api/admin/categories/git?token=anything',

	// `?refresh=` / `?force=` / `?cache=` — cache-
	// busting keys.
	'/api/admin/categories/git?refresh=1',
	'/api/admin/categories/git?fresh=true',
	'/api/admin/categories/git?cache=bypass',
	'/api/admin/categories/git?nocache=1',

	// `?fields=` / `?include=` / `?expand=` — content-
	// projection keys for a future contributor.
	'/api/admin/categories/git?fields=status',
	'/api/admin/categories/git?fields=status,categories',
	'/api/admin/categories/git?include=meta',
	'/api/admin/categories/git?expand=true',

	// `?status=` / `?onlyStatus=` — status-only filter
	// for a future contributor.
	'/api/admin/categories/git?status=true',
	'/api/admin/categories/git?onlyStatus=true',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys.
	'/api/admin/categories/git?userId=anything',
	'/api/admin/categories/git?user_id=anything',
	'/api/admin/categories/git?adminId=anything',
	'/api/admin/categories/git?as=admin',
	'/api/admin/categories/git?asUser=true',
	'/api/admin/categories/git?impersonate=admin',

	// `?secret=` / `?api_key=` / `?authorization=` —
	// magic-token bypass keys.
	'/api/admin/categories/git?secret=anything',
	'/api/admin/categories/git?api_key=anything',
	'/api/admin/categories/git?authorization=Bearer+anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/categories/git?bypass=1',
	'/api/admin/categories/git?admin=1',
	'/api/admin/categories/git?override=true',
	'/api/admin/categories/git?force=true',

	// `?commit=` / `?ref=` / `?sha=` — Git-ref-targeting
	// keys for a future contributor.
	'/api/admin/categories/git?commit=abc123',
	'/api/admin/categories/git?ref=main',
	'/api/admin/categories/git?sha=abc123def456',

	// `?path=` — Git-tree-targeting key for a future
	// contributor (the service reads from a hardcoded
	// path today).
	'/api/admin/categories/git?path=categories',
	'/api/admin/categories/git?path=../../etc/passwd',
	'/api/admin/categories/git?path=%00malicious',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/categories/git?locale=en',
	'/api/admin/categories/git?locale=fr',

	// Repeated keys.
	'/api/admin/categories/git?repo=a&repo=b',
	'/api/admin/categories/git?branch=main&branch=develop',

	// Bogus / typo'd query keys.
	'/api/admin/categories/git?unknown=value',
	'/api/admin/categories/git?foo=bar&baz=qux',
	'/api/admin/categories/git?userId=admin&token=foo&unknown=value&repo=anything&branch=main&foo=bar'
] as const;

test.describe('API: /api/admin/categories/git query-param surface', () => {
	for (const path of ADMIN_CATEGORIES_GIT_QUERIES) {
		test(`GET ${path} responds without a server error from the unauth gate`, async ({
			request
		}) => {
			const response = await request.get(path);

			// The route's admin gate fires before any
			// configuration check or Git service call. The
			// unauthenticated GET surface returns a 4xx
			// (specifically 401) deterministically.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/categories/git returns a 401 with the BARE { error } envelope and the role-context-specific message on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the gate
		// (`!session?.user?.isAdmin`) returns 401 with
		// the BARE `{ error: 'Unauthorized. Admin access required.' }`
		// envelope — the ONLY admin-tree GET route that
		// combines the bare-envelope shape (no `success`
		// discriminator) with the role-context-specific
		// `'Unauthorized. Admin access required.'`
		// message. A regression that switches to the
		// canonical `{ success: false, error: ... }`
		// envelope or drops the role-context-specific
		// suffix would surface here as a body-divergence
		// assertion failure.
		const response = await request.get('/api/admin/categories/git');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			error: 'Unauthorized. Admin access required.'
		});

		// Negative-shape assertions: the body must NOT
		// include a `success` key (which every other
		// admin-tree route's canonical envelope emits) and
		// must NOT use the bare `'Unauthorized'` message
		// the settings route emits.
		expect(body.success).toBeUndefined();
		expect(body.error).not.toBe('Unauthorized');
		expect(body.error).not.toBe('Forbidden');
	});

	test('GET /api/admin/categories/git has a stable status across query permutations', async ({
		request
	}) => {
		// The route's handler signature is `GET()` — zero-
		// argument, reading no `searchParams` at all
		// today. The unauth branch's status must be
		// invariant to any combination of known and
		// unknown keys.
		const baseline = await request.get('/api/admin/categories/git');
		const parameterised = await request.get(
			'/api/admin/categories/git?repo=anything&branch=main&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/categories/git?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/categories/git');
		const responses = await Promise.all([
			request.get('/api/admin/categories/git?userId=admin'),
			request.get('/api/admin/categories/git?user_id=admin'),
			request.get('/api/admin/categories/git?adminId=admin'),
			request.get('/api/admin/categories/git?as=admin'),
			request.get('/api/admin/categories/git?asUser=true'),
			request.get('/api/admin/categories/git?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories/git?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('token')` as a fallback for
		// `process.env.GITHUB_TOKEN` would change the
		// unauth branch from "always 401" to "200 if
		// ?token=… is present and the rest of the
		// configuration is intact". This assertion
		// catches that change immediately.
		const baseline = await request.get('/api/admin/categories/git');
		const responses = await Promise.all([
			request.get('/api/admin/categories/git?token=anything'),
			request.get('/api/admin/categories/git?secret=anything'),
			request.get('/api/admin/categories/git?api_key=anything'),
			request.get('/api/admin/categories/git?authorization=Bearer+anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories/git?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/categories/git');
		const responses = await Promise.all([
			request.get('/api/admin/categories/git?bypass=1'),
			request.get('/api/admin/categories/git?admin=1'),
			request.get('/api/admin/categories/git?override=true'),
			request.get('/api/admin/categories/git?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories/git?repo=… does NOT introduce a Git-service-config bypass', async ({
		request
	}) => {
		// The route reads the Git-service configuration
		// from `process.env.DATA_REPOSITORY` /
		// `process.env.GITHUB_TOKEN` /
		// `process.env.GITHUB_BRANCH` exclusively today.
		// A future contributor who exposes Git-config via
		// query params (`?repo=…` / `?branch=…` /
		// `?owner=…`) must not bypass the admin gate. The
		// unauth branch's status must be invariant to the
		// Git-config keys.
		const baseline = await request.get('/api/admin/categories/git');
		const responses = await Promise.all([
			request.get('/api/admin/categories/git?repo=anything'),
			request.get('/api/admin/categories/git?branch=main'),
			request.get('/api/admin/categories/git?branch=develop'),
			request.get('/api/admin/categories/git?owner=ever-co')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories/git?path=… does NOT introduce a path-traversal bypass', async ({
		request
	}) => {
		// The Git service reads from a hardcoded path
		// today. A future contributor who exposes a
		// `?path=…` query param must NOT propagate path-
		// traversal sequences (`../../etc/passwd`) or
		// null-byte injection (`%00`) to the Git service
		// call. The unauth branch must always return 401
		// regardless of the path-traversal payload.
		const baseline = await request.get('/api/admin/categories/git');
		const responses = await Promise.all([
			request.get('/api/admin/categories/git?path=categories'),
			request.get('/api/admin/categories/git?path=../../etc/passwd'),
			request.get('/api/admin/categories/git?path=%00malicious')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories/git?commit=…&ref=…&sha=… does NOT introduce a Git-ref-targeting bypass', async ({
		request
	}) => {
		// The Git service reads the configured branch's
		// HEAD commit today. A future contributor who
		// exposes `?commit=…` / `?ref=…` / `?sha=…` must
		// not bypass the admin gate.
		const baseline = await request.get('/api/admin/categories/git');
		const responses = await Promise.all([
			request.get('/api/admin/categories/git?commit=abc123'),
			request.get('/api/admin/categories/git?ref=main'),
			request.get('/api/admin/categories/git?sha=abc123def456')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories/git?refresh=… does NOT introduce a cache-bust bypass', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/categories/git');
		const responses = await Promise.all([
			request.get('/api/admin/categories/git?refresh=1'),
			request.get('/api/admin/categories/git?fresh=true'),
			request.get('/api/admin/categories/git?cache=bypass'),
			request.get('/api/admin/categories/git?nocache=1')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories/git keeps the response status stable across param permutations', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/categories/git'),
			request.get('/api/admin/categories/git?repo=anything&branch=main'),
			request.get(
				'/api/admin/categories/git?userId=admin&token=foo&repo=anything&path=../../etc/passwd&unknown=bar&refresh=1&bypass=1'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/categories/git does NOT branch on Accept header', async ({ request }) => {
		const baseline = await request.get('/api/admin/categories/git');
		const responses = await Promise.all([
			request.get('/api/admin/categories/git', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/categories/git', { headers: { Accept: 'application/vnd.github+json' } }),
			request.get('/api/admin/categories/git', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories/git keeps a zero-argument handler signature stable under cookie / IP side channels', async ({
		request
	}) => {
		// The route's handler signature is `GET()` —
		// zero-argument, no `NextRequest` parameter at
		// all today. A future regression that switches
		// to `GET(request: NextRequest)` would silently
		// open up the request.cookies / request.geo /
		// request.ip surface — the unauth branch must
		// stay invariant under any of those side
		// channels.
		const responses = await Promise.all([
			request.get('/api/admin/categories/git', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/categories/git', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/categories/git', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/categories/git', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			}),
			request.get('/api/admin/categories/git', {
				headers: { 'X-GitHub-Token': 'fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/categories/git repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/categories/git');
		const responses = await Promise.all([
			request.get('/api/admin/categories/git?repo=a&repo=b'),
			request.get('/api/admin/categories/git?branch=main&branch=develop')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
